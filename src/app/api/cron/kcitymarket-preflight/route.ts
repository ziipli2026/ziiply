import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { citymarketPreflightDatabaseUrl, recordCitymarketPreflight } from "@/app/components/ziiply/offerSearch/citymarketPreflight";
import { recordPublicationRun } from "@/app/components/ziiply/offerSearch/publicationRunLog";
import { getNextKCitymarketPeriod, persistKCitymarketOfferPublication, warmKCitymarketOfferCache } from "@/app/components/ziiply/offerSearch/providers/kCitymarketProvider";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const manualSecret = process.env.KCITYMARKET_MANUAL_SECRET;
  const manual = Boolean(manualSecret && authorization === `Bearer ${manualSecret}`);
  if (!manual && !(cronSecret && authorization === `Bearer ${cronSecret}`)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const period = getNextKCitymarketPeriod(now);
  if (!period) return NextResponse.json({ skipped: "Outside the advance publication window" });

  const details = { period: period.key, parserStartedAt: now.toISOString() };
  const log = { chain: "K-Citymarket", source: "k-citymarket-preflight", ok: false, count: 0 };
  const databaseUrl = citymarketPreflightDatabaseUrl();
  try {
    if (!databaseUrl) throw new Error("Citymarket preflight database unavailable");
    const sql = neon(databaseUrl);
    const [latest] = await sql`SELECT outcome, checked_at FROM ziiply_publication_run_log
      WHERE source='k-citymarket-preflight' AND details->>'period'=${period.key}
      ORDER BY checked_at DESC, id DESC LIMIT 1`;
    if (latest?.outcome === "preflight-started" && now.getTime() - Date.parse(latest.checked_at) < maxDuration * 1000) {
      return NextResponse.json({ skipped: "Preflight already running", ...details });
    }
    if (!manual && latest?.outcome === "preflight-awaiting-pdf-review") {
      return NextResponse.json({ skipped: "Automatic preflight already passed", ...details });
    }

    await recordPublicationRun({ ...log, outcome: "preflight-started", details }, databaseUrl);
    const result = await warmKCitymarketOfferCache(now, "next");
    if (result.next) await persistKCitymarketOfferPublication(now, period);
    const report = await recordCitymarketPreflight({
      period: period.key, startedAt: details.parserStartedAt, parsed: result.next, errors: result.errors,
    });
    return NextResponse.json(report, { status: report.outcome === "preflight-awaiting-pdf-review" ? 200 : 503 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[K-Citymarket] Advance preflight failed", period.key, message);
    await recordPublicationRun({ ...log, outcome: "preflight-check-error", details: {
      ...details, errors: [message], pdfReview: "pending",
    } }, databaseUrl).catch(logError => console.error("[K-Citymarket] Advance preflight logging failed", logError));
    return NextResponse.json({ ok: false, ...details, error: message }, { status: 503 });
  }
}

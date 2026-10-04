import { NextResponse } from "next/server";
import { recentPublicationRuns } from "@/app/components/ziiply/offerSearch/publicationRunLog";
import { publicationDiagnosticSnapshots } from "@/app/components/ziiply/offerSearch/publicationStore";
import { inspectOfferPublication, type OfferDiagnosticRow } from "@/app/components/ziiply/offerSearch/publicationDiagnostics";
import { publicationState, finnishPublicationDate } from "@/app/components/ziiply/offerSearch/publicationLifecycle";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "Unavailable" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const chain = new URL(request.url).searchParams.get("chain") || "LIDL:FI0218";
    if (!/^[A-Z0-9:_-]{2,60}$/.test(chain))
      return NextResponse.json({ ok: false, error: "Invalid chain" }, { status: 400 });
    const snapshots = await publicationDiagnosticSnapshots(chain);
    const date = finnishPublicationDate();
    const runs = await recentPublicationRuns(chain);
    const editions = snapshots.map((row) => {
      const validFrom = String(row.valid_from);
      const validUntil = String(row.valid_until);
      const offers = Array.isArray(row.offers) ? row.offers as OfferDiagnosticRow[] : [];
      return {
        publicationId: row.publication_id, validFrom, validUntil, parsedAt: row.parsed_at,
        state: publicationState({ validFrom, validUntil }, date),
        quality: inspectOfferPublication(offers, validFrom, validUntil),
      };
    });
    const latestRun = runs[0];
    // Corrected snapshots of the same period must not inflate the health totals.
    // The store returns newest first; retain the first edition per validity period.
    const latestByPeriod = new Map<string, (typeof editions)[number]>();
    for (const edition of editions) {
      const period = `${edition.validFrom}:${edition.validUntil}`;
      if (!latestByPeriod.has(period)) latestByPeriod.set(period, edition);
    }
    const effectiveEditions = [...latestByPeriod.values()];
    const current = effectiveEditions.filter((edition) => edition.state === "current");
    const upcoming = effectiveEditions.filter((edition) => edition.state === "upcoming");
    const issues: string[] = [];
    if (!latestRun) issues.push("No recorded source run");
    else {
      if (!latestRun.ok) issues.push("Latest source run failed");
      const ageMs = Date.now() - Date.parse(String(latestRun.checked_at));
      if (!Number.isFinite(ageMs) || ageMs < -300000 || ageMs > 36 * 60 * 60 * 1000)
        issues.push("Source run is stale or has an invalid timestamp");
    }
    if (!current.length) issues.push("No currently valid stored publication");
    for (const edition of current) {
      if (edition.quality.severity === "error") issues.push(`Critical offer data in ${edition.publicationId}`);
      else if (edition.quality.severity === "warning") issues.push(`Incomplete offer metadata in ${edition.publicationId}`);
    }
    const summary = {
      status: issues.some((issue) => /failed|Critical|No currently|No recorded|stale/.test(issue)) ? "error" :
        issues.length ? "warning" : "ok",
      latestRunAt: latestRun?.checked_at ?? null,
      latestRunSucceeded: latestRun?.ok ?? null,
      latestRunOfferCount: latestRun?.offer_count ?? null,
      effectiveEditionCount: effectiveEditions.length,
      currentEditionCount: current.length,
      upcomingEditionCount: upcoming.length,
      currentOfferCount: current.reduce((total, edition) => total + edition.quality.count, 0),
      issues,
    };
    return NextResponse.json({ ok: true, chain, checkedAt: new Date().toISOString(),
      summary, editionCount: editions.length, editions, runs },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Diagnostics failed" },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

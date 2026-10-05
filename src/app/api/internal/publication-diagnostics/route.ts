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
    const issues: Array<{ code: string; severity: "warning" | "error"; message: string }> = [];
    const issue = (code: string, severity: "warning" | "error", message: string) => issues.push({ code, severity, message });
    if (!latestRun) issue("NO_SOURCE_RUN", "error", "No recorded source run");
    else {
      if (!latestRun.ok) issue("SOURCE_RUN_FAILED", "error", "Latest source run failed");
      const ageMs = Date.now() - Date.parse(String(latestRun.checked_at));
      if (!Number.isFinite(ageMs) || ageMs < -300000 || ageMs > 36 * 60 * 60 * 1000)
        issue("SOURCE_RUN_STALE", "error", "Source run is stale or has an invalid timestamp");
    }
    // Compare only identical publication periods: a normal weekly edition change
    // must not trigger a false source-collapse alarm.
    const successfulRuns = runs.filter((run) => run.ok && Number(run.offer_count) > 0);
    const periodsOf = (run: (typeof runs)[number]): string | null => {
      const details = run.details as { periods?: Array<{ period?: string }> } | null;
      if (!Array.isArray(details?.periods) || !details.periods.length) return null;
      const periods = details.periods.map((entry) => entry.period).filter(
        (period): period is string => typeof period === "string",
      ).sort();
      return periods.length === details.periods.length ? periods.join("|") : null;
    };
    const latestSuccess = successfulRuns[0];
    const periodKey = latestSuccess ? periodsOf(latestSuccess) : null;
    const baseline = periodKey ? successfulRuns.slice(1).find((run) => periodsOf(run) === periodKey) : undefined;
    const newestCount = latestSuccess ? Number(latestSuccess.offer_count) : null;
    const previousCount = baseline ? Number(baseline.offer_count) : null;
    const sourceDropPercent = newestCount !== null && previousCount !== null && previousCount > 0
      ? Math.round((previousCount - newestCount) / previousCount * 100) : null;
    if (sourceDropPercent !== null && sourceDropPercent >= 40)
      issue("SOURCE_COUNT_DROP", "error", `Source offer count dropped ${sourceDropPercent}% for the same publication periods`);
    if (!current.length) issue("NO_CURRENT_PUBLICATION", "error", "No currently valid stored publication");
    for (const edition of current) {
      if (edition.quality.severity === "error") issue("PUBLICATION_DATA_ERROR", "error", `Critical offer data in ${edition.publicationId}`);
      else if (edition.quality.severity === "warning") issue("PUBLICATION_METADATA_WARNING", "warning", `Incomplete offer metadata in ${edition.publicationId}`);
    }
    const status = issues.some((entry) => entry.severity === "error") ? "error" :
      issues.length ? "warning" : "ok";
    const summary = {
      status, issues.some((entry) => entry.severity === "error") ? "error" :
        issues.length ? "warning" : "ok",
      latestRunAt: latestRun?.checked_at ?? null,
      latestRunSucceeded: latestRun?.ok ?? null,
      latestRunOfferCount: latestRun?.offer_count ?? null,
      previousSuccessfulOfferCount: previousCount,
      sourceDropPercent,
      effectiveEditionCount: effectiveEditions.length,
      currentEditionCount: current.length,
      upcomingEditionCount: upcoming.length,
      currentOfferCount: current.reduce((total, edition) => total + edition.quality.count, 0),
      issues,
    };
    return NextResponse.json({ ok: true, needsAttention: status !== "ok", chain, checkedAt: new Date().toISOString(),
      summary, editionCount: editions.length, editions, runs },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Diagnostics failed" },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

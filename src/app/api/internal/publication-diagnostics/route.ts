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
    let daysUntilCurrentEnd: number | null = null;
    if (current.length) {
      const endDates = current.map((edition) => edition.validUntil).sort();
      const currentEnd = endDates[endDates.length - 1];
      const calculated = Math.round((Date.parse(`${currentEnd}T12:00:00Z`) - Date.parse(`${date}T12:00:00Z`)) / 86400000);
      daysUntilCurrentEnd = Number.isFinite(calculated) ? calculated : null;
    }
    if (current.length && upcoming.length) {
      const currentEnd = current.map((edition) => edition.validUntil).sort().at(-1)!;
      const nextStart = upcoming.map((edition) => edition.validFrom).sort()[0];
      const gapDays = Math.round((Date.parse(`${nextStart}T12:00:00Z`) - Date.parse(`${currentEnd}T12:00:00Z`)) / 86400000) - 1;
      if (Number.isFinite(gapDays) && gapDays > 0)
        issue("PUBLICATION_GAP", "error", `There is a ${gapDays}-day gap between current and next publication`);
    }
    if (current.length && !upcoming.length) {
      const endDates = current.map((edition) => edition.validUntil).sort();
      const currentEnd = endDates[endDates.length - 1];
      const daysUntilEnd = daysUntilCurrentEnd;
      if (daysUntilEnd !== null && daysUntilEnd <= 1)
        issue("NEXT_PUBLICATION_MISSING", "warning", "Current publication ends within one day and no upcoming publication is staged");
    }
    for (const edition of current) {
      if (edition.quality.severity === "error") issue("PUBLICATION_DATA_ERROR", "error", `Critical offer data in ${edition.publicationId}`);
      else if (edition.quality.severity === "warning") issue("PUBLICATION_METADATA_WARNING", "warning", `Incomplete offer metadata in ${edition.publicationId}`);
    }
    const status = issues.some((entry) => entry.severity === "error") ? "error" :
      issues.length ? "warning" : "ok";
    const currentQuality = {
      missingNames: current.reduce((n, e) => n + e.quality.missingNames.count, 0),
      missingImages: current.reduce((n, e) => n + e.quality.missingImages.count, 0),
      missingCategories: current.reduce((n, e) => n + e.quality.missingCategories.count, 0),
      mismatchedValidity: current.reduce((n, e) => n + e.quality.mismatchedValidity.count, 0),
      duplicates: current.reduce((n, e) => n + e.quality.duplicates.count, 0),
      invalidPrices: current.reduce((n, e) => n + e.quality.invalidPrices.count, 0),
    };
    const latestRunAgeMinutes = latestRun ? Math.max(0, Math.round(
      (Date.now() - Date.parse(String(latestRun.checked_at))) / 60000,
    )) : null;
    const summary = {
      status,
      latestRunAt: latestRun?.checked_at ?? null,
      latestRunAgeMinutes: Number.isFinite(latestRunAgeMinutes) ? latestRunAgeMinutes : null,
      latestRunSucceeded: latestRun?.ok ?? null,
      latestRunOfferCount: latestRun?.offer_count ?? null,
      latestRunOutcome: latestRun?.outcome ?? null,
      latestRunSource: latestRun?.source ?? null,
      previousSuccessfulOfferCount: previousCount,
      sourceDropPercent,
      effectiveEditionCount: effectiveEditions.length,
      currentEditionCount: current.length,
      upcomingEditionCount: upcoming.length,
      nextValidFrom: upcoming.map((edition) => edition.validFrom).sort()[0] ?? null,
      currentValidUntil: current.map((edition) => edition.validUntil).sort().at(-1) ?? null,
      daysUntilCurrentEnd,
      currentOfferCount: current.reduce((total, edition) => total + edition.quality.count, 0),
      currentQuality,
      errorCount: issues.filter((entry) => entry.severity === "error").length,
      warningCount: issues.filter((entry) => entry.severity === "warning").length,
      issueCodes: issues.map((entry) => entry.code),
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

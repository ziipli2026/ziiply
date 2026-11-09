import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { warmKCitymarketOfferCache, persistKCitymarketOfferPublication, getNextKCitymarketPeriod } from "@/app/components/ziiply/offerSearch/providers/kCitymarketProvider";
import { readActivePublicationOffers, readPublicationCandidate } from "@/app/components/ziiply/offerSearch/publicationStore";
import { recordPublicationRun } from "@/app/components/ziiply/offerSearch/publicationRunLog";
import { inspectCitymarketOffers } from "@/app/components/ziiply/offerSearch/citymarketQuality";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const manualSecret = process.env.KCITYMARKET_MANUAL_SECRET;
  const authorization = request.headers.get("authorization");
  const authorized = (Boolean(secret) && authorization === `Bearer ${secret}`) ||
    (Boolean(manualSecret) && authorization === `Bearer ${manualSecret}`);
  if (!secret && !manualSecret) {
    return NextResponse.json({ ok: false, error: "Cron unavailable" }, { status: 503 });
  }
  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  try {
    const result = await warmKCitymarketOfferCache(startedAt, "active");
    if (result.active) {
      try {
        await persistKCitymarketOfferPublication(startedAt);
      } catch (error) {
        result.errors.push("active snapshot: " + (error instanceof Error ? error.message : String(error)));
      }
    }
    // A missing approved publication is a release-blocking condition, not
    // an empty but healthy cache. Keep the database error visible in the
    // diagnostics instead of silently converting it to an empty array.
    let activeOffers: Record<string,unknown>[] = [];
    try {
      activeOffers = await readActivePublicationOffers<Record<string,unknown>>("K-Citymarket",startedAt);
    } catch (error) {
      result.errors.push("approved snapshot read: " + (error instanceof Error ? error.message : String(error)));
    }
    // Diagnose the staged edition separately. A candidate must never be
    // counted as an approved consumer publication.
    const candidateId = result.active?.period ? result.active.period + "-printed-transactions-v165" : null;
    let candidateQuality: ReturnType<typeof inspectCitymarketOffers> | null = null;
    if (candidateId) {
      try {
        const candidate = await readPublicationCandidate<Record<string,unknown>>("K-Citymarket", candidateId);
        if (candidate) candidateQuality = inspectCitymarketOffers(candidate.offers);
      } catch (error) {
        result.errors.push("candidate snapshot read: " + (error instanceof Error ? error.message : String(error)));
      }
    }
    const activeQuality = inspectCitymarketOffers(activeOffers);
    const activeImages = {total:activeQuality.total,withImage:activeQuality.total-activeQuality.missingImages,missingImage:activeQuality.missingImages};
    // On Wednesday the publisher can roll the AV entry forward while its approved snapshot is still valid.
    const next = getNextKCitymarketPeriod(startedAt);
    const oldAvRolledForward = next?.kind === "LV" && !result.active && activeQuality.total > 0
      && result.errors.length === 1 && /_\d+LV_KCM\/index\.html.*does not match requested/.test(result.errors[0]);
    const activeOk = Boolean(result.active) || oldAvRolledForward;
    const nextAttempted = false;
    const nextOk = true;
    const ok = activeOk && !activeQuality.blocking && (oldAvRolledForward || result.errors.length === 0);
    // Audit selected-store campaigns independently of the national leaflet.
    // The leaflet's success must not turn the local-campaign status green.
    if (process.env.DATABASE_URL) {
      try {
        const sql = neon(process.env.DATABASE_URL);
        const rows = await sql`SELECT store_key, offers FROM public.ziiply_kcitymarket_tjek_snapshots
          WHERE store_key IN ('k-ruoka k citymarket hyvinkaa', 'k citymarket hyvinkaa')`;
        const activeCount = (key: string, storeId: string, scope: string) => {
          const offers = rows.find(row => row.store_key === key)?.offers;
          if (!Array.isArray(offers)) return 0;
          return (offers as Record<string, unknown>[]).filter(row =>
            row.storeId === storeId
            && ((row.debug as Record<string, unknown> | undefined)?.sourceScope ?? row.sourceScope) === scope
            && Date.parse(String(row.validFrom ?? "")) <= startedAt.getTime()
            && Date.parse(String(row.validUntil ?? "")) >= startedAt.getTime()
          ).length;
        };
        const verifiedKruokaRows = activeCount("k-ruoka k citymarket hyvinkaa", "N183", "SELECTED_STORE_WEB_OFFERS");
        const tjekRows = activeCount("k citymarket hyvinkaa", "fe95rtb", "SELECTED_STORE_PUBLICATION");
        const count = verifiedKruokaRows || tjekRows;
        await recordPublicationRun({
          chain: "K", source: "k-citymarket-local-benefits", ok: count > 0, count,
          outcome: verifiedKruokaRows > 0 ? "verified-store-campaigns-active"
            : tjekRows > 0 ? "selected-store-publication-active" : "verified-store-campaigns-expired-or-missing",
          details: { storeId: "N183", verifiedKruokaRows, tjekRows,
            source: verifiedKruokaRows > 0 ? "K-Ruoka selected store snapshot" : tjekRows > 0 ? "Tjek selected store publication" : "No active selected store snapshot" },
        });
      } catch (error) {
        await recordPublicationRun({chain:"K",source:"k-citymarket-local-benefits",ok:false,count:0,
          outcome:"store-campaign-audit-error",details:{error:String(error)}}).catch(()=>undefined);
      }
    }
    await recordPublicationRun({ chain: "K", source: "k-citymarket-cache", ok, count: result.active?.offers ?? 0, outcome: ok ? "active-cache-ok" : "cache-warm-partial-or-failed", details: { activeImages, activeQuality, candidateId, candidateQuality, active: result.active, next: result.next, errors: result.errors.slice(0, 10), activeOk, nextAttempted, nextOk } }).catch(() => undefined);

    return NextResponse.json(
      { ok, activeOk, nextAttempted, nextOk, startedAt: startedAt.toISOString(), activeImages, activeQuality, candidateId, candidateQuality, ...result },
      { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordPublicationRun({ chain: "K", source: "k-citymarket-cache", ok: false, count: 0, outcome: "cache-cron-error", details: { error: message, startedAt: startedAt.toISOString() } }).catch(() => undefined);
    return NextResponse.json(
      { ok: false, error: message, startedAt: startedAt.toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

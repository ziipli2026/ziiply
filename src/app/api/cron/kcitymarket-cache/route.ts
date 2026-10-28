import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { warmKCitymarketOfferCache, persistKCitymarketOfferPublication, getNextKCitymarketPeriod } from "@/app/components/ziiply/offerSearch/providers/kCitymarketProvider";
import { readActivePublicationOffers } from "@/app/components/ziiply/offerSearch/publicationStore";
import { recordPublicationRun } from "@/app/components/ziiply/offerSearch/publicationRunLog";
import { recordCitymarketPreflight } from "@/app/components/ziiply/offerSearch/citymarketPreflight";

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
  const preflightPeriod = getNextKCitymarketPeriod(startedAt);
  try {
    const result = await warmKCitymarketOfferCache(startedAt);
    // Publish a durable snapshot only after the current leaflet has parsed successfully.
    // A failure keeps the previous approved edition untouched.
    // Persist both the active leaflet and the verified upcoming leaflet in
    // parallel. A failed upcoming parse is never published as a substitute.
    const nextPeriod = result.next ? getNextKCitymarketPeriod(startedAt) : null;
    const snapshots = [
      ...(result.active ? [{ label: "active", period: undefined }] : []),
      ...(nextPeriod ? [{ label: "next", period: nextPeriod }] : []),
    ];
    await Promise.all(snapshots.map(async ({ label, period }) => {
      try {
        await persistKCitymarketOfferPublication(startedAt, period);
      } catch (error) {
        result.errors.push(label + " snapshot: " + (error instanceof Error ? error.message : String(error)));
      }
    }));
    // Record the upcoming edition separately, including a failed first parser attempt.
    // A green active edition must never hide a blocked advance check.
    const preflight = preflightPeriod ? await recordCitymarketPreflight({
      period:preflightPeriod.key,startedAt:startedAt.toISOString(),parsed:result.next,errors:result.errors,
    }) : null;
    const activeImages = await readActivePublicationOffers<{imageUrl?:string}>("K-Citymarket",startedAt).then(rows=>({total:rows.length,withImage:rows.filter(row=>Boolean(row.imageUrl)).length,missingImage:rows.filter(row=>!row.imageUrl).length})).catch(error=>({error:String(error)}));
    // A successful active leaflet must not mask a failed next-period warm-up.
    // warmKCitymarketOfferCache records failures for both attempted periods.
    // The publisher's AV landing page may already redirect to Thursday LV on
    // Wednesday afternoon. Keep the approved AV snapshot in use until midnight;
    // its missing historical source must not block a verified upcoming LV.
    const helsinki = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Helsinki", weekday: "short", hour: "numeric", hourCycle: "h23",
    }).formatToParts(startedAt);
    const weekday = helsinki.find(part => part.type === "weekday")?.value;
    const hour = Number(helsinki.find(part => part.type === "hour")?.value);
    const oldAvRolledForward = weekday === "Wed" && hour >= 15
      && Boolean(result.next) && !result.active
      && result.errors.length === 1
      && result.errors[0].startsWith("active ")
      && /_[0-9]+LV_KCM\/index\.html/.test(result.errors[0])
      && result.errors[0].includes("does not match requested");
    const storedActiveOk = !("error" in activeImages) && activeImages.total > 0;
    const activeOk = Boolean(result.active) || Boolean(oldAvRolledForward && storedActiveOk);
    const nextAttempted = result.next !== null || result.errors.some((error) => error.startsWith("next "));
    const nextOk = !nextAttempted || Boolean(result.next);
    const blockingErrors = oldAvRolledForward ? [] : result.errors;
    const ok = activeOk && nextOk && blockingErrors.length === 0 && preflight?.ok !== false;
    // Audit selected-store campaigns independently of the national leaflet.
    // The leaflet's success must not turn the local-campaign status green.
    if (process.env.DATABASE_URL) {
      try {
        const sql = neon(process.env.DATABASE_URL);
        const rows = await sql`SELECT offers FROM public.ziiply_kcitymarket_tjek_snapshots WHERE store_key = 'k-ruoka k citymarket hyvinkaa' ORDER BY updated_at DESC LIMIT 1`;
        const offers = Array.isArray(rows[0]?.offers) ? rows[0].offers as Record<string,unknown>[] : [];
        const active = offers.filter(row => row.storeId === "N183"
          && (row.sourceScope === "SELECTED_STORE_WEB_OFFERS" || (row.debug as Record<string,unknown> | undefined)?.sourceScope === "SELECTED_STORE_WEB_OFFERS")
          && Number.isFinite(Date.parse(String(row.validFrom ?? "")))
          && Date.parse(String(row.validFrom)) <= startedAt.getTime()
          && Date.parse(String(row.validUntil ?? "")) >= startedAt.getTime());
        await recordPublicationRun({chain:"K",source:"k-citymarket-local-benefits",ok:active.length>0,count:active.length,
          outcome:active.length>0?"verified-store-campaigns-active":"verified-store-campaigns-expired-or-missing",
          details:{storeId:"N183",storedRows:offers.length,source:"K-Ruoka selected store snapshot"}});
      } catch (error) {
        await recordPublicationRun({chain:"K",source:"k-citymarket-local-benefits",ok:false,count:0,
          outcome:"store-campaign-audit-error",details:{error:String(error)}}).catch(()=>undefined);
      }
    }
    await recordPublicationRun({ chain: "K", source: "k-citymarket-cache", ok, count: result.active?.offers ?? 0, outcome: ok ? (nextAttempted ? "active-and-next-cache-ok" : "active-cache-ok") : "cache-warm-partial-or-failed", details: { activeImages, active: result.active, next: result.next, errors: result.errors.slice(0, 10), activeOk, nextAttempted, nextOk } }).catch(() => undefined);

    return NextResponse.json(
      { ok, activeOk, nextAttempted, nextOk, preflight, startedAt: startedAt.toISOString(), activeImages, ...result },
      { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if(preflightPeriod) await recordPublicationRun({chain:"K-Citymarket",source:"k-citymarket-preflight",
      ok:false,count:0,outcome:"preflight-check-error",details:{period:preflightPeriod.key,
        parserStartedAt:startedAt.toISOString(),errors:[message],pdfReview:"pending"}}).catch(()=>undefined);
    await recordPublicationRun({ chain: "K", source: "k-citymarket-cache", ok: false, count: 0, outcome: "cache-cron-error", details: { error: message, startedAt: startedAt.toISOString() } }).catch(() => undefined);
    return NextResponse.json(
      { ok: false, error: message, startedAt: startedAt.toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

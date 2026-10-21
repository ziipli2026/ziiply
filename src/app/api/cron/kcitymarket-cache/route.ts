import { NextResponse } from "next/server";
import { warmKCitymarketOfferCache, persistKCitymarketOfferPublication, getNextKCitymarketPeriod } from "@/app/components/ziiply/offerSearch/providers/kCitymarketProvider";
import { readActivePublicationOffers } from "@/app/components/ziiply/offerSearch/publicationStore";
import { recordPublicationRun } from "@/app/components/ziiply/offerSearch/publicationRunLog";
import { recordCitymarketPreflight } from "@/app/components/ziiply/offerSearch/citymarketPreflight";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Cron unavailable" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
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
    const activeOk = Boolean(result.active);
    const nextAttempted = result.next !== null || result.errors.some((error) => error.startsWith("next "));
    const nextOk = !nextAttempted || Boolean(result.next);
    const ok = activeOk && nextOk && result.errors.length === 0 && preflight?.ok !== false;
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

import { NextResponse } from "next/server";
import { readActivePublicationOffers } from "@/app/components/ziiply/offerSearch/publicationStore";
import { recordPublicationRun } from "@/app/components/ziiply/offerSearch/publicationRunLog";

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
  try {
    // Desktop preview consumes the same approved Neon snapshot as mobile main.\n    // Never reparse or overwrite the shared publication with an older desktop parser.\n    const offers = await readActivePublicationOffers("K-Citymarket");\n    const result = { active: offers.length ? { period: "approved-neon", offers: offers.length, cachedAt: startedAt.toISOString() } : null, next: null, errors: offers.length ? [] : ["approved Citymarket snapshot missing"] };
    // A successful active leaflet must not mask a failed next-period warm-up.
    // warmKCitymarketOfferCache records failures for both attempted periods.
    const activeOk = Boolean(result.active);
    const nextAttempted = result.next !== null || result.errors.some((error) => error.startsWith("next "));
    const nextOk = !nextAttempted || Boolean(result.next);
    const ok = activeOk && nextOk && result.errors.length === 0;
    await recordPublicationRun({ chain: "K", source: "k-citymarket-cache", ok, count: result.active?.offers ?? 0, outcome: ok ? (nextAttempted ? "active-and-next-cache-ok" : "active-cache-ok") : "cache-warm-partial-or-failed", details: { active: result.active, next: result.next, errors: result.errors.slice(0, 10), activeOk, nextAttempted, nextOk } }).catch(() => undefined);

    return NextResponse.json(
      { ok, activeOk, nextAttempted, nextOk, startedAt: startedAt.toISOString(), ...result },
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

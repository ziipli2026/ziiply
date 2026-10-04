import { NextResponse } from "next/server";
import { warmKCitymarketOfferCache } from "@/app/components/ziiply/offerSearch/providers/kCitymarketProvider";

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
  const result = await warmKCitymarketOfferCache(startedAt);
  // A successful active leaflet must not mask a failed next-period warm-up.
  // warmKCitymarketOfferCache records failures for both attempted periods.
  const activeOk = Boolean(result.active);
  const nextAttempted = result.next !== null || result.errors.some((error) => error.startsWith("next "));
  const nextOk = !nextAttempted || Boolean(result.next);
  const ok = activeOk && nextOk && result.errors.length === 0;

  return NextResponse.json(
    { ok, activeOk, nextAttempted, nextOk, startedAt: startedAt.toISOString(), ...result },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

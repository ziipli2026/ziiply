import { NextResponse } from "next/server";
import { warmKCitymarketOfferCache } from "@/app/components/ziiply/offerSearch/providers/kCitymarketProvider";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  const result = await warmKCitymarketOfferCache(startedAt);
  const ok = result.errors.length === 0 || Boolean(result.active) || Boolean(result.next);

  return NextResponse.json(
    { ok, startedAt: startedAt.toISOString(), ...result },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

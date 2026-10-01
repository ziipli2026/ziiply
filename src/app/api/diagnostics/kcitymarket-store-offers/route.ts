import { NextRequest, NextResponse } from "next/server";
import { probeKCitymarketStoreOffers } from "../../../components/ziiply/offerSearch/providers/kCitymarketStoreOffersProvider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Private research endpoint. No arbitrary URL/store input or public offer output.
 * The existing CRON_SECRET is reused; do not create an unauthenticated debug API.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const result = await probeKCitymarketStoreOffers({
    storeId: "k-citymarket-hyvinkaa",
    endpoint: "https://www.k-ruoka.fi/kauppa/k-citymarket-hyvinkaa",
  });
  return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "private, no-store" } });
}

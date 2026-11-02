import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  for (const url of [
    "https://api.porssisahko.net/v1/latest-prices.json",
    "https://api.porssisahko.net/v2/latest-prices.json",
  ]) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(6500),
        headers: { accept: "application/json" },
      });
      if (!response.ok) continue;
      const data = await response.json();
      const prices = Array.isArray(data?.prices) ? data.prices : Array.isArray(data) ? data : [];
      if (prices.length) {
        return NextResponse.json({ prices }, { headers: { "Cache-Control": "no-store" } });
      }
    } catch {
      // Continue with the backup provider endpoint.
    }
  }
  return NextResponse.json({ prices: [] }, { status: 502, headers: { "Cache-Control": "no-store" } });
}

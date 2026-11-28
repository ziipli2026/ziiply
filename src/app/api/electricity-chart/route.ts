import { NextResponse } from "next/server";
import { GET as getQuarterHourPrices } from "../desktop-electricity/route";

export const dynamic = "force-dynamic";

const QUARTER_MS = 15 * 60 * 1000;

export async function GET() {
  const response = await getQuarterHourPrices();
  const { prices } = await response.json() as {
    prices: Array<{ startDate: string; price: number }>;
  };
  const now = Date.now();
  const currentQuarter = Math.floor(now / QUARTER_MS) * QUARTER_MS;
  const rows = prices
    .map(({ startDate, price }) => ({ time: Date.parse(startDate), price }))
    .filter(({ time }) => time >= currentQuarter && time < currentQuarter + 96 * QUARTER_MS);

  if (!response.ok || rows[0]?.time !== currentQuarter) {
    return NextResponse.json({ rows: [], error: "Kuluvan vartin hintaa ei saatu." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return NextResponse.json({ rows }, { headers: { "Cache-Control": "no-store" } });
}

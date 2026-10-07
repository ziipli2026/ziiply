import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch("https://api.porssisahko.net/v1/latest-prices.json", { cache: "no-store" });
    if (!response.ok) return NextResponse.json({ prices: [] }, { status: 502 });
    const data = await response.json();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ prices: [] }, { status: 502 });
  }
}

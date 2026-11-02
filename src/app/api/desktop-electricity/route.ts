import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Explicit quarter-hour prices. The legacy porssisahko v1 endpoint can return
  // 60-minute average prices, which must never be displayed as 15-minute prices.
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  try {
    const url = "https://www.sahkohinta-api.fi/api/vartti/v1/halpa?vartit=96&tulos=haja&aikaraja=" + today;
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Invalid quarter-hour response");
    const prices = data.flatMap((row: any) => {
      const start = Date.parse(String(row?.aikaleima_utc ?? "") + "Z");
      const price = Number(String(row?.hinta ?? "").replace(",", "."));
      if (!Number.isFinite(start) || !Number.isFinite(price)) return [];
      return [{ startDate: new Date(start).toISOString(), endDate: new Date(start + 900000).toISOString(), price }];
    });
    if (!prices.some((row: any) => Date.parse(row.startDate) <= Date.now() && Date.now() < Date.parse(row.endDate))) {
      throw new Error("Current quarter missing");
    }
    return NextResponse.json({ prices }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ prices: [], error: "Quarter-hour prices unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Actual 15-minute day-ahead prices for Finland. Provider prices exclude VAT.
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
      const utc = String(row?.aikaleima_utc ?? "");
      const start = Date.parse(utc.endsWith("Z") ? utc : utc + "Z");
      const excludingVat = Number(String(row?.hinta ?? "").replace(",", "."));
      if (!Number.isFinite(start) || !Number.isFinite(excludingVat)) return [];
      return [{
        startDate: new Date(start).toISOString(),
        endDate: new Date(start + 900000).toISOString(),
        price: excludingVat * 1.255,
      }];
    });
    if (!prices.some((row: any) => Date.parse(row.startDate) <= Date.now() && Date.now() < Date.parse(row.endDate))) {
      throw new Error("Current quarter missing");
    }
    return NextResponse.json({ prices }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ prices: [], error: "Quarter-hour prices unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

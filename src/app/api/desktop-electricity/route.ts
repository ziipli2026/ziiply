import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Price = { startDate: string; endDate: string; price: number };
let lastGoodPrices: Price[] = [];
let lastSuccessfulFetch = 0;
const FIFTEEN_MINUTES = 15 * 60 * 1000;
const REFRESH_INTERVAL = 5 * 60 * 1000;

function localDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

async function loadPrices(date: string): Promise<Price[]> {
  const url = `https://www.sahkohinta-api.fi/api/vartti/v1/halpa?vartit=96&tulos=haja&aikaraja=${date}`;
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Electricity provider HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error("Invalid quarter-hour response");
  const prices: Price[] = data.flatMap((row: any) => {
    const utc = String(row?.aikaleima_utc ?? "");
    const start = Date.parse(utc.endsWith("Z") ? utc : utc + "Z");
    const excludingVat = Number(String(row?.hinta ?? "").replace(",", "."));
    if (!Number.isFinite(start) || !Number.isFinite(excludingVat)) return [];
    return [{
      startDate: new Date(start).toISOString(),
      endDate: new Date(start + FIFTEEN_MINUTES).toISOString(),
      price: excludingVat * 1.255,
    }];
  });
  if (!prices.length) throw new Error("Empty quarter-hour response");
  return prices;
}

export async function GET() {
  const now = Date.now();
  const currentQuarter = (prices: Price[]) => prices.some(
    (p) => Date.parse(p.startDate) <= now && now < Date.parse(p.endDate),
  );
  if (lastGoodPrices.length && currentQuarter(lastGoodPrices) && now - lastSuccessfulFetch < REFRESH_INTERVAL) {
    return NextResponse.json({ prices: lastGoodPrices }, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const today = localDate(new Date(now));
    // Fetch both sides of midnight; next day's published quarters must remain available.
    const tomorrow = localDate(new Date(now + 24 * 60 * 60 * 1000));
    const results = await Promise.allSettled([loadPrices(today), loadPrices(tomorrow)]);
    const fetched = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    if (!fetched.length) throw new Error("No electricity prices fetched");
    const combined = new Map(lastGoodPrices.map((p) => [p.startDate, p]));
    for (const price of fetched) combined.set(price.startDate, price);
    const merged = [...combined.values()].filter((p) => Date.parse(p.endDate) > now - 24 * 60 * 60 * 1000)
      .sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
    if (!currentQuarter(merged)) throw new Error("Current quarter missing");
    lastGoodPrices = merged;
    lastSuccessfulFetch = now;
    return NextResponse.json({ prices: merged }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Never replace successfully loaded quarter-hour prices with an empty response.
    if (currentQuarter(lastGoodPrices)) {
      return NextResponse.json({ prices: lastGoodPrices, stale: true }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ prices: [], error: "Current quarter-hour price unavailable" }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}

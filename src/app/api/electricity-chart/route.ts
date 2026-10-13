import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PriceRow = { time: number; price: number };

function numberValue(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseRows(data: any): PriceRow[] {
  const items = Array.isArray(data?.prices) ? data.prices : Array.isArray(data) ? data : [];
  const now = Date.now();
  const rows = items.flatMap((item: any) => {
    const time = Date.parse(String(item.startDate ?? item.start ?? item.StartDate ?? item.time_start ?? item.date ?? ""));
    const cents = numberValue(item.price ?? item.value ?? item.priceWithTax ?? item.PriceWithTax ?? item.centsPerKwh);
    const euros = numberValue(item.EUR_per_kWh ?? item.eur_per_kwh);
    const price = cents ?? (euros == null ? null : euros * 100);
    if (!Number.isFinite(time) || price == null || Math.abs(price) > 500 || time < now - 3600000 || time >= now + 86400000) return [];
    return [{ time, price }];
  });
  return rows.sort((a, b) => a.time - b.time).slice(0, 96);
}

export async function GET() {
  const now = Date.now();
  const sources = [
    "https://api.porssisahko.net/v1/latest-prices.json",
    "https://api.porssisahko.net/v2/latest-prices.json",
    `https://sahkotin.fi/prices?quarter&fix&vat&start=${encodeURIComponent(new Date(now - 3600000).toISOString())}&end=${encodeURIComponent(new Date(now + 86400000).toISOString())}`,
  ];
  for (const url of sources) {
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6500), headers: { accept: "application/json" } });
      if (!response.ok) continue;
      const rows = parseRows(await response.json());
      if (rows.length) return NextResponse.json({ rows }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300" } });
    } catch {
      // Try next provider.
    }
  }
  return NextResponse.json({ rows: [], error: "Hintatietoja ei saatu sähkörajapinnoista." }, { status: 503 });
}

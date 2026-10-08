import { NextRequest, NextResponse } from "next/server";

/**
 * Tankkaus.com-specific read-only server integration.
 * Source contract: mobile-external.md (2026-10-02).
 * Never expose TANKKAUS_API_TOKEN or call Tankkaus.com from the browser.
 */
const BASE = "https://api.tankkaus.com/mobile";
const FUEL_IDS: Record<string, number> = { "95": 1, "95e10": 1, "98": 2, "98e5": 2, diesel: 6 };
type Station = { id: number; name: string; latitude: number | null; longitude: number | null; distanceKm: number | null; chain: string | null; address: string | null };
type Observation = { stationId: number; fuel: string; price: number; observedAt: string; station: Station };
const asNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const stationOf = (v: any): Station | null => {
  const id = asNumber(v?.id);
  if (id === null || !Number.isInteger(id) || id <= 0) return null;
  return { id, name: String(v?.name ?? ""), latitude: asNumber(v?.latitude), longitude: asNumber(v?.longitude), distanceKm: asNumber(v?.distance), chain: v?.chain?.name ? String(v.chain.name) : null, address: v?.address ? String(v.address) : null };
};
async function tankkaus(path: string, token: string) {
  const response = await fetch(BASE + path, {
    headers: { Accept: "application/json", Authorization: `Token ${token}` },
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`Tankkaus HTTP ${response.status}`);
  return response.json();
}
export async function GET(req: NextRequest) {
  const token = process.env.TANKKAUS_API_TOKEN?.trim();
  if (!token) return NextResponse.json({ ok: false, error: "Tankkaus not configured" }, { status: 503 });
  const params = req.nextUrl.searchParams;
  const latRaw = params.get("lat"), lonRaw = params.get("lon");
  const lat = asNumber(latRaw), lon = asNumber(lonRaw);
  if (!latRaw || !lonRaw || lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180)
    return NextResponse.json({ ok: false, error: "Valid coordinates required" }, { status: 400 });
  const fuel = (params.get("fuel") ?? "diesel").toLowerCase().replace(/\s/g, "");
  const fuelId = FUEL_IDS[fuel];
  if (!fuelId) return NextResponse.json({ ok: false, error: "Unsupported fuel type" }, { status: 400 });
  try {
    const coords = `${lat}/${lon}`;
    const [stationsData, pricesData] = await Promise.all([
      tankkaus(`/stations/stations-near/${coords}`, token),
      tankkaus(`/fills/home/${coords}`, token),
    ]);
    const stations = (Array.isArray(stationsData?.stations) ? stationsData.stations : [])
      .map(stationOf).filter((s: Station | null): s is Station => s !== null);
    const stationById = new Map<number, Station>(stations.map((s: Station) => [s.id, s]));
    const key = fuelId === 1 ? "fills95" : fuelId === 2 ? "fills98" : "fillsDiesel";
    const observations: Observation[] = [];
    for (const item of (Array.isArray(pricesData?.[key]) ? pricesData[key] : [])) {
      if (Number(item?.fuel_type_id) !== fuelId) continue;
      const id = asNumber(item?.station_id);
      const station = id !== null ? stationById.get(id) : undefined;
      const price = asNumber(item?.price_liter);
      if (!station || price === null || price <= 0 || price > 5 || !item?.created) continue;
      observations.push({ stationId: station.id, fuel, price, observedAt: String(item.created), station });
    }
    // Latest observation per station; the API may return repeated observations.
    observations.sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
    const seen = new Set<number>();
    const latest = observations.filter(o => !seen.has(o.stationId) && (seen.add(o.stationId), true));
    latest.sort((a, b) => (a.station.distanceKm ?? Infinity) - (b.station.distanceKm ?? Infinity));
    return NextResponse.json({ ok: true, source: "Tankkaus.com", fuel, stations, observations: latest, fetchedAt: new Date().toISOString(), note: "User-submitted observations, not guaranteed pump prices" }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upstream error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";

/**
 * Tankkaus.com-specific read-only server integration.
 * Source contract: mobile-external.md (2026-10-02).
 * Never expose TANKKAUS_API_TOKEN or call Tankkaus.com from the browser.
 */
const BASE = "https://api.tankkaus.com/mobile";
const FUEL_KEYS: Record<string, string> = { "95": "fills95", "95e10": "fills95", "98": "fills98", "98e5": "fills98", diesel: "fillsDiesel" };
type Station = { id: number; name: string; latitude: number | null; longitude: number | null; distanceKm: number | null; chain: string | null; address: string | null };
type Observation = { stationId: number; fuel: string; price: number; observedAt: string; station: Station };
const asNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return null;
  if (typeof v !== "number" && typeof v !== "string") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const distanceKmBetween = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
};
const stationOf = (v: any): Station | null => {
  const id = asNumber(v?.id ?? v?.station_id);
  if (id === null || !Number.isSafeInteger(id) || id <= 0) return null;
  return { id, name: String(v?.name ?? ""), latitude: asNumber(v?.latitude ?? v?.lat), longitude: asNumber(v?.longitude ?? v?.lon), distanceKm: asNumber(v?.distance ?? v?.distanceKm), chain: v?.chain?.name ? String(v.chain.name) : (typeof v?.chain === "string" ? v.chain : null), address: v?.address ? String(v.address) : null };
};
async function tankkaus(path: string, token: string) {
  const response = await fetch(BASE + path, {
    headers: { Accept: "application/json", Authorization: `Token ${token}` },
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`Tankkaus HTTP ${response.status}`);
  const data: unknown = await response.json();
  return data;
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
  const fuelConfig = Object.prototype.hasOwnProperty.call(FUEL_KEYS, fuel) ? FUEL_KEYS[fuel] : undefined;
  if (!fuelConfig) return NextResponse.json({ ok: false, error: "Unsupported fuel type" }, { status: 400 });
  try {
    const coords = `${lat}/${lon}`;
    const [stationsData, pricesData] = await Promise.all([
      tankkaus(`/stations/stations-near/${coords}`, token),
      tankkaus(`/fills/home/${coords}`, token),
    ]);
    const stationPayload = stationsData as any;
    const pricePayload = pricesData as any;
    const stationRows = Array.isArray(stationPayload) ? stationPayload : stationPayload?.stations;
    if (!Array.isArray(stationRows)) throw new Error("Tankkaus response missing expected stations array");
    // Derive distance from coordinates rather than trusting an undocumented upstream unit.
    // Exclude stations without usable coordinates; otherwise the 10 km claim cannot be enforced.
    const stations: Station[] = stationRows
      .map(stationOf).filter((s: Station | null): s is Station => s !== null)
      .filter((s: Station) => s.latitude !== null && s.longitude !== null && s.latitude >= -90 && s.latitude <= 90 && s.longitude >= -180 && s.longitude <= 180)
      .map((s: Station) => ({ ...s, distanceKm: distanceKmBetween(lat, lon, s.latitude!, s.longitude!) }))
      .filter((s: Station) => s.distanceKm !== null && s.distanceKm <= 10);
    // Do not accept duplicate station IDs with conflicting coordinates in one provider response.
    const stationById = new Map<number, Station>();
    for (const station of stations) {
      const existing = stationById.get(station.id);
      if (existing && (existing.latitude !== station.latitude || existing.longitude !== station.longitude)) {
        throw new Error("Tankkaus response has conflicting station coordinates");
      }
      stationById.set(station.id, station);
    }
    if (!Array.isArray(pricePayload?.[fuelConfig])) throw new Error("Tankkaus response missing expected fuel observations array");
    const observations: Observation[] = [];
    for (const item of pricePayload[fuelConfig]) {
      const id = asNumber(item?.station_id ?? item?.station?.id);
      const station = id !== null ? stationById.get(id) : null;
      const price = asNumber(item?.price_liter);
      if (!station || price === null || price <= 0 || price > 5 || typeof item?.created !== "string") continue;
// A timezone-free timestamp must not be interpreted using the server's local timezone.
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(item.created)) continue;
      observations.push({ stationId: station.id, fuel, price, observedAt: String(item.created), station });
    }
    // Latest observation per station; the API may return repeated observations.
    observations.sort((a, b) => (Date.parse(b.observedAt) || 0) - (Date.parse(a.observedAt) || 0));
    const seen = new Set<number>();
    const maxAgeMs = 5 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const latest = observations.filter(o => {
      const observedMs = Date.parse(o.observedAt);
      if (!Number.isFinite(observedMs) || observedMs > now || now - observedMs > maxAgeMs) return false;
      if (o.station.distanceKm !== null && (o.station.distanceKm < 0 || o.station.distanceKm > 10)) return false;
      if (seen.has(o.stationId)) return false;
      seen.add(o.stationId);
      return true;
    });
    latest.sort((a, b) => (a.station.distanceKm ?? Infinity) - (b.station.distanceKm ?? Infinity));
    const nearest = latest.slice(0, 10);
    return NextResponse.json({ ok: true, source: "Tankkaus.com", fuel, stations, observations: nearest, fetchedAt: new Date().toISOString(), coverage: { radiusKm: 10, observationMaxAgeDays: 5, maxObservationsPerFuel: 10 }, note: "User-submitted observations, not guaranteed pump prices" }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("[tankkaus] upstream request or response validation failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ ok: false, error: "Tankkaus data temporarily unavailable" }, { status: 502 });
  }
}

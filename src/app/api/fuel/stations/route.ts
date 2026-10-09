import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

function distanceKm(a: number, b: number, c: number, d: number) {
  const rad = Math.PI / 180;
  const x = (c - a) * rad;
  const y = (d - b) * rad;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(y / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  if (!req.nextUrl.searchParams.has("lat") || !req.nextUrl.searchParams.has("lon") ||
      !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ ok: false, error: "GPS coordinates required" }, { status: 400 });
  }
  const connection = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connection) return NextResponse.json({ ok: false, error: "Fuel database not configured" }, { status: 503 });
  try {
    const sql = neon(connection);
    const rows = await sql`
      SELECT s.source_station_id, s.name, s.chain, s.address, s.latitude, s.longitude,
        p95.price_eur_per_litre AS price95, p95.observed_at AS observed95,
        p98.price_eur_per_litre AS price98, p98.observed_at AS observed98,
        pd.price_eur_per_litre AS diesel, pd.observed_at AS observed_diesel
      FROM ziiply_fuel_stations s
      LEFT JOIN LATERAL (SELECT price_eur_per_litre, observed_at FROM ziiply_fuel_price_observations p
        WHERE p.source=s.source AND p.source_station_id=s.source_station_id AND p.fuel_type='95'
        ORDER BY observed_at DESC LIMIT 1) p95 ON TRUE
      LEFT JOIN LATERAL (SELECT price_eur_per_litre, observed_at FROM ziiply_fuel_price_observations p
        WHERE p.source=s.source AND p.source_station_id=s.source_station_id AND p.fuel_type='98'
        ORDER BY observed_at DESC LIMIT 1) p98 ON TRUE
      LEFT JOIN LATERAL (SELECT price_eur_per_litre, observed_at FROM ziiply_fuel_price_observations p
        WHERE p.source=s.source AND p.source_station_id=s.source_station_id AND p.fuel_type='diesel'
        ORDER BY observed_at DESC LIMIT 1) pd ON TRUE
      WHERE lower(coalesce(s.chain, '')) NOT LIKE '%teboil%'
        AND lower(coalesce(s.name, '')) NOT LIKE '%teboil%'
    `;
    const stations = rows.filter((r) => !/\bteboil\b/i.test(String(r.chain ?? "") + " " + String(r.name ?? ""))).map((r) => ({
      id: String(r.source_station_id), name: String(r.name), chain: r.chain,
      address: r.address, latitude: Number(r.latitude), longitude: Number(r.longitude),
      distanceKm: distanceKm(lat, lon, Number(r.latitude), Number(r.longitude)),
      diesel: r.diesel == null ? null : Number(r.diesel),
      price95: r.price95 == null ? null : Number(r.price95),
      price98: r.price98 == null ? null : Number(r.price98),
      observedDiesel: r.observed_diesel, observed95: r.observed95, observed98: r.observed98,
    }));
    // Collapse duplicate provider records at response time; keep database IDs and history intact.
    // Prefer the lowest source ID for a stable public station identifier.
    const unique = new Map<string, (typeof stations)[number]>();
    for (const station of stations.sort((a, b) => Number(a.id) - Number(b.id))) {
      const address = String(station.address ?? "").trim().toLowerCase().replace(/\s+/g, " ");
      const chain = String(station.chain ?? "").trim().toLowerCase();
      const key = address && chain ? chain + "|" + address : "id|" + station.id;
      const previous = unique.get(key);
      if (!previous) { unique.set(key, station); continue; }
      for (const [priceKey, dateKey] of [
        ["diesel", "observedDiesel"], ["price95", "observed95"], ["price98", "observed98"],
      ] as const) {
        const candidateTime = Date.parse(String(station[dateKey] ?? "")) || 0;
        const previousTime = Date.parse(String(previous[dateKey] ?? "")) || 0;
        if (station[priceKey] != null && (previous[priceKey] == null || candidateTime > previousTime)) {
          (previous as Record<string, unknown>)[priceKey] = station[priceKey];
          (previous as Record<string, unknown>)[dateKey] = station[dateKey];
        }
      }
    }
    const deduplicated = [...unique.values()].sort((a,b) => a.distanceKm-b.distanceKm);
    return NextResponse.json({ ok: true, stations: deduplicated, source: "Neon / tankkaus.com observations" });
  } catch {
    return NextResponse.json({ ok: false, error: "Fuel stations unavailable" }, { status: 503 });
  }
}

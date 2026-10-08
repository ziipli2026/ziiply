import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Read-only cache endpoint. Requires the database migration and DATABASE_URL.
// A cache miss is not a zero-price observation.
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  const fuelInput = (req.nextUrl.searchParams.get("fuel") ?? "diesel").toLowerCase().replace(/\s/g, "");
  const fuel = ({ "95e10": "95", "98e5": "98" } as Record<string, string>)[fuelInput] ?? fuelInput;
  if (!req.nextUrl.searchParams.has("lat") || !req.nextUrl.searchParams.has("lon") ||
      !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 ||
      !["95", "98", "diesel"].includes(fuel)) {
    return NextResponse.json({ ok: false, error: "Valid coordinates and fuel required" }, { status: 400 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "Fuel cache not configured" }, { status: 503 });
  }
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      WITH nearby AS (
        SELECT s.source_station_id, s.name, s.chain, s.address, s.latitude, s.longitude,
          6371 * 2 * ASIN(LEAST(1, SQRT(
            POWER(SIN(RADIANS((s.latitude - ${lat}) / 2)), 2) +
            COS(RADIANS(${lat})) * COS(RADIANS(s.latitude)) *
            POWER(SIN(RADIANS((s.longitude - ${lon}) / 2)), 2)
          ))) AS distance_km
        FROM ziiply_fuel_stations s WHERE s.source = 'tankkaus.com'
          AND s.latitude BETWEEN ${lat - 0.1} AND ${lat + 0.1}
          AND s.longitude BETWEEN ${lon - 0.2} AND ${lon + 0.2}
      )
      SELECT n.source_station_id AS "stationId", n.name, n.chain, n.address,
        n.latitude, n.longitude, n.distance_km AS "distanceKm",
        o.price_eur_per_litre::float8 AS price, o.observed_at AS "observedAt"
      FROM nearby n
      JOIN LATERAL (
        SELECT price_eur_per_litre, observed_at
        FROM ziiply_fuel_price_observations
        WHERE source = 'tankkaus.com' AND source_station_id = n.source_station_id
          AND fuel_type = ${fuel} AND observed_at >= NOW() - INTERVAL '5 days'
          AND observed_at <= NOW()
        ORDER BY observed_at DESC, ingested_at DESC LIMIT 1
      ) o ON true
      WHERE n.distance_km <= 10
      ORDER BY n.distance_km ASC LIMIT 10
    `;
    return NextResponse.json({
      ok: true, source: "Tankkaus.com", storage: "neon-cache", fuel,
      observations: rows, coverage: { radiusKm: 10, observationMaxAgeDays: 5 },
      note: "User-submitted observations; cached values may differ from pump prices"
    }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Fuel cache unavailable" }, { status: 503 });
  }
}

import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXPECTED_TEST_BRANCH = "br-spring-truth-b137mloi";
const ALLOWED_FUELS = new Set(["95", "98", "diesel", "e85", "fuel_oil"]);

type PriceRow = {
  stationId: string | number;
  station: string;
  chain: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  fuelType: string;
  price: number;
  observedAt: string;
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

function coordinate(value: string | null, min: number, max: number) {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export async function GET(request: NextRequest) {
  // This endpoint is deliberately isolated from production DATABASE_URL.
  if (process.env.TANKKAUS_NEON_READ_ENABLED !== "1") {
    return NextResponse.json({ ok: false, disabled: true }, { status: 503 });
  }

  const databaseUrl = process.env.TANKKAUS_TEST_DATABASE_URL?.trim();
  if (!databaseUrl) {
    return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  }

  const latitude = coordinate(request.nextUrl.searchParams.get("lat"), -90, 90);
  const longitude = coordinate(request.nextUrl.searchParams.get("lon"), -180, 180);
  const fuelType = String(request.nextUrl.searchParams.get("fuel") || "diesel").trim().toLowerCase();

  if (latitude == null || longitude == null) {
    return NextResponse.json({ ok: false, error: "Valid GPS coordinates required" }, { status: 400 });
  }
  if (!ALLOWED_FUELS.has(fuelType)) {
    return NextResponse.json({ ok: false, error: "Unsupported fuel type" }, { status: 400 });
  }

  try {
    const sql = neon(databaseUrl);
    const branchRows = await sql`SELECT current_setting('neon.branch_id', true) AS branch_id`;
    if (branchRows[0]?.branch_id !== EXPECTED_TEST_BRANCH) {
      return NextResponse.json({ ok: false, error: "Test database branch check failed" }, { status: 503 });
    }

    const rows = await sql`
      SELECT
        s.source_station_id AS "stationId",
        s.name AS station,
        s.chain,
        s.address,
        s.latitude::float8 AS latitude,
        s.longitude::float8 AS longitude,
        p.fuel_type AS "fuelType",
        p.price_eur_per_litre::float8 AS price,
        p.observed_at::text AS "observedAt"
      FROM public.ziiply_fuel_stations s
      JOIN LATERAL (
        SELECT o.fuel_type, o.price_eur_per_litre, o.observed_at
        FROM public.ziiply_fuel_price_observations o
        WHERE o.source = s.source
          AND o.source_station_id = s.source_station_id
          AND o.fuel_type = ${fuelType}
          AND o.observed_at <= NOW()
          AND o.observed_at >= NOW() - INTERVAL '7 days'
        ORDER BY o.observed_at DESC, o.ingested_at DESC, o.id DESC
        LIMIT 1
      ) p ON TRUE
      WHERE s.source = 'tankkaus.com'
        AND s.is_traffic_station = TRUE
        AND s.latitude BETWEEN ${latitude - 0.25} AND ${latitude + 0.25}
        AND s.longitude BETWEEN ${longitude - 0.35} AND ${longitude + 0.35}
      ORDER BY
        power(s.latitude - ${latitude}, 2) +
        power((s.longitude - ${longitude}) * cos(radians(${latitude})), 2)
      LIMIT 500
    ` as PriceRow[];

    const candidates = rows
      .map((row) => ({ ...row, distanceKm: haversineKm(latitude, longitude, row.latitude, row.longitude) }))
      .filter((row) => Number.isFinite(row.price) && row.price > 0 && row.price <= 5)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const best = candidates[0];
    if (!best) {
      return NextResponse.json({ ok: false, found: false, reason: "no_fresh_prices" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      source: "tankkaus.com",
      freshness: "fresh",
      item: {
        station: best.station,
        chain: best.chain,
        address: best.address,
        stationId: String(best.stationId),
        price: best.price,
        fuelType: best.fuelType,
        observedAt: best.observedAt,
        latitude: best.latitude,
        longitude: best.longitude,
        distanceKm: Math.round(best.distanceKm * 10) / 10,
      },
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    // Do not expose database URLs, SQL, or connection details in API responses.
    return NextResponse.json({ ok: false, error: "Fuel price lookup failed" }, { status: 500 });
  }
}

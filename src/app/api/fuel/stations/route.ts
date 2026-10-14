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
  const testConnection = process.env.VERCEL_ENV === "preview" ? process.env.TANKKAUS_TEST_DATABASE_URL : undefined;
  const connection = testConnection || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connection) return NextResponse.json({ ok: false, error: "Fuel database not configured" }, { status: 503 });
  try {
    const sql = neon(connection);
    const identity = await sql`SELECT current_setting(\'neon.branch_id\',true) AS branch_id`;
    if (testConnection && identity[0]?.branch_id !== "br-weathered-meadow-b1bwpzst") {
      return NextResponse.json({ ok: false, error: "Fuel preview database does not identify the approved test branch" }, { status: 503 });
    }
    const rows = await sql`
      SELECT s.source_station_id, s.name, s.chain, s.address, s.latitude, s.longitude, s.is_traffic_station, s.traffic_station_verified,
        country.payload->'station'->>'country_id' AS country_id,
        country.payload->'station'->'country'->>'name_short' AS country_code,
        p95.price_eur_per_litre AS price95, p95.observed_at AS observed95,
        p98.price_eur_per_litre AS price98, p98.observed_at AS observed98,
        pd.price_eur_per_litre AS diesel, pd.observed_at AS observed_diesel
      FROM ziiply_fuel_stations s
      LEFT JOIN LATERAL (SELECT payload FROM ziiply_tankkaus_feed_observations raw
        WHERE raw.source_station_id=s.source_station_id ORDER BY observed_at DESC LIMIT 1) country ON TRUE
      LEFT JOIN LATERAL (SELECT price_eur_per_litre, observed_at FROM ziiply_fuel_price_observations p
        WHERE p.source=s.source AND p.source_station_id=s.source_station_id AND p.fuel_type='95'
        UNION ALL
        SELECT raw.price_eur_per_litre, raw.observed_at FROM ziiply_tankkaus_feed_observations raw
        WHERE s.source='tankkaus.com' AND raw.source_station_id=s.source_station_id
          AND raw.fuel_type_id=1 AND raw.price_eur_per_litre > 0 AND raw.price_eur_per_litre <= 5
          AND raw.observed_at <= NOW()
        ORDER BY observed_at DESC LIMIT 1) p95 ON TRUE
      LEFT JOIN LATERAL (SELECT price_eur_per_litre, observed_at FROM ziiply_fuel_price_observations p
        WHERE p.source=s.source AND p.source_station_id=s.source_station_id AND p.fuel_type='98'
        UNION ALL
        SELECT raw.price_eur_per_litre, raw.observed_at FROM ziiply_tankkaus_feed_observations raw
        WHERE s.source='tankkaus.com' AND raw.source_station_id=s.source_station_id
          AND raw.fuel_type_id=2 AND raw.price_eur_per_litre > 0 AND raw.price_eur_per_litre <= 5
          AND raw.observed_at <= NOW()
        ORDER BY observed_at DESC LIMIT 1) p98 ON TRUE
      LEFT JOIN LATERAL (SELECT price_eur_per_litre, observed_at FROM ziiply_fuel_price_observations p
        WHERE p.source=s.source AND p.source_station_id=s.source_station_id AND p.fuel_type='diesel'
        UNION ALL
        SELECT raw.price_eur_per_litre, raw.observed_at FROM ziiply_tankkaus_feed_observations raw
        WHERE s.source='tankkaus.com' AND raw.source_station_id=s.source_station_id
          AND raw.fuel_type_id=6 AND raw.price_eur_per_litre > 0 AND raw.price_eur_per_litre <= 5
          AND raw.observed_at <= NOW()
        ORDER BY observed_at DESC LIMIT 1) pd ON TRUE
      WHERE lower(coalesce(s.chain, '')) NOT LIKE '%teboil%'
        AND lower(coalesce(s.name, '')) NOT LIKE '%teboil%'
        AND s.source_station_id NOT IN (12564,12577,12683,554,3028,398,11828,11829,12579)
    `;
    const stations = rows.filter((r) => {
      // Geographic validity, independent of the user's location: never a search radius.
      if (r.latitude == null || r.longitude == null) return false;
      const latitude = Number(r.latitude), longitude = Number(r.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
          latitude < 59 || latitude > 70.2 || longitude < 19 || longitude > 32) return false;
      const countryCode = String(r.country_code ?? "").toUpperCase();
      if (countryCode && countryCode !== "FI") return false;
      if (r.country_id != null && String(r.country_id) !== "1") return false;
      return !/teboil/i.test(String(r.chain ?? "") + " " + String(r.name ?? ""));
    }).map((r) => ({
      id: String(r.source_station_id), name: String(r.name), chain: r.chain,
      isTrafficStation: r.traffic_station_verified === true && r.is_traffic_station === true,
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
      // Completed classification: a verified traffic record wins over its duplicate.
      previous.isTrafficStation = previous.isTrafficStation || station.isTrafficStation;
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
    // GPS affects sorting only. No radius or movement threshold is applied.
    // Legacy clients receive all stations; pagination is opt-in.
    const pageRaw = req.nextUrl.searchParams.get("page");
    const limitRaw = req.nextUrl.searchParams.get("limit");
    const paginated = pageRaw !== null || limitRaw !== null;
    const page = pageRaw === null ? 1 : Number(pageRaw);
    const limit = limitRaw === null ? 20 : Number(limitRaw);
    if (paginated && (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 200)) {
      return NextResponse.json({ ok: false, error: "Invalid pagination" }, { status: 400 });
    }
    const start = (page - 1) * limit;
    const visible = paginated ? deduplicated.slice(start, start + limit) : deduplicated;
    return NextResponse.json({
      ok: true, stations: visible, total: deduplicated.length,
      ...(paginated ? { page, limit, hasMore: start + limit < deduplicated.length } : {}),
      ...(process.env.VERCEL_ENV === "preview" ? { databaseBranch: identity[0]?.branch_id ?? null } : {}),
      source: "Neon / tankkaus.com observations"
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Fuel stations unavailable" }, { status: 503 });
  }
}

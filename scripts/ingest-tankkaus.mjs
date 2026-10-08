#!/usr/bin/env node
// Explicit, one-shot ingestion. Dry-run by default. Never runs on ordinary page requests.
// Usage: TANKKAUS_INGEST_URL=https://preview.example/api/tankkaus?lat=...\&lon=... node scripts/ingest-tankkaus.mjs
// Write only after verifying live provider shape: DATABASE_URL=... TANKKAUS_INGEST_URL=... node scripts/ingest-tankkaus.mjs --write
const endpoint = process.env.TANKKAUS_INGEST_URL;
const write = process.argv.includes("--write");
if (!endpoint) throw new Error("TANKKAUS_INGEST_URL is required");
const url = new URL(endpoint);
if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("HTTPS endpoint required");
if (url.username || url.password || url.searchParams.has("token") || url.searchParams.has("key")) throw new Error("Do not put credentials in ingestion URL");
if (url.pathname !== "/api/tankkaus") throw new Error("Expected /api/tankkaus endpoint");
if (write && !process.env.DATABASE_URL) throw new Error("DATABASE_URL required for --write");
// An explicit confirmation prevents accidental writes to an unverified database target.
if (write && process.env.TANKKAUS_INGEST_WRITE_CONFIRM !== "YES_TEST_BRANCH") throw new Error("Set TANKKAUS_INGEST_WRITE_CONFIRM=YES_TEST_BRANCH after verifying the Neon test branch target");
const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { Accept: "application/json" } });
if (!response.ok) throw new Error(`Tankkaus endpoint HTTP ${response.status}`);
const payload = await response.json();
if (payload?.ok !== true || payload.source !== "Tankkaus.com" || !Array.isArray(payload.stations) || !Array.isArray(payload.observations)) {
  throw new Error("Unexpected Tankkaus response contract");
}
const stations = new Map();
for (const s of payload.stations) {
  if (!Number.isSafeInteger(s.id) || s.id <= 0 || typeof s.name !== "string" || !s.name.trim() ||
      !Number.isFinite(s.latitude) || Math.abs(s.latitude) > 90 ||
      !Number.isFinite(s.longitude) || Math.abs(s.longitude) > 180) continue;
  stations.set(s.id, s);
}
const fuelTypes = { "95": "95", "95e10": "95", "98": "98", "98e5": "98", diesel: "diesel" };
const fuel = Object.prototype.hasOwnProperty.call(fuelTypes, payload.fuel) ? fuelTypes[payload.fuel] : undefined;
if (!fuel) throw new Error("Unexpected fuel");
if (url.searchParams.has("fuel") && ({ "95e10": "95", "98e5": "98" }[url.searchParams.get("fuel")] ?? url.searchParams.get("fuel")) !== fuel) throw new Error("Fuel mismatch between request and response");
const now = Date.now();
// A successful but empty provider response must not erase cached station or price history.
if (payload.stations.length > 10000 || payload.observations.length > 10000) throw new Error("Unexpectedly large provider response");
const rows = payload.observations.filter(o => {
  if (!o || typeof o !== "object" || typeof o.observedAt !== "string") return false;
  const t = Date.parse(o.observedAt);
  return stations.has(o.stationId) && typeof o.price === "number" && Number.isFinite(o.price) && o.price > 0 && o.price <= 5 &&
    Number.isFinite(t) && t <= now && now - t <= 5 * 86400000;
});
// One provider response may contain duplicate observations. Keep a single canonical row per event.
const uniqueRows = [...new Map(rows.map(o => [`${o.stationId}:${o.observedAt}:${o.price}`, o])).values()];
if (write && (stations.size === 0 || uniqueRows.length === 0)) throw new Error("Refusing empty ingestion write");
if (!write) {
  console.log(JSON.stringify({ mode: "dry-run", stations: stations.size, observations: uniqueRows.length, fuel }));
  process.exit(0);
}
const { neon } = await import("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);
for (const s of stations.values()) {
  await sql`INSERT INTO ziiply_fuel_stations
    (source, source_station_id, name, chain, address, latitude, longitude, last_seen_at, updated_at)
    VALUES ('tankkaus.com', ${s.id}, ${s.name}, ${s.chain ?? null}, ${s.address ?? null}, ${s.latitude}, ${s.longitude}, NOW(), NOW())
    ON CONFLICT (source, source_station_id) DO UPDATE SET
      name=EXCLUDED.name, chain=EXCLUDED.chain, address=EXCLUDED.address,
      latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude,
      last_seen_at=NOW(), updated_at=NOW()`;
}
for (const o of uniqueRows) {
  await sql`INSERT INTO ziiply_fuel_price_observations
    (source, source_station_id, fuel_type, price_eur_per_litre, observed_at)
    VALUES ('tankkaus.com', ${o.stationId}, ${fuel}, ${o.price}, ${o.observedAt}::timestamptz)
    ON CONFLICT (source, source_station_id, fuel_type, observed_at, price_eur_per_litre) DO NOTHING`;
}
console.log(JSON.stringify({ mode: "write", stations: stations.size, observationsAttempted: uniqueRows.length, fuel }));

#!/usr/bin/env node
// Explicit, one-shot ingestion. Dry-run by default. Never runs on ordinary page requests.
// Usage: TANKKAUS_INGEST_URL=https://preview.example/api/tankkaus?lat=...\&lon=... node scripts/ingest-tankkaus.mjs
// Write only after verifying live provider shape and test branch: DATABASE_URL=... TANKKAUS_INGEST_WRITE_CONFIRM=YES_TEST_BRANCH TANKKAUS_INGEST_URL=... node scripts/ingest-tankkaus.mjs --write
const endpoint = process.env.TANKKAUS_INGEST_URL;
const write = process.argv.includes("--write");
if (!endpoint) throw new Error("TANKKAUS_INGEST_URL is required");
const url = new URL(endpoint);
if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("HTTPS endpoint required");
if (url.username || url.password || url.searchParams.has("token") || url.searchParams.has("key")) throw new Error("Do not put credentials in ingestion URL");
if (url.pathname !== "/api/tankkaus") throw new Error("Expected /api/tankkaus endpoint");
// Avoid recording observations under a misleading location or silently using a default fuel.
for (const coordinate of ["lat", "lon"]) {
  const values = url.searchParams.getAll(coordinate);
  if (values.length !== 1 || values[0].trim() === "" || !Number.isFinite(Number(values[0]))) throw new Error(`Exactly one valid ${coordinate} query parameter is required`);
  const n = Number(values[0]);
  if (coordinate === "lat" ? Math.abs(n) > 90 : Math.abs(n) > 180) throw new Error(`Invalid ${coordinate} coordinate`);
}
if (url.searchParams.getAll("fuel").length !== 1) throw new Error("Exactly one fuel query parameter is required");
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
  // Only timezone-explicit ISO timestamps are safe to persist as absolute events.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(o.observedAt)) return false;
  const t = Date.parse(o.observedAt);
  return stations.has(o.stationId) && typeof o.price === "number" && Number.isFinite(o.price) && o.price > 0 && o.price <= 5 &&
    Number.isFinite(t) && t <= now && now - t <= 5 * 86400000;
});
// One provider response may contain duplicate observations. Keep a single canonical row per event.
const uniqueRows = [...new Map(rows.map(o => [`${o.stationId}:${new Date(o.observedAt).toISOString()}:${o.price.toFixed(3)}`, o])).values()];
if (write && (stations.size === 0 || uniqueRows.length === 0)) throw new Error("Refusing empty ingestion write");
// Reject malformed provider batches while allowing harmless repeated observations.
// Dedupe happens separately; duplicate valid events are not malformed.
if (write && payload.observations.length > 0 && rows.length / payload.observations.length < 0.5) {
  throw new Error("Refusing ingestion: excessive invalid observations");
}
// Reject a claimed collection radius if the provider includes stations outside that radius.
// A future wider-coverage endpoint must be validated separately before ingestion.
const radiusClaim = payload.coverage?.radiusKm;
if (typeof radiusClaim === "number" && Number.isFinite(radiusClaim) && radiusClaim > 0) {
  const centerLat = Number(url.searchParams.get("lat"));
  const centerLon = Number(url.searchParams.get("lon"));
  const toRadians = n => n * Math.PI / 180;
  const distanceKm = (a, b) => {
    const dLat = toRadians(b.latitude - a.latitude);
    const dLon = toRadians(b.longitude - a.longitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  if ([...stations.values()].some(station => distanceKm({ latitude: centerLat, longitude: centerLon }, station) > radiusClaim + 0.05)) {
    throw new Error("Provider station outside claimed collection radius");
  }
}
// The live route only exposes the ten closest priced stations per fuel.
// Do not misrepresent a single coordinate sample as full-area or national coverage.
const radius = payload.coverage?.radiusKm;
const maxObservations = payload.coverage?.maxObservationsPerFuel;
const collectionScope = {
  center: { lat: Number(url.searchParams.get("lat")), lon: Number(url.searchParams.get("lon")) },
  radiusKm: typeof radius === "number" && Number.isFinite(radius) && radius > 0 ? radius : null,
  maxObservationsPerFuel: Number.isSafeInteger(maxObservations) && maxObservations > 0 ? maxObservations : null
};
if (!write) {
  console.log(JSON.stringify({ mode: "dry-run", stations: stations.size, observations: uniqueRows.length, fuel, collectionScope }));
  process.exit(0);
}
const { neon } = await import("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);
// The confirmation flag alone is not proof of the target branch.
// Refuse writes unless the connected database identifies as the isolated test branch.
const expectedBranch = "br-weathered-meadow-b1bwpzst";
const branchRows = await sql`SELECT current_setting('neon.branch_id', true) AS branch_id`;
if (branchRows[0]?.branch_id !== expectedBranch) {
  throw new Error("Refusing ingestion: DATABASE_URL does not identify the approved Neon test branch");
}
// Verify both migration tables before starting non-transactional writes.
const schemaRows = await sql`SELECT
  to_regclass('public.ziiply_fuel_stations') IS NOT NULL AS stations_ready,
  to_regclass('public.ziiply_fuel_price_observations') IS NOT NULL AS observations_ready`;
if (schemaRows[0]?.stations_ready !== true || schemaRows[0]?.observations_ready !== true) {
  throw new Error('Refusing ingestion: Tankkaus database migration is not installed');
}
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
console.log(JSON.stringify({ mode: "write", stations: stations.size, observationsAttempted: uniqueRows.length, fuel, collectionScope }));

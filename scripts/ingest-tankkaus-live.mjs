#!/usr/bin/env node
// One-shot live Tankkaus.com -> Neon test-branch ingestion.
// Retrigger after preview environment flags were provisioned.
// Enabled only with TANKKAUS_LIVE_INGEST=true. Never targets production.
if (process.env.TANKKAUS_LIVE_INGEST !== "true") process.exit(0);
if (process.env.TANKKAUS_INGEST_WRITE_CONFIRM !== "YES_TEST_BRANCH") throw new Error("Live ingestion requires explicit test-branch confirmation");
if (process.env.TANKKAUS_PROVIDER_SCHEMA_VERIFIED !== "YES") throw new Error("Live provider schema is not verified");
const token = process.env.TANKKAUS_API_TOKEN?.trim();
if (!token) throw new Error("TANKKAUS_API_TOKEN is missing");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
const { neon } = await import("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);
const expectedBranch = "br-weathered-meadow-b1bwpzst";
const branchRows = await sql`SELECT current_setting('neon.branch_id', true) AS branch_id`;
if (branchRows[0]?.branch_id !== expectedBranch) throw new Error("Refusing live ingestion: database is not the approved Neon test branch");
const schema = await sql`SELECT to_regclass('public.ziiply_fuel_stations') IS NOT NULL AS stations_ready, to_regclass('public.ziiply_fuel_price_observations') IS NOT NULL AS observations_ready`;
if (schema[0]?.stations_ready !== true || schema[0]?.observations_ready !== true) throw new Error("Tankkaus tables are missing");

const lat = Number(process.env.TANKKAUS_PROBE_LAT ?? "60.633");
const lon = Number(process.env.TANKKAUS_PROBE_LON ?? "24.866");
const base = "https://api.tankkaus.com/mobile";
const get = async path => {
  const r = await fetch(base + path, { headers: { Accept: "application/json", Authorization: `Token ${token}` }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`Tankkaus HTTP ${r.status} at ${path}`);
  return r.json();
};
const stationPayload = await get(`/stations/stations-near/${lat}/${lon}`);
const stationRows = Array.isArray(stationPayload) ? stationPayload : stationPayload?.stations;
if (!Array.isArray(stationRows) || stationRows.length > 10000) throw new Error("Invalid station payload");

const rad = n => n * Math.PI / 180;
const distanceKm = (a,b) => {
  const dLat=rad(b.latitude-a.latitude), dLon=rad(b.longitude-a.longitude);
  const h=Math.sin(dLat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2;
  return 6371*2*Math.asin(Math.min(1,Math.sqrt(h)));
};
const stations = new Map();
for (const v of stationRows) {
  const id=Number(v?.id ?? v?.station_id), latitude=Number(v?.latitude ?? v?.lat), longitude=Number(v?.longitude ?? v?.lon);
  if (!Number.isSafeInteger(id)||id<=0||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180) continue;
  const s={id,name:String(v?.name??""),chain:v?.chain?.name?String(v.chain.name):(typeof v?.chain==="string"?v.chain:null),address:v?.address?String(v.address):null,latitude,longitude,distanceKm:distanceKm({latitude:lat,longitude:lon},{latitude,longitude})};
  if (!s.name || s.distanceKm>10) continue;
  const prev=stations.get(id);
  if (prev && (prev.latitude!==s.latitude||prev.longitude!==s.longitude)) throw new Error("Conflicting station coordinates");
  stations.set(id,s);
}
if (!stations.size) throw new Error("No stations within 10 km");

const fuelConfigs = [["95","fills95"],["98","fills98"],["diesel","fillsDiesel"]];
const now=Date.now();
const observations=[];
for (const [fuel,key] of fuelConfigs) {
  const payload=await get(`/fills/home/${lat}/${lon}`);
  const rows=payload?.[key];
  if (!Array.isArray(rows)||rows.length>10000) throw new Error(`Missing or oversized ${key}`);
  for (const item of rows) {
    const id=Number(item?.station_id ?? item?.station?.id), price=Number(String(item?.price_liter??"").replace(",","."));
    const observedAt=item?.created;
    if (!stations.has(id)||!Number.isFinite(price)||price<=0||price>5||typeof observedAt!=="string") continue;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(observedAt)) continue;
    const t=Date.parse(observedAt);
    if (!Number.isFinite(t)||t>now||now-t>5*86400000) continue;
    observations.push({stationId:id,fuel,price,observedAt});
  }
}
// Canonical event identity; latest per station/fuel is what the app cache consumes.
const unique=[...new Map(observations.map(o=>[`${o.stationId}:${o.fuel}:${new Date(o.observedAt).toISOString()}:${o.price.toFixed(3)}`,o])).values()];
if (!unique.length) throw new Error("No valid live price observations");
for (const s of stations.values()) {
  await sql`INSERT INTO ziiply_fuel_stations
    (source,source_station_id,name,chain,address,latitude,longitude,last_seen_at,updated_at)
    VALUES ('tankkaus.com',${s.id},${s.name},${s.chain},${s.address},${s.latitude},${s.longitude},NOW(),NOW())
    ON CONFLICT (source,source_station_id) DO UPDATE SET
      name=EXCLUDED.name,chain=EXCLUDED.chain,address=EXCLUDED.address,
      latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,last_seen_at=NOW(),updated_at=NOW()`;
}
for (const o of unique) {
  await sql`INSERT INTO ziiply_fuel_price_observations
    (source,source_station_id,fuel_type,price_eur_per_litre,observed_at)
    VALUES ('tankkaus.com',${o.stationId},${o.fuel},${o.price},${o.observedAt}::timestamptz)
    ON CONFLICT (source,source_station_id,fuel_type,observed_at,price_eur_per_litre) DO NOTHING`;
}
console.log(JSON.stringify({ok:true,mode:"live-test-branch-write",stations:stations.size,observations:unique.length,fuels:[...new Set(unique.map(x=>x.fuel))],center:{lat,lon},radiusKm:10}));

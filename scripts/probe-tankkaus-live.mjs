#!/usr/bin/env node
// Read-only live contract probe. Never writes to Tankkaus.com or Neon.
// Runs only when TANKKAUS_LIVE_PROBE=true and uses the server-side token.
if (process.env.TANKKAUS_LIVE_PROBE !== "true") process.exit(0);
const token = process.env.TANKKAUS_API_TOKEN?.trim();
if (!token) throw new Error("TANKKAUS_LIVE_PROBE requested but TANKKAUS_API_TOKEN is missing");
const lat = Number(process.env.TANKKAUS_PROBE_LAT ?? "60.633");
const lon = Number(process.env.TANKKAUS_PROBE_LON ?? "24.866");
const base = "https://api.tankkaus.com/mobile";
const get = async path => {
  const response = await fetch(base + path, {
    headers: { Accept: "application/json", Authorization: `Token ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Tankkaus live probe HTTP ${response.status} at ${path}`);
  return response.json();
};
const [stations, fills] = await Promise.all([
  get(`/stations/stations-near/${lat}/${lon}`),
  get(`/fills/home/${lat}/${lon}`),
]);
const stationRows = Array.isArray(stations) ? stations : stations?.stations;
if (!Array.isArray(stationRows)) throw new Error("Live probe: stations response is not an array");
const keys = ["fills95", "fills98", "fillsDiesel"];
const counts = Object.fromEntries(keys.map(k => [k, Array.isArray(fills?.[k]) ? fills[k].length : -1]));
const sample = Object.fromEntries(keys.map(k => {
  const row = Array.isArray(fills?.[k]) ? fills[k][0] : null;
  return [k, row ? {
    keys: Object.keys(row).sort(),
    stationIdType: typeof (row.station_id ?? row.station?.id),
    priceType: typeof row.price_liter,
    createdType: typeof row.created,
  } : null];
}));
if (!stationRows.length) throw new Error("Live probe: stations response is empty");
if (Object.values(counts).some(n => n < 0)) throw new Error("Live probe: one or more fuel arrays are missing");
console.log(JSON.stringify({
  ok: true, endpointBase: base, stationCount: stationRows.length, fuelCounts: counts,
  stationSampleKeys: Object.keys(stationRows[0]).sort(), observationSamples: sample,
}, null, 2));

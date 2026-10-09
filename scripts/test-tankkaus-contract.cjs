// Isolated positive-path tests: no real Tankkaus.com calls or API credentials.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync('src/app/api/tankkaus/route.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  fileName: 'route.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const now = Date.now();
const at = (daysAgo) => new Date(now - daysAgo * 86400000).toISOString();
const stations = [
  { id: 1, name: 'Near', latitude: 60, longitude: 24.01 },
  { id: 2, name: 'Far', latitude: 60, longitude: 24.5 },
  { id: 3, name: 'No coordinates' },
  { id: 4, name: 'Second near', latitude: 60.005, longitude: 24 },
  { id: 5, name: 'Invalid latitude', latitude: 999, longitude: 24 },
  { id: Number.MAX_SAFE_INTEGER + 1, name: 'Unsafe ID', latitude: 60, longitude: 24 },
];
const fillsDiesel = [
  { station_id: 1, price_liter: '1.79', created: at(1) },
  { station_id: 1, price_liter: '1.89', created: at(2) },
  { station_id: 2, price_liter: '1.55', created: at(1) },
  { station_id: 3, price_liter: '1.50', created: at(1) },
  { station_id: 4, price_liter: '1.66', created: at(6) },
  { station_id: 4, price_liter: '1.72', created: at(1) },
  { station_id: 4, price_liter: '1.80', created: at(-1) },
  { station_id: 5, price_liter: '1.20', created: at(1) },
  { station_id: 4, price_liter: '1.11', created: at(0).replace('Z', '') },
  { station_id: Number.MAX_SAFE_INTEGER + 1, price_liter: '1.01', created: at(1) },
];
let calls = [];
let malformed = false;
let upstreamFailure = false;
const fetchMock = async (url, options) => {
  calls.push({ url, options });
  return { ok: !upstreamFailure, status: upstreamFailure ? 503 : 200, json: async () => malformed
    ? (url.includes('/stations/') ? { invalid: true } : { fillsDiesel })
    : (url.includes('/stations/') ? { stations } : { fillsDiesel, fills95: fillsDiesel, fills98: fillsDiesel }) };
};
const routeExports = {};
const routeModule = { exports: routeExports };
vm.runInNewContext(compiled, {
  exports: routeExports, module: routeModule, require: (id) => {
    assert.equal(id, 'next/server');
    return { NextResponse: { json: (body, options = {}) => ({
      body, status: options.status || 200, headers: options.headers || {}
    }) } };
  },
  fetch: fetchMock,
  process: { env: { TANKKAUS_API_TOKEN: 'fake-test-token' } },
  AbortSignal, Date, Map, Set, Number, String, Math, Array, console,
});
const get = (query) => routeModule.exports.GET({
  nextUrl: { searchParams: new URLSearchParams(query) }
});
(async () => {
  const ok = await get('lat=60&lon=24&fuel=diesel');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.ok, true);
  assert.equal(ok.body.source, 'Tankkaus.com');
  assert.deepEqual(Array.from(ok.body.observations, x => x.stationId), [1, 4]);
  assert.equal(ok.body.observations[0].price, 1.79);
  assert.equal(ok.body.observations[1].price, 1.72);
  assert.equal(ok.body.stations.length, 2);
  assert.ok(!ok.body.observations.some(o => o.price === 1.11 || o.price === 1.01));
  assert.ok(ok.body.stations.every(s => s.distanceKm <= 10));
  assert.equal(calls.length, 2);
  assert.ok(calls.every(x => x.options.headers.Authorization === 'Token fake-test-token'));
  assert.ok(!JSON.stringify(ok.body).includes('fake-test-token'));
  console.log('PASS: distance, freshness, deduplication, unsafe IDs, timezone validation, ordering, token isolation');

  calls = [];
  const bad = await get('lat=91&lon=24');
  assert.equal(bad.status, 400);
  assert.equal(calls.length, 0);
  const whitespace = await get('lat=%20%20%20&lon=24');
  assert.equal(whitespace.status, 400);
  assert.equal(calls.length, 0);
  console.log('PASS: invalid and whitespace-only coordinates never call upstream');

  for (const fuel of ['95', '95e10', '98', '98e5']) {
    const result = await get('lat=60&lon=24&fuel=' + fuel);
    assert.equal(result.status, 200, fuel);
    assert.equal(result.body.fuel, fuel);
    assert.equal(result.body.observations.length, 2);
  }
  console.log('PASS: petrol fuel aliases select matching upstream observations');

  // Conflicting coordinates for one upstream station ID must fail closed.
  stations.push({ id: 1, name: 'Conflicting location', latitude: 60.002, longitude: 24.002 });
  const originalError = console.error;
  console.error = () => {};
  try {
    const conflicting = await get('lat=60&lon=24&fuel=diesel');
    assert.equal(conflicting.status, 502);
    assert.equal(conflicting.body.ok, false);
  } finally {
    console.error = originalError;
    stations.pop();
  }
  console.log('PASS: conflicting coordinates for the same station ID are rejected');

  // Oversized provider arrays must fail before normalization.
  const oversizedStation = { id: 9001, name: 'Overflow', latitude: 60, longitude: 24 };
  const originalStations = stations.length;
  stations.push(...Array(10001 - originalStations).fill(oversizedStation));
  console.error = () => {};
  try {
    const tooManyStations = await get('lat=60&lon=24&fuel=diesel');
    assert.equal(tooManyStations.status, 502);
  } finally {
    console.error = originalError;
    stations.length = originalStations;
  }
  console.log('PASS: oversized station payload rejected');

  const originalFills = fillsDiesel.length;
  fillsDiesel.push(...Array(10001 - originalFills).fill(fillsDiesel[0]));
  console.error = () => {};
  try {
    const tooManyFills = await get('lat=60&lon=24&fuel=diesel');
    assert.equal(tooManyFills.status, 502);
  } finally {
    console.error = originalError;
    fillsDiesel.length = originalFills;
  }
  console.log('PASS: oversized fuel observation payload rejected');

  malformed = true;
  console.error = () => {};
  try {
    const upstream = await get('lat=60&lon=24');
    assert.equal(upstream.status, 502);
    assert.equal(upstream.body.ok, false);
    assert.ok(!JSON.stringify(upstream.body).includes('stations array'));
  } finally { console.error = originalError; }
  console.log('PASS: malformed upstream response safely rejected');

  malformed = false;
  upstreamFailure = true;
  console.error = () => {};
  try {
    const unavailable = await get('lat=60&lon=24');
    assert.equal(unavailable.status, 502);
    assert.equal(unavailable.body.error, 'Tankkaus data temporarily unavailable');
    assert.ok(!JSON.stringify(unavailable.body).includes('503'));
  } finally { console.error = originalError; }
  console.log('PASS: upstream HTTP failure is sanitized');
})().catch(e => { console.error(e); process.exitCode = 1; });

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
];
let calls = [];
let malformed = false;
const fetchMock = async (url, options) => {
  calls.push({ url, options });
  return { ok: true, json: async () => malformed
    ? (url.includes('/stations/') ? { invalid: true } : { fillsDiesel })
    : (url.includes('/stations/') ? { stations } : { fillsDiesel }) };
};
const exports = {};
const module = { exports };
vm.runInNewContext(compiled, {
  exports, module, require: (id) => {
    assert.equal(id, 'next/server');
    return { NextResponse: { json: (body, options = {}) => ({
      body, status: options.status || 200, headers: options.headers || {}
    }) } };
  },
  fetch: fetchMock,
  process: { env: { TANKKAUS_API_TOKEN: 'fake-test-token' } },
  AbortSignal, Date, Map, Set, Number, String, Math, Array, console,
});
const get = (query) => module.exports.GET({
  nextUrl: { searchParams: new URLSearchParams(query) }
});
(async () => {
  const ok = await get('lat=60&lon=24&fuel=diesel');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.ok, true);
  assert.equal(ok.body.source, 'Tankkaus.com');
  assert.deepEqual(Array.from(ok.body.observations, x => x.stationId), [4, 1]);
  assert.equal(ok.body.observations[0].price, 1.72);
  assert.equal(ok.body.observations[1].price, 1.79);
  assert.equal(ok.body.stations.length, 2);
  assert.ok(ok.body.stations.every(s => s.distanceKm <= 10));
  assert.equal(calls.length, 2);
  assert.ok(calls.every(x => x.options.headers.Authorization === 'Token fake-test-token'));
  assert.ok(!JSON.stringify(ok.body).includes('fake-test-token'));
  console.log('PASS: distance, freshness, deduplication, ordering, token isolation');

  calls = [];
  const bad = await get('lat=91&lon=24');
  assert.equal(bad.status, 400);
  assert.equal(calls.length, 0);
  console.log('PASS: invalid coordinates never call upstream');

  malformed = true;
  const originalError = console.error;
  console.error = () => {};
  try {
    const upstream = await get('lat=60&lon=24');
    assert.equal(upstream.status, 502);
    assert.equal(upstream.body.ok, false);
    assert.ok(!JSON.stringify(upstream.body).includes('stations array'));
  } finally { console.error = originalError; }
  console.log('PASS: malformed upstream response safely rejected');
})().catch(e => { console.error(e); process.exitCode = 1; });

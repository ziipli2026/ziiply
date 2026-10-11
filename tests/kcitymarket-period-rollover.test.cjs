const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { resolveKCitymarketPeriodSnapshot } = require('../src/app/components/ziiply/offerSearch/providers/kCitymarketPeriodSnapshot.ts');
const path = 'src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts';
const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

function deployment(store, calls, published) {
  const sql = async (strings, ...values) => {
    const query = strings.join('?');
    if (query.includes('CREATE TABLE')) return [];
    const key = values[0] + ':' + values[1];
    if (query.includes('SELECT payload')) return store.has(key) ? [{payload: store.get(key)}] : [];
    if (query.includes('INSERT INTO')) { store.set(key, JSON.parse(values[2])); return []; }
    throw new Error('Unexpected database operation');
  };
  const exports = {};
  vm.runInNewContext(compiled, { exports, process: {env: {DATABASE_URL: 'test'}}, console,
    require(name) {
      if (name === 'next/cache') return {unstable_cache: fn => fn}; // new deployment, no Next cache
      if (name === '@neondatabase/serverless') return {neon: () => sql};
      if (name === './kCitymarketPeriodSnapshot') return {resolveKCitymarketPeriodSnapshot};
      if (name === './kCitymarketPublisherImages') return {getKCitymarketPublisherImage: () => null};
      if (name === './kCitymarketSpatialParser.js') return {parseKCitymarketSpatialLeaflet: async entry => {
        calls.push(entry);
        return {leaflet: published(entry), pageCount: 1, rows: [{page: 1, title: 'Esimerkkituote 200 g',
          spatialResolved: {value: 2.49, sanity: 'pass'}, nearby: []}]};
      }};
      throw new Error('Unexpected import ' + name);
    }
  });
  return exports;
}
const url = id => `https://kcm-tarjouslehdet.k-ruoka.fi/example_tarjouslehti_${id}_KCM/index.html`;
test('real provider keeps active output across deployment and warms next leaflet independently', async () => {
  const store = new Map(), calls = [];
  const morning = deployment(store, calls, () => url('42LV'));
  const first = await morning.warmKCitymarketOfferCache(new Date('2026-10-18T03:45:00Z'));
  assert.equal(first.active.offers, 1);
  assert.equal(first.errors.length, 0);
  calls.length = 0;
  // On Sunday afternoon BOTH public entries can redirect to next week's AV.
  const afternoon = deployment(store, calls, () => url('43AV'));
  const result = await afternoon.warmKCitymarketOfferCache(new Date('2026-10-18T12:10:00Z'));
  assert.equal(result.active.period, '2026-10-15-W42-LV');
  assert.equal(result.next.period, '2026-10-19-W43-AV');
  assert.equal(result.errors.length, 0);
  assert.equal(calls.length, 1, 'only next publication should touch the publisher');
  const monday = deployment(store, calls, () => { throw new Error('publisher offline'); });
  const activated = await monday.warmKCitymarketOfferCache(new Date('2026-10-19T03:45:00Z'));
  assert.equal(activated.active.period, '2026-10-19-W43-AV');
  assert.equal(activated.errors.length, 0);
});
test('real provider rejects wrong-week output instead of hiding a real missing publication', async () => {
  const api = deployment(new Map(), [], () => url('43AV'));
  const result = await api.warmKCitymarketOfferCache(new Date('2026-10-18T03:45:00Z'));
  assert.equal(result.active, null);
  assert.match(result.errors[0], /does not match requested/);
});

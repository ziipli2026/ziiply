require('../scripts/recipe-audit-runtime.cjs');
const { runSimulation } = require('../src/lib/neonSearchSimulation/engine.ts');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ean = '6410000000001';
const source = (id, products) => ({ id, search: async () => products });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
test('Neon publishes before shop prices; shops fill by EAN and retain bank image', async () => {
  const s = deferred(), k = deferred(), states = [];
  const pending = runSimulation('olut', source('Neon', [{ ean, name: 'Olut', imageUrl: '/bank.jpg' }]), [{ id: 'S', search: () => s.promise }, { id: 'K', search: () => k.promise }], new AbortController().signal, value => states.push(value));
  await new Promise(resolve => setImmediate(resolve));
  const early = states.at(-1); assert.equal(early.rows.length, 1); assert.deepEqual(early.rows[0].prices, {}); assert.equal(early.done, false);
  s.resolve([{ ean, name: 'Olut', price: 1.25, imageUrl: null }]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(states.at(-1).rows[0].prices.S, 1.25); assert.equal(states.at(-1).done, false);
  k.resolve([{ ean, name: 'Olut', price: 1.39, imageUrl: '/shop.jpg' }]); await pending;
  assert.deepEqual(states.at(-1).rows[0].prices, { S: 1.25, K: 1.39 }); assert.equal(states.at(-1).rows[0].imageUrl, '/bank.jpg'); assert.equal(states.at(-1).done, true);
});
test('empty or failed bank still searches shops', async () => {
  for(const fail of [false, true]) {
    let last;
    await runSimulation('olut', { id: 'Neon', search: async () => { if(fail) throw Error(); return []; } }, [source('S', [{ ean, name: 'New', price: 2 }])], new AbortController().signal, state => last = state);
    assert.equal(last.rows.length, 1); assert.equal(last.rows[0].prices.S, 2); assert.equal(last.done, true);
  }
});
test('missing prices stay unknown; packages and store-only identities do not collide', async () => {
  let last;
  await runSimulation('olut', source('Neon', [{ ean, name: 'Olut' }]), [source('S', [{ ean, name: 'Olut', price: 0, imageUrl: '/filled.jpg' }, { ean: '6410000000002', name: 'Olut', price: 7.5 }, { id: 'same', name: 'Olut' }]), source('K', [{ id: 'same', name: 'Olut' }])], new AbortController().signal, value => last = value);
  assert.equal(last.rows.length, 4); assert.equal(last.rows[0].prices.S, null); assert.equal(last.rows[0].imageUrl, '/filled.jpg');
});
test('shop error does not discard bank or other shop results', async () => {
  let last;
  await runSimulation('olut', source('Neon', [{ ean, name: 'Olut' }]), [{ id: 'S', search: async () => { throw Error(); } }, source('K', [{ ean, name: 'Olut', price: 2 }])], new AbortController().signal, value => last = value);
  assert.equal(last.stages.S, 'error'); assert.equal(last.rows[0].prices.K, 2); assert.equal(last.done, true);
});
test('aborted old request cannot publish late rows', async () => {
  const wait = deferred(), controller = new AbortController(), states = [];
  const pending = runSimulation('old', { id: 'Neon', search: () => wait.promise }, [source('S', [])], controller.signal, value => states.push(value));
  controller.abort(); const count = states.length; wait.resolve([{ ean, name: 'Late' }]); await pending;
  assert.equal(states.length, count); assert.equal(states.at(-1).rows.length, 0);
});

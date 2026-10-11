const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveKCitymarketPeriodSnapshot: resolve } = require('../src/app/components/ziiply/offerSearch/providers/kCitymarketPeriodSnapshot.ts');
const snapshot = (period) => ({ period, offers: [{ price: 2.49 }] });
const valid = (period) => (value) => value?.period === period && value.offers?.length > 0;

test('41LV survives a deployment cache miss after the publisher rolls to 42AV', async () => {
  const saved = snapshot('41LV');
  const result = await resolve({ read: async () => saved, validate: valid('41LV'),
    parse: async () => { throw new Error('publisher now returns 42AV'); },
    write: async () => assert.fail('saved output must not be rewritten') });
  assert.equal(result, saved);
});
test('next-period 42AV is parsed and saved separately from active 41LV', async () => {
  const store = new Map([['41LV', snapshot('41LV')]]);
  await resolve({ read: async () => store.get('42AV') || null, validate: valid('42AV'),
    parse: async () => snapshot('42AV'), write: async (value) => store.set('42AV', value) });
  assert.equal(store.get('41LV').period, '41LV');
  assert.equal(store.get('42AV').period, '42AV');
});
test('wrong-period or empty saved output cannot bypass publication validation', async () => {
  for (const saved of [snapshot('42AV'), { period: '41LV', offers: [] }]) {
    let wrote = false;
    await assert.rejects(resolve({ read: async () => saved, validate: valid('41LV'),
      parse: async () => snapshot('42AV'), write: async () => { wrote = true; } }), /Invalid/);
    assert.equal(wrote, false);
  }
});
test('parse errors preserve the durable snapshot and remain real errors', async () => {
  await assert.rejects(resolve({ read: async () => null, validate: valid('42AV'),
    parse: async () => { throw new Error('publisher unavailable'); },
    write: async () => assert.fail('failed parse cannot be saved') }), /publisher unavailable/);
});
test('a failed durable write is reported, not silently labelled successful', async () => {
  await assert.rejects(resolve({ read: async () => null, validate: valid('42AV'),
    parse: async () => snapshot('42AV'), write: async () => { throw new Error('database unavailable'); } }), /database unavailable/);
});

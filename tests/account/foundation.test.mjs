import test from 'node:test';
import assert from 'node:assert/strict';
import { getGuestIdentity, captureGuestSnapshot, validateGuestSnapshot, GUEST_KEY } from '../../src/lib/account/guest.ts';
import { isolatedAccountDatabase } from '../../src/lib/account/database.ts';
import { accountLabEnabled } from '../../src/lib/account/config.ts';
const memory = (initial = {}) => { const values = new Map(Object.entries(initial)); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values }; };
test('guest identity persists; existing baskets stay byte-for-byte unchanged', () => {
  const store = memory({ 'ziiply-cart-v1': '{"items":[{"id":"one"}]}' });
  const before = store.getItem('ziiply-cart-v1');
  assert.equal(getGuestIdentity(store).id, getGuestIdentity(store).id);
  assert.equal(store.getItem('ziiply-cart-v1'), before);
  assert.ok(store.getItem(GUEST_KEY));
});
test('blocked and malformed storage do not prevent guest use', () => {
  assert.equal(getGuestIdentity({ getItem() { throw Error(); }, setItem() { throw Error(); } }).persistent, false);
  assert.equal(getGuestIdentity(memory({ [GUEST_KEY]: '{' })).persistent, true);
});
test('mobile and desktop captured independently; GPS and caches excluded', () => {
  const local = memory({ 'ziiply-cart-v1': '{"items":[{"id":"mobile"}]}', 'ziiply-desktop-ostelusvihko-v1': '[]', 'ziiply-store-selection-v536': '{"gpsCoords":{}}', 'ziiply-comparison-snapshot-v1': '{}' });
  const session = memory({ 'ziiply-desktop-current-cart-v1': '[{"id":"desktop"}]' });
  const snapshot = captureGuestSnapshot(local, session);
  assert.deepEqual(Object.keys(snapshot.values).sort(), ['ziiply-cart-v1','ziiply-desktop-current-cart-v1','ziiply-desktop-ostelusvihko-v1']);
  assert.equal(snapshot.values['ziiply-desktop-current-cart-v1'][0].id, 'desktop');
  assert.equal(local.values.size, 4);
});
test('unknown keys, malformed lists, oversized snapshots rejected', () => {
  assert.throws(() => validateGuestSnapshot({version:1,values:{token:'secret'}}));
  assert.throws(() => validateGuestSnapshot({version:1,values:{'ziiply-cart-v1':{items:'wrong'}}}));
  assert.throws(() => validateGuestSnapshot({version:1,values:{'ziiply-cart-v1':[{name:'x'.repeat(256001)}]}}));
});
test('database cannot fall back or target product pooled/direct endpoint', () => {
  assert.throws(() => isolatedAccountDatabase({DATABASE_URL:'postgres://u:p@ep-prod.neon.tech/db'}));
  assert.throws(() => isolatedAccountDatabase({DATABASE_URL:'postgres://u:p@ep-prod.neon.tech/db', ZIIPLY_ACCOUNT_DATABASE_URL:'postgres://u:p@ep-prod-pooler.neon.tech/other', ZIIPLY_ACCOUNT_DATABASE_HOST:'ep-prod.neon.tech'}));
  assert.throws(() => isolatedAccountDatabase({ZIIPLY_ACCOUNT_DATABASE_URL:'postgres://u:p@ep-dev.neon.tech/db',ZIIPLY_ACCOUNT_DATABASE_HOST:'ep-wrong.neon.tech'}));
  assert.equal(isolatedAccountDatabase({DATABASE_URL:'postgres://u:p@ep-prod.neon.tech/db', ZIIPLY_ACCOUNT_DATABASE_URL:'postgres://u:p@ep-dev.neon.tech/db',ZIIPLY_ACCOUNT_DATABASE_HOST:'ep-dev.neon.tech'}), 'postgres://u:p@ep-dev.neon.tech/db');
});
test('production stays disabled even with explicit opt-in', () => {
  const old = {...process.env};
  try {
    delete process.env.ZIIPLY_ACCOUNT_LAB;
    assert.equal(accountLabEnabled(), false);
    process.env.ZIIPLY_ACCOUNT_LAB = 'true'; process.env.VERCEL_ENV = 'production';
    assert.equal(accountLabEnabled(), false);
    process.env.VERCEL_ENV = 'preview'; assert.equal(accountLabEnabled(), true);
  } finally { process.env = old; }
});

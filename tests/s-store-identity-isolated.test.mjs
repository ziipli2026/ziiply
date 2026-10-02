// Isolated, dependency-free identity contract tests. Run: node --test tests/s-store-identity-isolated.test.mjs
// Synthetic IDs only; never map an actual shop to a hardcoded product ID.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const provider = readFileSync(new URL('../src/app/components/ziiply/offerSearch/providers/skaupatProvider.ts', import.meta.url), 'utf8');
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9äöå]+/g, ' ').trim();
const place = (name) => norm(name).replace(/^prisma |^s market |^sale |^alepa /, '');
const brand = (name) => norm(name).startsWith('prisma ') ? 'prisma' : norm(name).startsWith('s market ') ? 's-market' : '';
function verifyPickup(name, productId, candidates) {
  if (candidates === null) return 'unavailable';
  const matches = candidates.filter(c => (!brand(name) || c.brand === brand(name)) && place(name) && norm(c.pickupName).includes(place(name)));
  const ids = [...new Set(matches.map(c => c.storeId))];
  return ids.length !== 1 ? 'unavailable' : ids[0] === productId ? 'verified' : 'mismatch';
}
function decide({ official, pickup, pickupMatches = true, productIdValidated = false }) {
  // Official identity is not automatically a RemoteFilteredProducts product-store ID.
  if (official && pickup && pickupMatches && official.storeId !== pickup.storeId)
    return { status: 'requires-relation-proof', productStoreId: null };
  if (official && pickup && pickupMatches && official.storeId === pickup.storeId)
    return { status: 'verified', productStoreId: pickup.storeId };
  if (official && productIdValidated)
    return { status: 'verified', productStoreId: official.storeId };
  return { status: 'unverified', productStoreId: null };
}
test('actual provider has primary identity and fallback verification guards', () => {
  assert.match(provider, /verifySelectedSOfferStoreV230\(selectedStore\.storeName, selectedStore\.storeId\)/);
  assert.match(provider, /verifySelectedSOfferStoreV230\(\s*selectedStore\.storeName, fallbackStoreId/);
  assert.match(provider, /if \(identityV230\.status !== "verified"\)/);
  assert.match(provider, /if \(fallbackIdentityV231\.status !== "verified"\)/);
});
test('matching selected shop pickup verifies product ID', () => {
  assert.equal(verifyPickup('Prisma Example', 'PRODUCT_A', [{ brand: 'prisma', pickupName: 'Prisma Example pickup', storeId: 'PRODUCT_A' }]), 'verified');
});
test('different product ID is rejected', () => {
  assert.equal(verifyPickup('Prisma Example', 'PRODUCT_B', [{ brand: 'prisma', pickupName: 'Prisma Example pickup', storeId: 'PRODUCT_A' }]), 'mismatch');
});
test('wrong shop, wrong brand, missing and ambiguous pickup are not verified', () => {
  assert.equal(verifyPickup('Prisma Example', 'PRODUCT_A', [{ brand: 'prisma', pickupName: 'Prisma Other', storeId: 'PRODUCT_A' }]), 'unavailable');
  assert.equal(verifyPickup('Prisma Example', 'PRODUCT_A', [{ brand: 's-market', pickupName: 'Prisma Example', storeId: 'PRODUCT_A' }]), 'unavailable');
  assert.equal(verifyPickup('Prisma Example', 'PRODUCT_A', null), 'unavailable');
  assert.equal(verifyPickup('Prisma Example', 'PRODUCT_A', [{ brand: 'prisma', pickupName: 'Prisma Example', storeId: 'PRODUCT_A' }, { brand: 'prisma', pickupName: 'Prisma Example second', storeId: 'PRODUCT_B' }]), 'unavailable');
});
test('official store identity is not silently treated as product ID', () => {
  assert.deepEqual(decide({ official: { storeId: 'OFFICIAL_A' }, pickup: null }), { status: 'unverified', productStoreId: null });
});
test('official and pickup equal may be used', () => {
  assert.deepEqual(decide({ official: { storeId: 'ID_A' }, pickup: { storeId: 'ID_A' } }), { status: 'verified', productStoreId: 'ID_A' });
});
test('different official and pickup IDs require independent relationship proof', () => {
  assert.deepEqual(decide({ official: { storeId: 'OFFICIAL_A' }, pickup: { storeId: 'PRODUCT_A' } }), { status: 'requires-relation-proof', productStoreId: null });
});
test('official-only store can be used if product API independently validates its ID', () => {
  assert.deepEqual(decide({ official: { storeId: 'OFFICIAL_A' }, pickup: null, productIdValidated: true }), { status: 'verified', productStoreId: 'OFFICIAL_A' });
});
test('wrong-name pickup cannot override official identity', () => {
  assert.deepEqual(decide({ official: { storeId: 'OFFICIAL_A' }, pickup: { storeId: 'PRODUCT_B' }, pickupMatches: false }), { status: 'unverified', productStoreId: null });
});

test('audit: trial V230 blocks unavailable verification rather than labeling it as shop-specific', () => {
  const start = provider.indexOf('const identityV230 = await verifySelectedSOfferStoreV230(');
  const end = provider.indexOf('const pageStep = 48;', start);
  assert.ok(start >= 0 && end > start);
  const guard = provider.slice(start, end);
  assert.match(guard, /identityV230\.status !== "verified"/);
  assert.doesNotMatch(guard, /identityV230\.status === "unavailable"\)\s*\{/);
  // Trial guard is fail-closed; this is not a successful live identity test.
});
test('audit: initial unverified identity skips the entire selected store before Prisma fallback', () => {
  const initial = provider.indexOf('const identityV230 = await verifySelectedSOfferStoreV230(');
  const fallback = provider.indexOf('resolveSafePrismaFallbackStoreIdV225(', initial);
  assert.ok(initial >= 0 && fallback > initial);
  const block = provider.slice(initial, fallback);
  assert.match(block, /identityV230\.status !== "verified"[\s\S]*?continue;/);
});

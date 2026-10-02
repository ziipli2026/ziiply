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
  assert.match(provider, /if \(identityV230\.status === "mismatch"\)/);
  assert.match(provider, /if \(fallbackIdentityV231\.status === "mismatch"\)/);
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

test('audit: mismatch blocks and unavailable offers are labeled as unverified source data', () => {
  const start = provider.indexOf('const identityV230 = await verifySelectedSOfferStoreV230(');
  const end = provider.indexOf('const pageStep = 48;', start);
  assert.ok(start >= 0 && end > start);
  const guard = provider.slice(start, end);
  assert.match(guard, /identityV230\.status === "mismatch"/);
  assert.doesNotMatch(guard, /identityV230\.status === "unavailable"\)\s*\{/);
  assert.match(provider, /result\.sOfferStoreIdentityV232 = effectiveIdentityStatusV232/);
  assert.match(provider, /result\.sOfferLocalVerifiedV232 = effectiveIdentityStatusV232 === "verified"/);
  assert.match(provider, /myymälää ei vahvistettu/);
});
test('audit: proven mismatch skips the selected store before fallback', () => {
  const initial = provider.indexOf('const identityV230 = await verifySelectedSOfferStoreV230(');
  const fallback = provider.indexOf('resolveSafePrismaFallbackStoreIdV225(', initial);
  assert.ok(initial >= 0 && fallback > initial);
  const block = provider.slice(initial, fallback);
  assert.match(block, /identityV230\.status === "mismatch"[\s\S]*?continue;/);
});

test('audit: cached pickup diagnostic must not be mistaken for independent live identity evidence', () => {
  const start = provider.indexOf('if (cachedPickupIdV222) {');
  const end = provider.indexOf('lastPickupResolverDiagnosticV216 = {', start + 10);
  assert.ok(start >= 0 && end > start);
  const cachePath = provider.slice(start, provider.indexOf('return cachedPickupIdV222;', start));
  assert.match(cachePath, /bestPickupName: cleanStoreName/);
  assert.match(cachePath, /geocodeQueryUsed: "positive-cache"/);
  // Existing behavior documented: a synthetic name in cache diagnostics cannot prove ownership.
});
test('audit: only mismatch blocks and local verification is explicit', () => {
  const start = provider.indexOf('const identityV230 = await verifySelectedSOfferStoreV230(');
  const end = provider.indexOf('const pageStep = 48;', start);
  assert.ok(start >= 0 && end > start);
  assert.match(provider.slice(start, end), /identityV230\.status === "mismatch"[\s\S]*?continue;/);
});

test('normal S-kaupat query keeps the non-discounted provider path', () => {
  assert.match(provider, /return await fetchSKaupatRemoteFilteredProductsV170\(cleanQuery, config, options\)/);
  assert.match(provider, /if \(identityV230\.status === "mismatch"\)/);
});

test('audit: proven fallback mismatch stops pagination instead of continuing with the rejected fallback', () => {
  const start = provider.indexOf('if (fallbackIdentityV231.status === "mismatch") {');
  const end = provider.indexOf('const fallbackPage =', start);
  assert.ok(start >= 0 && end > start);
  const block = provider.slice(start, end);
  assert.match(block, /V231 FALLBACK_STORE_ID_MISMATCH[\\s\\S]*?break;/);
  assert.doesNotMatch(block, /V231 FALLBACK_STORE_ID_MISMATCH[\\s\\S]*?continue;/);
});

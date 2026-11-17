const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = fs.readFileSync(path.join(__dirname, '../src/app/components/ziiply/offerSearch/ziiplyOfferCategoryCore.ts'), 'utf8');
const provider = fs.readFileSync(path.join(__dirname, '../src/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider.ts'), 'utf8');
const section = core.split('export function getOfferCategoryV106(')[1].split('export function isKnownOfferCategoryFilterV113(')[0];

test('EAN override is restricted to local Citymarket Tjek publication provenance', () => {
  assert.match(section, /provider === "kcitymarket-local"/);
  assert.match(section, /source === "K-Citymarket kauppakohtainen julkaisu"/);
  assert.match(section, /if \(localCitymarketTjek && eanMatch === "ean"/);
  assert.doesNotMatch(section, /eanMatch === "exact-name"/);
});

test('EAN override happens before legacy title-based rules', () => {
  assert.ok(section.indexOf('if (localCitymarketTjek && eanMatch') < section.indexOf('getVerifiedOfferCategory(item)'));
});

test('Tjek local publication marks its provenance explicitly', () => {
  assert.match(provider, /source:"K-Citymarket kauppakohtainen julkaisu",provider:"kcitymarket-local"/);
});

test('unresolved offers still use the existing fallback', () => {
  assert.match(section, /const verifiedCategory = getVerifiedOfferCategory\(item\)/);
});

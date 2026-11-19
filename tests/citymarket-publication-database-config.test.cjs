const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const provider = fs.readFileSync(path.resolve('src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts'), 'utf8');
const store = fs.readFileSync(path.resolve('src/app/components/ziiply/offerSearch/publicationStore.ts'), 'utf8');

test('Citymarket reads approved offers with either configured Neon URL', () => {
  assert.match(store, /process\\.env\\.OFFER_PUBLICATION_DATABASE_URL\\s*\\|\\|\\s*process\\.env\\.DATABASE_URL/);
  assert.match(provider, /const stored=\\(process\\.env\\.OFFER_PUBLICATION_DATABASE_URL \\|\\| process\\.env\\.DATABASE_URL\\)\\s*\\? await readActivePublicationOffers<CitymarketOffer>\\("K-Citymarket"\\)/);
});

test('Citymarket never falls back to unapproved live parsing when dedicated Neon URL exists', () => {
  assert.match(provider, /if \\(process\\.env\\.OFFER_PUBLICATION_DATABASE_URL \\|\\| process\\.env\\.DATABASE_URL\\) \\{\\s*console\\.warn\\("\\[K-Citymarket\\] no approved publication/);
});

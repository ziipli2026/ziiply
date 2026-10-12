import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseKCitymarketSpatialLeaflet} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParserCurrent.js';
import {canonicalCitymarketProductRows} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketProductRows.js';
import {printedOfferUnit} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketPrintedOfferUnit.js';

// Independently transcribed from the printed 41LV PDF, page 17.
// PDF SHA256: 34e790cb72ffb0388be16cc1f4af97115f013a2f10f3bdf10df0c9faa8f46cd6.
// These expectations describe printed totals and purchase counts, not calculated prices.
const expected = [
  ['VIHANNESSEKOITUKSET', 5, 3, 'PS'],
  ['CHICKEN SHOP PANEROIDUT KANATUOTTEET', 2.99, null, 'KPL'],
  ['FILEEKALAPUIKOT', 6.95, null, 'PKT'],
  ['BONBONS', 10, 3, 'PKT'],
  ['PASTAT', 3.50, 2, 'PS'],
  ['GOLD & GREEN', 2.99, null, 'PS'],
  ['FASUPALAT', 6, 2, 'PS'],
  ['TONNIKALAPALOJA', 4, 2, 'PRK'],
  ['TOMAATTIMURSKA', 2.69, null, 'PKT'],
];
const archive = JSON.parse(fs.readFileSync(new URL('../src/app/components/ziiply/offerSearch/providers/data/kCitymarket41LVPublisherArchive.json', import.meta.url)));
const parsed = await parseKCitymarketSpatialLeaflet(archive.entry, async input => {
  const response = archive.responses[String(input)];
  assert.ok(response, 'Every request must use the immutable archive');
  return {ok: true, status: 200, url: response.url, text: async () => response.body};
});
const rows = canonicalCitymarketProductRows(parsed.rows).filter(row => row.page === 17 && row.spatialResolved);
test('Missing units require their own price glyph and printed count', () => {
  const original = rows.find(row => row.title.includes('PASTAT'));
  const before = JSON.stringify(original);
  for (const mode of ['count', 'cents', 'column', 'ambiguity']) {
    const row = structuredClone(original);
    if (mode === 'count') row.debugNearbyBoxes = row.debugNearbyBoxes.filter(box => !(box.text === '2' && box.top === .55026));
    if (mode === 'cents') row.debugNearbyBoxes = row.debugNearbyBoxes.filter(box => !(box.text === '50' && box.left > .85));
    if (mode === 'column') row.debugCardAnchor.left -= .4;
    if (mode === 'ambiguity') row.debugNearbyBoxes.push({...row.debugNearbyBoxes.find(box => box.text === 'PS' && box.top === .55026), text: 'KPL'});
    assert.equal(printedOfferUnit(row), null, mode);
  }
  assert.equal(JSON.stringify(original), before);
});
for (const [title, value, quantity, unit] of expected) {
  test('41LV printed page 17 transaction: ' + title, () => {
    const matches = rows.filter(row => row.title.includes(title));
    assert.equal(matches.length, 1, 'Exactly one matching product');
    const price = matches[0].spatialResolved;
    assert.deepEqual({value: price.value, quantity: price.quantity ?? null, unit: printedOfferUnit(matches[0])}, {value, quantity, unit});
  });
}
test('41LV page 17 has exactly the nine resolved national transactions', () => {
  assert.equal(rows.length, expected.length);
});
test('Remaining printed ice cream offer is supplied by the frozen local publisher source', () => {
  const local = JSON.parse(fs.readFileSync(new URL('../src/app/components/ziiply/offerSearch/providers/data/kCitymarket41LVLocalPublisherArchive.json', import.meta.url)));
  const matches = local.offers.filter(entry => /Classic tai Fazer JÄÄTELÖPUIKOT/.test(entry.offer.name));
  assert.equal(matches.length, 1);
  const offer = matches[0].offer;
  assert.equal(offer.appPrice ?? offer.membershipPrice ?? offer.price, 5);
  assert.equal(offer.pieceCountFrom, 3);
  assert.equal(offer.pieceCountTo, 3);
});

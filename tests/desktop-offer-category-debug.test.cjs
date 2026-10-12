const test = require('node:test');
const assert = require('node:assert/strict');
const core = require(process.env.ZIIPLY_OFFER_CORE_DIR + '/ziiplyOfferSearchCore.js');

for (const category of ['Leipomo', 'Maitotuotteet', 'Juomat', 'Hygienia & kosmetiikka', 'Koti & vapaa-aika']) {
  test(`Citymarket cached card and category filter agree: ${category}`, () => {
    const raw = { id: category, title: 'Testituote', category, storeType: 'k-citymarket',
      storeLabel: 'K-Citymarket Hyvinkää', source: 'k-citymarket-tarjouslehti', price: 2.99, priceText: '2,99 €' };
    const mapped = core.mapZiiplyGostaOfferToCardOfferV147(raw);
    const stale = { ...mapped, category: 'Muut' };
    const finalCategory = core.getResolvedGostaCategoryV166(stale);
    assert.equal(finalCategory, category);
    assert.deepEqual(core.filterZiiplyGostaOfferResultsV146([stale], finalCategory), [stale]);
    assert.equal(core.filterZiiplyGostaOfferResultsV146([stale], 'Hevi').length, 0);
    assert.equal(stale.price, '2,99 €');
    assert.equal(raw.category, category);
  });
}
test('Lidl product-form guard is shared by cards and filters', () => {
  const raw = { id: 'pulla', title: 'Rahkapulla', category: 'Maitotuotteet', source: 'lidl', price: 1 };
  const card = core.mapZiiplyGostaOfferToCardOfferV147(raw);
  assert.equal(core.getResolvedGostaCategoryV166(card), 'Leipomo');
  assert.equal(core.filterZiiplyGostaOfferResultsV146([card], 'Maitotuotteet').length, 0);
  assert.equal(core.filterZiiplyGostaOfferResultsV146([card], 'Leipomo').length, 1);
});
test('shared cleanup rejects junk and duplicates without mutating input', () => {
  const good = { id: 'good', title: 'Oltermanni juusto', category: 'Maitotuotteet', price: 2.99 };
  const junk = { id: 'junk', title: 'Ostoskori' };
  const input = [good, { ...good }, junk];
  assert.deepEqual(core.cleanZiiplyGostaOfferResultsV146(input), [good]);
  assert.equal(input.length, 3);
});
test('DEBUG captures provider rows before cleanup and leaves prices unchanged', async () => {
  const originalFetch = global.fetch;
  const raw = { id: 'raw1', title: 'Oltermanni juusto', category: 'Maitotuotteet', price: 2.99,
    priceText: '2,99 €', storeLabel: 'K-Citymarket Debugtest', source: 'K-Citymarket tarjouslehti' };
  global.fetch = async () => new Response(JSON.stringify({ok:true,results:[raw,{...raw},{id:'junk',title:'Ostoskori'}]}));
  try {
    const result = await core.searchZiiplyGostaOffersV146({query:'',context:{kStoreId:'test',kStoreName:'K-Citymarket Debugtest'},captureDiagnostics:true});
    assert.equal(result.diagnosticInput.length,3);
    assert.equal(result.results.length,1);
    assert.equal(result.results[0].price,2.99);
    assert.equal(result.results[0].category,'Maitotuotteet');
  } finally { global.fetch = originalFetch; }
});

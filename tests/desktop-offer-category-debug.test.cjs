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

const debugCategoryCases = [
  ['RISTORANTE PAKASTEPIZZAT 269–390 g (7,69–11,15/kg)', 'Valmisruoka', 'Pakasteet'],
  ['PORON PAISTIKÄRISTYS 400 g Pakaste (37,48/kg)', 'Liha & makkarat', 'Pakasteet'],
  ['ISOT KUORELLISET KATKARAVUT 70/90 500 g MSC-sertifioitu, pakaste (13,90/kg)', 'Kala', 'Pakasteet'],
  ['iKAFFE MAUSTAMATON KAURAJUOMA 1 l', 'Juomat', 'Maitotuotteet'],
  ['POHJOISEN MAUT ATERIAT 8 kk 190 g (6,58/kg)', 'Valmisruoka', 'Lastenruoat'],
  ['ISO VÄLIPALALAJITELMA YLI 1,5 v. 12 x 150 g tai HEDELMÄSOSELAJITELMA 4–6 kk 14 x 90 g', 'Valmisruoka', 'Lastenruoat'],
];
for(const [title,oldCategory,wanted] of debugCategoryCases) {
  test(`Actual desktop DEBUG category correction: ${title}`, () => {
    const raw={id:title,title,category:oldCategory,storeType:'K-Citymarket',source:'K-Citymarket tarjouslehti',
      price:9,priceText:'9,00 € / 3 KPL',offerQuantity:3,imageUrl:'/verified-publisher-photo.svg#card'};
    const snapshot=JSON.stringify(raw);
    const card=core.mapZiiplyGostaOfferToCardOfferV147(raw);
    assert.equal(card.category,wanted);
    assert.deepEqual(core.filterZiiplyGostaOfferResultsV146([card],wanted),[card]);
    assert.equal(core.filterZiiplyGostaOfferResultsV146([card],oldCategory).length,0);
    assert.equal(card.price,raw.priceText);
    assert.equal(card.imageUrl,raw.imageUrl);
    assert.equal(card.__sourceOfferSearchResult.offerQuantity,3);
    assert.equal(JSON.stringify(raw),snapshot);
  });
}
test('Adult package counts do not turn ready meals into infant food', () => {
  const row={title:'ATERIAT 8 kpl 300 g',category:'Valmisruoka',storeType:'K-Citymarket'};
  assert.equal(core.getResolvedGostaCategoryV166(row),'Valmisruoka');
});
test('Different selected-store campaign cards survive even with the same EAN, title and price', () => {
  const first={id:'local-1',title:'Coca-Cola Original 24-pack',price:13.99,ean:'6410000000001',
    provider:'kcitymarket-local',storeId:'selected-store',offerId:'card-a',debug:{publicationId:'publication-a'},campaignType:'campaign'};
  const second={...first,id:'local-2',offerId:'card-b'};
  const third={...first,id:'local-3',debug:{publicationId:'publication-b'}};
  assert.deepEqual(core.cleanZiiplyGostaOfferResultsV146([first,second,third,{...first}]),[first,second,third]);
});

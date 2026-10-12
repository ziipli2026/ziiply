// Mapper inputs reconstructed from the 2026-10-12 Hakalantori debug snapshot;
// this tests mapping, not completeness of the upstream leaflet fetch.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync('src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts', 'utf8');
const context = { exports: {}, require: id => id === '../kOfferTabPolicy' ? {} : require(id) };
vm.runInNewContext(ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, context);
const map = (x, i=0) => context.exports.mapTjekOffer(x,i,'K375','K-Market Hakalantori','K-Market','K-Market');
const inputs = require('../tests/fixtures/kmarket-hakalantori-price-inputs.json');
const results = inputs.map(map);
assert.equal(results.filter(Boolean).length,33);
assert.equal(results.filter(x=>x.campaignType==='offer').length,4);
assert.equal(results.filter(x=>x.campaignType==='campaign').length,29);
results.forEach((x,i)=>{assert.equal(x.price,inputs[i].price);assert.equal(x.category,inputs[i].expectedCategory);assert.equal(x.offerId,inputs[i].publicId);});
const find = name => results.find(x=>x.title.includes(name));
assert.equal(find('kesäkurpitsa').offerPrice,'1,69 € / kg');
assert.equal(find('syöntikypsä mango').offerPrice,'2,99 € / kg');
assert.equal(find('omenapussi').offerPrice,'2,99');
assert.equal(find('jääsalaatti').offerPrice,'0,99');
assert.equal(find('Calluna').offerPrice,'12,90 € / 3 kpl');
assert.equal(find('puolukka-').unitPrice,'2,89 €/l');
assert.equal(find('Löfbergs').unitPrice,'13,98–17,48 €/kg');
assert.equal(find('Hook').unitPrice,'7,99–13,98 €/kg');
assert.equal(find('Ben&Jerry').unitPrice,'12,88–14,03 €/l');
assert.equal(find('ISOt burgerit').unitPrice,'13,61–15,15 €/kg');
assert.equal(find('tonnikalat').unitPrice,'8,82–13,16 €/kg');
assert.equal(find('Palmolive').unitPrice,'8,00 €/l');
const base={name:'Testituote 250 g',price:2,unitPrice:8,baseUnit:'kilogram'};
assert.equal(map({...base,description:'Ilman Plussa-korttia 3,00/kpl (12,00/kg)'}).unitPrice,'8,00 €/kg');
assert.equal(map({...base,description:'8,00–9,00 €/kg Ilman Plussa-korttia 12,00/kg'}).unitPrice,'8,00–9,00 €/kg');
assert.equal(map({...base,description:'',baseUnit:'piece',unitPrice:2}).unitPrice,'2,00 €/kpl');
const other = map({...inputs[0],publicationPublicId:'another-publication',publicId:'another-source-card'});
assert.equal(other.title,results[0].title);
assert.notEqual(other.offerId,results[0].offerId);
console.log('PASS: 33 Hakalantori rows, categories, tab counts, price ranges, units, bundles and normal-price boundaries');

// Verify the actual shared card formatters as well as provider data.
const card = fs.readFileSync('src/app/components/ziiply/cards/ZiiplyMobileOfferSearchCard.tsx','utf8');
const slice = (start,end) => card.slice(card.indexOf(start),card.indexOf(end));
const formatSource = slice('function normalizePrice(', 'function getNumericPrice(') +
  slice('export function getOfferPrice(', '// Shared display-only price layout') +
  slice('function getOfferComparisonPrice(', 'function getOfferImage(') +
  '\nexports.comparison=getOfferComparisonPrice;';
const formatContext={exports:{}};
vm.runInNewContext(ts.transpileModule(formatSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,formatContext);
for(const x of results){
  const cardItem={offerPrice:x.offerPrice,unitPrice:x.unitPrice,__sourceOfferSearchResult:x};
  assert.equal(formatContext.exports.comparison(cardItem),x.unitPrice);
  if(x.priceText.includes('€')) assert.equal(formatContext.exports.getOfferPrice(cardItem),x.priceText);
}
console.log('PASS: actual card preserves comparison units/ranges and transaction prices');

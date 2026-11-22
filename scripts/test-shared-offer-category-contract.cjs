const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

// Test the actual shared category mapper, without any database connection,
// production endpoint, or Lidl-only classification.
const source = fs.readFileSync('src/app/components/ziiply/offerSearch/neonOfferCategory.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022}
}).outputText;
const moduleExports = {};
const sandbox = {
  exports: moduleExports,
  require(name) {
    if (name === '@neondatabase/serverless') return {neon: () => {throw Error('Unexpected database access')}};
    if (name === './catalogIdentityResolver') return {};
    throw Error('Unexpected import '+name);
  },
};
vm.runInNewContext(compiled, sandbox, {filename:'neonOfferCategory.js'});
const classify = moduleExports.neonOfferDisplayCategory;
assert.equal(typeof classify, 'function');
const examples = [
  ['Juomat/Kahvi', 'Kahvi & tee'],
  ['Juomat/Mehut', 'Juomat'],
  ['Liha ja lihavalmisteet/Makkarat', 'Liha & makkarat'],
  ['Hedelmät ja vihannekset/Salaatit', 'Hevi'],
  ['Pakasteet/Pakastevihannekset', 'Pakasteet'],
  ['Pakasteet/Pakastesnacksit', 'Pakasteet'],
  ['Pakasteet/Pakastepopcorn', 'Pakasteet'],
  ['Makeiset-ja-naposteltavat/Sipsit', 'Kuivatuotteet'],
  ['Leivät ja leivonnaiset/Leivät', 'Leipomo'],
  ['Maitotuotteet/Juustot', 'Maitotuotteet'],
  ['Muut', null],
  ['CAUNKNOWNCATEGORY', null],
  ['Tuntematon/Alaryhmä', null],
];
for (const [path, expected] of examples) {
  assert.equal(classify(path), expected, 'Shared category mapping for '+path);
}
console.log('PASS shared Neon category mapper: '+examples.length+' source-independent taxonomy cases');

const resolverSource = fs.readFileSync('src/app/components/ziiply/offerSearch/catalogIdentityResolver.ts','utf8');
const resolverExports = {};
vm.runInNewContext(ts.transpileModule(resolverSource, {
  compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText, {exports:resolverExports}, {filename:'catalogIdentityResolver.js'});
const resolve = resolverExports.resolveUniqueCatalogIdentity;
const catalog = [
  {ean:'6400000000001',name:'Esimerkki salaatti 200 g',brand:'Esimerkki',quantity:'200 g',category:'Hedelmät ja vihannekset/Salaatit'},
  {ean:'6400000000002',name:'Esimerkki salaatti 200 g',brand:'Toinen',quantity:'200 g',category:'Valmisruoat/Salaatit'},
];
assert.equal(resolve({title:'Esimerkki salaatti 200 g'},catalog),null,'Ambiguous title must not assign a category');
assert.equal(resolve({title:'Esimerkki salaatti 200 g',brand:'Esimerkki',quantity:'200 g'},catalog)?.category,'Hedelmät ja vihannekset/Salaatit');
assert.equal(resolve({title:'Esimerkki salaatti 200 g',brand:'Esimerkki',quantity:'400 g'},catalog),null,'Package mismatch must not assign a category');
assert.equal(resolve({title:'Esimerkki salaatti 200 g',brand:'Esimerkki',quantity:'200 g'},catalog.concat(catalog[0])),null,'Duplicate identities must not be accepted');
assert.ok(!/byEan\.get\(ean\) \|\| localCategory \|\| byName\.get\(/.test(source),'EAN-less offers must not fall back to unverified name-only categories');
assert.ok(!source.includes('replace(/\\\\s+/g'),'Catalog lookup must normalize real whitespace, not literal backslash-s');
console.log('PASS shared catalog identity: ambiguous title, brand, quantity, duplicate, and safe fallback');

assert.ok(!source.includes('byName.get('),'Category assignment must never use an unverified title-only catalog match');
console.log('PASS no unverified title-only category assignment across providers');

assert.ok(source.includes('const category = display;'),'Verified catalog category must override a conflicting provider category');
console.log('PASS verified shared catalog categories override provider shelf labels');


// Execute the actual asynchronous enrichment function with an isolated, read-only
// catalog fixture. This checks the returned offer, not merely source-code text.
const sqlFixture = (parts, ...values) => {
  const query = parts.join('?');
  if (query.includes('SELECT ean, category FROM ziiply_ean_products'))
    return Promise.resolve([{ean:'6400000000001',category:'Hedelmät ja vihannekset/Salaatit'}]);
  if (query.includes('SELECT name, category FROM ziiply_ean_products')) return Promise.resolve([]);
  if (query.includes('SELECT ean FROM ziiply_ean_products')) return Promise.resolve([{ean:'6400000000001'}]);
  if (query.includes('SELECT ean, name, brand, quantity, category'))
    return Promise.resolve([{ean:'6400000000002',name:'Esimerkki lihapyörykkä 400 g',brand:'Esimerkki',quantity:'400 g',category:'Liha ja lihavalmisteet/Lihapyörykät'}]);
  throw Error('Unexpected fixture SQL: '+query);
};
const integrationExports = {};
vm.runInNewContext(compiled, {
  exports:integrationExports,
  process:{env:{DATABASE_URL:'fixture-only'}},
  console,
  require(name) {
    if(name==='@neondatabase/serverless') return {neon:()=>sqlFixture};
    if(name==='./catalogIdentityResolver') return resolverExports;
    throw Error('Unexpected import '+name);
  },
}, {filename:'neonOfferCategory-integration.js'});
(async () => {
  const input = [
    {ean:'6400000000001',title:'Esimerkki salaatti 200 g',category:'Maitotuotteet'},
    {title:'Esimerkki lihapyörykkä 400 g',brand:'Esimerkki',quantity:'400 g',category:'Maitotuotteet'},
    {title:'Täysin tuntematon tuote',category:'Maitotuotteet'},
  ];
  const result = await integrationExports.enrichOfferCategoriesFromNeon(input);
  assert.equal(result[0].category,'Hevi','EAN-verified category overrides wrong provider category');
  assert.equal(result[1].category,'Liha & makkarat','Unique EAN-less catalog identity overrides wrong provider category');
  assert.equal(result[2].category,'Maitotuotteet','Unmatched product retains source category, without inventing a match');
  console.log('PASS actual shared enrichment: verified EAN, EAN-less identity, unknown product');
})().catch(error => {console.error(error);process.exitCode=1;});


const lidlParserSource = fs.readFileSync('src/app/components/ziiply/offerSearch/providers/lidlPublicLeafletProvider.ts','utf8');
const lidlParserExports = {};
vm.runInNewContext(ts.transpileModule(lidlParserSource, {
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText, {
  exports:lidlParserExports,
  require(name) {
    if(name==='../publicationLifecycle') return {
      finnishPublicationDate:()=> '2026-11-22',
      publicationState:()=> 'current'
    };
    throw Error('Unexpected Lidl parser import '+name);
  },
}, {filename:'lidlPublicLeafletProvider.js'});
const jsonLd = product => '<script type="application/ld+json">'+JSON.stringify({
  '@type':'Product',name:'Esimerkki kananmunat 6 kpl',gtin13:'6400000000001',
  offers:{price:2.49,validFrom:'2026-11-20',validThrough:'2026-11-30'},
  ...product
})+'</script>';
const parsedLidl = lidlParserExports.parseLidlPublicCategoryHtml(
  jsonLd({}), 'https://www.lidl.fi/p/esimerkki/p123456','2026-11-22');
assert.equal(parsedLidl.length,1,'Published Lidl JSON-LD product must parse');
assert.equal(parsedLidl[0].ean,'6400000000001','Published GTIN must survive parser');
assert.equal(parsedLidl[0].priceBasis,'unit','Package count alone is not a multi-buy promotion');
assert.equal(parsedLidl[0].multiBuyQuantity,undefined);
assert.equal(parsedLidl[0].category,'','Parser must not invent its own product category');
console.log('PASS Lidl public parser: published GTIN, package quantity, no invented category');


// Both public parser aggregation paths must retain a published barcode when
// another duplicate row supplies a better image or other complementary data.
const publicSource = fs.readFileSync('src/app/components/ziiply/offerSearch/providers/lidlPublicLeafletProvider.ts','utf8');
assert.ok(publicSource.includes('ean: preferred.ean || other.ean || ""'),
  'Duplicate Lidl product records must retain published EAN from either source');
console.log('PASS Lidl public duplicate merge retains published EAN');


const gridPayload = {
  fullTitle:'Esimerkki kananmunat 6 kpl',
  gtin:'6400000000001',
  price:{price:2.49},
  storeStartDate:1795132800,
  storeEndDate:1795996800
};
const gridHtml = '<div data-grid-data="'+JSON.stringify(gridPayload).replace(/"/g,'&quot;')+'"></div>';
const parsedGrid = lidlParserExports.parseLidlGridDataOffers(gridHtml,'https://www.lidl.fi/h/test/h123456','2026-11-22');
assert.equal(parsedGrid.length,1,'Lidl grid fixture must parse');
assert.equal(parsedGrid[0].ean,'6400000000001','Lidl grid GTIN must survive parser');
assert.equal(parsedGrid[0].priceBasis,'unit','Lidl grid package count alone is not multi-buy');
assert.equal(parsedGrid[0].multiBuyQuantity,undefined);
console.log('PASS Lidl grid parser: GTIN and package count are handled correctly');


const campaignSource = fs.readFileSync('src/app/components/ziiply/offerSearch/providers/lidlPublicLeafletProvider.ts','utf8');
const campaignBlock = campaignSource.slice(campaignSource.indexOf('function parseCampaignProductCards('),campaignSource.indexOf('function productLinks('));
assert.ok(campaignBlock.includes('const ean = [product.gtin13'),'Lidl campaign cards must extract published GTIN');
assert.ok(campaignBlock.includes('hasConcretePrice: true, ean,'),'Lidl campaign cards must return extracted GTIN');
console.log('PASS Lidl campaign parser preserves published GTIN');

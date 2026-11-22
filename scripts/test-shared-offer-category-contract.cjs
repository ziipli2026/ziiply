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

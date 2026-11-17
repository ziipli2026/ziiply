const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const path = require('node:path');

// Exercise the exact production watchOfferKey function, not a copied rewrite.
const source = fs.readFileSync(path.join(__dirname, '../src/app/api/offers/watch/route.ts'), 'utf8');
const begin = source.indexOf('function norm(');
const end = source.indexOf('// Reuse completed scans', begin);
assert.ok(begin >= 0 && end > begin);
const isolated = source.slice(begin, end);
const js = ts.transpileModule(isolated + '\nexports.watchOfferKey=watchOfferKey;', {
  compilerOptions: {target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
}).outputText;
const isolatedExports = {};
vm.runInNewContext(js, {exports: isolatedExports});
const key = (row,store='Prisma Hyvinkää') => isolatedExports.watchOfferKey('S',store,row);
const base = {title:'Kotimaista Kirjolohifilee 300-400g vak, pakaste',ean:'2396012500002',
  price:'3,12 €',offerPrice:'3,12 €',source:'skaupat',id:'2396012500002'};
test('same Prisma campaign product with EAN and campaign IDs deduplicates',()=>{
  const mirror={...base,id:'prisma-campaign-634976534-2396012500002'};
  assert.equal(key(base),key(mirror));
});
test('distinct Prisma prices and campaign conditions remain distinct',()=>{
  const mirror={...base,id:'prisma-campaign-634976534-2396012500002'};
  assert.notEqual(key(base),key({...mirror,price:'4,12 €',offerPrice:'4,12 €'}));
  assert.notEqual(key(base),key({...mirror,requiresLidlPlus:true}));
});
test('other Prisma campaign IDs and other stores are not silently collapsed',()=>{
  assert.notEqual(key(base),key({...base,id:'prisma-campaign-other-source-2396012500002'}));
  const other={...base,id:'prisma-campaign-634976534-2396012500002'};
  assert.notEqual(key(base,'S-market Jokela'),key(other,'S-market Jokela'));
  assert.notEqual(key(base),key({...other,source:'other-provider'}));
});

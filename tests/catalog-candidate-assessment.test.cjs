const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/app/components/ziiply/offerSearch/catalogCandidateAssessment.ts'),'utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const compiledExports = {};
vm.runInNewContext(compiled,{exports:compiledExports});
const assess = compiledExports.assessCatalogCandidate;
const product = {ean:'6412345678901',name:'Esimerkki kaurajuoma 1 l',brand:'Esimerkki',quantity:'1 l',category:'Juomat'};
test('candidate with matching package is eligible but not verified identity',()=>{
  assert.equal(assess({title:'Esimerkki kaurajuoma 1 l'},product).reason,'candidate-only');
});
test('different package sizes reject candidate',()=>{
  assert.equal(assess({title:'Esimerkki kaurajuoma 2 l'},{...product,name:'Esimerkki kaurajuoma 2 l',quantity:'1 l'}).reason,'candidate-only');
  assert.equal(assess({title:'Esimerkki kaurajuoma 1 l'},{...product,name:'Esimerkki kaurajuoma 2 l'}).eligible,false);
});
test('missing pack in offer cannot verify packaged SKU',()=>{
  assert.equal(assess({title:'Esimerkki kaurajuoma'},product).reason,'pack-unverified');
});
test('brand mismatch rejects candidate',()=>{
  assert.equal(assess({title:'Esimerkki kaurajuoma 1 l',brand:'Toinen'},product).reason,'brand-conflict');
});
test('partial word does not match',()=>{
  assert.equal(assess({title:'Esimerkki kaura'},product).eligible,false);
});

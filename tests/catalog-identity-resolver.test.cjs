const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/app/components/ziiply/offerSearch/catalogIdentityResolver.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
vm.runInNewContext(compiled, {exports});
const {resolveUniqueCatalogIdentity: resolve} = exports;
const product = {ean:'6412345678901',name:'Esimerkki kaurajuoma 1 l',brand:'Esimerkki',quantity:'1 l',category:'Juomat'};

test('unique full identity is accepted', () => {
  assert.equal(resolve({title:'ESIMERKKI KAURAJUOMA 1 L',brand:'Esimerkki',quantity:'1 l'},[product]).ean,product.ean);
});
test('similar title does not match', () => {
  assert.equal(resolve({title:'Esimerkki kaurajuoma 2 l'},[product]),null);
});
test('brand and quantity conflicts reject candidates', () => {
  assert.equal(resolve({title:product.name,brand:'Toinen'},[product]),null);
  assert.equal(resolve({title:product.name,quantity:'2 l'},[product]),null);
});
test('multiple EAN candidates are ambiguous even if category agrees', () => {
  assert.equal(resolve({title:product.name},[product,{...product,ean:'6412345678902'}]),null);
});
test('invalid EAN and insufficient title are rejected', () => {
  assert.equal(resolve({title:product.name},[{...product,ean:'123'}]),null);
  assert.equal(resolve({title:'Maito'},[product]),null);
});

const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const file='src/app/components/ziiply/offerSearch/providers/kCitymarketPackageTransaction.ts';
const context={exports:{}};vm.runInNewContext(ts.transpile(fs.readFileSync(file,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}),context);const resolve=context.exports.resolvePackageTransaction;
for(const [title,desc,price,count] of [
 ['Actimel','8 x 100 g (4,61/kg) Ilman Plussa-korttia 5,15/pkt (6,44/kg)',3.69,8],
 ['Tomaattimurska 3 x 400 g','(2,24/kg)',2.69,3],
 ['Mehu 2 dl 24-pack','(2,08/l)',10,24],
 ['Virvoitusjuoma 0,33 l 24-pack','(1,08/l) Sis. pantit 2,40',10.99,24]
])test('Contents are not multibuy: '+title,()=>{const r=resolve(title,desc,price,count,99,'kg');assert.equal(r.quantity,null);assert.equal(r.packageCount,count);assert.notEqual(r.unitPrice,99);});
test('Three whole packages remain a multibuy',()=>assert.equal(resolve('3 x 400 g','(2,24/kg)',8.07,3,2.57,'kg').quantity,3));
test('Ambiguous rates cannot prove package contents',()=>assert.equal(resolve('8 x 100 g','(4,61/kg) (6,44/kg)',3.69,8,6.44,'kg').quantity,8));
test('Split-card prices require printed cents and matching owned rate',async()=>{const {verifiedSplitAcrossCardsSingle,verifiedDecimalBundle}=await import('../src/app/components/ziiply/offerSearch/providers/kCitymarketPrintedBundleProof.js');const f=JSON.parse(fs.readFileSync('tests/fixtures/citymarket/printed-transactions-v130.json'));for(const {row,expected} of f.corrections){const r=verifiedSplitAcrossCardsSingle(row)||verifiedDecimalBundle(row);assert.deepEqual({value:r.value,quantity:r.quantity??null,unit:r.unit},expected);}const r=structuredClone(f.corrections[0].row);r.package={...r.package,min:1,max:1};assert.equal(verifiedSplitAcrossCardsSingle(r),null);});

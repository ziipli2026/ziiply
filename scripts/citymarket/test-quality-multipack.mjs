import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source=readFileSync('src/app/components/ziiply/offerSearch/citymarketQuality.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
new Function('module','exports',js)(mod,mod.exports);
const inspect=mod.exports.inspectCitymarketOffers;
const base={category:'Juomat',imageUrl:'/verified.png',price:12.99,depositAmount:2.40,unitPrice:1.34,offerQuantity:1};
const pack=inspect([{...base,title:'VIRVOITUSJUOMAT 0,33 l/pl 24-pack'}]);
assert.equal(pack.inconsistentUnitPrices,0,'24-pack must divide total liquid volume by 24');
const categorySource=readFileSync('src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts','utf8');
assert.match(categorySource,/dr\\s\+jackson/, 'Dr Jackson range needs an explicit category mapping');
for(const [title,price,quantity,unitPrice] of [
  ['ALKOHOLITON OLUT 0,0 % 0,33 l/tlk',4,3,3.59],
  ['SIIDERIT 0,0 % 0,33 l/tlk',4.5,3,4.09],
  ['LONG DRINK 0 % 0,33 l/tlk',3.1,2,4.24],
  ['MOCKTAILIT 0,33 l/tlk',4.3,3,3.89],
]){
  const result=inspect([{...base,title,price,offerQuantity:quantity,unitPrice}]);
  assert.equal(result.inconsistentUnitPrices,0,title+' must exclude the 0.15 euro/can deposit');
}
assert.equal(inspect([{...base,title:'KANANPOJAN FILEEPIHVIT 1 kg (7,99/kg)',price:4.99,unitPrice:7.99}]).inconsistentUnitPrices,1,'unverified chicken price mismatch must stay blocked');
assert.equal(inspect([{...base,title:'VIRVOITUSJUOMAT 0,33 l/tlk 6-PACK',price:.85,unitPrice:2.57}]).inconsistentUnitPrices,1,'unverified six-pack total must stay blocked');
const single=inspect([{...base,title:'VIRVOITUSJUOMAT 0,33 l/pl'}]);
assert.equal(single.inconsistentUnitPrices,1,'A single bottle must not inherit the 24-pack exemption');
const bad=inspect([{...base,title:'VIRVOITUSJUOMAT 0,33 l/pl 24-pack',unitPrice:4.44}]);
assert.equal(bad.inconsistentUnitPrices,1,'Wrong multipack unit price must still fail');
console.log('Citymarket multipack quality audit: 3 checks passed');

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyPrintedTransaction} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketPrintedTransactionProof.js';
import {productish} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParserCurrent.js';
// Expected transactions were visually checked against the immutable PDFs,
// 43AV pages 3/6 and 43LV pages 6/9. Fixtures keep the original wrong input.
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/citymarket/printed-transaction-proof-cases.json',import.meta.url)));
for(const c of fixture.cases)test(c.source+' p'+c.page+' '+c.row.title,()=>{
 const before=JSON.stringify(c.row);
 const result=verifyPrintedTransaction(c.row,fixture.pages[c.source+':'+c.page]);
 assert.equal(result.spatialResolved?.value,c.expected.value);
 assert.equal(result.spatialResolved?.quantity||1,c.expected.quantity);
 assert.equal(JSON.stringify(c.row),before,'Proof cannot mutate earlier parser evidence');
 const renamed=verifyPrintedTransaction({...c.row,title:'RIIPPUMATON TUOTENIMI'},fixture.pages[c.source+':'+c.page]);
 assert.equal(renamed.spatialResolved?.value,c.expected.value,'The rule cannot depend on product names');
});
test('A nearby rate cannot override an internally consistent transaction',()=>{
 const c=fixture.cases[0],row={...c.row,package:{min:1,max:1,raw:'1 kg'},unitPrice:{min:7.99,max:7.99},spatialResolved:{value:7.99,quantity:1},debugCardPrice:{...c.row.debugCardPrice,value:3}};
 assert.equal(verifyPrintedTransaction(row,fixture.pages[c.source+':'+c.page]).spatialResolved.value,7.99);
});
test('Seasonal candy remains food; seasonal decorations remain excluded',()=>{
 assert.equal(productish('HALLOWEEN MAKEISPUSSILAJITELMAT 175–200 g'),true);
 assert.equal(productish('HALLOWEEN PAPERILYHTY 3 kpl'),false);
 assert.equal(productish('KELTAINEN SUNGOLD KIIVI'),true);
 assert.equal(productish('BATAATTI'),true);
});

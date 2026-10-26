import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseKCitymarketSpatialLeaflet} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParserCurrent.js';

// Immutable publisher geometry from 44AV, captured on 2026-10-25.
// This checks parser evidence, not full printed-PDF approval.
const frozen=JSON.parse(fs.readFileSync(new URL('./fixtures/citymarket/44AV.publisher-responses.json',import.meta.url)));
test('Parenthesized unit rates discard contained character fragments and prove multibuy totals',async()=>{
 const parsed=await parseKCitymarketSpatialLeaflet(frozen.entry,async input=>{
  const r=frozen.responses[String(input)];assert.ok(r,'Only frozen publisher responses are used');
  return {ok:true,status:200,url:r.url,text:async()=>r.body};
 });
 assert.equal(parsed.pageCount,18);
 assert.equal(parsed.rows.length,35);
 const row=parsed.rows.find(r=>r.page===5&&r.title==='KIISSELIT 365 g');
 assert.ok(row);
 assert.equal(row.spatialResolved.value,5);
 assert.equal(row.spatialResolved.quantity,3);
 assert.equal(row.spatialResolved.unit,'KPL');
 assert.equal(row.unitPrice.min,4.57);
 assert.equal(row.unitPrice.max,4.57);
 assert.deepEqual(row.normal,{min:1.95,max:1.95,unit:'KPL'});
 assert.equal(row.debugPriceOwnershipConflict,undefined);
 assert.equal(parsed.rows.filter(r=>!r.spatialResolved&&!(r.percentageOffer?.percent>0)).length,0);
});

import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {parseKCitymarketSpatialLeaflet} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParserCurrent.js';
import {verifiedPrintedBundle,verifiedMergedEuroCents,verifiedCompoundOfferCount,verifiedDecimalBundle,verifiedLargeHeadlineBundle} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketPrintedBundleProof.js';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/citymarket/printed-transactions-v129.json',import.meta.url)));
const next=JSON.parse(fs.readFileSync(new URL('./fixtures/citymarket/printed-transactions-v130.json',import.meta.url)));
const archive=JSON.parse(fs.readFileSync(new URL('../src/app/components/ziiply/offerSearch/providers/data/kCitymarket41LVPublisherArchive.json',import.meta.url)));
const repair=r=>verifiedPrintedBundle(r)||verifiedMergedEuroCents(r)||verifiedCompoundOfferCount(r)||verifiedDecimalBundle(r)||verifiedLargeHeadlineBundle(r);
const transaction=r=>r?{value:r.value,quantity:r.quantity??null,unit:r.unit??null}:null;
for(const {row,expected} of fixture.corrections)test('Printed transaction: '+row.title,()=>assert.deepEqual(transaction(repair(row)),expected));
test('Full immutable 41LV source retains all other transactions',async()=>{
 const parsed=await parseKCitymarketSpatialLeaflet(archive.entry,async input=>{const r=archive.responses[String(input)];assert.ok(r,'archived response');return {ok:true,status:200,url:r.url,text:async()=>r.body};});
 assert.equal(parsed.rows.length,fixture.baseline.length);
 const fixes=new Map([...fixture.corrections,...next.corrections].map(x=>[x.row.page+':'+x.row.title,x.expected]));
 for(let i=0;i<parsed.rows.length;i++){
  const row=parsed.rows[i],base=fixture.baseline[i];assert.equal(row.title,base.title);
  assert.deepEqual(transaction(row.spatialResolved),fixes.get(base.page+':'+base.title)||base.transaction,base.title);
 }
 const cheese=parsed.rows.find(r=>r.title.includes('LEIPÄJUUSTO'));assert.equal(cheese.unitPrice.min,14.21);assert.equal(cheese.spatialResolved.value,1.99);
 for(const row of parsed.rows.filter(r=>r.spatialResolved?.source.startsWith('printed-')))assert.equal(row.percentageOffer,null);
});
test('Merged neighbour glyph cannot override inconsistent owned unit rate',()=>{const r=structuredClone(fixture.corrections.find(x=>x.row.title.includes('KANATUOTTEET')).row);r.package={...r.package,min:1,max:1};assert.equal(verifiedMergedEuroCents(r),null);});
test('Compound discount without the printed count cannot invent a quantity',()=>{const r=structuredClone(fixture.corrections.find(x=>x.row.title.includes('SININEN')).row);r.debugNearbyBoxes=r.debugNearbyBoxes.filter(b=>!b.text.includes('4KPL'));assert.equal(verifiedCompoundOfferCount(r),null);});
test('Headline total without its package label cannot invent a multibuy',()=>{const r=structuredClone(fixture.corrections.find(x=>x.row.title.includes('COSTA RICA')).row);r.debugNearbyBoxes=r.debugNearbyBoxes.filter(b=>b.text!=='PKT');assert.equal(verifiedLargeHeadlineBundle(r),null);});
test('Missing decimal total without printed cents remains unresolved',()=>{const r=structuredClone(fixture.corrections.find(x=>x.row.title.includes('JUUSTORAASTE')).row);r.debugNearbyBoxes=r.debugNearbyBoxes.filter(b=>b.text!=='50');assert.equal(verifiedDecimalBundle(r),null);});

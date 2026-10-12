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
 const meal=parsed.rows.filter(r=>r.title==='RUUKUT ja KULHOT 300 g');
 assert.equal(meal.length,1);assert.equal(meal[0].page,14);assert.deepEqual(transaction(meal[0].spatialResolved),{value:10,quantity:4,unit:'KPL'});
 const percentages=parsed.rows.filter(r=>['LUMENE PUUTERIT','LUMENE KULMATUOTTEET'].includes(r.title));
 assert.equal(percentages.length,2);for(const r of percentages){assert.equal(r.spatialResolved,null);assert.equal(r.percentageOffer.percent,40);}
 const wrapped=parsed.rows.filter(r=>r.percentageOffer?.source==='wrapped-column-printed-percentage');
 assert.deepEqual(wrapped.map(r=>[r.title,r.percentageOffer.percent,r.spatialResolved]),[
 ['MAX FACTOR MEIKIT',30,null],
 ['EYLURE ja ELEGANT TOUCH TUOTTEET',30,null],
 ['MOSSA TUOTTEET',40,null],
 ['LUMENE IHONHOITO- ja PUHDISTUSTUOTTEET',40,null],
 ['SMUUTI SKIN ja COSRX -TUOTTEET',25,null],
 ['BONDI SANDS ITSERUSKETTAVAT TUOTTEET',25,null],
 ['WELLAFLEX WELLA DELUXE ja SHOCKWAVES HIUSTENMUOTOILUTUOTTEET sekä CLAIROL HIUSVÄRIT',25,null],
 ['DEFINE HIUSTENHOITO- ja MUOTOILUTUOTTEET 100–750 ml',20,null],
 ['TENA PRO SKIN TUOTTEET',25,null],
 ['AIRFRYERIN SUOJAPAPERIT 50 kpl',20,null],
 ['PENTIK LAUTASLIINAT 20 kpl 25 ja 33 cm',15,null]]);
 const tissue=parsed.rows.find(r=>r.title==='Lotus Nessu NENÄLIINA 100 kpl Valkoinen');
 assert.ok(tissue);assert.deepEqual(transaction(tissue.spatialResolved),{value:4,quantity:2,unit:'PKT'});assert.equal(tissue.percentageOffer,null);
 const recovered=parsed.rows.filter(r=>r.debugRecoveredPrintedPrice);
 assert.deepEqual(recovered.map(r=>[r.page,r.title,transaction(r.spatialResolved)]),[[20,'WOK-KASTIKKEET 120 g',{value:1,quantity:null,unit:'PS'}],[20,'PEHMOVITA MONIVITAMIINIT 75 kpl (0,13/kpl)',{value:9.99,quantity:null,unit:'PRK'}]]);
 const existing=parsed.rows.filter(r=>!recovered.includes(r)&&r!==meal[0]&&r!==tissue&&!percentages.includes(r)&&!wrapped.includes(r));
 const baseline=fixture.baseline.filter(r=>!r.title.startsWith('Lotus Nessu NENÄLIINA 100 kpl Valkoinen Plussa-kortilla'));
 assert.equal(existing.length,baseline.length);
 const fixes=new Map([...fixture.corrections,...next.corrections].map(x=>[x.row.page+':'+x.row.title,x.expected]));
 for(let i=0;i<existing.length;i++){
  const row=existing[i],base=baseline[i];assert.equal(row.title,base.title);
  assert.deepEqual(transaction(row.spatialResolved),fixes.get(base.page+':'+base.title)||base.transaction,base.title);
 }
 const cheese=parsed.rows.find(r=>r.title.includes('LEIPÄJUUSTO'));assert.equal(cheese.unitPrice.min,14.21);assert.equal(cheese.spatialResolved.value,1.99);
 for(const row of parsed.rows.filter(r=>r.spatialResolved?.source.startsWith('printed-')))assert.equal(row.percentageOffer,null);
});
test('Merged neighbour glyph cannot override inconsistent owned unit rate',()=>{const r=structuredClone(fixture.corrections.find(x=>x.row.title.includes('KANATUOTTEET')).row);r.package={...r.package,min:1,max:1};assert.equal(verifiedMergedEuroCents(r),null);});
test('Compound discount without the printed count cannot invent a quantity',()=>{const r=structuredClone(fixture.corrections.find(x=>x.row.title.includes('SININEN')).row);r.debugNearbyBoxes=r.debugNearbyBoxes.filter(b=>!b.text.includes('4KPL'));assert.equal(verifiedCompoundOfferCount(r),null);});
test('Headline total without its package label cannot invent a multibuy',()=>{const r=structuredClone(fixture.corrections.find(x=>x.row.title.includes('COSTA RICA')).row);r.debugNearbyBoxes=r.debugNearbyBoxes.filter(b=>b.text!=='PKT');assert.equal(verifiedLargeHeadlineBundle(r),null);});
test('Missing decimal total without printed cents remains unresolved',()=>{const r=structuredClone(fixture.corrections.find(x=>x.row.title.includes('JUUSTORAASTE')).row);r.debugNearbyBoxes=r.debugNearbyBoxes.filter(b=>b.text!=='50');assert.equal(verifiedDecimalBundle(r),null);});

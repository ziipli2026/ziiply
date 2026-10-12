import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ownedPrintedNormalPrice,parseKCitymarketSpatialLeaflet} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParserCurrent.js';
const root='../src/app/components/ziiply/offerSearch/providers/data/kCitymarket41LVPublisherArchive.json';
const archive=JSON.parse(fs.readFileSync(new URL(root,import.meta.url)));
const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/citymarket/v152-normal-price-transactions.json',import.meta.url)));
const box=(text,left,top,width=.02,height=.009)=>({text,left,top,width,height});
const row={imageAnchor:{left:.1,top:.2,height:.015}};
const reference=(left=.1,top=.24,euro='2',cents='85/prk')=>[
 box('Ilman',left,top,.023),box('Plussa-korttia',left+.026,top,.06),
 box(euro,left+.09,top,.006),box(cents,left+.098,top,.03)];
test('Only the title column can supply a normal price, including PRK',()=>{
 const input=reference(),before=JSON.stringify(input);
 assert.deepEqual(ownedPrintedNormalPrice(row,input),{min:2.85,max:2.85,unit:'PRK',text:'Ilman Plussa-korttia 2,85/prk',left:.1,top:.24});
 assert.equal(JSON.stringify(input),before);
 assert.equal(ownedPrintedNormalPrice(row,reference(.4)),null);
 assert.equal(ownedPrintedNormalPrice(row,reference(.1,.18)),null);
 assert.equal(ownedPrintedNormalPrice(row,reference(.1,.4)),null);
});
test('Conflicting labels and a following product title remain unresolved',()=>{
 assert.equal(ownedPrintedNormalPrice(row,[...reference(),...reference(.1,.26,'4','29/prk')]),null);
 const other={imageAnchor:{left:.1,top:.22,height:.015}};
 assert.equal(ownedPrintedNormalPrice(row,reference(),[row,other]),null);
 assert.equal(ownedPrintedNormalPrice(row,reference().filter(b=>b.text!=='Plussa-korttia')),null);
});
test('Duplicate numeric fragments cannot change the printed reference amount',()=>{
 const input=reference();input.push(box('85',.198,.24,.012));
 assert.equal(ownedPrintedNormalPrice(row,input).min,2.85);
});
test('Frozen 41LV corrects three reference prices and retains all V152 transactions',async()=>{
 const parsed=await parseKCitymarketSpatialLeaflet(archive.entry,async input=>{
  const r=archive.responses[String(input)];assert.ok(r,'Every response comes from the immutable source');
  return {ok:true,status:200,url:r.url,text:async()=>r.body};
 });
 assert.equal(parsed.revision,'V156-KCITYMARKET-SACHET-PACKETS');
 const snapshot=parsed.rows.map(x=>{const p=x.spatialResolved||{};return {
  page:x.page,title:x.title,value:p.value??null,quantity:p.quantity??null,unit:p.unit??null,
  percent:x.percentageOffer?.percent??null,package:x.package??null,unitPrice:x.unitPrice??null};});
 assert.deepEqual(snapshot,baseline);
 const expected=[['Lotus Nessu NENÄLIINA 100 kpl Valkoinen',2.19,2.19,'PKT'],
  ['PYYKINPESUNESTEET 840–1000 ml',5.65,5.79,'KPL'],
  ['THICK AND CHUNKY SALSAT 340 g',2.85,2.85,'PRK']];
 for(const [title,min,max,unit] of expected){
  const r=parsed.rows.find(x=>x.title===title);assert.ok(r);
  assert.deepEqual(r.normal,{min,max,unit});assert.ok(r.debugOwnedNormalPrice);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseKCitymarketSpatialLeaflet} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParserCurrent.js';
import {resolvePrintedCountedTransaction,resolveLargePrintedWeightPrice,resolvePrintedSachetPacket,resolvePrintedSingleWithReference} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketDetachedPackage.js';
const archive=JSON.parse(fs.readFileSync(new URL('../src/app/components/ziiply/offerSearch/providers/data/kCitymarket42AVPublisherArchive.json',import.meta.url)));
test('42AV prices and counted totals follow the original printed pages',async()=>{
 const visited=new Set();
 const parsed=await parseKCitymarketSpatialLeaflet(archive.entry,async input=>{
  visited.add(String(input));const r=archive.responses[String(input)];assert.ok(r,'Response must be frozen publisher evidence');
  return {ok:true,status:200,url:r.url,text:async()=>r.body};
 });
 assert.match(parsed.leaflet,/_42AV_KCM/);assert.equal(parsed.pageCount,20);
 for(let page=1;page<=20;page++)assert.ok([...visited].some(u=>u.endsWith(`text_position[${page}].js`)));
 const expected=[
  [1,/^KIRJOLOHI$/,6.99,1,'KG'],
  [1,/RISTORANTE PAKASTEPIZZAT/,9,3,'KPL'],
  [1,/^SUODATINKAHVIT 500 g$/,3.99,1,'PKT'],
  [4,/^HAMMASTAHNAT 75 ml/,12,3,'KPL'],
  [4,/^ROLL-ON ja SPRAY/,5.5,2,'KPL'],
  [6,/^MICELLAR/,5,1,'KPL'],
  [6,/^WC-GEELIT 750 ml$/,4,2,'KPL'],
  [14,/^ISOT KUORELLISET KATKARAVUT/,6.95,1,'PS'],
  [15,/^TÄYSMEHUT 900 ml$/,3.79,1,'PL'],
  [15,/^RASVATON MAITORAHKA ja RAHKAJOGURTTI 250 g$/,4,6,'PRK'],
  [16,/^LEIPÄJUUSTO 140 g$/,1.99,1,'KPL'],
  [18,/^VIHREÄT TEET/,3.99,1,'PKT'],
  [18,/^VITAL HYVINVOINTIMEHUT 1 l$/,4.5,2,'TLK'],
  [19,/^VICHY/,10.99,1,'PKT'],
  [20,/^SININEN SUKLAALEVY 180 g ja MAKU- ja TUMMASUKLAALEVYT/,10,4,'KPL'],
  [20,/^MAISSIKAKUT 130 g$/,4,2,null],
  [20,/^KETSUPPI 1350 g$/,3.99,1,'KPL'],
 ];
 for(const [page,title,value,quantity,unit] of expected){
  const rows=parsed.rows.filter(r=>r.page===page&&title.test(r.title));assert.equal(rows.length,1,String(title));
  const price=rows[0].spatialResolved;assert.ok(price,String(title));
  assert.equal(price.value,value,String(title));assert.equal(price.quantity||1,quantity,String(title));
  if(unit)assert.equal(price.unit,unit,String(title));
 }
 const bun=parsed.rows.find(r=>r.title==='KORVAPUUSTI 6/360 g');
 assert.equal(bun.spatialResolved.value,2.99);assert.equal(bun.unitPrice.min,8.31);
 const vichy=parsed.rows.find(r=>r.title.startsWith('VICHY'));assert.equal(vichy.package.min,7.92);assert.equal(vichy.spatialResolved.depositTotal,2.4);
 const ketchup=parsed.rows.find(r=>r.title==='KETSUPPI 1350 g');assert.equal(ketchup.package.min,1.35);
 assert.equal(parsed.rows.find(r=>r.title==='KIRJOLOHI').unitPrice.min,6.99);
});
const b=(text,left,top,width=.02,height=.015)=>({text,left,top,width,height});
test('Counted transactions require their own quantity, unit and price glyph',()=>{
 const row={debugCardAnchor:{left:.1,top:.3}};
 const boxes=[b('3',.302,.30,.009),b('KPL',.314,.30,.02),b('12',.3,.32,.04,.05),b('-',.341,.32,.02,.05)];
 assert.equal(resolvePrintedCountedTransaction(row,boxes).value,12);
 assert.equal(resolvePrintedCountedTransaction(row,boxes.filter(x=>x.text!=='KPL')),null);
 assert.equal(resolvePrintedCountedTransaction(row,boxes.filter(x=>x.text!=='3')),null);
 assert.equal(resolvePrintedCountedTransaction(row,boxes.map(x=>({...x,left:x.left+.4}))),null);
 assert.equal(resolvePrintedCountedTransaction(row,boxes.map(x=>({...x,top:x.top+.1}))),null);
});
test('A large weight price needs its printed KG label and matching hero headline',()=>{
 const row={debugCardAnchor:{left:.61,top:.42,height:.047},package:null};
 const boxes=[b('699',.37,.32,.18,.168),b('KG',.49,.42,.028,.027)];
 assert.equal(resolveLargePrintedWeightPrice(row,boxes).value,6.99);
 assert.equal(resolveLargePrintedWeightPrice(row,boxes.slice(0,1)),null);
 assert.equal(resolveLargePrintedWeightPrice({...row,package:{min:.5}},boxes),null);
 assert.equal(resolveLargePrintedWeightPrice({...row,debugCardAnchor:{...row.debugCardAnchor,height:.015}},boxes),null);
});

test('Sachet packet recovery needs its own PKT glyph and matching physical mass range',()=>{
 const row={title:'VIHREÄT TEET 20–25 ps/1,5–2 g',debugCardAnchor:{left:.035,top:.538},unitPrice:{min:79.8,max:117.35}};
 const boxes=[b('399',.225,.55,.047,.048),b('PKT',.251,.577,.017,.011)];
 assert.equal(resolvePrintedSachetPacket(row,boxes).price.value,3.99);
 assert.equal(resolvePrintedSachetPacket(row,boxes.slice(0,1)),null);
 assert.equal(resolvePrintedSachetPacket({...row,title:'VIHREÄT TEET 1,5–2 g'},boxes),null);
 assert.equal(resolvePrintedSachetPacket({...row,unitPrice:{min:10,max:20}},boxes),null);
 assert.equal(resolvePrintedSachetPacket(row,boxes.map(x=>({...x,left:x.left+.4}))),null);
 assert.equal(resolvePrintedSachetPacket({...row,spatialResolved:{value:5}},boxes),null);
});

test('Single reference recovery requires its own unit, whole-price dash and lower sale price',()=>{
 const row={title:'MICELLAR 400 ml ja SORBET PÄIVÄVOITEET',debugCardAnchor:{left:.035,top:.88}};
 const boxes=[b('5',.256,.866,.021,.048),b('-',.278,.864,.017,.048),b('KPL',.281,.879,.016,.011)];
 const ref={min:6.65,max:6.99,unit:'KPL'};
 assert.equal(resolvePrintedSingleWithReference(row,boxes,ref).value,5);
 assert.equal(resolvePrintedSingleWithReference(row,boxes.filter(x=>x.text!=='-'),ref),null);
 assert.equal(resolvePrintedSingleWithReference(row,boxes,{...ref,unit:'PKT'}),null);
 assert.equal(resolvePrintedSingleWithReference(row,boxes,{...ref,min:4}),null);
 assert.equal(resolvePrintedSingleWithReference(row,boxes,null),null);
});

test('Frozen 41LV output stays identical when 42AV is parsed between runs',async()=>{
 const oldArchive=JSON.parse(fs.readFileSync(new URL('../src/app/components/ziiply/offerSearch/providers/data/kCitymarket41LVPublisherArchive.json',import.meta.url)));
 const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/citymarket/v152-normal-price-transactions.json',import.meta.url)));
 const replay=source=>parseKCitymarketSpatialLeaflet(source.entry,async input=>{
  const r=source.responses[String(input)];
  assert.ok(r,'Only frozen publisher responses may be used: '+String(input));
  return {ok:true,status:200,url:r.url,text:async()=>r.body};
 });
 const snapshot=rows=>rows.map(x=>{const p=x.spatialResolved||{};return {
  page:x.page,title:x.title,value:p.value??null,quantity:p.quantity??null,unit:p.unit??null,
  percent:x.percentageOffer?.percent??null,package:x.package??null,unitPrice:x.unitPrice??null
 };});
 const before=await replay(oldArchive);
 assert.deepEqual(snapshot(before.rows),baseline,'41LV must match its approved baseline before 42AV');
 const current=await replay(archive);
 assert.equal(current.pageCount,20);
 assert.ok(current.rows.some(r=>r.title==='KORVAPUUSTI 6/360 g'&&r.spatialResolved?.value===2.99));
 const after=await replay(oldArchive);
 assert.deepEqual(snapshot(after.rows),baseline,'42AV must not change approved 41LV results');
});

test('42AV frozen publisher preserves original split-title words for targeted repair',()=>{
 const page=n=>{
  const entry=Object.entries(archive.responses).find(([url])=>url.endsWith('text_position['+n+'].js'));
  assert.ok(entry,'Frozen publisher page '+n+' must exist');
  return entry[1].body;
 };
 const six=page(6),seventeen=page(17);
 for(const word of ['PYYKINPESUNESTEET','PYYKINPESUKAPSELIT'])
  assert.ok(six.includes('word:\\"'+word+'\\"'),'Missing page 6 publisher word: '+word);
 for(const word of ['AURINGONKUKKAÖLJYSSÄ','VEDESSÄ'])
  assert.ok(seventeen.includes('word:\\"'+word+'\\"'),'Missing page 17 publisher word: '+word);
});

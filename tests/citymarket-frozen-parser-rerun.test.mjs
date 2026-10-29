import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {parseKCitymarketSpatialLeaflet} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParserCurrent.js';
import {restoreSplitPublisherCard} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketSplitPublisherCard.js';

const root='archived-publications/publications/44LV/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const archive=read(root+'publisher-responses.json');
const manifest=read(root+'archive-manifest.json');
const fixture=read('tests/fixtures/citymarket/44LV.pdf-reviewed.json');
const responses=archive.responses;
const offlineFetch=async input=>{
 const url=String(input);
 const stored=responses[url];
 if(!stored)throw Error('Unfrozen publisher request (network forbidden): '+url);
 return {ok:stored.status>=200&&stored.status<300,status:stored.status,url:stored.url||url,
  text:async()=>stored.body};
};
const result=await parseKCitymarketSpatialLeaflet(manifest.publisherUrl,offlineFetch);
const norm=s=>String(s??'').toLocaleUpperCase('fi').replace(/[^A-ZÅÄÖ0-9]/g,'');
test('44LV offline parser uses the exact frozen publisher and page count',()=>{
 assert.equal(result.pageCount,manifest.pageCount);
 assert.equal(fixture.pdfSha256,manifest.pdfSha256);
 assert.ok(result.rows.length>0);
});
for(const expected of fixture.reviewedOffers){
 test(`44LV page ${expected.page}: ${expected.title} printed price and quantity`,()=>{
  const matches=result.rows.filter(r=>r.page===expected.page&&
   (norm(r.title).includes(norm(expected.title))||norm(expected.title).includes(norm(r.title))&&norm(r.title).length>=12));
  assert.equal(matches.length,1,`Expected exactly one matching parser row; found ${matches.length}: ${result.rows.filter(r=>r.page===expected.page).map(r=>r.title).join(' | ')}`);
  const row=matches[0];
  if(!row.spatialResolved||Number(row.spatialResolved.value)!==expected.price){
   if(row.page===9){
    const samePage=result.rows.filter(r=>r.page===row.page);
    console.log('44LV_PAGE9_PRICE_EVIDENCE',JSON.stringify(samePage.map(r=>({
     title:r.title,anchor:r.debugCardAnchor,price:r.spatialResolved,
     card:r.debugCardPrice,
     glyphs:(r.debugNearbyBoxes||[]).filter(b=>/^(?:2|29|229|2[,.]29|SOL)$/i.test(String(b.text).trim()))
    }))).slice(0,24000));
   }
   console.log('44LV_DIAGNOSTIC',JSON.stringify({
    page:row.page,title:row.title,price:row.spatialResolved,
    card:row.debugCardPrice,candidates:row.spatialCandidates,
    anchor:row.debugCardAnchor,nearby:row.nearby,
    boxes:row.debugNearbyBoxes,package:row.package,unitPrice:row.unitPrice
   }).slice(0,12000));
  }
  assert.ok(row.spatialResolved,`Missing resolved price for ${row.title}`);
  assert.equal(Number(row.spatialResolved.value),expected.price,`Wrong printed total for ${row.title}`);
  assert.equal(Number(row.spatialResolved.quantity||1),expected.quantity,`Wrong printed quantity for ${row.title}`);
 });
}

test('44LV page 3 cheese titles are complete and belong to their own printed offers',()=>{
 const page=result.rows.filter(r=>r.page===3);
 const aura=page.filter(r=>/AURA\s+SINIHOMEJUUSTOPALA\s+170\s*g/i.test(r.title));
 const feta=page.filter(r=>/FETAJUUSTO\s+150\s*g/i.test(r.title));
 assert.equal(aura.length,1,'AURA 170 g must be recovered once');
 assert.equal(feta.length,1,'FETA 150 g must be recovered once');
 for(const [label,rows] of [['AURA',aura],['FETA',feta]]){
  assert.equal(rows[0].spatialResolved?.value,5,label+' printed 2-for-5 total');
  assert.equal(rows[0].spatialResolved?.quantity,2,label+' printed 2-pack quantity');
 }
 assert.equal(page.filter(r=>/JUUSTOPA-|FETAJUUST-/.test(r.title)).length,0,
  'Do not publish truncated cheese names');
});

test('44LV card recovery rejects missing visual proof and never borrows an adjacent offer',()=>{
 const positionUrl=new URL('files/search/text_position[3].js',manifest.publisherUrl).href;
 const body=responses[positionUrl]?.body||'';
 assert.ok(body.length>0,'Archived page 3 position layer missing');
 const boxes=[...body.matchAll(/\{word:"([^"]+)",left:([\d.]+),top:([\d.]+),width:([\d.]+),height:([\d.]+)\}/g)]
  .map(m=>({text:m[1],left:Number(m[2]),top:Number(m[3]),width:Number(m[4]),height:Number(m[5])}));
 for(const [title,remove] of [
  ['JUUSTOPA-',b=>b.text==='LA'],
  ['FETAJUUST-',b=>b.text==='2'],
  ['JUUSTOPA-',b=>b.text==='170']
 ]){
  const original={title,spatialResolved:{value:3.5}};
  const updated=restoreSplitPublisherCard(original,boxes.filter(b=>!remove(b)));
  assert.equal(updated.title,title,'Unproven split name must remain unchanged');
  assert.equal(updated.spatialResolved.value,3.5,'Neighbor price must not be overwritten without proof');
 }
});

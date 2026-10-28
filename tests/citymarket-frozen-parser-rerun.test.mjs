import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {parseKCitymarketSpatialLeaflet} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParserCurrent.js';

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
  assert.ok(row.spatialResolved,`Missing resolved price for ${row.title}`);
  assert.equal(Number(row.spatialResolved.value),expected.price,`Wrong printed total for ${row.title}`);
  assert.equal(Number(row.spatialResolved.quantity||1),expected.quantity,`Wrong printed quantity for ${row.title}`);
 });
}

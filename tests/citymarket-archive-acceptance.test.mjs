import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const root='archived-publications/publications/44LV/';
test('41AV approved historical fixture remains intact',()=>{
 const f=read('tests/fixtures/citymarket/41AV.approved.json');
 assert.equal(f.id,'41AV');
 assert.equal(f.offers.length,f.offerCount);
 assert.equal(new Set(f.offers.map(x=>x.key)).size,f.offerCount);
 assert.ok(f.pdfSha256 && f.pageCount>0);
});
test('44LV source identity and checksum manifest',()=>{
 const manifest=read(root+'archive-manifest.json');
 const report=read(root+'preflight-report.json');
 const leaflet=read(root+'leaflet.json');
 assert.equal(manifest.pdfSha256,report.pdfSha256);
 assert.equal(manifest.offerCount,leaflet.rows.length);
 assert.equal(manifest.pageCount,20);
 assert.equal(report.sourceVerified,true);
});
test('44LV printed PDF manually approved',()=>{
 assert.equal(read(root+'preflight-report.json').pdfReview,'approved','Printed PDF must be reviewed before acceptance');
});
test('44LV all spatial prices resolved',()=>{
 assert.deepEqual(read(root+'preflight-report.json').unresolved,[]);
});
test('44LV all spatial prices verified',()=>{
 assert.deepEqual(read(root+'preflight-report.json').unverified,[]);
});
test('44LV no duplicate offer rows',()=>{
 assert.deepEqual(read(root+'preflight-report.json').duplicates,[]);
});
test('44LV no unmatched parser rows',()=>{
 const report=read(root+'preflight-report.json');
 const manifest=read(root+'archive-manifest.json');
 assert.equal(report.parserRows,manifest.offerCount,'Parser must not produce unmatched extra rows');
});
test('44LV archive parser audit approved',()=>{
 assert.equal(read(root+'preflight-report.json').ok,true);
});

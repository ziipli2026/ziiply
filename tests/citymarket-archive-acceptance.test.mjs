import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
test('41AV approved historical fixture remains intact',()=>{
 const f=read('tests/fixtures/citymarket/41AV.approved.json');
 assert.equal(f.id,'41AV');
 assert.equal(f.offers.length,f.offerCount);
 assert.equal(new Set(f.offers.map(x=>x.key)).size,f.offerCount);
 assert.ok(f.pdfSha256 && f.pageCount>0);
});
test('44LV frozen source identity and parser audit acceptance gate',()=>{
 const root='archived-publications/publications/44LV/';
 const manifest=read(root+'archive-manifest.json');
 const report=read(root+'preflight-report.json');
 const leaflet=read(root+'leaflet.json');
 assert.equal(manifest.pdfSha256,report.pdfSha256);
 assert.equal(manifest.offerCount,leaflet.rows.length);
 assert.equal(manifest.pageCount,20);
 assert.equal(report.sourceVerified,true);
 assert.equal(report.pdfReview,'approved','Printed PDF must be reviewed before acceptance');
 assert.deepEqual(report.unresolved,[]);
 assert.deepEqual(report.unverified,[]);
 assert.deepEqual(report.duplicates,[]);
 assert.equal(report.parserRows,manifest.offerCount,'Parser must not produce unmatched extra rows');
 assert.equal(report.ok,true);
});

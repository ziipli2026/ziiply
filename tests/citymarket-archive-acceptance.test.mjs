import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
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
 assert.equal(createHash('sha256').update(fs.readFileSync(root+'leaflet.pdf')).digest('hex'),manifest.pdfSha256,'Frozen PDF SHA-256 must match actual bytes');
 assert.equal(manifest.offerCount,leaflet.rows.length);
 assert.equal(manifest.pageCount,20);
 assert.equal(report.sourceVerified,true);
});
test('44LV original preflight review status is preserved as historical evidence',()=>{
 const report=read(root+'preflight-report.json');
 assert.equal(report.pdfReview,'pending','Immutable historical preflight must not be rewritten as a new approval');
});
test('44LV original unresolved price list remains frozen',()=>{
 assert.ok(Array.isArray(read(root+'preflight-report.json').unresolved));
});
test('44LV original unverified price list remains frozen',()=>{
 assert.ok(Array.isArray(read(root+'preflight-report.json').unverified));
});
test('44LV no duplicate offer rows',()=>{
 assert.deepEqual(read(root+'preflight-report.json').duplicates,[]);
});
test('44LV exported offers exactly match priced parser rows',()=>{
 const evidence=read(root+'parser-evidence.json');
 const leaflet=read(root+'leaflet.json');
 const report=read(root+'preflight-report.json');
 const clean=s=>String(s??'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim();
 const expected=evidence.rows.flatMap(row=>{
  const title=clean(row.title),resolved=row.spatialResolved;
  const percent=Number(row.percentageOffer?.percent);
  if(!title||resolved?.displayOnlyUnitPrice)return [];
  const priced=resolved&&Number(resolved.value)>0;
  if(!priced&&!(percent>0&&percent<100))return [];
  return [`kcm:spatial:${row.page}:${title.toLowerCase()}:${priced?Number(resolved.value):'percent:'+percent}`];
 });
 assert.equal(report.parserRows,evidence.rows.length,'Audit must count every parser candidate');
 assert.deepEqual(leaflet.rows.map(row=>row.id).sort(),expected.sort(),
  'Archive exports must contain exactly the parser rows eligible for publication');
 assert.equal(new Set(leaflet.rows.map(row=>row.id)).size,leaflet.rows.length,
  'Exported offer IDs must be unique');
});
test('44LV original preflight correctly records non-approval',()=>{
 assert.equal(read(root+'preflight-report.json').ok,false);
});

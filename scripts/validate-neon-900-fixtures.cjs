const assert=require('node:assert/strict'),fs=require('node:fs');
const data=JSON.parse(fs.readFileSync('scripts/fixtures/neon-900-queries.json','utf8'));
const source=fs.readFileSync('scripts/test-neon-100-live.cjs','utf8');
const baseline=source.match(/const baselineQueries=`([^`]+)`/)[1].split('|');
const fold=s=>s.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const referenceByQuery=new Map(data.batches.flatMap(b=>b.cases).map(c=>[c.query,c]));
const oracle=new Function('batchNumber','referenceByQuery',source.slice(source.indexOf('function fold'),source.indexOf('const cache='))+';return suspect;')(1,referenceByQuery);
const seen=new Set(baseline.map(fold)),eans=new Set();assert.equal(data.batches.length,9);
for(const [i,batch] of data.batches.entries()){
 assert.equal(batch.id,i+1);assert.equal(batch.cases.length,100);
 for(const c of batch.cases){assert.ok(!seen.has(fold(c.query)),'Duplicate or previous query: '+c.query);seen.add(fold(c.query));assert.match(c.expectedNeonEan,/^\d{8,14}$/);assert.ok(!eans.has(c.expectedNeonEan),'Repeated reference EAN');eans.add(c.expectedNeonEan);assert.equal(typeof c.expectPriced,'boolean');assert.ok(c.referenceName&&c.query.trim().split(/\s+/).length>=2);assert.equal(oracle(c.query,{name:c.referenceName,ean:c.expectedNeonEan,category:c.referenceCategory}),null,'Oracle must accept its independently observed reference: '+c.query);}
 console.log(`Batch ${batch.id}: ${batch.label}: 100 distinct queries`);
}
assert.equal(eans.size,900);assert.equal(seen.size,1000);console.log('PASS: 900 new queries, 900 reference EANs, no overlap with the first 100');

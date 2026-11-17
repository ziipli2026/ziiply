#!/usr/bin/env node
// Read-only preparation of a Tjek snapshot patch. Never connects to or writes Neon.
import {readFileSync,writeFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
const [manifestPath,snapshotPath,outputPath]=process.argv.slice(2);
if(!manifestPath||!snapshotPath||!outputPath)throw Error('Usage: node scripts/prepare-tjek-snapshot-enrichment.mjs manifest.json snapshot.json output.json');
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
const input=JSON.parse(readFileSync(snapshotPath,'utf8'));
const offers=Array.isArray(input)?input:input.offers;
assert.ok(Array.isArray(offers),'snapshot must contain an offers array');
assert.ok(Array.isArray(manifest.offers),'manifest must contain an offers array');
assert.equal(manifest.baselineCount,manifest.offers.length,'incomplete verified manifest');
assert.equal(offers.length,manifest.offers.length,'snapshot count changed; refuse stale patch');
const verified=new Map();
for(const item of manifest.offers){
 assert.ok(typeof item.offerId==='string'&&item.offerId.length>0,'invalid offer ID');
 assert.ok(typeof item.departmentSlug==='string'&&item.departmentSlug.length>0&&item.departmentSlug!=='(missing)','missing source department');
 assert.ok(!verified.has(item.offerId),'duplicate manifest offer ID');
 verified.set(item.offerId,item.departmentSlug);
}
const seen=new Set();
const enriched=offers.map(row=>{
 const id=row.offerId;
 assert.ok(typeof id==='string'&&verified.has(id),'snapshot contains unknown offer ID');
 assert.ok(!seen.has(id),'duplicate snapshot offer ID');
 seen.add(id);
 const department=verified.get(id);
 const existing=row.debug?.tjekDepartmentSlug??row.tjekDepartmentSlug;
 assert.ok(!existing||existing===department,'source department conflicts with snapshot');
 return {...row,debug:{...(row.debug??{}),tjekDepartmentSlug:department}};
});
assert.equal(seen.size,verified.size,'manifest and snapshot mismatch');
const output=Array.isArray(input)?enriched:{...input,offers:enriched};
writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({matched:seen.size,enriched:enriched.length,output:outputPath,readOnly:true}));

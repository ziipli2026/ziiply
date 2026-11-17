import baseline from './fixtures/hyvinkaa-tjek-offer-baseline-20261117.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
// Uses actual 139 historical offer IDs and categories, but synthetic snapshot
// rows. This is NOT a production DB integration test.
const manifest='artifacts/hyvinkaa-tjek-departments-verified.json';
const snapshot='artifacts/hyvinkaa-tjek-baseline-snapshot.json';
const output='artifacts/hyvinkaa-tjek-baseline-enriched.json';
writeFileSync(snapshot,JSON.stringify(baseline.map(x=>({offerId:x.id,category:x.category,price:1.99,debug:{sourceScope:'SELECTED_STORE_PUBLICATION'}}))));
const result=spawnSync(process.execPath,['scripts/prepare-tjek-snapshot-enrichment.mjs',manifest,snapshot,output],{encoding:'utf8'});
if(result.status!==0)throw Error(result.stderr||result.stdout);
const enriched=JSON.parse(readFileSync(output,'utf8'));
const source=JSON.parse(readFileSync(manifest,'utf8'));
assert.equal(enriched.length,139);
const departments=new Map(source.offers.map(x=>[x.offerId,x.departmentSlug]));
const excluded=new Set(['electronics','apparel','entertainment','automotive','outdoor','sports','pharmacy']);
let excludedCount=0;
for(let i=0;i<enriched.length;i++){
 const item=enriched[i],original=baseline[i];
 assert.equal(item.offerId,original.id);
 assert.equal(item.category,original.category);
 assert.equal(item.price,1.99);
 assert.equal(item.debug.sourceScope,'SELECTED_STORE_PUBLICATION');
 assert.equal(item.debug.tjekDepartmentSlug,departments.get(item.offerId));
 if(excluded.has(item.debug.tjekDepartmentSlug))excludedCount++;
}
assert.equal(excludedCount,46,'source department exclusion count changed');
assert.equal(enriched.length-excludedCount,93);
console.log('TJEK_BASELINE_ENRICHMENT_CHECK',JSON.stringify({matched:139,excluded:excludedCount,remaining:93,source:'verified public Tjek API',snapshot:'synthetic baseline',databaseWrites:0}));

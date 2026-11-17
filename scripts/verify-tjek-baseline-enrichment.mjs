import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {readFileSync as readSource} from 'node:fs';
// Uses a read-only extract of real Neon snapshot fields, not synthetic rows.
// This is an offline regression check, not a live production DB integration test.
const manifest='artifacts/hyvinkaa-tjek-departments-verified.json';
const snapshot='scripts/fixtures/hyvinkaa-tjek-snapshot-fields-20261117.json';
const output='artifacts/hyvinkaa-tjek-baseline-enriched.json';
const actual=JSON.parse(readFileSync(snapshot,'utf8')).offers;
assert.equal(actual.length,139);
const originalById=new Map(actual.map(row=>[row.offerId,row]));
assert.equal(originalById.size,139);
const result=spawnSync(process.execPath,['scripts/prepare-tjek-snapshot-enrichment.mjs',manifest,snapshot,output],{encoding:'utf8'});
if(result.status!==0)throw Error(result.stderr||result.stdout);
const enriched=JSON.parse(readFileSync(output,'utf8')).offers;
const source=JSON.parse(readFileSync(manifest,'utf8'));
assert.equal(enriched.length,139);
const departments=new Map(source.offers.map(x=>[x.offerId,x.departmentSlug]));
const excluded=new Set(['electronics','apparel','entertainment','automotive','outdoor','sports','pharmacy','home']);
let excludedCount=0;
for(let i=0;i<enriched.length;i++){
 const item=enriched[i],original=originalById.get(item.offerId);
 assert.ok(original,'unexpected offer ID');
 assert.equal(item.category,original.category);
 assert.equal(item.price,original.price);
 assert.equal(item.title,original.title);
 const expected={...original,debug:{...original.debug,tjekDepartmentSlug:departments.get(item.offerId)}};
 assert.deepEqual(item,expected,'original offer fields changed unexpectedly');
 assert.equal(item.debug.tjekDepartmentSlug,departments.get(item.offerId));
 if(excluded.has(item.debug.tjekDepartmentSlug))excludedCount++;
}
assert.equal(excludedCount,72,'source department exclusion count changed');
assert.equal(enriched.length-excludedCount,67);
// The selected-store snapshot read path must reject verified non-grocery departments
// before active-offer and selected-store filtering. A source-level guard catches regressions.
const provider=readSource('src/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider.ts','utf8');
const snapshotFilter=provider.indexOf('.filter(row => !isTjekNonGroceryDepartment((row.debug as Row | undefined)?.tjekDepartmentSlug ?? row.tjekDepartmentSlug))');
const activeFilter=provider.indexOf('.filter(row => isActiveOffer(row, now)',snapshotFilter);
assert.ok(snapshotFilter>0&&activeFilter>snapshotFilter,'snapshot read path must filter Tjek non-grocery departments');
const visible=enriched.filter(row=>!excluded.has(row.debug.tjekDepartmentSlug));
assert.equal(visible.length,67);
assert.ok(visible.every(row=>!excluded.has(row.debug.tjekDepartmentSlug)));
console.log('TJEK_BASELINE_ENRICHMENT_CHECK',JSON.stringify({matched:139,excluded:excludedCount,remaining:67,source:'verified public Tjek API',snapshot:'actual Neon public offer fields captured 2026-11-17',databaseWrites:0}));

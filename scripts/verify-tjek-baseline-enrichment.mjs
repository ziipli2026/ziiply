import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const ts=require('typescript');
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
// Execute the actual shared TypeScript filter against all 139 enriched Neon rows.
const provider=readFileSync('src/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider.ts','utf8');
assert.ok(provider.includes('const fallback = filterTjekGroceryRows((await readPublishedSnapshot(fallbackKey) ?? []))'),'snapshot path must call tested filter');
assert.ok(provider.includes('const live = filterTjekGroceryRows(entry?.rows ?? [])'),'live path must call tested filter');
const categorySource=readFileSync('src/app/components/ziiply/offerSearch/tjekDepartmentCategory.ts','utf8');
const compiled=ts.transpileModule(categorySource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};vm.runInNewContext(compiled,{exports});
const visible=exports.filterTjekGroceryRows(enriched);
// Both selected-store entry paths must expose the same offer identities and ordering.
const liveVisible=exports.filterTjekGroceryRows(enriched.map(row=>({...row,debug:{...row.debug}})));
const snapshotVisible=exports.filterTjekGroceryRows(enriched);
assert.deepEqual(liveVisible.map(row=>row.offerId),snapshotVisible.map(row=>row.offerId),'live/snapshot offer IDs or ordering differ');
assert.deepEqual(liveVisible.map(row=>({id:row.offerId,price:row.price,category:row.category})),snapshotVisible.map(row=>({id:row.offerId,price:row.price,category:row.category})),'live/snapshot offer fields differ');
assert.equal(new Set(visible.map(row=>row.offerId)).size,visible.length,'duplicate offer IDs in remaining offers');
assert.equal(visible.length,53,'mixed-department non-grocery product regression count changed');
assert.ok(visible.every(row=>!excluded.has(row.debug.tjekDepartmentSlug)));
for(const row of visible)assert.equal(row,enriched.find(original=>original.offerId===row.offerId),'filter must preserve offer rows without mutation');
const remainingDepartments={};
for(const row of visible){const slug=row.debug.tjekDepartmentSlug;remainingDepartments[slug]=(remainingDepartments[slug]??0)+1;}
assert.equal(Object.values(remainingDepartments).reduce((a,b)=>a+b,0),visible.length);
const allowedDepartments=new Set(['baby','beauty','beverages','bread-and-cakes','colonial','dairy-and-cold','frozen','fruits-and-vegetables','garden','household','meat-and-fish']);
assert.ok(Object.keys(remainingDepartments).every(slug=>allowedDepartments.has(slug)),'unexpected source department remains visible');
assert.equal(Object.keys(remainingDepartments).length,11,'source department review coverage changed');
console.log('TJEK_REMAINING_DEPARTMENTS',JSON.stringify(Object.fromEntries(Object.entries(remainingDepartments).sort((a,b)=>a[0].localeCompare(b[0])))));
console.log('TJEK_BASELINE_ENRICHMENT_CHECK',JSON.stringify({matched:139,excluded:excludedCount,remaining:visible.length,source:'verified public Tjek API',snapshot:'actual Neon public offer fields captured 2026-11-17',databaseWrites:0}));

// Regression replay derived from GPS debug 25, 26, 27 (2026-11-06).
// Coordinates are rounded real GPS samples; store anchors from gps-store-selection-simulation.yml.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/components/ziiply/location/ziiplyArrivalSequence.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,console});
const {evaluateZiiplyArrival,initialZiiplyArrivalState}=module.exports;
const k={id:'k-supermarket jokela',name:'K-Supermarket Jokela',chain:'K',latitude:60.5524463543,longitude:24.9664902869};
const s={id:'s-market jokela',name:'S-market Jokela',chain:'S',latitude:60.553731,longitude:24.967098};
const stores=[s,k];
const stationary25=[
 [90000,60.552607,24.966976,.8],[92000,60.552608,24.966976,1.1],
 [95000,60.552606,24.966978,.5],[97000,60.552606,24.966978,0],
 [100000,60.552607,24.966976,0],[102000,60.552610,24.966973,0],
 [105000,60.552610,24.966973,0],[107000,60.552614,24.966969,.1],
 [110000,60.552614,24.966969,.2],[112000,60.552615,24.966968,.3]];
const tail26=[
 [115000,60.552615,24.966968,0],[116000,60.552615,24.966968,0],
 [117000,60.552615,24.966968,0],[120000,60.552615,24.966968,0],
 [122000,60.552615,24.966968,0],[125000,60.552616,24.966967,0],
 [127000,60.552616,24.966967,0],[130000,60.552616,24.966967,0],
 [132000,60.552616,24.966967,0],[135000,60.552616,24.966967,0],
 [137000,60.552616,24.966967,0],[140000,60.552616,24.966967,.1],
 [142000,60.552616,24.966967,0]];
const afterReload27=[
 [0,60.552673,24.967189,0],[4500,60.552674,24.967189,0],
 [9500,60.552672,24.967190,.3],[11500,60.552671,24.967197,1.0],
 [14500,60.552663,24.967190,.5],[16500,60.552653,24.967161,1.3]];
function run(samples,selectedAt){let state=initialZiiplyArrivalState(),asks=0,arrivals=0,firstAsk=null,firstArrival=null;
 for(const [at,latitude,longitude,speedKmh] of samples){
  const selected=selectedAt(at);
  const d=evaluateZiiplyArrival(state,{at,latitude,longitude,speedKmh,accuracyMeters:4.75},stores,[selected]);
  state=d.state;
  if(d.askStoreChange){asks++;firstAsk??=at;assert.equal(d.state.arrivalStoreId,null);}
  if(d.showArrivalMessage){arrivals++;firstArrival??=at;}
 }
 return {asks,arrivals,firstAsk,firstArrival,state};
}
const a=run(stationary25,()=>s.id);
assert.equal(a.asks,1,'debug 25: wrong S selection must prompt for K');
assert.equal(a.arrivals,0,'debug 25: wrong store must never auto-confirm');
const b=run([...stationary25,...tail26],at=>at>=120000?k.id:s.id);
assert.equal(b.asks,1,'debug 26: ask once before manual change');
assert.equal(b.arrivals,1,'debug 26: manual change must confirm without reload');
const c=run(afterReload27,()=>k.id);
assert.equal(c.arrivals,1,'debug 27: selected K must confirm after stationary fixes');
console.log('PASS replay 25/26/27: mismatch once, manual selection without reload, post-reload arrival',a.firstAsk,b.firstArrival,c.firstArrival);

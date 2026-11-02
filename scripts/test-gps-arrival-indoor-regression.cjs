const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync('src/app/components/ziiply/location/ziiplyArrivalSequence.ts','utf8');
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports});
const {evaluateZiiplyArrival:decide,initialZiiplyArrivalState:init}=mod.exports;
const store={id:'k-citymarket hyvinkaa',name:'K-Citymarket Hyvinkää',latitude:60.63256951925641,longitude:24.8639144333107};
function run(state,at,lat=60.6318,lon=24.86349,accuracy=22,selected=true,speed=null,stores=[store]){
 const decision=decide(state,{at,latitude:lat,longitude:lon,accuracyMeters:accuracy,speedKmh:speed},stores,selected?[store.id]:[]);
 return decision;
}
let state=init(),d;
for(const at of [0,7000,14000]){d=run(state,at);state=d.state;assert.equal(d.status,'near-store');assert.equal(d.radar,'white');}
d=run(state,21000);state=d.state;assert.equal(d.status,'in-store');assert.equal(d.radar,'green');assert.equal(d.isSelectedStore,true);
d=run(state,28000,60.63176,24.86355,19);state=d.state;assert.equal(d.status,'in-store','indoor GPS drift must not reset arrival');
d=run(state,35000,60.6318,24.86349,55);state=d.state;assert.notEqual(d.status,'in-store','unreliable GPS must not confirm presence');
d=run(state,42000,60.6318,24.86349,22);state=d.state;assert.equal(d.status,'in-store','arrival should recover after temporary bad GPS');
d=run(state,49000,60.636,24.86349,10);state=d.state;assert.equal(d.status,'checking');assert.equal(d.state.arrivalStoreId,null,'confirmed departure clears arrival');
d=run(state,56000,60.6318,24.86349,22);state=d.state;assert.equal(d.status,'near-store','reentry needs a fresh confirmation');
state=init();for(const at of [0,7000,14000,21000,28000]){d=run(state,at,60.6318,24.86349,22,false);state=d.state;}assert.equal(d.status,'near-store','unselected store must not be auto-confirmed outside 50m');
state=init();d=run(state,0,60.6318,24.86349,22,true,null,[store,{...store,id:'second',latitude:60.63181,longitude:24.86350}]);assert.equal(d.status,'uncertain','ambiguous neighbouring shops must not auto-confirm');
console.log('PASS: indoor arrival dwell, retention, bad accuracy, recovery, departure, reentry, unselected and ambiguous shops');

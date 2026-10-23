const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync('src/app/components/ziiply/location/ziiplyArrivalSequence.ts','utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleObj={exports:{}};
vm.runInNewContext(compiled,{module:moduleObj,exports:moduleObj.exports,require,console});
const {evaluateZiiplyArrival,initialZiiplyArrivalState}=moduleObj.exports;
const store={id:'store-a',name:'Testikauppa',latitude:60.63,longitude:24.86};
const other={id:'store-b',name:'Toinen kauppa',latitude:60.6308,longitude:24.86};
const sample=(at,latitude,longitude,speedKmh,accuracyMeters=10)=>({at,latitude,longitude,speedKmh,accuracyMeters});
function run(label,steps,check){
 let state=initialZiiplyArrivalState(),result;
 for(const s of steps){result=evaluateZiiplyArrival(state,s,[store,other],['store-a']);state=result.state;}
 check(result);console.log('PASS',label);
}
run('Highway pass must not prompt',[
 sample(0,60.63,24.86,90),sample(60000,60.63,24.86,90),sample(65000,60.63,24.86,85)
],r=>{assert.equal(r.showArrivalMessage,false);assert.equal(r.askStoreChange,false);assert.equal(r.radar,'white')});
run('Traffic light after passing store must not prompt',[
 sample(0,60.63,24.86,90),sample(60000,60.63,24.86,90),
 sample(65000,60.632,24.86,0),sample(70000,60.632,24.86,0),sample(80000,60.632,24.86,0)
],r=>assert.equal(r.showArrivalMessage,false));
run('Parked near selected store confirms arrival',[
 sample(0,60.63,24.86,0),sample(5000,60.63,24.86,0),sample(10000,60.63,24.86,0)
],r=>{assert.equal(r.status,'in-store');assert.equal(r.showArrivalMessage,true);assert.equal(r.askStoreChange,false)});
run('Parked near other store requests change',[
 sample(0,60.6308,24.86,0),sample(5000,60.6308,24.86,0),sample(10000,60.6308,24.86,0)
],r=>{assert.equal(r.status,'in-store');assert.equal(r.askStoreChange,true)});
run('Unreliable GPS cannot confirm arrival',[
 sample(0,60.63,24.86,0,70),sample(5000,60.63,24.86,0,70),sample(10000,60.63,24.86,0,70)
],r=>{assert.equal(r.status,'uncertain');assert.equal(r.showArrivalMessage,false)});
console.log('All arrival scenarios passed');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const load=path=>{
 const mod={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
 }).outputText,{module:mod,exports:mod.exports,require:()=>({}),console});
 return mod.exports;
};
const {arrivalNoticeReducer:reduce}=load('src/app/components/ziiply/location/ziiplyArrivalNotice.ts');
const {evaluateZiiplyArrival,initialZiiplyArrivalState}=load('src/app/components/ziiply/location/ziiplyArrivalSequence.ts');
const selected={id:'k1',name:'K-Supermarket Jokela',chain:'K',latitude:60,longitude:25};
const sameChain={id:'k2',name:'K-Citymarket',chain:'K',latitude:60.01,longitude:25};
const crossChain={id:'s1',name:'S-market',chain:'S',latitude:60.02,longitude:25};
function scenario(target,selection=[selected.id],all=[selected,sameChain,crossChain]){
 let state=initialZiiplyArrivalState(),notice=null,decision;
 for(const at of [0,3000,6000]){
  decision=evaluateZiiplyArrival(state,{at,latitude:target.latitude,longitude:target.longitude,accuracyMeters:5,speedKmh:0},all,selection);
  state=decision.state;notice=reduce(notice,{type:'sample',decision,at});
 }
 return {decision,notice};
}
// Identity cross-check: a single alternating store fix cannot confirm a visit.
{
 let state=initialZiiplyArrivalState();
 const positions=[selected,selected,sameChain,selected,selected];
 for(let i=0;i<positions.length;i++){
  const p=positions[i],at=i*3000;
  const d=evaluateZiiplyArrival(state,{at,latitude:p.latitude,longitude:p.longitude,accuracyMeters:5,speedKmh:0},[selected,sameChain,crossChain],[selected.id]);
  state=d.state;
  assert.equal(d.showArrivalMessage,false,'alternating store identity must not confirm arrival');
 }
}
let x=scenario(selected);
assert.equal(x.decision.showArrivalMessage,true);
assert.equal(x.notice.phase,'approach');
let n=reduce(x.notice,{type:'tick',at:10000});assert.equal(n.phase,'list');
n=reduce(n,{type:'tick',at:15000});assert.equal(n.phase,'offers');
n=reduce(n,{type:'tick',at:70000});assert.equal(n.phase,'done');
assert.equal(reduce(n,{type:'sample',decision:x.decision,at:22000}).phase,'done');
x=scenario(selected,[]);assert.equal(x.decision.showArrivalMessage,false);assert.equal(x.notice,null);
x=scenario(sameChain);assert.equal(x.decision.showArrivalMessage,false);assert.equal(x.decision.askStoreChange,true);assert.equal(x.notice,null);
x=scenario(crossChain);assert.equal(x.decision.showArrivalMessage,false);assert.equal(x.decision.askStoreChange,false);assert.equal(x.notice,null);
x=scenario(selected);n=reduce(x.notice,{type:'tick',at:2000});assert.equal(n.phase,'approach');
n=reduce(n,{type:'pause',at:8500});assert.equal(n.remainingMs,1500);assert.equal(n.deadline,null);
n=reduce(n,{type:'tick',at:600000});assert.equal(n.phase,'approach');
n=reduce(n,{type:'resume',at:600000});assert.equal(n.deadline,601500);
n=reduce(n,{type:'tick',at:601500});assert.equal(n.phase,'list');
console.log('PASS arrival: selected-only, same-chain mismatch, cross-chain suppression, once, 4+5+5 timers, pause/resume');

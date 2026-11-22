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
 const nearbyOther={...sameChain,latitude:60.00072};
 const positions=[selected,selected,nearbyOther,selected,selected];
 for(let i=0;i<positions.length;i++){
  const p=positions[i],at=i*3000;
  const d=evaluateZiiplyArrival(state,{at,latitude:p.latitude,longitude:p.longitude,accuracyMeters:5,speedKmh:0},[selected,nearbyOther,crossChain],[selected.id]);
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
// Switching selection invalidates an already confirmed visit, including during GPS loss.
{
 const confirmed=scenario(selected).decision.state;
 const switched=evaluateZiiplyArrival(confirmed,{at:7000,latitude:selected.latitude,longitude:selected.longitude,accuracyMeters:100,speedKmh:0},[selected,sameChain,crossChain],[sameChain.id]);
 assert.equal(switched.state.arrivalStoreId,null,'selection change must clear stale confirmed store');
 assert.equal(switched.radar,'white','invalid GPS must not restore old green state');
 assert.equal(switched.showArrivalMessage,false);
}
x=scenario(selected,[]);assert.equal(x.decision.showArrivalMessage,false);assert.equal(x.notice,null);
x=scenario(sameChain);assert.equal(x.decision.showArrivalMessage,false);assert.equal(x.decision.askStoreChange,true,'first confirmed mismatch must ask for store change');assert.equal(x.decision.state.arrivalStoreId,null,'mismatched store must not latch presence');assert.equal(x.notice,null);
{
 let state=initialZiiplyArrivalState(), prompts=0;
 for(const at of [0,3000,6000,9000,12000]){
  const d=evaluateZiiplyArrival(state,{at,latitude:sameChain.latitude,longitude:sameChain.longitude,accuracyMeters:5,speedKmh:0},[selected,sameChain,crossChain],[selected.id]);
  state=d.state;prompts+=Number(d.askStoreChange);
  assert.equal(d.state.arrivalStoreId,null,'wrong same-chain store must not confirm presence');
 }
 assert.equal(prompts,1,'one mismatch prompt per encounter');
}
x=scenario(crossChain);assert.equal(x.decision.showArrivalMessage,false);assert.equal(x.decision.askStoreChange,true,'cross-chain nearby store must request selection change');assert.equal(x.notice,null);
// Regression: user stops with the wrong chain selected, then manually switches after >30s.
{
 let state=initialZiiplyArrivalState();let prompts=0;let final;
 for(let i=0;i<18;i++){
  const at=i*3000;
  final=evaluateZiiplyArrival(state,{at,latitude:crossChain.latitude,longitude:crossChain.longitude,accuracyMeters:5,speedKmh:0},[selected,sameChain,crossChain],[selected.id]);
  state=final.state;prompts+=Number(final.askStoreChange);
 }
 assert.equal(prompts,1,'cross-chain mismatch must prompt once');
 for(let i=18;i<22;i++){
  final=evaluateZiiplyArrival(state,{at:i*3000,latitude:crossChain.latitude,longitude:crossChain.longitude,accuracyMeters:5,speedKmh:0},[selected,sameChain,crossChain],[crossChain.id]);
  state=final.state;
 }
 assert.equal(final.status,'in-store','manual switch after 30s must confirm without reload');
 assert.equal(final.state.arrivalStoreId,crossChain.id);
}
// Adjacent shops inside GPS accuracy: offer both choices, never auto-confirm.
{
 const a={id:'adj-k',name:'K-Supermarket',chain:'K',latitude:60,longitude:25};
 const b={id:'adj-s',name:'S-market',chain:'S',latitude:60.00006,longitude:25};
 let state=initialZiiplyArrivalState(),prompts=0,decision;
 for(let i=0;i<8;i++){
  decision=evaluateZiiplyArrival(state,{at:i*3000,latitude:60.00003,longitude:25,accuracyMeters:5,speedKmh:0},[a,b],[a.id]);
  state=decision.state;prompts+=Number(decision.askStoreChange);
 }
 assert.equal(prompts,1,'ambiguous adjacent stores should ask only once');
 assert.equal(decision.status,'uncertain');
 assert.equal(decision.showArrivalMessage,false,'ambiguous GPS must not auto-confirm');
 assert.equal(decision.nearbyStoreChoices.length,2,'both adjacent stores must be offered');
 assert.equal(decision.state.arrivalStoreId,null);
}
x=scenario(selected);n=reduce(x.notice,{type:'tick',at:2000});assert.equal(n.phase,'approach');
n=reduce(n,{type:'pause',at:8500});assert.equal(n.remainingMs,1500);assert.equal(n.deadline,null);
n=reduce(n,{type:'tick',at:600000});assert.equal(n.phase,'approach');
n=reduce(n,{type:'resume',at:600000});assert.equal(n.deadline,601500);
n=reduce(n,{type:'tick',at:601500});assert.equal(n.phase,'list');
console.log('PASS arrival: selected-only, same-chain mismatch, cross-chain mismatch and late manual selection, once, 4+5+5 timers, pause/resume');

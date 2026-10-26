import assert from 'node:assert/strict';
import {arrivalNoticeReducer as reduce} from '../src/app/components/ziiply/location/ziiplyArrivalNotice.ts';
import {evaluateZiiplyArrival,initialZiiplyArrivalState} from '../src/app/components/ziiply/location/ziiplyArrivalSequence.ts';
const store={id:'sale',name:'Sale Monninkylä',latitude:60.49385,longitude:25.5413};
let state=null,engine=initialZiiplyArrivalState();
function sample(at,offset=.0013,selected=false,accuracy=5){
 const decision=evaluateZiiplyArrival(engine,{at,latitude:store.latitude+offset,longitude:store.longitude,accuracyMeters:accuracy,speedKmh:0},[store],selected?[store.id]:[]);
 engine=decision.state;state=reduce(state,{type:'sample',decision,at});return decision;
}
sample(0);assert.equal(state.phase,'approach');sample(3000);assert.equal(state.deadline,4000);
state=reduce(state,{type:'tick',at:4000});assert.equal(state.phase,'list');assert.equal(state.confirmed,false);
sample(5000);assert.equal(state.phase,'list');assert.equal(state.deadline,9000);
state=reduce(state,{type:'skip',at:6000});assert.equal(state.phase,'offers');
state=reduce(state,{type:'tick',at:11000});assert.equal(state.phase,'done');sample(12000,0);assert.equal(state.phase,'done');
console.log('PASS 145m approach opens recipe/list after 4s with selected:false; entering shop does not restart chain');
sample(15000,.004);assert.equal(state,null);sample(17000,0);state=reduce(state,{type:'tick',at:21000});assert.equal(state.phase,'list');
sample(22000,0,false,100);assert.equal(state.phase,'waiting');sample(23000);assert.equal(state.phase,'list');
state=reduce(state,{type:'dismiss'});sample(24000);assert.equal(state.phase,'done');
console.log('PASS direct arrival, poor accuracy, dismissal, exit and re-entry');

state=null;engine=initialZiiplyArrivalState();
for(const selected of [false,true]){
 state=null;engine=initialZiiplyArrivalState();
 sample(0,.0013,selected);state=reduce(state,{type:'tick',at:4000});
 assert.equal(state.phase,'list');sample(5000,0,selected);assert.equal(state.phase,'list');
 state=reduce(state,{type:'tick',at:9000});assert.equal(state.phase,'offers');
 state=reduce(state,{type:'tick',at:14000});assert.equal(state.phase,'done');
 sample(15000,0,selected);assert.equal(state.phase,'done');
 sample(16000,.004,selected);assert.equal(state,null);
 sample(17000,.0013,selected);state=reduce(state,{type:'tick',at:21000});assert.equal(state.phase,'list');
}
console.log('PASS both selected flag values: list at 145m, no duplicate on entry, 5s timeouts and repeat only after exit');

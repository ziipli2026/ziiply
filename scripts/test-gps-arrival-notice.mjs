import assert from 'node:assert/strict';
import {arrivalNoticeReducer as reduce} from '../src/app/components/ziiply/location/ziiplyArrivalNotice.ts';
import {evaluateZiiplyArrival,initialZiiplyArrivalState} from '../src/app/components/ziiply/location/ziiplyArrivalSequence.ts';
const store={id:'sale',name:'Sale Monninkylä',latitude:60.49385,longitude:25.5413};
let notice=null,engine=initialZiiplyArrivalState();
const sample=(at,offset=0,speed=0,selected=false)=>{
 const d=evaluateZiiplyArrival(engine,{at,latitude:store.latitude+offset,longitude:store.longitude,accuracyMeters:5,speedKmh:speed},[store],selected?[store.id]:[]);
 engine=d.state;notice=reduce(notice,{type:'sample',decision:d,at});return d;
};
assert.equal(sample(0,.0013).showArrivalMessage,false);assert.equal(notice,null);
assert.equal(sample(1000,0,42).showArrivalMessage,false);assert.equal(notice,null);
sample(2000,0,0);assert.equal(notice,null);
const confirmed=sample(7000,0,0);assert.equal(confirmed.showArrivalMessage,true);assert.equal(confirmed.askStoreChange,true);
assert.equal(notice.phase,'list');assert.equal(notice.selected,false);
notice=reduce(notice,{type:'tick',at:20000});assert.equal(notice.phase,'list');
notice=reduce(notice,{type:'dismiss'});assert.equal(notice.phase,'done');
sample(9000,0,0);assert.equal(notice.phase,'done');
console.log('PASS arrival notice: no drive-by prompts, explicit confirmation, mismatch and no timer auto-navigation');

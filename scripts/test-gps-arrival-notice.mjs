import assert from 'node:assert/strict';
import { arrivalNoticeReducer as reduce } from '../src/app/components/ziiply/location/ziiplyArrivalNotice.ts';
import { evaluateZiiplyArrival, initialZiiplyArrivalState } from '../src/app/components/ziiply/location/ziiplyArrivalSequence.ts';
const store = { id:'sale', name:'Sale Monninkylä', latitude:60.49385, longitude:25.5413 };
let engine, notice;
function reset(){ engine=initialZiiplyArrivalState(); notice=null; }
function sample(at, offset=0, selected=true, accuracy=5, stores=[store]){
  const decision=evaluateZiiplyArrival(engine,{at,latitude:store.latitude+offset,longitude:store.longitude,accuracyMeters:accuracy,speedKmh:0},stores,selected?[store.id]:[]);
  engine=decision.state;notice=reduce(notice,{type:'sample',decision,at});return decision;
}
function tick(at){notice=reduce(notice,{type:'tick',at});}
reset();assert.equal(sample(0,.0013).status,'near-store');assert.equal(notice.phase,'approach');
sample(1500);sample(3500);assert.equal(notice.deadline,4000);tick(3999);assert.equal(notice.phase,'approach');
tick(4000);assert.equal(notice.phase,'list');assert.equal(notice.deadline,9000);
sample(6000);assert.equal(notice.deadline,9000);tick(9000);assert.equal(notice.phase,'offers');
tick(14000);assert.equal(notice.phase,'done');sample(15000);assert.equal(notice.phase,'done');
console.log('PASS approach 4s, list 5s, offers 5s, repeated samples do not restart timers');
sample(16000,.004);assert.equal(notice,null);assert.equal(engine.arrivalStoreId,null);
assert.equal(sample(17000).showArrivalMessage,true);assert.equal(notice.phase,'approach');
console.log('PASS exit clears visit and re-entry announces again');
reset();sample(0,.0013);tick(4000);assert.equal(notice.phase,'waiting');sample(7000);assert.equal(notice.phase,'list');
console.log('PASS approaching alone does not open in-store choices; later arrival resumes');
reset();sample(0,0,false);tick(4000);assert.equal(notice.phase,'store-change');
sample(5000,0,true);assert.equal(notice.phase,'list');
console.log('PASS unselected store requires selection; selected reliable store skips confirmation');
reset();sample(0);tick(4000);sample(5000,0,true,100);assert.equal(notice.phase,'waiting');
tick(9000);assert.equal(notice.phase,'waiting');sample(10000);assert.equal(notice.phase,'list');
console.log('PASS unreliable GPS cancels actionable choices');
reset();sample(0,0,true,5,[store,{...store,id:'other',latitude:store.latitude+.00001}]);assert.equal(notice,null);
console.log('PASS ambiguous stores cannot trigger arrival');
reset();sample(0);tick(4000);notice=reduce(notice,{type:'dismiss'});sample(5000);assert.equal(notice.phase,'done');
notice=reduce(notice,{type:'reset'});assert.equal(notice,null);
console.log('PASS user action closes chain; GPS off resets it');
reset();sample(0);tick(4000);notice=reduce(notice,{type:'resume',at:20000});assert.equal(notice.deadline,25000);
console.log('PASS returning to foreground grants a full choice interval');

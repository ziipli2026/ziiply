const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const load=(path)=>{const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports,require,console});return mod.exports;};
const core=load('src/app/components/ziiply/location/ziiplyArrivalSequence.ts');
const {arrivalNoticeReducer:reduce}=load('src/app/components/ziiply/location/ziiplyArrivalNotice.ts');
const shop={id:'sale',name:'Sale',latitude:60,longitude:25};
let state=core.initialZiiplyArrivalState(),notice=null;
function sample(at,offset=0,selected=true,accuracy=5,stores=[shop]){
 const d=core.evaluateZiiplyArrival(state,{at,latitude:60+offset,longitude:25,accuracyMeters:accuracy,speedKmh:null},stores,selected?['sale']:[]);
 state=d.state;notice=reduce(notice,{type:'sample',at,decision:d});return d;
}
for(const selected of [false,true]){
 state=core.initialZiiplyArrivalState();notice=null;
 const near=sample(0,.0013,selected);assert.equal(near.status,'near-store');assert.equal(near.radar,'white');
 notice=reduce(notice,{type:'tick',at:4000});assert.equal(notice.phase,'list','recipe/list opens while approaching regardless of active chain');
 sample(5000,.0013,selected);assert.equal(notice.deadline,9000);
 notice=reduce(notice,{type:'tick',at:9000});assert.equal(notice.phase,'offers');
 const inside=sample(10000,0,selected);assert.equal(inside.status,'in-store');assert.equal(inside.radar,'green');
 assert.equal(inside.isSelectedStore,selected);assert.equal(notice.phase,'offers','entering store must not restart approach prompts');
 notice=reduce(notice,{type:'tick',at:14000});assert.equal(notice.phase,'done');
 sample(15000,0,selected);assert.equal(notice.phase,'done');
 sample(16000,.004,selected);assert.equal(notice,null);assert.equal(state.arrivalStoreId,null);
 assert.equal(sample(17000,0,selected).showArrivalMessage,true);
 sample(18000,0,selected,100);assert.equal(notice.phase,'waiting');
}
state=core.initialZiiplyArrivalState();notice=null;
assert.equal(sample(0,0,true,5,[shop,{...shop,id:'other',latitude:60.00001}]).status,'uncertain');
assert.equal(notice,null);
assert.equal(core.shouldFetchZiiplyCartPrice({hasPrice:true,event:'cart-open',inStore:false,storeConfirmed:false}),false);
assert.equal(core.shouldFetchZiiplyCartPrice({hasPrice:true,event:'ttl-expired',inStore:false,storeConfirmed:false}),false);
assert.equal(core.shouldFetchZiiplyCartPrice({hasPrice:false,event:'new-item',inStore:false,storeConfirmed:false}),true);
console.log('PASS arrival: 145m prompts, 4s/5s timing, immediate reliable in-store decision, uncertainty, departure and price guards');

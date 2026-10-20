const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
const path='src/app/components/ziiply/location/ziiplyArrivalSequence.ts';
const source=fs.readFileSync(path,'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const testModule={exports:{}};
vm.runInNewContext(js,{module:testModule,exports:testModule.exports,require,console}, {filename:path});
const m=testModule.exports;
const store={id:'prisma',name:'Prisma',latitude:60.63,longitude:24.86};
const other={id:'citymarket',name:'Citymarket',latitude:60.64,longitude:24.87};
let state=m.initialZiiplyArrivalState();
function step(at,speed,latitude=store.latitude,longitude=store.longitude,accuracy=8,stores=[store]){
 const r=m.evaluateZiiplyArrival(state,{at,speedKmh:speed,latitude,longitude,accuracyMeters:accuracy},stores,['citymarket']);
 state=r.state;return r;
}
assert.equal(step(0,30).state.tripConfirmed,false);
assert.equal(step(20000,30).state.tripConfirmed,false);
assert.equal(step(60000,30).state.tripConfirmed,true,'60-second trip');
assert.equal(step(65000,0).radar,'white');
assert.equal(step(70000,0).radar,'white');
assert.equal(step(75000,0).radar,'white');
const arrived=step(85000,0);
assert.equal(arrived.radar,'green','parked 20 seconds');
assert.equal(arrived.askStoreChange,true,'GPS store differs from selected');
assert.equal(arrived.showArrivalMessage,true);
assert.equal(step(90000,0).showArrivalMessage,false,'do not repeat arrival');
state=m.initialZiiplyArrivalState();
let r=m.evaluateZiiplyArrival(state,{at:0,speedKmh:0,latitude:store.latitude,longitude:store.longitude,accuracyMeters:15},[store,{...other,latitude:store.latitude+0.00005,longitude:store.longitude}],['prisma']);
state=r.state;
r=m.evaluateZiiplyArrival(state,{at:20000,speedKmh:0,latitude:store.latitude,longitude:store.longitude,accuracyMeters:15},[store,{...other,latitude:store.latitude+0.00005,longitude:store.longitude}],['prisma']);
assert.equal(r.radar,'white','ambiguous neighboring shops');
for(const elapsed of [20*60*1000,24*60*60*1000]){
 assert.equal(m.shouldFetchZiiplyCartPrice({hasPrice:true,event:'cart-open',inStore:false,storeConfirmed:false}),false,'cart opening at '+elapsed);
 assert.equal(m.shouldFetchZiiplyCartPrice({hasPrice:true,event:'ttl-expired',inStore:false,storeConfirmed:false}),false);
}
assert.equal(m.shouldFetchZiiplyCartPrice({hasPrice:false,event:'new-item',inStore:false,storeConfirmed:false}),true);
assert.equal(m.shouldFetchZiiplyCartPrice({hasPrice:true,event:'confirmed-store-arrival',inStore:true,storeConfirmed:true,activeStoreId:'prisma',priceStoreId:'prisma'}),true);
console.log('PASS: simulated GPS, arrival and cart cache rules');

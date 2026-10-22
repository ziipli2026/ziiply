const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const page=fs.readFileSync('src/app/page.tsx','utf8');
const core=fs.readFileSync('src/app/components/ziiply/location/ziiplyArrivalSequence.ts','utf8');
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(core,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports});
const {evaluateZiiplyArrival,initialZiiplyArrivalState}=mod.exports;
const start=page.indexOf('  liveArrivalHandlerRefV864.current = (position) => {');
const end=page.indexOf('\n  function checkScannerLocationOnOpenV856()',start);
assert(start>0&&end>start);
let now=1000000,ui;
const ref=v=>({current:v});
const context={Date:{now:()=>now},Number,Map,
  evaluateZiiplyArrival,initialZiiplyArrivalState,
  liveArrivalHandlerRefV864:ref(null),liveArrivalStateRefV864:ref(initialZiiplyArrivalState()),
  liveArrivalLastFixAtRefV864:ref(0),liveArrivalDecisionRefV864:ref(null),
  scannerStoreCheckDoneRefV791:ref(false),scannerInStoreRefV828:ref(false),
  scannerConfirmedStoreNameRefV828:ref(''),gpsCoordsLatestRefV137:ref(null),
  eanScannerOpen:true,selectedChains:{s:true,k:true},
  activeStores:{sStoreName:'Sale',kStoreName:'K-Market'},
  selectedLidlStoreV750:null,selectedTokmanniStoreV756:null,selectedEurosparStoreV751:null,
  foundStores:[],normalize:s=>s.toLowerCase(),
  buildGpsStoreCandidatePoolFromAllAreasV40:()=>[
    {name:'Sale',latitude:60,longitude:25},
    {name:'Sale',latitude:60,longitude:25},
    {name:'K-Market',latitude:61,longitude:26}],
  getStoreCoordinateV320:(s,keys)=>s[keys[0]],
  setGpsCoordsV320:()=>{},
  setScannerLocationStatusV855:value=>{ui=typeof value==='function'?value(ui):value;}
};
vm.runInNewContext(ts.transpileModule(page.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
const sample=(elapsed,{lat=60,lon=25,speed=null,accuracy=8,age=0}={})=>{
 now=1000000+elapsed;
 context.liveArrivalHandlerRefV864.current({timestamp:now-age,coords:{latitude:lat,longitude:lon,speed,accuracy}});
};
sample(0);assert.equal(context.scannerInStoreRefV828.current,false);
for(const t of [5000,10000,15000]){sample(t);assert.equal(context.scannerInStoreRefV828.current,false);}
sample(20000);assert.equal(context.scannerInStoreRefV828.current,true,'stable null-speed Safari fixes confirm arrival after 10 seconds');
assert.equal(ui.name,'Sale');assert.equal(ui.verified,true,'duplicate store rows must not create ambiguity');
sample(25000,{accuracy:150});assert.equal(context.scannerInStoreRefV828.current,true,'brief indoor loss preserves confirmation');
now=1051000;context.liveArrivalHandlerRefV864.current(null);
assert.equal(context.scannerInStoreRefV828.current,false,'confirmation expires after 30 seconds without usable GPS');
assert.equal(context.scannerStoreCheckDoneRefV791.current,false,'GPS failure remains retryable');
sample(55000);assert.equal(context.scannerInStoreRefV828.current,false);
for(const t of [60000,65000,70000,75000])sample(t);
assert.equal(context.scannerInStoreRefV828.current,true,'later accurate fixes recover without reopening scanner');
sample(80000,{lat:60.01,speed:10});assert.equal(context.scannerInStoreRefV828.current,false,'departure revokes confirmation');
sample(85000,{age:20000});assert.equal(context.scannerInStoreRefV828.current,false,'stale fixes cannot confirm a shop');
sample(120000);assert.equal(context.scannerInStoreRefV828.current,false,'resume after a long gap starts new stationary confirmation');
for(const t of [125000,130000,135000,140000])sample(t);
assert.equal(context.scannerInStoreRefV828.current,true);
context.buildGpsStoreCandidatePoolFromAllAreasV40=()=>[
 {name:'Sale',latitude:60,longitude:25},
 {name:'K-Market',latitude:60.00001,longitude:25}];
sample(145000);assert.equal(context.scannerInStoreRefV828.current,false,'indistinguishable neighboring stores are not auto-confirmed');
// Execute the real sampling effect with fake browser callbacks and timers.
const effectStart=page.indexOf('  // V864: lightweight fresh samples');
const effectEnd=page.indexOf('  // V737_RESUME_REFRESH_AFTER_LONG_BACKGROUND:',effectStart);
let cleanup,timer,success,hidden=false,calls=0,handlerCalls=0;const listeners={};
const browser={usingOwnLocation:true,gpsUserDisabledRefV306:ref(false),ZIIPLY_PARKED_SAMPLE_MS:5000,
 liveArrivalHandlerRefV864:ref(()=>handlerCalls++),
 navigator:{geolocation:{getCurrentPosition(ok,err,options){
  calls++;assert.equal(options.maximumAge,0);assert.equal(options.enableHighAccuracy,true);success=ok;
 }}},
 document:{get hidden(){return hidden;},addEventListener:(n,cb)=>listeners[n]=cb,removeEventListener:(n)=>delete listeners[n]},
 window:{addEventListener:(n,cb)=>listeners[n]=cb,removeEventListener:(n)=>delete listeners[n]},
 useEffect:fn=>cleanup=fn(),setInterval:(fn,ms)=>{assert.equal(ms,5000);timer=fn;return 1;},
 clearInterval:()=>{},setTimeout:()=>1,clearTimeout:()=>{}};
vm.runInNewContext(ts.transpileModule(page.slice(effectStart,effectEnd),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,browser);
assert.equal(calls,1);success({});timer();assert.equal(calls,2,'sample again every five seconds');
const late=success;hidden=true;listeners.visibilitychange();late({});assert.equal(handlerCalls,1,'hidden-session callback is ignored');
hidden=false;listeners.visibilitychange();assert.equal(calls,3,'resume requests fresh location immediately');
cleanup();success({});assert.equal(handlerCalls,1,'unmounted callback is ignored');
console.log('PASS: five-second polling, 10-second parking, null speed, retries, indoor GPS loss, departure, stale fixes, ambiguity and resume');

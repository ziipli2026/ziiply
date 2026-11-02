const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(path){const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports});return mod.exports;}
const core=load('src/app/components/ziiply/location/ziiplyArrivalSequence.ts');
const {arrivalNoticeReducer:reduce}=load('src/app/components/ziiply/location/ziiplyArrivalNotice.ts');
function check(selectedName,arrivedName,expected){
 const selected={id:'selected',name:selectedName,latitude:60.01,longitude:25};
 const arrived={id:'arrived',name:arrivedName,latitude:60,longitude:25};
 const decision=core.evaluateZiiplyArrival(core.initialZiiplyArrivalState(),{at:1000,latitude:60,longitude:25,accuracyMeters:5,speedKmh:0},[selected,arrived],['selected']);
 assert.equal(decision.askStoreChange,expected,selectedName+' -> '+arrivedName);
 const notice=reduce(null,{type:'sample',decision,at:1000});
 assert.equal(notice?.phase==='change-store',expected);
 if(expected){assert.equal(notice.selectedStoreName,selectedName);assert.equal(reduce(notice,{type:'dismiss'}).phase,'done');}
}
check('K-Supermarket Hyvinkää','K-Citymarket Hyvinkää',true);
check('K-Citymarket Hyvinkää','K-Supermarket Hyvinkää',true);
check('S-market Hyvinkää','Prisma Hyvinkää',true);
check('Prisma Hyvinkää','S-market Hyvinkää',true);
check('Sale Hyvinkää','Alepa Hyvinkää',true);
check('K-Market Hyvinkää','K-Market Helsinki',true);
check('K-Market Hyvinkää','K-Citymarket Hyvinkää',true);
check('Prisma Hyvinkää','Sale Hyvinkää',true);
check('Prisma Hyvinkää','K-Citymarket Hyvinkää',false);
check('S-market Hyvinkää','K-Supermarket Hyvinkää',false);
check('Tuntematon kauppa','K-Citymarket Hyvinkää',false);
console.log('PASS: chain and store-group isolation, K/S cross-format switching, consent prompt and decline');

const citymarket={id:'k-citymarket hyvinkaa',name:'K-Citymarket Hyvinkää',latitude:60.63256951925641,longitude:24.8639144333107};
const selectedName='K-Supermarket Vieremä';
const sample={at:1000,latitude:60.631593183629526,longitude:24.863967967839802,accuracyMeters:16.78,speedKmh:null};
const first=core.evaluateZiiplyArrival(core.initialZiiplyArrivalState(),sample,[citymarket],['k-supermarket vierema'],[selectedName]);
assert.equal(first.status,'near-store');
assert.equal(first.selectedStoreName,selectedName);
const second=core.evaluateZiiplyArrival(first.state,{...sample,at:22000},[citymarket],['k-supermarket vierema'],[selectedName]);
assert.equal(second.status,'in-store');
assert.equal(second.askStoreChange,true);
const prompt=reduce(null,{type:'sample',decision:second,at:22000});
assert.equal(prompt?.phase,'change-store');
const next=core.evaluateZiiplyArrival(second.state,{...sample,at:29000},[citymarket],['k-supermarket vierema'],[selectedName]);
assert.equal(reduce(prompt,{type:'sample',decision:next,at:29000})?.phase,'change-store');
console.log('PASS: real Hyvinkää 108m GPS mismatch, 20s stationary, selected shop outside GPS pool, persistent prompt');

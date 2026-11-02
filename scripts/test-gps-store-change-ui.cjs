const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
let noticeModule;
function load(file){
 const mod={exports:{}};
 const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(compiled,{module:mod,exports:mod.exports,require:name=>name==='react'?React:name==='react/jsx-runtime'?require('react/jsx-runtime'):name==='./ziiplyArrivalNotice'?noticeModule:require(name)});
 return mod.exports;
}
noticeModule=load('src/app/components/ziiply/location/ziiplyArrivalNotice.ts');
const core=load('src/app/components/ziiply/location/ziiplyArrivalSequence.ts');
const Component=load('src/app/components/ziiply/location/ZiiplyArrivalNotice.tsx').default;
const citymarket={id:'k-citymarket hyvinkaa',name:'K-Citymarket Hyvinkää',latitude:60.63256951925641,longitude:24.8639144333107};
const selectedName='K-Supermarket Vieremä';
const samples=[
 [1793606220907,60.631593183629526,24.863967967839802,16.779964084269498],
 [1793606227902,60.63160283148443,24.86395870056551,13.945136366758899],
 [1793606234832,60.631602613576995,24.863965991669147,12.17218299008424],
 [1793606241668,60.631604654952596,24.86396799514512,10.950524134320387]
];
let state=core.initialZiiplyArrivalState(),notice=null;
for(const [at,latitude,longitude,accuracyMeters] of samples){
 const decision=core.evaluateZiiplyArrival(state,{at,latitude,longitude,accuracyMeters,speedKmh:null},[citymarket],['k-supermarket vierema'],[selectedName]);
 state=decision.state;
 notice=noticeModule.arrivalNoticeReducer(notice,{type:'sample',decision,at});
}
assert.equal(notice?.phase,'change-store');
const html=renderToStaticMarkup(React.createElement(Component,{notice,onDismiss:()=>{},onSkip:()=>{},onList:()=>{},onRecipe:()=>{},onOffers:()=>{},onConfirmStoreChange:()=>{}}));
for(const term of ['data-testid="gps-arrival-overlay"','K-Citymarket Hyvinkää','K-Supermarket Vieremä','Kyllä, vaihda kauppa','Ei, säilytä nykyinen'])assert.ok(html.includes(term),term);
assert.equal((html.match(/<button/g)||[]).length,2);
assert.equal(noticeModule.arrivalNoticeReducer(notice,{type:'dismiss'}).phase,'done');
assert.equal(state.arrivalStoreId,null,'no automatic GPS store selection');
const page=fs.readFileSync('src/app/page.tsx','utf8');
assert.ok(page.includes('arrivalNotice.notice?.phase !== "change-store"'));
assert.ok(page.includes('selectStoreForCurrentMode(target, mode)'));
console.log('PASS: real GPS trace renders the store-change dialog and both choices; decline preserves selection; accept handler wired');

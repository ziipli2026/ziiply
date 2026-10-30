require('../scripts/recipe-audit-runtime.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const normal = require('../src/app/components/ziiply/ziiplyCore.ts');
const relevance=require('../src/app/components/ziiply/search/desktopNormalRelevance.ts');
const source = fs.readFileSync('src/app/desktop-preview/DesktopPreviewClient.tsx','utf8');
const start = source.indexOf('  async function runDesktopNormalSearch(');
const end = source.indexOf('  async function runDesktopJustiinaSearch(',start);
const compiled = ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function harness({delay=false}={}) {
  const state = {requests:[],results:null,loading:false};
  const generation = {current:1};
  let release;
  const dependencies = {
    ...relevance, traceNormal:()=>{}, performance, URLSearchParams, justiinaQuery:'maito',desktopVoiceRunRef:generation,
    selectedStores:{s:{id:'prisma',name:'Prisma Hyvinkää',kind:'sHyper'}},storeKind:s=>s.kind,
    getNormalSearchQueries:normal.getNormalSearchQueries,
    rankNormalSearchResults:normal.rankNormalSearchResults,
    rankProductResultsByRelevanceAndPrice:normal.rankProductResultsByRelevanceAndPrice,
    isBadNormalResult:normal.isBadNormalResult,
    setJustiinaDebug:v=>state.debug=v,setJustiinaMessage:v=>state.message=v,
    setJustiinaResults:v=>state.results=v,setJustiinaResultsOpen:v=>state.open=v,
    setJustiinaLoading:v=>state.loading=v,
    justiinaLastSearchedRef:{current:''},justiinaUserEditedRef:{current:false},justiinaAddedDuringSelectionRef:{current:false},
    fetch:async url=>{
      state.requests.push(url);
      if(url.startsWith('/api/neon-first-search'))return {ok:true,json:async()=>({products:[{ean:'6410000000001',name:'Valio kevytmaito 1l',price:999}]})};
      if(delay)await new Promise(resolve=>{release=resolve});
      return {ok:true,status:200,headers:new Headers(),json:async()=>({source:'s-kaupat-normal-v220',products:[
        {id:'beer',name:'Karhu olut 4,6% 0,33l',price:1.24},
        {id:'milk',name:'Valio kevytmaito 1l',price:1.09}
      ]})};
    }
  };
  // No recipe functions, ingredient refs or sessionStorage are supplied.
  const run = new Function(...Object.keys(dependencies),compiled+';return runDesktopNormalSearch;')(...Object.values(dependencies));
  return {run,state,generation,release:()=>release()};
}
(async()=>{
  const h=harness();assert.equal(await h.run('maito'),true);
  assert.equal(h.state.results.length,2);assert.equal(h.state.results[0].id,'milk');
  assert.equal(h.state.results[0].__price,1.09);assert.equal(h.state.loading,false);
  assert.equal(h.state.requests.length,2);assert.ok(h.state.requests.some(url=>url.startsWith('/api/s-products?')));
  assert.equal(h.state.results[1].__price,null,'Neon catalog price must never leak into store quote');
  const d=harness(),events=[];
  await d.run('maito',{observe:(stage,data)=>events.push({stage,data}),signal:new AbortController().signal});
  assert.equal(d.state.results,null);assert.equal(events[0].data.recipeRulesApplied,false);
  assert.equal(events.at(-1).stage,'complete');assert.equal(events.at(-1).data.displayedCount,2);
  const stale=harness({delay:true});const pending=stale.run('maito');
  stale.generation.current++;stale.release();await pending;
  assert.deepEqual(stale.state.results,null,'cancelled search must not replace current results');
  console.log('PASS normal search: provider route, relevance gate, euro prices, diagnostics and stale-response guard');
})().catch(error=>{console.error(error);process.exitCode=1});

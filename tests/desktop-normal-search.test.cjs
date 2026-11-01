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
function harness({delay=false,products=null,providerFailure=false,catalogProducts=null,providerProducts=null}={}) {
  const state = {requests:[],results:null,loading:false};
  const generation = {current:1};
  let release;
  let delayed=false;
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
      if(url.startsWith("/api/ean-bank?"))return {ok:false,status:204,json:async()=>({})};
      state.requests.push(url);
      if(providerFailure&&url.startsWith('/api/neon-first-search'))await new Promise(resolve=>setTimeout(resolve,20));
      if(url.startsWith('/api/neon-first-search'))return {ok:true,json:async()=>({products:catalogProducts||[{ean:'6410000000001',name:'Valio kevytmaito 1l',price:999}]})};
      if(providerFailure)throw new Error("Provider failed before Neon settled");
      if(delay&&!delayed){delayed=true;await new Promise(resolve=>{release=resolve});}
      return {ok:true,status:200,headers:new Headers(),json:async()=>({source:'s-kaupat-normal-v220',products:providerProducts?providerProducts(new URL(url,'https://example.test').searchParams.get('search')):products||[
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
  assert.equal(h.state.results.length,1);assert.equal(h.state.results[0].id,'milk');
  assert.equal(h.state.results[0].__price,1.09);assert.equal(h.state.loading,false);
  assert.equal(h.state.requests.length,1+relevance.desktopSearchQueries("maito").length);assert.ok(h.state.requests.some(url=>url.startsWith('/api/s-products?')));
  assert.ok(h.state.results.every(p=>Number.isFinite(p.__price)&&p.__price>0),'catalog-only records must not be displayed');
  const priced=harness({products:[
    {id:'exact',name:'Valio maito 1l',price:1.29},
    {id:'cheap',name:'Arla kevytmaito 1l',price:0.85},
    {id:'unknown',name:'Maito 1l',price:null},
    {id:'powder',name:'Pikacappuccino maito-kahvijauhe',price:0.1},
    {id:'condensed',name:'Kondensoitu maito 300g',price:0.2},
    {id:'chocolate',name:'Maitosuklaa',price:0.05},
  ]});
  await priced.run('maito');
  assert.deepEqual(priced.state.results.map(p=>p.id),['cheap','exact'],'only real priced milk, cheapest first even when exact lexical hit costs more');
  assert.deepEqual(priced.state.results.map(p=>p.__price),[0.85,1.29]);
  const d=harness(),events=[];
  await d.run('maito',{observe:(stage,data)=>events.push({stage,data}),signal:new AbortController().signal});
  assert.equal(d.state.results,null);assert.equal(events[0].data.recipeRulesApplied,false);
  assert.equal(events.at(-1).stage,'complete');assert.equal(events.at(-1).data.displayedCount,1);
  const stale=harness({delay:true});const pending=stale.run('maito');
  stale.generation.current++;stale.release();await pending;
  assert.deepEqual(stale.state.results,null,'cancelled search must not replace current results');
  const failed=harness({providerFailure:true});
  assert.equal(await failed.run('maito'),false);
  assert.deepEqual(failed.state.results,[],'failed providers must not leave stale results visible');
  assert.equal(failed.state.loading,false);
  assert.match(failed.state.message,/Haku ei onnistunut/);
  const longQuery='Atria Artesaani Kalapihvit Smetanakastikkeella ja Pinaatti';
  const catalog={ean:'6407800008252',name:'Atria Artesaani kalapihvit ja pinaattimuusi 350g',brand:'Atria Artesaani',aliases:['Atria Artesaani Kalapihvit Smetanakastikkeella ja Pinaatti-Perunamuusi 350g']};
  const quote={ean:catalog.ean,id:'meal',name:catalog.name,brandName:catalog.brand,price:5.85};
  const named=harness({catalogProducts:[catalog],products:[quote]});
  await named.run(longQuery);
  assert.equal(named.state.results.length,1,'same-EAN selected-store quote must inherit compatible observed names');
  assert.equal(named.state.results[0].name,quote.name,'retain the current shop display name');
  assert.equal(named.state.results[0].__price,5.85,'retain the real selected-store euro quote');
  const lookup=harness({catalogProducts:[catalog],providerProducts:search=>search===catalog.name?[quote]:[]});
  await lookup.run(longQuery);
  assert.equal(lookup.state.results.length,1,'a catalogue name lookup must recover the real shop quote');
  assert.ok(lookup.state.requests.some(url=>new URL(url,'https://example.test').searchParams.get('search')===catalog.name));
  const mismatch=harness({catalogProducts:[catalog],products:[{...quote,name:quote.name.replace('350g','1kg')}]});
  await mismatch.run(longQuery);
  assert.equal(mismatch.state.results.length,0,'a conflicting package must not inherit catalogue names');
  const noQuote=harness({catalogProducts:[{...catalog,price:999}],products:[{...quote,price:null}]});
  await noQuote.run(longQuery);
  assert.equal(noQuote.state.results.length,0,'catalogue evidence never supplies a missing shop quote');
  const localProducer=harness({catalogProducts:[{ean:'2000629900000',name:'Kurkku Härkälä'}],products:[{ean:'2000629900000',name:'Kurkku Juntti',price:1.29}]});
  await localProducer.run('Kurkku Härkälä');
  assert.equal(localProducer.state.results.length,0,'restricted EAN cannot transfer another producer between stores');
  const cauliflower={ean:'2000604100005',name:'Kukkakaali',aliases:['Kukkakaali irto']};
  const loose=harness({catalogProducts:[cauliflower],providerProducts:search=>search===cauliflower.name?[{ean:cauliflower.ean,name:cauliflower.name,price:2.89}]:[]});
  await loose.run('Kukkakaali irto');
  assert.equal(loose.state.results.length,1,'two-word attribute queries can recover a shorter current shop name');
  const potato={ean:'2000680700007',name:'Peruna kiinteä pesty/mullattu Suomi'};
  const slash=harness({catalogProducts:[potato],providerProducts:search=>search===potato.name?[{...potato,price:2.95}]:[]});
  await slash.run('Peruna kiinteä pesty mullattu Suomi');
  assert.equal(slash.state.results.length,1,'word-equivalent punctuation must not suppress the canonical shop lookup');
  assert.equal(slash.state.results[0].__price,2.95);
  // Exercise the actual audit verdict, so another priced EAN cannot turn a
  // missing known reference product into a passing coverage check.
  const auditSource=fs.readFileSync('scripts/test-neon-100-live.cjs','utf8');
  const guardStart=auditSource.indexOf('  const expectedEanVisible=');
  const guardEnd=auditSource.indexOf('\n }catch(error)',guardStart);
  assert.ok(guardStart>=0 && guardEnd>guardStart);
  const auditVerdict=new Function('reference','rows','r','suspects','summarize',auditSource.slice(guardStart,guardEnd));
  const missing={errors:[]};
  auditVerdict({expectedNeonEan:'6407800008252',expectPriced:true},[{ean:'6413300016468',__price:1.89}],missing,[],p=>p);
  assert.equal(missing.visible.expectedEanVisible,false);
  assert.deepEqual(missing.errors,['Expected priced EAN missing from normal display: 6407800008252']);
  const present={errors:[]};
  auditVerdict({expectedNeonEan:'6407800008252',expectPriced:true},[{ean:'6407800008252',__price:5.85}],present,[],p=>p);
  assert.equal(present.visible.expectedEanVisible,true);assert.deepEqual(present.errors,[]);
  const unconfirmed={errors:[]};
  auditVerdict({expectedNeonEan:'6407800008252',expectPriced:false},[{ean:'6413300016468',__price:1.89}],unconfirmed,[],p=>p);
  assert.equal(unconfirmed.visible.expectedEanVisible,false);assert.deepEqual(unconfirmed.errors,[],'a reference without a price is recorded without claiming stock');
  console.log('PASS normal search: provider route, relevance gate, euro prices, diagnostics and stale-response guard');
})().catch(error=>{console.error(error);process.exitCode=1});

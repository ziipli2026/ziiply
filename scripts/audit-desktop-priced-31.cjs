// Execute the real desktop handler with live selected-store HTTP responses.
// Fixture names are never used as product aliases or search fallbacks.
require('./recipe-audit-runtime.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const ts=require('typescript'),cli=promisify(execFile);
const relevance=require('../src/app/components/ziiply/search/desktopNormalRelevance.ts');
const core=require('../src/app/components/ziiply/ziiplyCore.ts');
const {compatibleCatalogNames}=require('../src/lib/catalogNameEvidence.ts');
const cases=require('./fixtures/neon-31-canonical.json');
const base=process.env.PREVIEW_URL,target=process.env.TARGET_COMMIT;
assert.ok(base&&target,'Pin the verified desktop target before this audit');
assert.ok(process.env.VERCEL_TOKEN,'Missing VERCEL_TOKEN');
const source=fs.readFileSync('src/app/desktop-preview/DesktopPreviewClient.tsx','utf8');
const start=source.indexOf('  async function runDesktopNormalSearch('),end=source.indexOf('  async function runDesktopJustiinaSearch(',start);
assert.ok(start>=0&&end>start,'Desktop handler not found');
const compiled=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const stores=[{chain:'S',id:'292',name:'Prisma Hyvinkää',kind:'sHyper'},{chain:'K',id:'3221',name:'K-Citymarket Hyvinkää',kind:'kHyper'}];
const unresolved=new Set(['2000410100008','2387966000007','2000629900000']);
const cache=new Map(),report={target:base,targetCommit:target,sourceCommit:process.env.GITHUB_SHA,runAt:new Date().toISOString(),stores,results:[],transportIssues:[]};
const itemsOf=data=>Array.isArray(data)?data:Array.isArray(data?.products)?data.products:Array.isArray(data?.items)?data.items:[];
const shopPath=(store,search)=>'/api/'+(store.chain==='S'?'s':'k')+'-products?'+new URLSearchParams({search,store:store.id,...(store.chain==='S'?{storeName:store.name,storeType:'hyper'}:{})});
const euro=(store,data,p)=>{const raw=Number(p?.storeItems?.[0]?.price??p?.price??0);return Number.isFinite(raw)&&raw>0?raw/(store.chain==='S'&&data.source==='s-kaupat-normal-v220'?1:100):null;};
function save(){fs.writeFileSync('desktop-priced-31.json',JSON.stringify(report,null,2));}
process.on('exit',save);
async function request(path){
 if(!cache.has(path))cache.set(path,(async()=>{
  let stdout;
  for(let attempt=0;attempt<2;attempt++){
   try{({stdout}=await cli('vercel',['curl',new URL(path,base).toString(),'--','-sS','-f'],{timeout:45000,maxBuffer:8*1024*1024,env:process.env}));break;}
   catch(error){
    const detail=String(error.stderr||error.message||'');
    const transient=error.killed||/ETIMEDOUT|ECONNRESET|EAI_AGAIN|curl: \((?:6|7|28|35|52|55|56)\)/i.test(detail);
    report.transportIssues.push({path,attempt:attempt+1,retried:Boolean(transient&&!attempt),detail:detail.slice(0,300)});
    if(!transient||attempt)throw Error('HTTP request failed: '+path);
   }
  }
  const data=JSON.parse(stdout);
  if(data.ok===false||data.error)throw Error('API error: '+path+' '+JSON.stringify(data.error||data));
  return data;
 })());
 return cache.get(path);
}
async function test(c){
 const r={query:c.query,ean:c.ean,errors:[],requests:[],probes:[],visible:[],catalogFound:false};report.results.push(r);
 try{
  let rows=null;const noop=()=>{};
  const deps={...relevance,traceNormal:noop,performance,URLSearchParams,justiinaQuery:c.query,desktopVoiceRunRef:{current:1},
   selectedStores:{s:stores[0],k:stores[1]},storeKind:s=>s.kind,rankProductResultsByRelevanceAndPrice:core.rankProductResultsByRelevanceAndPrice,
   setJustiinaDebug:debug=>{r.providerFailures=debug.failures||[];},setJustiinaMessage:message=>{r.message=message;},setJustiinaResults:value=>{rows=value;},setJustiinaResultsOpen:noop,setJustiinaLoading:noop,
   justiinaLastSearchedRef:{current:''},justiinaUserEditedRef:{current:false},justiinaAddedDuringSelectionRef:{current:false},
   fetch:async path=>{
    if(path.startsWith('/api/ean-bank?'))return {ok:false,status:204,headers:new Headers(),json:async()=>({})};
    r.requests.push(path);
    try{const data=await request(path);return {ok:true,status:200,headers:new Headers({'content-type':'application/json'}),json:async()=>data};}
    catch(error){r.errors.push(String(error));throw error;}
   }};
  await new Function(...Object.keys(deps),compiled+';return runDesktopNormalSearch;')(...Object.values(deps))(c.query);
  assert.ok(Array.isArray(rows),'Handler did not return a result array');
  assert.ok(rows.every(p=>Number.isFinite(p.__price)&&p.__price>0),'Unpriced displayed product');
  assert.ok(rows.every((p,i)=>!i||rows[i-1].__price<=p.__price),'Prices not ascending');
  r.visible=rows.map(p=>({ean:p.ean,name:p.name,price:p.__price,store:p.__store}));
  const catalogData=await request('/api/neon-first-search?desktop=1&q='+encodeURIComponent(relevance.desktopSearchQuery(c.query)));
  const catalog=itemsOf(catalogData).find(p=>String(p.ean)===c.ean);r.catalogFound=Boolean(catalog);
  assert.equal(r.catalogFound,!unresolved.has(c.ean),'Catalogue coverage changed; review the actual identity');
  const exactData=await request('/api/neon-first-search?q='+c.ean);
  const canonical=itemsOf(exactData).find(p=>String(p.ean)===c.ean);
  r.currentCatalogName=canonical?.name||null;
  // Independent store probes establish whether a known priced EAN was lost.
  // Missing probe results mean price was not obtained, never proof of no stock.
  await Promise.all(stores.map(async store=>{
   const searches=[...new Set([canonical?.name,c.ean].filter(Boolean))];
   for(const search of searches){
    const data=await request(shopPath(store,search));
    const products=itemsOf(data).filter(p=>String(p.ean)===c.ean);
    r.probes.push({store:store.name,search,count:itemsOf(data).length,quotes:products.map(p=>({ean:p.ean,name:p.name,quantity:p.quantity,price:euro(store,data,p),source:data.source,
     compatible:Boolean(catalog&&compatibleCatalogNames(p.name,catalog.name,p.quantity)&&(!/^2/.test(c.ean)||relevance.searchWords(p.name).join(' ')===relevance.searchWords(catalog.name).join(' ')))}))});
    if(products.some(p=>euro(store,data,p)>0))break;
   }
  }));
  const quotes=r.probes.flatMap(p=>p.quotes),qualified=quotes.filter(p=>p.price>0&&p.compatible);
  const visible=r.visible.filter(p=>String(p.ean)===c.ean);
  r.expectedEanVisible=visible.length>0;
  if(qualified.length){assert.ok(visible.length,'Known compatible priced EAN dropped from normal search');assert.ok(visible[0].price<=Math.min(...qualified.map(p=>p.price)),'Cheaper verified selected-store quote was dropped');}
  if(unresolved.has(c.ean))assert.equal(visible.length,0,'Unverified package/producer constraints accepted');
  r.status=visible.length?'visible':!catalog?'catalog_constraints_unverified':!quotes.some(p=>p.price>0)?'no_price_obtained_from_selected_stores':'store_identity_conflict';
 }catch(error){r.errors.push(String(error));r.status='failed';}
 console.log(JSON.stringify({query:r.query,ean:r.ean,catalogFound:r.catalogFound,status:r.status,visible:r.visible.filter(p=>String(p.ean)===r.ean),errors:r.errors}));save();
}
(async()=>{
 const version=await request('/api/desktop-search-version');assert.equal(version.commit,target);assert.equal(version.branch,'preview/legacy-desktop-ui');
 for(const c of cases)await test(c);
 report.summary={total:report.results.length,catalogFound:report.results.filter(r=>r.catalogFound).length,visible:report.results.filter(r=>r.expectedEanVisible).length,failed:report.results.filter(r=>r.errors.length).length,statuses:{}};
 for(const r of report.results)report.summary.statuses[r.status]=(report.summary.statuses[r.status]||0)+1;
 save();console.log('SUMMARY',JSON.stringify(report.summary));assert.equal(report.summary.failed,0,'Live priced search regression failed');
})().catch(error=>{console.error(error);process.exitCode=1});

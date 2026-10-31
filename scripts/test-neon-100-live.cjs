// Live HTTP data, real desktop handler, independently specified name/type expectations.
require('./recipe-audit-runtime.cjs');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const ts=require('typescript');
const normal=require('../src/app/components/ziiply/ziiplyCore.ts');
const relevance=require('../src/app/components/ziiply/search/desktopNormalRelevance.ts');
const cli=promisify(execFile);
const base=process.env.PREVIEW_URL||'https://ziiply-cecippwge-ziipli2026s-projects.vercel.app';
const shard=Number(process.env.SHARD||0), shards=Number(process.env.SHARDS||1);
const queries=`maito|kevytmaito|rasvaton maito|täysmaito|laktoositon maito|kauramaito|soijajuoma|piimä|kerma|kuohukerma|ruokakerma|jogurtti|luonnonjogurtti|rahka|maitorahka|raejuusto|juusto|edam|mozzarella|feta|voi|margariini|kananmuna|cola|pepsi|coca cola|cola zero|limonadi|kivennäisvesi|vesi|appelsiinimehu|omenamehu|mehu|kahvi|suodatinkahvi|pikakahvi|tee|kaakao|olut|alkoholiton olut|energiajuoma|jauheliha|naudan jauheliha|sika-nauta jauheliha|kana|broileri|kananfilee|lohi|kirjolohi|tonnikala|seiti|makkara|nakki|kinkku|pekoni|meetvursti|peruna|bataatti|porkkana|sipuli|punasipuli|valkosipuli|tomaatti|kurkku|paprika|parsakaali|kukkakaali|kesäkurpitsa|salaatti|pinaatti|herne|maissi|banaani|omena|appelsiini|mandariini|päärynä|sitruuna|avokado|viinirypäle|mansikka|mustikka|vadelma|leipä|ruisleipä|paahtoleipä|sämpylä|riisi|pasta|makaroni|spagetti|kaurahiutale|murot|vehnäjauho|sokeri|suola|öljy|oliiviöljy|ketsuppi|jäätelö`.split('|');
assert.equal(queries.length,100);assert.equal(new Set(queries).size,100);
const source=fs.readFileSync('src/app/desktop-preview/DesktopPreviewClient.tsx','utf8');
const start=source.indexOf('  async function runDesktopNormalSearch('), end=source.indexOf('  async function runDesktopJustiinaSearch(',start);
assert.ok(start>=0&&end>start);
const compiled=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function fold(s){return String(s||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');}
const aliases={maito:/maito/,kauramaito:/kaura.*(?:juoma|maito)|(?:juoma|maito).*kaura/,juusto:/juusto|edam|emmental|gouda|mozzarella|cheddar|feta|parmesan|brie|halloumi/,cola:/\bcola\b|pepsi|coke/,'coca cola':/coca.?cola/,'cola zero':/(?:cola|pepsi|coke).*(?:zero|sokeriton|max)|(?:zero|sokeriton|max).*(?:cola|pepsi|coke)/,kahvi:/kahvi|coffee|espresso|juhla mokka|presidentti|kulta katriina|paulig|lofbergs/,suodatinkahvi:/kahvi|juhla mokka|presidentti|kulta katriina|paulig|lofbergs/,pikakahvi:/pikakahvi|instant|nescafe/,jogurtti:/jogurtti|jogurt|yogurt/,kananmuna:/kananmun|munia|munat/,jauheliha:/jauheliha/,tomaatti:/tomaat/,peruna:/perun/,porkkana:/porkkan/,banaani:/banaan/,omena:/omen/,appelsiini:/appelsiin/,mandariini:/mandariin/,sitruuna:/sitruun/,viinirypäle:/viinirypal/,leipä:/leipa|leivat|leivan/,ruisleipä:/ruisleipa|ruisleivat|ruisleivan/,paahtoleipä:/paahtoleipa/,sämpylä:/sampyl/,murot:/muro|cereal/,spagetti:/spaget|spaghet/,öljy:/oljy/,oliiviöljy:/oliivioljy/,ketsuppi:/ketsup|ketchup/,tee:/\btee\b|teeta|tea\b/};
function suspect(query,p){
 const name=fold(p.name||p.title||p.productName).replace(/juustoportti(?:n)?/g,'');
 const pattern=aliases[query];
 if(pattern ? !pattern.test(name) : !fold(query).split(/[\s-]+/).every(w=>name.includes(w)))return 'name mismatch';
 if(query==='maito'&&/jauhe|suklaa|cappuccino|kondens|tiiviste|korvike|vierot|vieroit|piima|kaura|soija|pirtelo/.test(name))return 'milk derivative/substitute';
 if(['cola','pepsi','coca cola','cola zero'].includes(query)&&/ketsup|kastike|karkki|makeinen|tikkari|sodastream|tiiviste|jaatelo|mehuj|jaloviina|shampoo|hoitoaine|pulled|kana/.test(name))return 'cola derivative';
 if(['kahvi','suodatinkahvi'].includes(query)&&/shampoo|hoitoaine|suodatinpussi|suodatinpaper|jaakahvi|kahvijuoma|jogurtti|jaatelo|suklaa|jaloviina/.test(name))return 'coffee derivative/accessory';
 if(query==='jauheliha'&&/pizza|mauste|kastike|keitto|laatikko|piirakka/.test(name))return 'prepared food';
 return null;
}
const cache=new Map(),report={target:base,sourceCommit:process.env.GITHUB_SHA||null,shard,shards,runAt:new Date().toISOString(),results:[]};
function save(){report.failures=report.results.filter(r=>r.errors.length).length;fs.writeFileSync(`neon-100-live-${shard}.json`,JSON.stringify(report,null,2));}
process.on('exit',save);
async function request(path){
 if(!cache.has(path))cache.set(path,(async()=>{
  const {stdout}=await cli('vercel',['curl',new URL(path,base).toString(),'--','-sS','-f'],{timeout:45000,maxBuffer:8*1024*1024,env:process.env});
  const data=JSON.parse(stdout);
  const items=Array.isArray(data)?data:Array.isArray(data.products)?data.products:Array.isArray(data.items)?data.items:null;
  assert.ok(items,'Missing products/items array: '+path);
  if(data.ok===false||data.error)throw Error('API error '+path+': '+JSON.stringify(data.error||data));
  return {data,items};
 })());return cache.get(path);
}
function summarize(p){return {ean:p.ean,name:p.name||p.title||p.productName,category:p.category,price:p.__price??p.price??null,store:p.__store};}
async function test(query){
 const r={query,errors:[],requests:[],raw:null,desktop:null,visible:null};report.results.push(r);
 try{
  for(const desktop of [false,true]){
   const path='/api/neon-first-search?q='+encodeURIComponent(query)+(desktop?'&desktop=1':'');
   const {data,items}=await request(path);
   assert.equal(data.readOnly,true);assert.equal(data.count,items.length);assert.ok(items.length<=100);
   assert.notEqual(data.categoryExpansion,'exact-ean');
   const suspects=items.map(p=>({...summarize(p),reason:suspect(query,p)})).filter(p=>p.reason);
   r[desktop?'desktop':'raw']={count:items.length,version:data.searchVersion,suspects,products:items.map(summarize)};
   if(desktop&&suspects.length)r.errors.push('Neon desktop: '+suspects.length+' suspect names/types');
   for(const p of items)if(!p.name||!/^\d{8,14}$/.test(String(p.ean)))r.errors.push('Invalid Neon record');
  }
  let rows=null;const noOp=()=>{};
  const deps={...relevance,traceNormal:noOp,performance,URLSearchParams,justiinaQuery:query,desktopVoiceRunRef:{current:1},
   selectedStores:{s:{id:'292',name:'Prisma Hyvinkää',kind:'sHyper'},k:{id:'3221',name:'K-Citymarket Hyvinkää',kind:'kHyper'}},storeKind:s=>s.kind,
   rankProductResultsByRelevanceAndPrice:normal.rankProductResultsByRelevanceAndPrice,
   setJustiinaDebug:noOp,setJustiinaMessage:noOp,setJustiinaResults:v=>{rows=v},setJustiinaResultsOpen:noOp,setJustiinaLoading:noOp,
   justiinaLastSearchedRef:{current:''},justiinaUserEditedRef:{current:false},justiinaAddedDuringSelectionRef:{current:false},
   fetch:async path=>{r.requests.push(path);let data;try{({data}=await request(path));}catch(error){r.errors.push(String(error));throw error;}return {ok:true,status:200,headers:new Headers({'content-type':'application/json'}),json:async()=>data};}};
  const run=new Function(...Object.keys(deps),compiled+';return runDesktopNormalSearch;')(...Object.values(deps));
  await run(query);
  assert.ok(Array.isArray(rows),'Normal handler did not produce results');
  if(!rows.length)r.errors.push('No priced normal results');
  const suspects=rows.map(p=>({...summarize(p),reason:suspect(query,p)})).filter(p=>p.reason);
  if(suspects.length)r.errors.push('Normal display: '+suspects.length+' suspect names/types');
  assert.ok(rows.every(p=>Number.isFinite(p.__price)&&p.__price>0),'Unpriced visible product');
  assert.ok(rows.every((p,i)=>i===0||rows[i-1].__price<=p.__price),'Prices not ascending');
  r.visible={count:rows.length,suspects,products:rows.map(summarize)};
 }catch(error){r.errors.push(String(error));}
 console.log(JSON.stringify({query,raw:r.raw?.count,desktop:r.desktop?.count,visible:r.visible?.count,rawSuspects:r.raw?.suspects.length,suspects:[...(r.desktop?.suspects||[]),...(r.visible?.suspects||[])].slice(0,12),errors:r.errors}));save();
}
(async()=>{
 if(!process.env.VERCEL_TOKEN)throw Error('Missing VERCEL_TOKEN');
 for(const [i,query] of queries.entries())if(i%shards===shard)await test(query);
 save();console.log('Completed',report.results.length,'queries; failures:',report.failures);
 if(report.failures)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});

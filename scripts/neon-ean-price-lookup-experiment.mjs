// Read-only bounded full-coverage experiment, not a production search integration.
// Fetch baseline first. Never call Ziiply S/K routes (which may write Neon observations).
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
const base=process.env.SEARCH_BASE_URL;
if(base!=='http://127.0.0.1:3099')throw Error('Local test API required');
const stores=[{id:'S',storeId:292},{id:'K',storeId:3221}];
const queries=['maito','makkara','kahvi','peruna','laktoositon maito'];
const limit=Number(process.env.EAN_LOOKUP_LIMIT||250);
if(!Number.isInteger(limit)||limit<1||limit>250)throw Error('EAN_LOOKUP_LIMIT must be 1..250');
const concurrency=3;
const nameQuery=p=>String(p.name||'').trim().split(/\s+/).filter(w=>w.length>=4).slice(0,2).join(' ');
const reports=[];
const seen=new Set();
const queryCache=new Map();
async function getJson(url){const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
async function pool(items,worker){let cursor=0;const out=new Array(items.length);await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{while(cursor<items.length){const i=cursor++;out[i]=await worker(items[i]);}}));return out;}
const baselines=[];
for(const query of queries){
 const started=performance.now();
 const [bank,...shops]=await Promise.all([getJson(base+'/api/neon-first-search?q='+encodeURIComponent(query)),...stores.map(s=>getJson('https://api.ruoanhinta.fi/api/items?search='+encodeURIComponent(query)+'&storeIds='+s.storeId+'&skip=0&take=80'))]);
 if(!bank.ok||!Array.isArray(bank.products)||shops.some(s=>!Array.isArray(s.items)))throw Error('Invalid baseline response '+query);
 const current=new Set(shops.flatMap(s=>s.items).map(p=>String(p.ean||'')).filter(Boolean));
 const candidates=bank.products.filter(p=>/^\d{8,14}$/.test(String(p.ean||''))&&!current.has(String(p.ean)));
 const unique=candidates.filter(p=>{const ean=String(p.ean);if(seen.has(ean))return false;seen.add(ean);return true;});
 baselines.push({query,candidates,unique,current,baselineMs:Math.round(performance.now()-started)});
}
const work=baselines.flatMap(b=>b.unique.map(p=>({query:b.query,p}))).slice(0,limit);
const startedExtra=performance.now();
const checked=await pool(work,async ({query,p})=>{
 const matches=await Promise.all(stores.map(async store=>{
  const term=nameQuery(p);
  if(!term)return {store:store.id,exact:0,priced:0,reason:'no-safe-name-query'};
  const key=store.id+'|'+term.toLowerCase();
  try{
   // Cache same store/name search across EANs. Concurrency is bounded by product pool.
   if(!queryCache.has(key))queryCache.set(key,getJson('https://api.ruoanhinta.fi/api/items?search='+encodeURIComponent(term)+'&storeIds='+store.storeId+'&skip=0&take=80'));
   const data=await queryCache.get(key);
   const exact=(data.items||[]).filter(item=>String(item.ean||'')===String(p.ean));
   const priced=exact.filter(item=>Number.isFinite(item.storeItems?.[0]?.price)&&item.storeItems[0].price>0);
   return {store:store.id,query:term,exact:exact.length,priced:priced.length,prices:priced.map(item=>item.storeItems[0].price)};
  }catch(error){return {store:store.id,error:String(error)};}
 }));
 return {query,ean:p.ean,name:p.name,matches,verifiedStores:matches.filter(m=>m.priced>0).map(m=>m.store)};
});
for(const b of baselines){
 const own=checked.filter(p=>p.query===b.query);
 reports.push({query:b.query,neonOnly:b.candidates.length,uniqueNeonOnly:b.unique.length,sampled:own.length,verified:own.filter(p=>p.verifiedStores.length).length,errors:own.flatMap(p=>p.matches).filter(m=>m.error).length,baselineRows:b.current.size,baselineReadyBeforeExtraLookup:true,baselineMs:b.baselineMs,checked:own});
}
const summary={queries:reports.length,totalNeonOnly:reports.reduce((n,r)=>n+r.neonOnly,0),uniqueNeonOnly:seen.size,sampled:checked.length,verified:checked.filter(p=>p.verifiedStores.length).length,unverified:checked.filter(p=>!p.verifiedStores.length).length,verifiedS:checked.filter(p=>p.verifiedStores.includes('S')).length,verifiedK:checked.filter(p=>p.verifiedStores.includes('K')).length,errors:checked.flatMap(p=>p.matches).filter(m=>m.error).length,uniqueStoreNameRequests:queryCache.size,extraLookupMs:Math.round(performance.now()-startedExtra),maxConcurrentProducts:concurrency};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/neon-ean-price-lookup-experiment.json',JSON.stringify({at:new Date().toISOString(),note:'Read-only bounded coverage; product name search with exact EAN and positive store-specific price. Unverified is NOT proof of absence. Baseline fully fetched before extra lookups. No UI timing claim.',summary,reports},null,2));
console.log('EAN EXTRA PRICE LOOKUP:',JSON.stringify(summary));
console.log('EAN EXTRA PRICE CASES:',JSON.stringify(reports.map(({query,neonOnly,uniqueNeonOnly,sampled,verified,errors,baselineMs})=>({query,neonOnly,uniqueNeonOnly,sampled,verified,errors,baselineMs}))));
if(summary.errors)process.exitCode=1;

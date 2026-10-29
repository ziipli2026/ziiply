// Read-only experimental EAN price/supply verification. Runs AFTER baseline comparison.
// Never calls Ziiply app S/K routes (which can write EAN observations).
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
const base=process.env.SEARCH_BASE_URL;
if(base!=='http://127.0.0.1:3099')throw Error('Local test API required');
const stores=[{id:'S',storeId:292},{id:'K',storeId:3221}];
const queries=['maito','makkara','kahvi','peruna','laktoositon maito'];
const limit=Number(process.env.EAN_LOOKUP_LIMIT||12);
const concurrency=3;
const reports=[];
async function getJson(url){const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
async function pool(items,worker){let cursor=0;const out=new Array(items.length);await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{while(cursor<items.length){const i=cursor++;out[i]=await worker(items[i]);}}));return out;}
for(const query of queries){
 const started=performance.now();
 const [bank,...shops]=await Promise.all([getJson(base+'/api/neon-first-search?q='+encodeURIComponent(query)),...stores.map(s=>getJson('https://api.ruoanhinta.fi/api/items?search='+encodeURIComponent(query)+'&storeIds='+s.storeId+'&skip=0&take=80'))]);
 if(!bank.ok||!Array.isArray(bank.products)||shops.some(s=>!Array.isArray(s.items)))throw Error('Invalid baseline response '+query);
 const current=new Set(shops.flatMap(s=>s.items).map(p=>String(p.ean||'')).filter(Boolean));
 const candidates=bank.products.filter(p=>/^\d{8,14}$/.test(String(p.ean||''))&&!current.has(String(p.ean)));
 const sampled=candidates.slice(0,limit);
 const checked=await pool(sampled,async p=>{
  const matches=await Promise.all(stores.map(async store=>{
   try{
    const data=await getJson('https://api.ruoanhinta.fi/api/items?search='+encodeURIComponent(p.ean)+'&storeIds='+store.storeId+'&skip=0&take=80');
    const exact=(data.items||[]).filter(item=>String(item.ean||'')===String(p.ean));
    const priced=exact.filter(item=>Number.isFinite(item.storeItems?.[0]?.price)&&item.storeItems[0].price>0);
    return {store:store.id,exact:exact.length,priced:priced.length,prices:priced.map(item=>item.storeItems[0].price)};
   }catch(error){return {store:store.id,error:String(error)};}
  }));
  return {ean:p.ean,name:p.name,matches,verifiedStores:matches.filter(m=>m.priced>0).map(m=>m.store)};
 });
 reports.push({query,neonOnly:candidates.length,sampled:sampled.length,verified:checked.filter(p=>p.verifiedStores.length).length,errors:checked.flatMap(p=>p.matches).filter(m=>m.error).length,baselineRows:current.size,baselineReadyBeforeExtraLookup:true,extraLookupMs:Math.round(performance.now()-started),checked});
}
const summary={queries:reports.length,totalNeonOnly:reports.reduce((n,r)=>n+r.neonOnly,0),sampled:reports.reduce((n,r)=>n+r.sampled,0),verified:reports.reduce((n,r)=>n+r.verified,0),errors:reports.reduce((n,r)=>n+r.errors,0)};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/neon-ean-price-lookup-experiment.json',JSON.stringify({at:new Date().toISOString(),note:'Read-only limited sample. Exact EAN and positive selected-store price required to verify. No inference of absence from missing match. Baseline fetched before extra lookups; timing does not measure UI rendering.',summary,reports},null,2));
console.log('EAN EXTRA PRICE LOOKUP:',JSON.stringify(summary));
console.log('EAN EXTRA PRICE CASES:',JSON.stringify(reports.map(({query,neonOnly,sampled,verified,errors,extraLookupMs})=>({query,neonOnly,sampled,verified,errors,extraLookupMs}))));
if(summary.errors)process.exitCode=1;

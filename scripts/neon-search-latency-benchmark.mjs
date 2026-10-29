// Read-only real-network benchmark: Neon-first response then independent S/K upstream.
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
const base=process.env.SEARCH_BASE_URL||'http://127.0.0.1:3099';
const queries=['maito','makkara','kahvi'];
const stores=[{id:'S',storeId:292},{id:'K',storeId:3221}];
const trials=[];
const request=async url=>{const start=performance.now();const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{accept:'application/json'}});if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();return {data,ms:Math.round(performance.now()-start)}};
for(const query of queries)for(let iteration=1;iteration<=3;iteration++){
 const started=performance.now();
 const neonPromise=request(base+'/api/neon-first-search?q='+encodeURIComponent(query));
 const shopPromises=stores.map(async store=>({store:store.id,...await request('https://api.ruoanhinta.fi/api/items?search='+encodeURIComponent(query)+'&storeIds='+store.storeId+'&skip=0&take=80')}));
 try{
  const neon=await neonPromise;
  if(!neon.data.ok||!Array.isArray(neon.data.products))throw Error('Invalid Neon response');
  const neonReadyMs=Math.round(performance.now()-started);
  const shops=await Promise.all(shopPromises);
  const allReadyMs=Math.round(performance.now()-started);
  const bankEans=new Set(neon.data.products.map(p=>String(p.ean)));
  const shopStats=shops.map(s=>({store:s.store,ms:s.ms,rows:s.data.items?.length??0,matchingEans:(s.data.items||[]).filter(p=>bankEans.has(String(p.ean))).length}));
  trials.push({query,iteration,neonReadyMs,allReadyMs,priceWaitAfterNeonMs:allReadyMs-neonReadyMs,neonRows:neon.data.products.length,shops:shopStats});
 }catch(error){await Promise.allSettled(shopPromises);trials.push({query,iteration,error:String(error)})}
}
const valid=trials.filter(t=>!t.error);
const median=xs=>{const a=xs.slice().sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:null};
const summary={trials:trials.length,successful:valid.length,failed:trials.length-valid.length,medianNeonReadyMs:median(valid.map(t=>t.neonReadyMs)),medianAllReadyMs:median(valid.map(t=>t.allReadyMs)),medianPriceWaitAfterNeonMs:median(valid.map(t=>t.priceWaitAfterNeonMs))};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/neon-search-latency-benchmark.json',JSON.stringify({at:new Date().toISOString(),note:'Local Next.js API + real Ruoanhinta HTTP latency; not a production browser or current-search baseline comparison. Shop requests launched concurrently with Neon; Neon results can publish independently.',summary,trials},null,2));
console.log('NEON FIRST LATENCY:',JSON.stringify(summary));
console.log('NEON FIRST LATENCY TRIALS:',JSON.stringify(trials));
if(summary.failed)process.exitCode=1;

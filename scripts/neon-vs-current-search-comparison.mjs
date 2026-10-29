// Read-only comparison of existing S/K provider-first search vs Neon-first.
// Uses the identical upstream responses for both paths; never invokes app routes
// because their best-effort EAN observation may write to Neon.
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
const base=process.env.SEARCH_BASE_URL||'http://127.0.0.1:3099';
const cases=['maito','makkara','kahvi','peruna','laktoositon maito'];
const stores=[{id:'S',storeId:292},{id:'K',storeId:3221}];
const results=[];
const fetchTimed=async url=>{const t=performance.now();const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('HTTP '+response.status);return {data:await response.json(),ms:Math.round(performance.now()-t)}};
const normalize=p=>({ean:/^\d{8,14}$/.test(String(p.ean||''))?String(p.ean):null,name:p.name||'',image:p.pictureUrl||null,price:Number.isFinite(p.storeItems?.[0]?.price)&&p.storeItems[0].price>0?p.storeItems[0].price:null});
for(const query of cases){
 const started=performance.now();
 try{
  const requests=stores.map(s=>fetchTimed('https://api.ruoanhinta.fi/api/items?search='+encodeURIComponent(query)+'&storeIds='+s.storeId+'&skip=0&take=80').then(r=>({...r,store:s.id})));
  const neonRequest=fetchTimed(base+'/api/neon-first-search?q='+encodeURIComponent(query));
  const [neon,...shops]=await Promise.all([neonRequest,...requests]);
  if(!neon.data.ok||!Array.isArray(neon.data.products))throw Error('Invalid Neon response');
  if(shops.some(s=>!Array.isArray(s.data.items)))throw Error('Invalid shop response');
  const bank=new Map(neon.data.products.filter(p=>p.ean).map(p=>[String(p.ean),p]));
  const current=new Map(),combined=new Map();
  for(const p of neon.data.products)if(p.ean)combined.set(String(p.ean),{ean:String(p.ean),name:p.name,image:p.imageUrl||null,prices:{}});
  const storeMetrics=[];
  for(const s of shops){
   const products=s.data.items.map(normalize);
   for(const p of products){
    const key=p.ean||s.store+':'+p.name;
    if(!current.has(key))current.set(key,{ean:p.ean,name:p.name,image:p.image,prices:{}});
    const existing=current.get(key);
    if(!existing.image&&p.image)existing.image=p.image;
    if(p.price!==null)existing.prices[s.store]=p.price;
    if(!combined.has(key))combined.set(key,{ean:p.ean,name:p.name,image:p.image,prices:{}});
    const merged=combined.get(key);
    if(!merged.image&&p.image)merged.image=p.image;
    if(p.price!==null)merged.prices[s.store]=p.price;
   }
   storeMetrics.push({store:s.store,rows:products.length,ms:s.ms,eanMatches:products.filter(p=>p.ean&&bank.has(p.ean)).length,withImage:products.filter(p=>p.image).length,withPrice:products.filter(p=>p.price!==null).length});
  }
  const priceMismatches=[],missingCurrent=[],missingImage=[],priceChecks=[];
  for(const [key,p] of current){
   const n=combined.get(key);
   if(!n){missingCurrent.push(key);continue}
   if(p.image&&!n.image)missingImage.push(key);
   for(const store of stores){
    if(p.prices[store.id]!==undefined){
     priceChecks.push({key,store:store.id});
     if(n.prices[store.id]!==p.prices[store.id])priceMismatches.push({key,store:store.id,expected:p.prices[store.id],actual:n.prices[store.id]});
    }
   }
  }
  const firstCurrentMs=Math.min(...shops.filter(s=>s.data.items.length).map(s=>s.ms));
  const allCurrentMs=Math.max(...shops.map(s=>s.ms));
  const firstNeonMs=neon.ms;
  results.push({query,firstCurrentMs,allCurrentMs,firstNeonMs,firstNewVisibleMs:Math.min(firstNeonMs,firstCurrentMs),allNewReadyMs:Math.max(firstNeonMs,allCurrentMs),firstVisibleGainMs:firstCurrentMs-Math.min(firstNeonMs,firstCurrentMs),currentRows:current.size,neonRows:bank.size,mergedRows:combined.size,missingCurrent,missingImage,priceMismatches,priceChecks:priceChecks.length,storeMetrics,elapsedMs:Math.round(performance.now()-started)});
 }catch(error){results.push({query,error:String(error)})}
}
const ok=results.filter(r=>!r.error);
const median=values=>{const a=values.slice().sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:null};
const summary={cases:results.length,successful:ok.length,failed:results.length-ok.length,medianCurrentFirstMs:median(ok.map(r=>r.firstCurrentMs)),medianNeonFirstMs:median(ok.map(r=>r.firstNeonMs)),medianNewFirstVisibleMs:median(ok.map(r=>r.firstNewVisibleMs)),medianFirstVisibleGainMs:median(ok.map(r=>r.firstVisibleGainMs)),totalCurrentRows:ok.reduce((n,r)=>n+r.currentRows,0),totalMergedRows:ok.reduce((n,r)=>n+r.mergedRows,0),priceChecks:ok.reduce((n,r)=>n+r.priceChecks,0),priceMismatches:ok.reduce((n,r)=>n+r.priceMismatches.length,0),lostCurrentRows:ok.reduce((n,r)=>n+r.missingCurrent.length,0),lostCurrentImages:ok.reduce((n,r)=>n+r.missingImage.length,0)};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/neon-vs-current-search-comparison.json',JSON.stringify({at:new Date().toISOString(),note:'READ-ONLY provider-first baseline approximation using first 80 Ruoanhinta results per store. NOT actual browser, full current application routes, pagination, or UI. Both paths share identical upstream responses to verify EAN/price/image preservation; latency is concurrent HTTP response timing, not rendered UI.',summary,results},null,2));
console.log('CURRENT VS NEON SUMMARY:',JSON.stringify(summary));
console.log('CURRENT VS NEON CASES:',JSON.stringify(results.map(({query,error,firstCurrentMs,firstNeonMs,firstNewVisibleMs,currentRows,mergedRows,priceChecks,priceMismatches,missingCurrent,missingImage})=>({query,error,firstCurrentMs,firstNeonMs,firstNewVisibleMs,currentRows,mergedRows,priceChecks,priceMismatches:priceMismatches?.length,missingCurrent:missingCurrent?.length,missingImage:missingImage?.length}))));
if(summary.failed||summary.priceMismatches||summary.lostCurrentRows||summary.lostCurrentImages)process.exitCode=1;

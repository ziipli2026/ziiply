// Read-only smoke test against the same Ruoanhinta upstream used by S/K routes.
// No calls to application S/K routes: they may schedule EAN-bank observation writes.
import fs from 'node:fs';
const base=process.env.SEARCH_BASE_URL||'http://127.0.0.1:3099';
const stores=[{id:'S',storeId:292},{id:'K',storeId:3221}];
const queries=['maito','makkara'];
const report=[];
const fetchJson=async(url)=>{const r=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json()};
for(const query of queries){
 const bank=await fetchJson(base+'/api/neon-first-search?q='+encodeURIComponent(query));
 if(!bank.ok||!Array.isArray(bank.products))throw Error('Neon API invalid '+query);
 const bankByEan=new Map(bank.products.map(p=>[String(p.ean),p]));
 for(const store of stores){
  const started=Date.now();
  const url='https://api.ruoanhinta.fi/api/items?search='+encodeURIComponent(query)+'&storeIds='+store.storeId+'&skip=0&take=80';
  try{
   const data=await fetchJson(url);
   if(!Array.isArray(data.items))throw Error('Missing items array');
   const sample=data.items[0]||{};
   const structure={topLevelKeys:Object.keys(sample).sort(),nestedObjects:Object.fromEntries(Object.entries(sample).filter(([k,v])=>v&&typeof v==='object').map(([k,v])=>[k,Array.isArray(v)?{type:'array',firstItemKeys:v[0]&&typeof v[0]==='object'?Object.keys(v[0]).sort():[]}:Object.keys(v).sort()])),idExamples:data.items.slice(0,3).map(p=>({id:p.id,externalId:p.externalId,productId:p.productId,gtin:p.gtin,ean:p.ean}))};
   const rows=data.items.map(p=>({ean:[p.ean,p.gtin,p.eanCode,p.barcode,p.externalId].find(v=>/^\d{8,14}$/.test(String(v||''))),name:p.name,price:p.storeItems?.[0]?.price,imageUrl:p.pictureUrl})); 
   const priced=rows.filter(p=>Number.isFinite(p.price)&&p.price>0);
   const exact=priced.filter(p=>p.ean&&bankByEan.has(String(p.ean)));
   const unpriced=rows.filter(p=>!Number.isFinite(p.price)||p.price<=0);
   const missingEan=priced.filter(p=>!p.ean);
   report.push({query,store:store.id,storeId:store.storeId,upstreamRows:rows.length,structure,priced:priced.length,missingPrice:unpriced.length,missingEan:missingEan.length,neonRows:bank.products.length,exactEanOverlap:exact.length,storeOnlyEan:priced.filter(p=>p.ean&&!bankByEan.has(String(p.ean))).length,elapsedMs:Date.now()-started,examples:exact.slice(0,3).map(p=>({ean:p.ean,name:p.name,price:p.price,neonImage:!!bankByEan.get(String(p.ean))?.imageUrl,shopImage:!!p.imageUrl}))});
  }catch(error){report.push({query,store:store.id,storeId:store.storeId,error:String(error)});}
 }
}
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/neon-real-sk-upstream-smoke.json',JSON.stringify({at:new Date().toISOString(),note:'Read-only upstream first-page diagnostics; no application route writeback, no price verification beyond upstream response, no exhaustive coverage claim.',report},null,2));
console.log('REAL S/K UPSTREAM:',JSON.stringify(report));
if(report.some(r=>r.error))process.exitCode=1;

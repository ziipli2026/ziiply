// Fresh, read-only evidence for the five restricted-circulation EAN cases.
require('./recipe-audit-runtime.cjs');
const fs=require('node:fs');
const {neon}=require('@neondatabase/serverless');
const {desktopSearchDecision}=require('../src/app/components/ziiply/search/desktopNormalRelevance.ts');
const {compatibleCatalogNames}=require('../src/lib/catalogNameEvidence.ts');
const cases=require('./fixtures/neon-31-canonical.json').filter(c=>/^2/.test(c.ean));
const report={readOnly:true,runAt:new Date().toISOString(),requests:[],results:[]};
const save=()=>fs.writeFileSync('neon-restricted-ean-identities.json',JSON.stringify(report,null,2));
const getEan=p=>[p.ean,p.gtin,p.eanCode,p.barcode,p.externalId].map(String).find(s=>/^\d{8,14}$/.test(s))||'';
const cache=new Map();
async function search(store,hint){
 const key=store+':'+hint;
 if(cache.has(key))return cache.get(key);
 const products=[];
 for(let skip=0;skip<500;skip+=100){
  const url=new URL('https://api.ruoanhinta.fi/api/items');
  for(const [k,v] of Object.entries({storeIds:String(store),search:hint,skip:String(skip),take:'100'}))url.searchParams.set(k,v);
  const request={store,hint,skip,url:url.toString()};report.requests.push(request);
  try{
   const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(15000)});
   request.status=response.status;
   if(!response.ok)break;
   const data=await response.json(),items=Array.isArray(data.items)?data.items:[];
   request.count=items.length;
   products.push(...items);
   if(items.length<100)break;
  }catch(error){request.error=String(error);break;}
 }
 cache.set(key,products);return products;
}
(async()=>{
 if(!process.env.DATABASE_URL)throw Error('Missing DATABASE_URL');
 const sql=neon(process.env.DATABASE_URL);
 for(const c of cases){
  const [current]=await sql`SELECT ean,name,brand,quantity,category,source,aliases FROM ziiply_ean_products WHERE ean=${c.ean} LIMIT 1`;
  const reference=c.query;
  const hint=/kirjolohi/i.test(reference)?'kirjolohi':/lohi/i.test(reference)?'lohi':/kukkakaali/i.test(reference)?'kukkakaali':'kurkku';
  const row={ean:c.ean,query:reference,current:current||null,observations:[]};report.results.push(row);
  for(const [store,chain] of [[292,'S'],[3221,'K']]){
   const broad=await search(store,hint);
   let exact=broad.filter(p=>getEan(p)===c.ean);
   if(!exact.length)exact=(await search(store,c.ean)).filter(p=>getEan(p)===c.ean);
   for(const p of exact){
    const product={ean:getEan(p),name:p.name,brand:p.brandName,quantity:p.quantity,category:p.category};
    const observation={provider:'ruoanhinta',chain,storeId:String(store),identityKey:`ruoanhinta:${store}:${c.ean}`,id:p.id,...product,familyKey:p.familyKey,externalId:p.externalId,storeItems:p.storeItems,queryDecision:desktopSearchDecision(reference,product),compatibleWithCurrent:compatibleCatalogNames(current?.name,p.name,current?.quantity)};
    row.observations.push(observation);
   }
  }
  console.log(JSON.stringify(row));save();
 }
 report.summary={checked:report.results.length,withFreshStoreEvidence:report.results.filter(r=>r.observations.length).length,withQualifiedStoreMatch:report.results.filter(r=>r.observations.some(o=>o.queryDecision.accepted)).length};
 save();console.log('RESTRICTED SUMMARY',JSON.stringify(report.summary));
})().catch(error=>{save();console.error(error);process.exitCode=1});

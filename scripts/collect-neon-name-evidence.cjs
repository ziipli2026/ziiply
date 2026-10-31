// Recover names only from fresh provider responses with the exact same EAN.
// Fixture names are search hints, never evidence to write into the catalogue.
require('./recipe-audit-runtime.cjs');
const fs=require('node:fs');
const {neon}=require('@neondatabase/serverless');
const {compatibleCatalogNames}=require('../src/lib/catalogNameEvidence.ts');
const {desktopSearchDecision}=require('../src/app/components/ziiply/search/desktopNormalRelevance.ts');
const {SKAUPAT_PROTOCOL_FALLBACK}=require('../src/lib/skaupatProtocol.ts');
const baseline=JSON.parse(fs.readFileSync('neon-31-corrected.json','utf8'));
const cases=baseline.results.filter(r=>!r.found);
const apply=process.env.APPLY_ALIAS_EVIDENCE==='1';
const result={readOnly:!apply,startedAt:new Date().toISOString(),results:[]};
const save=()=>fs.writeFileSync('neon-name-evidence.json',JSON.stringify(result,null,2));
function getEan(p){return [p.ean,p.gtin,p.eanCode,p.barcode,p.externalId,p.id].map(String).find(x=>/^\d{8,14}$/.test(x))||'';}
function previewProducts(value,depth=0){
 if(!value||typeof value!=='object'||depth>14)return [];
 if(typeof value.name==='string'&&(value.ean||value.id))return [{name:value.name,ean:value.ean,id:value.id,keys:Object.keys(value)}];
 return Object.values(value).flatMap(v=>previewProducts(v,depth+1)).slice(0,2);
}
function findExact(value,ean,depth=0){
 if(!value||typeof value!=='object'||depth>14)return [];
 if(!Array.isArray(value)&&getEan(value)===ean&&typeof value.name==='string')return [value];
 return Object.values(value).flatMap(v=>findExact(v,ean,depth+1));
}
async function request(url,headers={}){
 const response=await fetch(url,{headers:{accept:'application/json',...headers},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('Provider HTTP '+response.status);
 const data=await response.json();if(data.errors?.length)throw Error('Provider GraphQL '+JSON.stringify(data.errors).slice(0,160));
 return data;
}
(async()=>{
 if(!process.env.DATABASE_URL)throw Error('Missing DATABASE_URL');
 const sql=neon(process.env.DATABASE_URL);
 let protocol=SKAUPAT_PROTOCOL_FALLBACK;
 try{
  const [p]=await sql`SELECT persisted_query_hash,client_version,apollo_version FROM ziiply_skaupat_protocol WHERE config_key='remote-filtered-products' LIMIT 1`;
  if(p)protocol={persistedQueryHash:p.persisted_query_hash,clientVersion:p.client_version,apolloVersion:p.apollo_version};
 }catch{/* Existing fallback; never create or modify protocol configuration. */}
 for(const c of cases){
  const [current]=await sql`SELECT ean,name,brand,quantity,category,aliases FROM ziiply_ean_products WHERE ean=${c.ean} LIMIT 1`;
  const row={ean:c.ean,query:c.query,before:current||null,observations:[],attempts:[],applied:0};
  result.results.push(row);
  if(!current){row.error='Canonical EAN missing';save();continue;}
  const hints=[...new Set([c.query.split(/\s+/).slice(0,3).join(' '),current.name.split(/\s+/).slice(0,3).join(' ')])];
  const record=(data,url,source)=>{
   for(const p of findExact(data,c.ean)){
    const name=p.name.normalize('NFKC').trim().slice(0,300);
    if(!name||row.observations.some(o=>o.name===name&&o.source===source))continue;
    const compatible=compatibleCatalogNames(current.name,name,current.quantity);
    const qualifies=desktopSearchDecision(c.query,{...current,name,brand:p.brandName||current.brand,aliases:[]}).accepted;
    row.observations.push({ean:c.ean,name,source,url,compatible,qualifies});
   }
  };
  // Both selected-store Ruoanhinta feeds are independent observations.
  for(const store of [292,3221]){
   for(const hint of hints){
    const url=new URL('https://api.ruoanhinta.fi/api/items');
    for(const [key,value] of Object.entries({search:hint,storeIds:String(store),skip:'0',take:'100'}))url.searchParams.set(key,value);
    try{record(await request(url),url.toString(),'ruoanhinta-'+store);row.attempts.push({source:'ruoanhinta-'+store,hint,ok:true});}
    catch(error){row.attempts.push({source:'ruoanhinta-'+store,hint,error:String(error)});}
   }
  }
  // Fetch the official S-kaupat name directly. Store id is the existing
  // protocol probe's verified store; this operation gathers identity, not price.
  for(const hint of [c.ean,...hints.slice(0,1)]){
   const url=new URL('https://api.s-kaupat.fi/');
   url.searchParams.set('operationName','RemoteFilteredProducts');
   url.searchParams.set('variables',JSON.stringify({facets:[{key:'brandName',order:'asc'},{key:'category'},{key:'labels'}],filters:[],generatedSessionId:'ziiply-name-evidence',fetchSponsoredContent:false,limit:96,queryString:hint,storeId:'603217266',useRandomId:false,marketingId:'ziiply-name-evidence',from:0}));
   url.searchParams.set('extensions',JSON.stringify({clientLibrary:{name:'@apollo/client',version:protocol.apolloVersion},persistedQuery:{version:1,sha256Hash:protocol.persistedQueryHash}}));
   try{const data=await request(url,{'accept-language':'fi',origin:'https://www.s-kaupat.fi',referer:'https://www.s-kaupat.fi/','x-client-name':'skaupat-web','x-client-version':protocol.clientVersion});record(data,url.toString(),'s-kaupat-official');row.attempts.push({source:'s-kaupat-official',hint,ok:true,preview:previewProducts(data)});console.log('S EVIDENCE',JSON.stringify({ean:c.ean,hint,preview:previewProducts(data),roots:Object.keys(data.data||data)}));}
   catch(error){row.attempts.push({source:'s-kaupat-official',hint,error:String(error)});}
  }
  const safe=[...new Set(row.observations.filter(o=>o.compatible).map(o=>o.name))];
  if(apply && safe.length){
   const changed=await sql`UPDATE ziiply_ean_products SET aliases=ARRAY(
     SELECT x FROM unnest(${safe}::text[] || ARRAY[name] || aliases) WITH ORDINALITY AS observed(x,position)
     WHERE TRIM(x)<>'' GROUP BY x ORDER BY MIN(position) LIMIT 24
   ),updated_at=NOW() WHERE ean=${c.ean} AND name=${current.name} AND quantity IS NOT DISTINCT FROM ${current.quantity} RETURNING ean,aliases`;
   row.applied=changed.length;row.after=changed[0]||null;
  }
  console.log(JSON.stringify({ean:c.ean,names:row.observations.map(o=>({name:o.name,compatible:o.compatible,qualifies:o.qualifies})),applied:row.applied}));save();
 }
 result.summary={checked:result.results.length,withFreshNames:result.results.filter(r=>r.observations.length).length,withQualifyingEvidence:result.results.filter(r=>r.observations.some(o=>o.compatible&&o.qualifies)).length,updated:result.results.filter(r=>r.applied).length};
 save();console.log('EVIDENCE SUMMARY',JSON.stringify(result.summary));
})().catch(error=>{save();console.error(error);process.exitCode=1});

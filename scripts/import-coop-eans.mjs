import { neon } from "@neondatabase/serverless";
const url=process.env.DATABASE_URL;
if(!url) throw new Error("DATABASE_URL missing");
const sql=neon(url);
const fallbackProtocol={persisted_query_hash:"85a4eed2f0a1e3269ac49b94276ca952922568369d85ddd5dcee34481e4c0f91",client_version:"production-add4ac0e6ec7f03f2c5373a6ebfab2b63df73f68",apollo_version:"4.3.1"};
let protocol=fallbackProtocol;
try {
 const cfg=await sql`SELECT persisted_query_hash,client_version,apollo_version FROM ziiply_skaupat_protocol WHERE config_key='remote-filtered-products' LIMIT 1`;
 protocol=cfg[0]??fallbackProtocol;
} catch (error) {
 if (error?.code !== "42P01") throw error;
 console.warn("ziiply_skaupat_protocol is missing in DATABASE_URL target; using built-in protocol defaults.");
}
const stores=[...new Set((process.env.COOP_STORE_IDS||"634976534").split(",").map(s=>s.trim()).filter(Boolean))];
const limit=48, maxPages=Number(process.env.COOP_MAX_PAGES||500);
const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const seen=new Map();
let fetched=0,invalid=0,pages=0,inserted=0;
const storeSummaries=[];
for(const storeId of stores){
 let total=Infinity;
 let storeFetched=0,storeUniqueBefore=seen.size;
 for(let from=0;from<total&&pages<maxPages;from+=limit){
  const variables={facets:[{key:"brandName",order:"asc"},{key:"category"},{key:"labels"}],filters:[],generatedSessionId:"1d6b5de9-df99-4608-af07-7d754955df82",fetchSponsoredContent:false,from,offset:from,skip:from,page:Math.floor(from/limit)+1,limit,queryString:"Coop",storeId,useRandomId:false,marketingId:"d0bcc6e5-6130-494e-b6fb-12b5cb9c60cf"};
  const extensions={clientLibrary:{name:"@apollo/client",version:protocol.apollo_version},persistedQuery:{version:1,sha256Hash:protocol.persisted_query_hash}};
  const endpoint=new URL("https://api.s-kaupat.fi/");
  endpoint.searchParams.set("operationName","RemoteFilteredProducts");
  endpoint.searchParams.set("variables",JSON.stringify(variables));
  endpoint.searchParams.set("extensions",JSON.stringify(extensions));
  let body;
  for(let attempt=0;attempt<4;attempt++){
   try{
    const response=await fetch(endpoint,{headers:{accept:"application/json","accept-language":"fi",origin:"https://www.s-kaupat.fi",referer:"https://www.s-kaupat.fi/","x-client-name":"skaupat-web","x-client-version":protocol.client_version,"user-agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15"},signal:AbortSignal.timeout(25000)});
    if(!response.ok)throw new Error("HTTP "+response.status);
    body=await response.json();
    if(body.errors?.length)throw new Error(JSON.stringify(body.errors));
    break;
   }catch(e){if(attempt===3)throw e;await new Promise(r=>setTimeout(r,1000*(attempt+1)));}
  }
  const root=body?.data?.store?.products;
  if(!root||!Array.isArray(root.productListItems))throw new Error("Unexpected S-kaupat response: "+JSON.stringify({storeId,keys:Object.keys(body??{}),errors:body?.errors,rootKeys:Object.keys(root??{})}));
  const items=root.productListItems;
  total=Number(root.total??0);
  pages++;fetched+=items.length;storeFetched+=items.length;
  for(const entry of items){
   const p=entry.product??entry;
   const ean=String(p.ean??"").trim();
   const name=String(p.name??p.displayName??"").trim();
   const brand=String(p.brandName??p.brand?.name??p.brand??"").trim();
   if(!/^(?:\d{8}|\d{13}|\d{14})$/.test(ean)||!name||!(brand.toLowerCase()==="coop"||/^coop\b/i.test(name))){invalid++;continue;}
   seen.set(ean,{ean,name,brand:"Coop"});
  }
  console.log(JSON.stringify({storeId,from,total,received:items.length,unique:seen.size}));
  if(items.length===0||from+items.length>=total)break;
  await new Promise(r=>setTimeout(r,250));
 }
 storeSummaries.push({storeId,total:Number.isFinite(total)?total:0,fetched:storeFetched,newUnique:seen.size-storeUniqueBefore});
 if(storeFetched===0) console.warn(JSON.stringify({warning:"No Coop products returned for store",storeId,total}));
}
if(fetched===0||seen.size===0) throw new Error(`Coop import returned zero usable products. Check S-kaupat protocol, filters, and store IDs. pages=${pages}, fetched=${fetched}, invalid=${invalid}`);
if(pages>=maxPages) console.warn(JSON.stringify({warning:"COOP_MAX_PAGES limit reached",maxPages,pages}));
const products=[...seen.values()];
for(let i=0;i<products.length;i+=100){
 const batch=products.slice(i,i+100);
 const rows=await sql`INSERT INTO ziiply_ean_products(ean,name,brand,source)
 SELECT x.ean,x.name,x.brand,'s-kaupat.fi' FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb) AS x(ean text,name text,brand text)
 ON CONFLICT(ean) DO NOTHING RETURNING ean`;
 inserted+=rows.length;
}
console.log(JSON.stringify({complete:true,stores,storeSummaries,pages,fetched,unique:seen.size,invalid,inserted,alreadyPresent:seen.size-inserted}));

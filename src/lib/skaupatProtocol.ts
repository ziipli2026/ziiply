import { neon } from "@neondatabase/serverless";

export type SKaupatProtocolConfig = { persistedQueryHash: string; clientVersion: string; apolloVersion: string; verifiedAt?: string };
export const SKAUPAT_PROTOCOL_FALLBACK: SKaupatProtocolConfig = {
  persistedQueryHash: "85a4eed2f0a1e3269ac49b94276ca952922568369d85ddd5dcee34481e4c0f91",
  clientVersion: "production-add4ac0e6ec7f03f2c5373a6ebfab2b63df73f68",
  apolloVersion: "4.3.1",
};
const KEY = "remote-filtered-products";
let cache: { value: SKaupatProtocolConfig; until: number } | null = null;

async function table(sql: ReturnType<typeof neon>) {
  await sql`CREATE TABLE IF NOT EXISTS ziiply_skaupat_protocol (
    config_key TEXT PRIMARY KEY, persisted_query_hash TEXT NOT NULL,
    client_version TEXT NOT NULL, apollo_version TEXT NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}
const validHash=(v:unknown)=>typeof v==="string"&&/^[a-f0-9]{64}$/i.test(v);
const validClient=(v:unknown)=>typeof v==="string"&&/^production-[a-f0-9]{20,}$/i.test(v);

export async function getSKaupatProtocolConfig(): Promise<SKaupatProtocolConfig> {
  if(cache&&cache.until>Date.now()) return cache.value;
  const db=process.env.DATABASE_URL; if(!db) return SKAUPAT_PROTOCOL_FALLBACK;
  try {
    const sql=neon(db); await table(sql);
    const rows=await sql`SELECT persisted_query_hash,client_version,apollo_version,verified_at FROM ziiply_skaupat_protocol WHERE config_key=${KEY} LIMIT 1`;
    const r=rows[0];
    if(r&&validHash(r.persisted_query_hash)&&validClient(r.client_version)){
      const value={persistedQueryHash:String(r.persisted_query_hash),clientVersion:String(r.client_version),apolloVersion:String(r.apollo_version||"4.3.1"),verifiedAt:String(r.verified_at||"")};
      cache={value,until:Date.now()+300000}; return value;
    }
  } catch(e){ console.warn("[S-kaupat protocol] config read failed",e); }
  return SKAUPAT_PROTOCOL_FALLBACK;
}

async function text(url:string){
  const r=await fetch(url,{cache:"no-store",headers:{accept:"text/html,application/javascript,*/*","accept-language":"fi","user-agent":"Mozilla/5.0 (compatible; Ziiply/1.0; +https://ziiply.fi)"}});
  if(!r.ok) throw new Error(`HTTP ${r.status} ${url}`); return r.text();
}
function scripts(html:string){
  const out:string[]=[]; const re=/<script[^>]+src=["']([^"']+\.js(?:\?[^"']*)?)["']/gi; let m:RegExpExecArray|null;
  while((m=re.exec(html))) try{out.push(new URL(m[1],"https://www.s-kaupat.fi").toString())}catch{}
  return [...new Set(out)];
}
function candidates(js:string){
  const out:{hash:string;client:string}[]=[];
  for(const m of js.matchAll(/RemoteFilteredProducts/g)){
    const near=js.slice(Math.max(0,(m.index||0)-16000),Math.min(js.length,(m.index||0)+16000));
    const hashes=[...near.matchAll(/[a-f0-9]{64}/gi)].map(x=>x[0]);
    const clients=[...js.matchAll(/production-[a-f0-9]{20,}/gi)].map(x=>x[0]);
    for(const hash of hashes) for(const client of clients.slice(0,8)) out.push({hash,client});
  }
  return out;
}
function probeUrl(c:SKaupatProtocolConfig){
  const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const variables={availabilityDate:date,facets:[{key:"brandName",order:"asc"},{key:"category"},{key:"labels"}],generatedSessionId:"ziiply-protocol-probe",fetchSponsoredContent:false,limit:1,queryString:"maito",sortForAvailabilityLabelDate:date,storeId:"603217266",useRandomId:false,marketingId:"ziiply-protocol-probe"};
  const extensions={clientLibrary:{name:"@apollo/client",version:c.apolloVersion},persistedQuery:{version:1,sha256Hash:c.persistedQueryHash}};
  const u=new URL("https://api.s-kaupat.fi/"); u.searchParams.set("operationName","RemoteFilteredProducts");u.searchParams.set("variables",JSON.stringify(variables));u.searchParams.set("extensions",JSON.stringify(extensions));return u.toString();
}
async function verify(c:SKaupatProtocolConfig){
  const r=await fetch(probeUrl(c),{cache:"no-store",headers:{accept:"application/graphql-response+json,application/json;q=0.9","content-type":"application/json","accept-language":"fi",origin:"https://www.s-kaupat.fi",referer:"https://www.s-kaupat.fi/","x-client-name":"skaupat-web","x-client-version":c.clientVersion}});
  const j=await r.json().catch(()=>null); return r.ok&&!!j?.data?.store?.products&&Array.isArray(j.data.store.products.productListItems);
}
export async function refreshSKaupatProtocolConfig(){
  const html=await text("https://www.s-kaupat.fi/"); const urls=scripts(html); const seen=new Set<string>(); let found=0;
  for(const url of urls){
    let js=""; try{js=await text(url)}catch{continue}
    for(const x of candidates(js)){
      const id=x.hash+"|"+x.client;if(seen.has(id)||!validHash(x.hash)||!validClient(x.client))continue;seen.add(id);found++;
      const c={persistedQueryHash:x.hash,clientVersion:x.client,apolloVersion:"4.3.1"};
      if(!(await verify(c)))continue;
      const db=process.env.DATABASE_URL;if(!db)return{ok:true,persisted:false,candidate:c,scriptsChecked:urls.length,candidatesFound:found};
      const sql=neon(db);await table(sql);await sql`INSERT INTO ziiply_skaupat_protocol(config_key,persisted_query_hash,client_version,apollo_version,verified_at,updated_at) VALUES(${KEY},${c.persistedQueryHash},${c.clientVersion},${c.apolloVersion},NOW(),NOW()) ON CONFLICT(config_key) DO UPDATE SET persisted_query_hash=EXCLUDED.persisted_query_hash,client_version=EXCLUDED.client_version,apollo_version=EXCLUDED.apollo_version,verified_at=NOW(),updated_at=NOW()`;
      const value={...c,verifiedAt:new Date().toISOString()};cache={value,until:Date.now()+300000};return{ok:true,persisted:true,candidate:value,scriptsChecked:urls.length,candidatesFound:found};
    }
  }
  return{ok:false,persisted:false,scriptsChecked:urls.length,candidatesFound:found,error:"No discovered protocol candidate passed verification"};
}

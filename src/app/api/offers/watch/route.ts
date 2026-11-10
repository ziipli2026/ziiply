import { cleanZiiplyGostaOfferResultsV146, mapZiiplyGostaOfferToCardOfferV147 } from "../../../components/ziiply/offerSearch/ziiplyOfferSearchCore";
import { desktopSearchDecision } from "../../../components/ziiply/search/desktopNormalRelevance";
import { NextRequest, NextResponse } from "next/server";
import { GET as lidlStoresGET } from "../../lidl/store-search/route";
import { GET as eurosparStoresGET } from "../../eurospar-stores/route";
import { neon } from "@neondatabase/serverless";
import { GET as searchOffersGET } from "../search/route";

export const dynamic = "force-dynamic";
// The watcher aggregates six independent retail providers; allow slow upstream
// weekly-offer pages to finish instead of terminating the whole scan at 10s.
export const maxDuration = 60;

function norm(value: unknown) {
  return String(value ?? "").toLocaleLowerCase("fi").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
// Search the product identity, not offer conditions or store metadata.
function matches(query:string,offer:Record<string,unknown>){
  const name=String(offer.title||offer.name||offer.productName||"");
  const decision=desktopSearchDecision(query,{...offer,name,title:name} as Parameters<typeof desktopSearchDecision>[1]);
  if(decision.accepted)return true;
  // The saved-offer watcher should also recognize a generic product inside a
  // compound Finnish product name: lohi -> kirjolohi, voi -> meijerivoi.
  // Keep this narrow so a generic term does not match unrelated products.
  const q=norm(query);
  const words=norm(name).split(" ");
  if(q==="lohi")return !/\b(koiran|koira|dog|kissan|kissa|cat|lemmikki|pet)\b/i.test(norm(name)) && words.some(w=>w==="lohi"||w.endsWith("lohi")||/^lohen|^lohta$/.test(w));
  if(q==="voi")return words.some(w=>w==="voi"||w.endsWith("meijerivoi")||w.endsWith("ruokavoi")||w==="voita");
  return false;
}
function priceNumber(offer:Record<string,unknown>){
  for(const raw of [offer.offerPrice,offer.price]){
    const value=String(raw??"").trim().replace(/\s*€$/,"").replace(",",".");
    if(/^\d+(?:\.\d+)?$/.test(value)&&Number(value)>0)return Number(value);
    // Gösta cards may carry the verified selling price as "8,99 €/kg".
    // Accept a clearly marked euro unit price, not arbitrary comparison text.
    const unit=String(raw??"").trim().match(/^(\d{1,5}(?:[,.]\d{1,2})?)\s*(?:€|eur)\s*\/\s*(?:kg|l|kpl)\s*$/i);
    if(unit&&Number(unit[1].replace(",","."))>0)return Number(unit[1].replace(",","."));
  }
  return Number.POSITIVE_INFINITY;
}
// Reuse completed scans and coalesce concurrent requests on a warm server instance.
// Cache keys include location and watched terms; failed scans are never retained.
function canonicalWatchQueries(value: string | null): string {
  return [...new Set((value || "").split("|").map(q => q.trim().toLocaleLowerCase("fi")).filter(q => q.length >= 2 && q.length <= 80))].sort((a,b)=>a.localeCompare(b,"fi")).slice(0,30).join("|");
}

const watchScanCache = new Map<string,{expires:number,promise:Promise<Response>}>();
const WATCH_CACHE_MS = 5 * 60 * 1000;
const WATCH_CACHE_MAX = 80;
// Keep last successful per-store offers for transient upstream failures.
const lastGoodStoreOffers=new Map<string,{at:number;offers:Record<string,unknown>[]}>();
const STORE_FALLBACK_MS=30*60*1000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const validLocation = url.searchParams.has("lat") && url.searchParams.has("lon") && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat)<=90 && Math.abs(lon)<=180;
  if (!validLocation) return runWatch(request);
  const key = [lat.toFixed(3),lon.toFixed(3),canonicalWatchQueries(url.searchParams.get("q"))].join("|");
  const now = Date.now();
  const existing = watchScanCache.get(key);
  if (existing && existing.expires > now) {
    const response = await existing.promise;
    return response.clone();
  }
  watchScanCache.delete(key);
  // Only cache successful responses, and expire incomplete store scans quickly.
  const promise = runWatch(request);
  watchScanCache.set(key,{expires:now+WATCH_CACHE_MS,promise});
  try {
    const response = await promise;
    if (!response.ok) { watchScanCache.delete(key); return response; }
    const payload = await response.clone().json() as {ok?:boolean;partial?:boolean};
    if (!payload.ok || payload.partial) watchScanCache.delete(key);
    else watchScanCache.set(key,{expires:Date.now()+WATCH_CACHE_MS,promise:Promise.resolve(response.clone())});
    while(watchScanCache.size>WATCH_CACHE_MAX)watchScanCache.delete(watchScanCache.keys().next().value!);
    return response;
  } catch(error) {
    watchScanCache.delete(key);
    throw error;
  }
}

async function runWatch(request: Request) {
  const started = Date.now();
  const params = new URL(request.url).searchParams;
  const queries = canonicalWatchQueries(params.get("q")).split("|").filter(Boolean);
  if (!queries.length) return NextResponse.json({ok:false,error:"Hakusanat puuttuvat",results:[]},{status:400});
  if (!process.env.DATABASE_URL) return NextResponse.json({ok:false,error:"DATABASE_URL puuttuu",results:[]},{status:503});
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT chain, publication_id, offers
      FROM (SELECT DISTINCT ON (chain, valid_from, valid_until)
        chain, publication_id, offers, valid_from, valid_until
        FROM ziiply_offer_publications
        WHERE approval_state='approved'
          AND valid_from <= (now() AT TIME ZONE 'Europe/Helsinki')::date
          AND valid_until >= (now() AT TIME ZONE 'Europe/Helsinki')::date
        ORDER BY chain, valid_from, valid_until, parsed_at DESC, publication_id DESC) latest`;
    const nearbyDiagnostics: Array<{store:string;count:number;error?:string}> = [];
    const nearbyOffers: Array<{chain:string;publication_id:string;offers:Record<string,unknown>[]}> = [];
    let selectedStoreCount = 0;
    const hasValidLocation = params.has("lat") && params.has("lon") && Number.isFinite(Number(params.get("lat"))) && Number.isFinite(Number(params.get("lon"))) && Math.abs(Number(params.get("lat"))) <= 90 && Math.abs(Number(params.get("lon"))) <= 180;
    if (!hasValidLocation) return NextResponse.json({ok:false,error:"Tarjousvahdin lähikauppahaku tarvitsee sallitun sijaintitiedon.",results:[],diagnostic:{partial:true,expectedStores:6,selectedStores:0,completedStores:0,publications:rows.length,durationMs:Date.now()-started}},{status:422,headers:{"Cache-Control":"no-store"}});
    const lat=Number(params.get("lat")),lon=Number(params.get("lon"));
    if(params.has("lat")&&params.has("lon")&&Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180){
      const names=["S-market","Sale","Alepa","K-Market","K-Supermarket","Prisma","K-Citymarket"];
      const batches=await Promise.allSettled(names.map(async name=>{
        const response=await fetch("https://api.ruoanhinta.fi/api/stores?search="+encodeURIComponent(name),{cache:"no-store",signal:AbortSignal.timeout(7000)});
        if(!response.ok)throw new Error("Store list HTTP "+response.status);
        const data=await response.json();
        return Array.isArray(data)?data:Array.isArray(data.items)?data.items:[];
      }));
      const origin=new URL(request.url).origin;
      const independent=await Promise.allSettled(["/api/lidl/store-search","/api/eurospar-stores?lat="+encodeURIComponent(String(lat))+"&lon="+encodeURIComponent(String(lon))].map(async path=>{
        // Avoid Vercel protected self-fetch HTML responses for store discovery.
        const response=path.startsWith("/api/lidl/")
          ? await lidlStoresGET(new NextRequest(origin+path))
          : await eurosparStoresGET(new NextRequest(origin+path));
        if(!response.ok)throw new Error("Store list HTTP "+response.status);
        const data=await response.json();
        return Array.isArray(data)?data:Array.isArray(data.items)?data.items:[];
      }));
      const distance=(store:any)=>{
        const a=Number(store.lat??store.latitude),b=Number(store.long??store.lon??store.lng??store.longitude);
        if(!Number.isFinite(a)||!Number.isFinite(b))return Infinity;
        const rad=Math.PI/180,dl=(a-lat)*rad,dn=(b-lon)*rad;
        const h=Math.sin(dl/2)**2+Math.cos(lat*rad)*Math.cos(a*rad)*Math.sin(dn/2)**2;
        return 12742*Math.asin(Math.min(1,Math.sqrt(h)));
      };
      const seenStores=new Set<string>();
      const stores=[...batches,...independent].flatMap(b=>b.status==="fulfilled"?b.value:[])
        .filter((store:any)=>{
          const name=String(store.name||"");
          if(store.delistedAt||!(/^(Prisma|S-market|Sale|Alepa|K-Market|K-Supermarket|K-Citymarket|Lidl|Eurospar|Spar|Tokmanni)\b/i.test(name)||/lidl|spar|tokmanni/i.test(String(store.chain||""))))return false;
          if(!Number.isFinite(distance(store)))return false;
          const id=String(store.externalId||store.id||name);
          if(seenStores.has(id))return false;seenStores.add(id);return true;
        }).sort((a:any,b:any)=>distance(a)-distance(b));
      const category=(name:string,chain="")=>{
        if(/lidl/i.test(name+" "+chain))return "lidl";
        if(/spar|tokmanni/i.test(name+" "+chain))return "spar";
        if(/^Prisma\b/i.test(name))return "sHyper";
        if(/^K-Citymarket\b/i.test(name))return "kHyper";
        if(/^(S-market|Sale|Alepa)\b/i.test(name))return "sLocal";
        if(/^(K-Market|K-Supermarket)\b/i.test(name))return "kLocal";
        return "";
      };
      const picked=new Set<string>();
      const selectedStores=stores.filter((store:any)=>{
        const kind=category(String(store.name||""),String(store.chain||""));
        if(!kind||picked.has(kind))return false;
        picked.add(kind);return true;
      });
      selectedStoreCount = selectedStores.length;
      let cursor=0;
      await Promise.all(Array.from({length:Math.min(6,selectedStores.length)},async()=>{
        while(cursor<selectedStores.length){
          const store=selectedStores[cursor++] as Record<string,unknown>;
          const name=String(store.name||"");
          const id=String(store.externalId||store.id||"");
          const kind=category(name,String(store.chain||""));
          const isS=kind==="sHyper"||kind==="sLocal";
          const isCitymarket=/^K-Citymarket/i.test(name);
          try{
            // Use the same store-scoped master endpoint and provider dispatch as desktop Gösta.
            const offerParams=new URLSearchParams({q:"__ziiply_all_offers__"});
            if(isCitymarket){
              offerParams.set("provider","kcitymarket");
              offerParams.set("kStoreId",id);
              offerParams.set("kStoreName",name);
            }else if(kind==="lidl"){
              offerParams.set("provider","lidl");
              offerParams.set("lidlStoreKey",String(store.storeKey||store.externalId||store.id||""));
              offerParams.set("lidlStoreName",name);
            }else if(kind==="spar"){
              if(/eurospar/i.test(name+" "+String(store.chain||""))){
                offerParams.set("provider","eurospar");
                offerParams.set("eurosparStoreName",name);
              }else{
                offerParams.set("provider","tokmanni");
                offerParams.set("tokmanniStoreName",name);
              }
            }else if(isS){
              offerParams.set("sStoreId",id);
              offerParams.set("sStoreName",name);
            }else{
              offerParams.set("kStoreId",id);
              offerParams.set("kStoreName",name);
            }
            // Call the search handler directly: a server-side HTTP self-fetch can be
            // intercepted by Vercel Deployment Protection and return HTML instead of JSON.
            const searchUrl=origin+"/api/offers/search?"+offerParams.toString();
            const response=await searchOffersGET(new Request(searchUrl));
            if(!response.ok)throw new Error("Offer source HTTP "+response.status);
            const payload=await response.json();
            if(!payload.ok)throw new Error(String(payload.error||"Offer source unavailable"));
            if(Array.isArray(payload.sourceFailures)&&payload.sourceFailures.length){
              const details=payload.sourceFailures.map((failure:{source?:string;message?:string})=>String(failure.source||"provider")+": "+String(failure.message||"failed")).join("; ");
              throw new Error("Offer provider failed: "+details.slice(0,500));
            }
            const raw=(Array.isArray(payload.results)?payload.results:[]) as Parameters<typeof cleanZiiplyGostaOfferResultsV146>[0];
            const normalized=cleanZiiplyGostaOfferResultsV146(raw).map(mapZiiplyGostaOfferToCardOfferV147) as Record<string,unknown>[];
            lastGoodStoreOffers.set(kind+"|"+id,{at:Date.now(),offers:normalized});
            while(lastGoodStoreOffers.size>120)lastGoodStoreOffers.delete(lastGoodStoreOffers.keys().next().value!);
            nearbyOffers.push({chain:kind==="lidl"?"LIDL":kind==="spar"?"SPAR":isS?"S":"K",publication_id:name,offers:normalized.map(o=>({...o,storeName:name}))});
            nearbyDiagnostics.push({store:name,count:normalized.length});
          }catch(error){
            const fallback=lastGoodStoreOffers.get(kind+"|"+id);
            if(fallback&&Date.now()-fallback.at<STORE_FALLBACK_MS){
              nearbyOffers.push({chain:kind==="lidl"?"LIDL":kind==="spar"?"SPAR":isS?"S":"K",publication_id:name,offers:fallback.offers.map(o=>({...o,storeName:name}))});
              nearbyDiagnostics.push({store:name,count:fallback.offers.length,error:"Tilapäinen lähdevirhe, käytetään viimeksi onnistunutta hakua: "+String(error)});
            }else nearbyDiagnostics.push({store:name,count:0,error:String(error)});
          }
        }
      }));
    }
    const seen = new Set<string>();
    const results: Array<Record<string,unknown>> = [];
    const sources: Array<{chain:string;publication:string;count:number}> = [];
    let inspected = 0;
    for (const row of nearbyOffers) {
      const offers = Array.isArray(row.offers) ? row.offers as Record<string,unknown>[] : [];
      sources.push({chain:String(row.chain),publication:String(row.publication_id),count:offers.length});
      inspected += offers.length;
      for (const offer of offers) {
        // Never publish an unpriced or malformed offer in the watcher bag.
        if (!Number.isFinite(priceNumber(offer))) continue;
        const matchingQueries = queries.filter(q => matches(q,offer));
        if (!matchingQueries.length) continue;
        const title=String(offer.title||offer.name||offer.productName||"");
        const store=String(offer.storeName||offer.store||row.chain||"");
        // The same product can arrive under different publication offer IDs.
        // Prefer a verified EAN, scoped to the store and price; otherwise use
        // normalized product identity instead of provider-specific row IDs.
        const ean=String(offer.ean||"").trim();
        const identity=/^\\d{8,14}$/.test(ean) ? "ean:"+ean : "name:"+norm(title);
        // Keep separate offers when their original publishers/providers differ.
        // Deduplicate only identical product/price entries from the same source.
        const offerSource=String(offer.source||offer.provider||"unknown").trim().toLocaleLowerCase("fi");
        const key=[row.chain,store,offerSource,identity,priceNumber(offer)].join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({...offer,title,storeName:store,chain:String(row.chain),watchQueries:matchingQueries});
      }
    }
    const partial=selectedStoreCount!==6||nearbyDiagnostics.length!==6||nearbyDiagnostics.some(item=>Boolean(item.error));
    results.sort((a,b)=>priceNumber(a)-priceNumber(b));
    const publishedResults=results;
    const matchesByQuery=Object.fromEntries(queries.map(q=>[q,publishedResults.filter(r=>(r.watchQueries as string[]).includes(q)).length]));
    return NextResponse.json({ok:true,partial, warning:partial?"Osa kaupoista jäi tarkistamatta; näytetään vain onnistuneiden kauppojen vahvistetut tarjoukset.":undefined,queries,results:publishedResults,diagnostic:{partial,expectedStores:6,selectedStores:selectedStoreCount,completedStores:nearbyDiagnostics.length,matchesByQuery,publications:rows.length,inspected,matched:publishedResults.length,sources,nearby:nearbyDiagnostics,durationMs:Date.now()-started}},
      {headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:String(error),results:[],diagnostic:{durationMs:Date.now()-started}},{status:500,headers:{"Cache-Control":"no-store"}});
  }
}

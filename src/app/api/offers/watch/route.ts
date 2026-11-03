import { searchZiiplyOffers } from "../../../components/ziiply/offerSearch/ziiplyOfferSearchSources";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

function norm(value: unknown) {
  return String(value ?? "").toLocaleLowerCase("fi").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
function matches(query: string, offer: Record<string, unknown>) {
  const words = norm(query).split(/\s+/).filter(Boolean);
  const title = norm(offer.title || offer.name || offer.productName);
  const tokens = title.split(/\s+/);
  return words.length > 0 && words.every(word => tokens.some(token =>
    token === word || token.startsWith(word) || (word.length >= 5 && token.startsWith(word.slice(0, -1)))));
}
export async function GET(request: Request) {
  const started = Date.now();
  const params = new URL(request.url).searchParams;
  const queries = [...new Set((params.get("q") || "").split("|").map(q => q.trim()).filter(q => q.length >= 2 && q.length <= 80))].slice(0, 30);
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
        const response=await fetch(origin+path,{cache:"no-store",signal:AbortSignal.timeout(7000)});
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
      let cursor=0;
      await Promise.all(Array.from({length:Math.min(5,selectedStores.length)},async()=>{
        while(cursor<selectedStores.length){
          const store=selectedStores[cursor++] as Record<string,unknown>;
          const name=String(store.name||"");
          const id=String(store.externalId||store.id||"");
          const kind=category(name,String(store.chain||""));
          const isS=kind==="sHyper"||kind==="sLocal";
          const isCitymarket=/^K-Citymarket/i.test(name);
          if(isCitymarket){
            const cityRows=rows.filter(row=>/^K-Citymarket/i.test(String(row.chain)));
            const cityOffers=cityRows.flatMap(row=>Array.isArray(row.offers)?row.offers as Record<string,unknown>[]:[]);
            nearbyOffers.push({chain:"K",publication_id:name,offers:cityOffers.map(o=>({...o,storeName:name}))});
            nearbyDiagnostics.push({store:name,count:cityOffers.length,error:cityOffers.length?undefined:"Citymarket publication unavailable"});continue;
          }
          try{
            if(kind==="lidl"){
              const lidlRows=rows.filter(row=>/^LIDL/i.test(String(row.chain)));
              const lidlOffers=lidlRows.flatMap(row=>Array.isArray(row.offers)?row.offers as Record<string,unknown>[]:[]);
              nearbyOffers.push({chain:"LIDL",publication_id:name,offers:lidlOffers.map(o=>({...o,storeName:name}))});
              nearbyDiagnostics.push({store:name,count:lidlOffers.length,error:lidlOffers.length?undefined:"Lidl publication unavailable"});continue;
            }
            const context=kind==="spar"?(/eurospar/i.test(name+" "+String(store.chain||""))?{eurosparStoreId:id,eurosparStoreName:name,eurosparStoreChain:String(store.chain||"")}:{tokmanniStoreId:id,tokmanniStoreName:name}):isS?{sStoreId:id,sStoreName:name,sStoreIds:[id],sStoreNames:[name]}:{kStoreId:id,kStoreName:name,kStoreIds:[id],kStoreNames:[name]};
            const offers=await Promise.race([
              searchZiiplyOffers("__ziiply_all_offers__",context),
              new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error("timeout 10s")),10000))
            ]);
            const normalized=offers as unknown as Record<string,unknown>[];
            nearbyOffers.push({chain:kind==="spar"?"SPAR":isS?"S":"K",publication_id:name,offers:normalized.map(o=>({...o,storeName:name}))});
            nearbyDiagnostics.push({store:name,count:normalized.length});
          }catch(error){nearbyDiagnostics.push({store:name,count:0,error:String(error)});}
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
        const matchingQueries = queries.filter(q => matches(q,offer));
        if (!matchingQueries.length) continue;
        const title=String(offer.title||offer.name||offer.productName||"");
        const store=String(offer.storeName||offer.store||row.chain||"");
        const key=[row.chain,store,offer.id||offer.offerId||offer.ean||title,offer.offerPrice??offer.price??""].join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({...offer,title,storeName:store,chain:String(row.chain),watchQueries:matchingQueries});
      }
    }
    return NextResponse.json({ok:true,queries,results,diagnostic:{publications:rows.length,inspected,matched:results.length,sources,nearby:nearbyDiagnostics,durationMs:Date.now()-started}},
      {headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:String(error),results:[],diagnostic:{durationMs:Date.now()-started}},{status:500,headers:{"Cache-Control":"no-store"}});
  }
}

import { category as classifyCitymarketCategory } from "./kCitymarketProvider";
/**
 * Store-addressed Citymarket Tjek publication offers. The national leaflet is
 * fetched separately. No fallback to an arbitrary nearby store or generic feed.
 */
type Row = Record<string, unknown>;
const ORIGIN = "https://etarjouslehdet.fi/";
const BUSINESS = "38d088";
const normalize = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const asRows = (v: unknown): Row[] => v && typeof v === "object" && Array.isArray((v as Row).data)
  ? ((v as Row).data as unknown[]).filter((x): x is Row => !!x && typeof x === "object" && !Array.isArray(x)) : [];
const numeric = (v: unknown): number | null => v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null;
function stable(value: unknown): string {
  return JSON.stringify(value, (_key, v) => v && Object.prototype.toString.call(v) === "[object Object]"
    ? Object.keys(v).sort().reduce<Record<string,unknown>>((out,key) => { out[key]=v[key]; return out; }, {}) : v);
}
async function tjek(name: string, params: Row): Promise<unknown> {
  const key = Buffer.from(stable([name,params]),"utf8").toString("base64");
  const response = await fetch(ORIGIN, { method:"POST", cache:"no-store",
    headers:{"Content-Type":"application/json",Accept:"application/json, text/plain, */*",Referer:ORIGIN+"K-Citymarket"},
    body:JSON.stringify({data:[key]}),signal:AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("Tjek "+name+" HTTP "+response.status);
  for (const line of (await response.text()).split(/\r?\n/).filter(Boolean)) {
    try { const parsed=JSON.parse(line); if(parsed.key===key)return parsed.value; } catch {}
  }
  throw new Error("Tjek "+name+" response missing");
}
export async function fetchKCitymarketSelectedStoreOffers(selectedStoreName: string): Promise<Row[]> {
  const wanted=normalize(selectedStoreName);
  if (!wanted.includes("citymarket") || wanted.length < 13) return [];
  const stores=asRows(await tjek("stores",{businessId:BUSINESS,pagination:{offset:0,limit:1000}}));
  const matching=stores.filter(s => normalize(s.name)===wanted);
  // No substring fallback: never silently import another store's publication.
  if (matching.length!==1) return [];
  const store=matching[0], storeId=String(store.id??"");
  if (!storeId || !store.coordinates) return [];
  const fronts=await tjek("fronts",{businessIds:[BUSINESS],localBusinessIds:[storeId],coordinates:store.coordinates});
  const now=Date.now();
  const publications=(Array.isArray(fronts)?fronts:[]).flatMap(front => front && typeof front==="object" && Array.isArray((front as Row).publications) ? (front as Row).publications as Row[] : [])
    .filter(p => {const from=Date.parse(String(p.validFrom??"")),until=Date.parse(String(p.validUntil??""));return Number.isFinite(from)&&Number.isFinite(until)&&from<=now&&now<=until;});
  const output: Row[]=[];
  const seen=new Set<string>();
  for(const publication of publications.slice(0,5)){
    const publicationId=String(publication.id??"");
    if(!publicationId)continue;
    for(let page=1;page<=20;page++){
      const response=await fetch("https://publication-viewer.tjek.com/api/paged-publications/"+encodeURIComponent(publicationId)+"/"+page,{cache:"no-store",headers:{Accept:"application/json"},signal:AbortSignal.timeout(12000)});
      if(!response.ok){if(page>1&&(response.status===400||response.status===404))break;throw new Error("Tjek publication HTTP "+response.status);}
      const payload=await response.json() as Row;
      const hotspots=Array.isArray(payload.hotspots)?payload.hotspots:[];
      const ids=[...new Set(hotspots.map(h=>h && typeof h==="object" ? String((h as Row).offer && typeof (h as Row).offer==="object" ? ((h as Row).offer as Row).id??"" : "") : "").filter(Boolean))];
      const freshIds=ids.filter(id=>!seen.has(id));
      freshIds.forEach(id=>seen.add(id));
      for(let offset=0;offset<freshIds.length;offset+=8){
      const fetched=await Promise.all(freshIds.slice(offset,offset+8).map(async id=>{
        try {const result=await tjek("offer",{publicId:id});return result&&typeof result==="object"&&!Array.isArray(result)?{id,offer:result as Row}:null;}catch{return null;}
      }));
      for(const entry of fetched){
        if(!entry)continue;
        const {id,offer}=entry;
        if(String(offer.publicationPublicId??publicationId)!==publicationId)continue;
        const title=String(offer.name??"").trim();
        const regular=numeric(offer.price),member=numeric(offer.membershipPrice),app=numeric(offer.appPrice);
        const price=app??member??regular??numeric(offer.fromPrice);
        const from=Date.parse(String(offer.validFrom??publication.validFrom??""));
        const until=Date.parse(String(offer.validUntil??publication.validUntil??""));
        if(!title||price==null||price<=0||!Number.isFinite(from)||!Number.isFinite(until)||from>now||until<now)continue;
        const qty=numeric(offer.pieceCountFrom);
        const quantity=qty!=null&&qty>1&&qty===numeric(offer.pieceCountTo)?qty:null;
        const unit=String(offer.baseUnit??"");
        const unitValue=numeric(offer.unitPrice);
        output.push({id:"citymarket-local-"+storeId+"-"+id,title,name:title,productName:title,price,
          priceText:quantity ? price.toFixed(2).replace(".",",")+" € / "+quantity+" kpl" : price.toFixed(2).replace(".",",")+" €",
          previousPrice:regular!=null&&regular!==price?regular:null,
          unitPrice:unitValue==null?"":unitValue.toFixed(2).replace(".",",")+(unit?"/"+unit:""),
          imageUrl:String(offer.imageLarge??offer.image??""),
          storeId,storeName:String(store.name),storeLabel:String(store.name),chain:"K",storeType:"K-Citymarket",
          source:"K-Citymarket kauppakohtainen julkaisu",provider:"kcitymarket-local",offerId:id,
          additionalInfo:offer.description??null,benefitText:app!=null?"Mobiilitarjous":member!=null?"Plussa-tarjous":undefined,
          validFrom:offer.validFrom??publication.validFrom,validUntil:offer.validUntil??publication.validUntil,
          isPlussaOffer:member!=null,offerQuantity:quantity,
          sourceUrl:ORIGIN+"K-Citymarket/kaupat/"+encodeURIComponent(storeId),
          category:classifyCitymarketCategory(title),categoryPath:classifyCitymarketCategory(title),productGroup:classifyCitymarketCategory(title),mainCategory:classifyCitymarketCategory(title),campaignType:"campaign",debug:{publicationId,tjekStoreId:storeId,sourceScope:"SELECTED_STORE_PUBLICATION"}});
      }
      }
      if(hotspots.length===0)break;
    }
  }
  return output;
}


/** Optional national-publication photo index. Never imports Tjek prices or local campaigns. */
export type KCitymarketTjekImageDebug={fronts:number;publications:number;pages:number;offerIds:number;offersWithImage:number;uniqueImages:number;error:string|null};
let nationalTjekImageDebug:KCitymarketTjekImageDebug={fronts:0,publications:0,pages:0,offerIds:0,offersWithImage:0,uniqueImages:0,error:null};
export function getKCitymarketNationalTjekImageDebug(){return {...nationalTjekImageDebug};}
export async function fetchKCitymarketNationalTjekImages(): Promise<Map<string,string>> {
  const stats:KCitymarketTjekImageDebug={fronts:0,publications:0,pages:0,offerIds:0,offersWithImage:0,uniqueImages:0,error:null};
  const images=new Map<string,string>();
  try {
    const fronts=await tjek("fronts",{businessIds:[BUSINESS]});
    stats.fronts=Array.isArray(fronts)?fronts.length:0;
    const now=Date.now();
    const publications=(Array.isArray(fronts)?fronts:[]).flatMap(front =>
      front && typeof front==="object" && Array.isArray((front as Row).publications)
        ? (front as Row).publications as Row[] : [])
      .filter(p=>{const from=Date.parse(String(p.validFrom??"")),until=Date.parse(String(p.validUntil??""));
        return Number.isFinite(from)&&Number.isFinite(until)&&from<=now&&now<=until;});
    stats.publications=publications.length;
    const candidates=new Map<string,Set<string>>();
    for(const publication of publications.slice(0,3)){
      const publicationId=String(publication.id??"");
      if(!publicationId)continue;
      const seen=new Set<string>();
      for(let page=1;page<=20;page++){
        const response=await fetch("https://publication-viewer.tjek.com/api/paged-publications/"+encodeURIComponent(publicationId)+"/"+page,
          {cache:"no-store",headers:{Accept:"application/json"},signal:AbortSignal.timeout(12000)});
        if(!response.ok)break;
        stats.pages++;
        const payload=await response.json() as Row;
        const hotspots=Array.isArray(payload.hotspots)?payload.hotspots:[];
        const ids=[...new Set(hotspots.map(h=>h&&typeof h==="object"&&((h as Row).offer)&&typeof (h as Row).offer==="object"
          ? String(((h as Row).offer as Row).id??""):"").filter(Boolean))].filter(id=>!seen.has(id));
        stats.offerIds+=ids.length;
        ids.forEach(id=>seen.add(id));
        for(let offset=0;offset<ids.length;offset+=8){
          const offers=await Promise.all(ids.slice(offset,offset+8).map(async id=>{
            try{return await tjek("offer",{publicId:id}) as Row;}catch{return null;}
          }));
          for(const offer of offers){
            if(!offer||String(offer.publicationPublicId??publicationId)!==publicationId)continue;
            const from=Date.parse(String(offer.validFrom??publication.validFrom??""));
            const until=Date.parse(String(offer.validUntil??publication.validUntil??""));
            if(!Number.isFinite(from)||!Number.isFinite(until)||from>now||until<now)continue;
            const key=normalize(offer.name),url=String(offer.imageLarge??offer.image??"");
            if(!key||!/^https:\/\//i.test(url))continue;
            stats.offersWithImage++;
            const set=candidates.get(key)||new Set<string>();set.add(url);candidates.set(key,set);
          }
        }
        if(!hotspots.length)break;
      }
    }
    for(const [key,urls] of candidates)if(urls.size===1)images.set(key,[...urls][0]);
    stats.uniqueImages=images.size;
    console.info("[K-Citymarket] national Tjek photo candidates",stats);
  }catch(error){stats.error=error instanceof Error?error.message:String(error);console.warn("[K-Citymarket] optional national Tjek photo lookup unavailable",error);}
  nationalTjekImageDebug=stats;
  return images;
}

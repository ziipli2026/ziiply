import { category as classifyCitymarketCategory } from "./kCitymarketProvider";
import { neon } from "@neondatabase/serverless";
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
type LocalProgress = { stage: string; storeName: string; storeId: string | null; publicationIds: string[]; pages: number; offerIds: number; accepted: number; error: string | null; updatedAt: string };
const localCache = new Map<string, { rows: Row[]; startedAt: number; finishedAt: number; running: boolean; progress: LocalProgress; promise?: Promise<void> }>();
const LOCAL_TTL = 15 * 60_000;
const FAILED_RETRY_TTL = 60 * 60_000;
const isActiveOffer = (row: Row, at=Date.now()) => {
  const from=Date.parse(String(row.validFrom??""));
  const until=Date.parse(String(row.validUntil??""));
  return Number.isFinite(from)&&Number.isFinite(until)&&from<=at&&at<=until;
};
export function getKCitymarketLocalTjekDebug(selectedStoreName: string): LocalProgress & { running: boolean; cachedRows: number } {
  const entry = localCache.get(normalize(selectedStoreName));
  return entry ? { ...entry.progress, publicationIds: [...entry.progress.publicationIds], running: entry.running, cachedRows: entry.rows.length } :
    { stage: "not-started", storeName: selectedStoreName, storeId: null, publicationIds: [], pages: 0, offerIds: 0, accepted: 0, error: null, updatedAt: "", running: false, cachedRows: 0 };
}
// Shared durable snapshot: only publish fully completed Tjek scans.
// Keep the previous successful snapshot if the upstream scan times out.
async function readPublishedSnapshot(key: string): Promise<Row[] | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT offers FROM public.ziiply_kcitymarket_tjek_snapshots WHERE (store_key = ${key} OR regexp_replace(lower(store_key), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(${key}), '[^a-z0-9]+', '', 'g')) ORDER BY CASE WHEN store_key = ${key} THEN 0 ELSE 1 END, updated_at DESC LIMIT 1`;
    return Array.isArray(rows[0]?.offers) ? rows[0].offers as Row[] : null;
  } catch (error) {
    console.warn("[K-Citymarket] snapshot read unavailable", error);
    return null;
  }
}
async function publishSnapshot(key: string, offers: Row[], publicationIds: string[]): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing: cannot persist Tjek snapshot");
  const sql = neon(process.env.DATABASE_URL);
  await sql`INSERT INTO public.ziiply_kcitymarket_tjek_snapshots (store_key, offers, publication_ids, valid_until, updated_at)
    VALUES (${key}, ${JSON.stringify(offers)}::jsonb, ${JSON.stringify(publicationIds)}::jsonb, NOW() + INTERVAL '7 days', NOW())
    ON CONFLICT (store_key) DO UPDATE SET offers = EXCLUDED.offers, publication_ids = EXCLUDED.publication_ids,
      valid_until = EXCLUDED.valid_until, updated_at = NOW()`;
}
/** A pack's contents are not a minimum purchase quantity. Applies on read to old snapshots too. */
export function normalizeTjekPackagePrice(row: Row): Row {
  const quantity = Number(row.offerQuantity);
  if (!(quantity > 1)) return row;
  const text = String(row.title ?? row.name ?? "") + " " + String(row.additionalInfo ?? "");
  const counts = [...text.matchAll(/\b(\d+)\s*[x×]\s*\d+(?:[,.]\d+)?\s*(?:kg|g|ml|cl|dl|l)\b|\b(\d+)\s*[- ]pack\b/gi)]
    .map(match => Number(match[1] || match[2]));
  if (!counts.includes(quantity)) return row;
  // Explicit purchase labels take precedence over package contents.
  if (new RegExp("\\b" + quantity + "\\s*(?:PKT|PAKKAUSTA|PACKIA)\\b", "i").test(text)) return row;
  const price = Number(row.price);
  if (!(price > 0)) return row;
  return {...row, offerQuantity: null, offerUnit: "pkt", packageCount: quantity,
    priceBasis: "package-total", priceText: price.toFixed(2).replace(".", ",") + " € / pkt (" + quantity + " kpl)"};
}
/** Verified K-Ruoka N183 offers only; never count Tjek fallback as K-Ruoka success. */
export async function fetchVerifiedKCitymarketHyvinkaaOffers(): Promise<Row[]> {
  const now = Date.now();
  return (await readPublishedSnapshot("k-ruoka k citymarket hyvinkaa") ?? [])
    .filter(row => String(row.storeId ?? "") === "N183"
      && String((row.debug as Row | undefined)?.sourceScope ?? row.sourceScope ?? "") === "SELECTED_STORE_WEB_OFFERS"
      && normalize(row.storeName) === "k citymarket hyvinkaa"
      && isActiveOffer(row, now));
}
export async function fetchKCitymarketSelectedStoreOffers(selectedStoreName: string): Promise<Row[]> {
  const key = normalize(selectedStoreName);
  const now = Date.now();
  // Preserve K-Ruoka's verified store-scoped offers independently of Tjek.
  // The alternate key is accepted only for the explicitly verified Hyvinkaa store,
  // and every row must independently identify the same store (N183).
  const isHyvinkaa = key === "k citymarket hyvinkaa" || key === "k ruoka k citymarket hyvinkaa";
  const primary = isHyvinkaa
    ? (await readPublishedSnapshot("k-ruoka k citymarket hyvinkaa") ?? [])
        .filter(row => String(row.storeId ?? "") === "N183"
          && String((row.debug as Row | undefined)?.sourceScope ?? row.sourceScope ?? "") === "SELECTED_STORE_WEB_OFFERS"
          && normalize(row.storeName) === "k citymarket hyvinkaa"
          && isActiveOffer(row, now))
    : [];
  const fallbackKey = isHyvinkaa ? "k citymarket hyvinkaa" : key;
  const fallback = (await readPublishedSnapshot(fallbackKey) ?? [])
    .filter(row => isActiveOffer(row, now)
      && (!isHyvinkaa || (String(row.storeId ?? "") === "fe95rtb"
        && normalize(row.storeName) === "k citymarket hyvinkaa")));
  // A local Tjek publication and the verified K-Ruoka store feed are independent.
  // Never replace either source when the other one refreshes, including a
  // verified-empty K-Ruoka scan. Every row was already validated by source,
  // store identity and offer validity above.
  return [...primary, ...fallback].map(normalizeTjekPackagePrice);
}
export async function refreshKCitymarketCampaignCache(storeName: string) {
  const key = normalize(storeName);
  // This updater owns Tjek snapshots ONLY. Never allow an alternate K-Ruoka
  // store label to overwrite the independently collected verified N183 feed.
  if (key.startsWith("k ruoka ")) throw new Error("Tjek refresh cannot write a K-Ruoka snapshot key");
  const entry = {rows: [] as Row[], unpricedRows: [] as Row[], progress: {stage: "starting", storeName,
    storeId: null as string | null, publicationIds: [] as string[], pages: 0,
    offerIds: 0, accepted: 0, error: null as string | null,
    updatedAt: new Date().toISOString()}};
  await readKCitymarketSelectedStoreOffers(storeName, entry);
  if (entry.progress.stage !== "reading-pages" && entry.progress.stage !== "no-active-publications") {
    throw new Error("Tjek scan incomplete: " + entry.progress.stage);
  }
  if (entry.progress.publicationIds.length === 0 || entry.rows.length === 0) {
    throw new Error("Tjek refresh returned no active campaign rows; previous snapshot preserved");
  }
  // A successful HTTP scan is not proof of a complete campaign catalogue.
  // Never replace a healthy snapshot with a suddenly tiny partial publication.
  const previous = await readPublishedSnapshot(key);
  const previousActive = (previous ?? []).filter(row => isActiveOffer(row)).length;
  const currentActive = entry.rows.filter(row => isActiveOffer(row)).length;
  if (previousActive >= 5 && currentActive < Math.max(3, Math.floor(previousActive * 0.5))) {
    throw new Error(`Tjek campaign coverage regression: ${currentActive} active rows vs ${previousActive} previously; previous snapshot preserved`);
  }
  // Report accepted/identified offer coverage; do not silently interpret a
  // successful source request as complete coverage of every hotspot.
  if (entry.progress.offerIds >= 5 && entry.rows.length < Math.max(3, Math.floor(entry.progress.offerIds * 0.2))) {
    throw new Error(`Tjek campaign detail coverage incomplete: ${entry.rows.length}/${entry.progress.offerIds}; previous snapshot preserved`);
  }
  entry.rows = entry.rows.map(normalizeTjekPackagePrice);
  await publishSnapshot(key, entry.rows, entry.progress.publicationIds);
  // Keep display-only discounts separate from priced offers and basket calculations.
  await publishSnapshot(key+" unpriced", entry.unpricedRows, entry.progress.publicationIds);
  return {count: entry.rows.length, activeCount: currentActive, discoveredOfferIds: entry.progress.offerIds, pages: entry.progress.pages};
}
export async function fetchKCitymarketUnpricedDiscounts(selectedStoreName: string): Promise<Row[]> {
  const key=normalize(selectedStoreName);
  return (await readPublishedSnapshot(key+" unpriced")??[]).filter(row=>isActiveOffer(row));
}
async function readKCitymarketSelectedStoreOffers(selectedStoreName: string, entry: { rows: Row[]; unpricedRows?: Row[]; progress: LocalProgress }): Promise<void> {
  const wanted=normalize(selectedStoreName);
  if (!wanted.includes("citymarket") || wanted.length < 13) { entry.progress.stage = "invalid-store-name"; return; }
  const stores=asRows(await tjek("stores",{businessId:BUSINESS,pagination:{offset:0,limit:1000}}));
  const matching=stores.filter(s => normalize(s.name)===wanted);
  // No substring fallback: never silently import another store's publication.
  if (matching.length!==1) { entry.progress.stage = "store-match-failed"; entry.progress.error = "Tjek stores matching count: " + matching.length; return; }
  const store=matching[0], storeId=String(store.id??"");
  if (!storeId || !store.coordinates) { entry.progress.stage = "store-location-missing"; return; }
  entry.progress.storeId = storeId; entry.progress.stage = "discovering-publications";
  const fronts=await tjek("fronts",{businessIds:[BUSINESS],localBusinessIds:[storeId],coordinates:store.coordinates});
  const now=Date.now();
  // Prepare upcoming publications too; the reader still exposes only currently valid offers.
  const horizon=now+3*24*60*60*1000;
  const publications=(Array.isArray(fronts)?fronts:[]).flatMap(front => front && typeof front==="object" && Array.isArray((front as Row).publications) ? (front as Row).publications as Row[] : [])
    .filter(p => {const from=Date.parse(String(p.validFrom??"")),until=Date.parse(String(p.validUntil??""));return Number.isFinite(from)&&Number.isFinite(until)&&from<=horizon&&now<=until;});
  // The fronts feed may repeat a publication across front sections. Process each
  // publication once, otherwise coverage metrics and offer scans are distorted.
  const uniquePublications = [...new Map(publications.filter(p => p.id != null).map(p => [String(p.id), p])).values()];
  entry.progress.publicationIds = uniquePublications.map(p => String(p.id));
  entry.progress.stage = uniquePublications.length ? "reading-pages" : "source-unavailable";
  if (!uniquePublications.length) {
    entry.progress.error = `Tjek ei palauttanut kauppakohtaisia julkaisuja myymälälle ${String(store.name)} (storeId=${storeId}). Tarjousten määrää ei voida vahvistaa; aiempi aineisto säilytetään.`;
    throw new Error(entry.progress.error);
  }
  const failedOfferIds=new Set<string>();
  const acceptedOfferKeys=new Set<string>();
  const rejectedReasons: Record<string,number> = {};
  let filteredByValidity=0;
  const unpricedOfferExamples: Array<{id:string;title:string;unitPrice:unknown;description:string;plussa:boolean;discountPercent:number|null}> = [];
  const unpricedCategories={plussaPercentage:0,plussaOther:0,percentageOther:0,other:0};
  let missingOfferDetails=0;
  const rejectedSamples: Record<string,string[]> = {};
  const sampleReject=(reason:string,id:string)=>{const samples=rejectedSamples[reason]??(rejectedSamples[reason]=[]);if(samples.length<5)samples.push(id);};
  let duplicateOfferRows=0;
  const reject=(reason:string)=>{rejectedReasons[reason]=(rejectedReasons[reason]??0)+1;};
  let completedPublications=0;
  let pageLimitReached=false;
  for(const publication of uniquePublications){
    // Offer IDs must be deduplicated within each publication, not across all publications.
    const seen=new Set<string>();
    const publicationId=String(publication.id??"");
    if(!publicationId)continue;
    for(let page=1;page<=100;page++){
      const response=await fetch("https://publication-viewer.tjek.com/api/paged-publications/"+encodeURIComponent(publicationId)+"/"+page,{cache:"no-store",headers:{Accept:"application/json"},signal:AbortSignal.timeout(12000)});
      if(!response.ok){if(page>1&&(response.status===400||response.status===404))break;throw new Error("Tjek publication HTTP "+response.status);}
      const payload=await response.json() as Row;
      entry.progress.pages++;
      const hotspots=Array.isArray(payload.hotspots)?payload.hotspots:[];
      const ids=[...new Set(hotspots.map(h=>h && typeof h==="object" ? String(((h as Row).offer && typeof (h as Row).offer==="object" ? ((h as Row).offer as Row).id : null) ?? (h as Row).offerId ?? (h as Row).offerPublicId ?? "") : "").filter(Boolean))];
      const freshIds=ids.filter(id=>!seen.has(id));
      entry.progress.offerIds += freshIds.length;
      freshIds.forEach(id=>seen.add(id));
      for(let offset=0;offset<freshIds.length;offset+=24){
      const fetched=await Promise.all(freshIds.slice(offset,offset+24).map(async id=>{
        try {const result=await tjek("offer",{publicId:id});return result&&typeof result==="object"&&!Array.isArray(result)?{id,offer:result as Row}:null;}catch{failedOfferIds.add(id);return null;}
      }));
      for(const fetchedEntry of fetched){
        if(!fetchedEntry){missingOfferDetails++;continue;}
        const {id,offer}=fetchedEntry;
        if(String(offer.publicationPublicId??publicationId)!==publicationId){reject("publication-mismatch");sampleReject("publication-mismatch",id);continue;}
        const title=String(offer.name??"").trim();
        const hasPlussaLabel=/\bplussa(?:-etu|-tarjous)?\b/i.test(title+" "+String(offer.description??""));
        const regular=numeric(offer.price),member=numeric(offer.membershipPrice),app=numeric(offer.appPrice);
        const price=app??member??regular??numeric(offer.fromPrice);
        const from=Date.parse(String(offer.validFrom??publication.validFrom??""));
        const until=Date.parse(String(offer.validUntil??publication.validUntil??""));
        if(!title){reject("missing-title");sampleReject("missing-title",id);continue;}
        if(price==null||price<=0){
          reject("missing-or-invalid-price");sampleReject("missing-or-invalid-price",id);
          const description=String(offer.description??"");
          const plussa=/plussa|k-plussa/i.test(title+" "+description);
          const discountMatch=description.match(/(?:-|−)\s*(\d{1,2})\s*%/);
          const discountPercent=discountMatch?Number(discountMatch[1]):null;
          if(plussa&&discountPercent!==null)unpricedCategories.plussaPercentage++;
          else if(plussa)unpricedCategories.plussaOther++;
          else if(discountPercent!==null)unpricedCategories.percentageOther++;
          else unpricedCategories.other++;
          if(unpricedOfferExamples.length<25)unpricedOfferExamples.push({id,title,unitPrice:offer.unitPrice??null,description:description.slice(0,160),plussa,discountPercent});
          if(Number.isFinite(from)&&Number.isFinite(until)&&from<=horizon&&until>=now&&entry.unpricedRows){
            entry.unpricedRows.push({id:"citymarket-discount-"+storeId+"-"+publicationId+"-"+id,title,name:title,productName:title,
              price:null,priceText:discountPercent!==null?(plussa?"Plussa-etu ":"")+"−"+discountPercent+" %":plussa?"Plussa-etu · hinta vaihtelee":"Tarjous · hinta ei tiedossa",
              discountPercent,hasVerifiedPrice:false,displayOnly:true,isPlussaOffer:plussa,
              additionalInfo:description,imageUrl:String(offer.imageLarge??offer.image??""),
              storeId,storeName:String(store.name),chain:"K",storeType:"K-Citymarket",provider:"kcitymarket-local-discount",offerId:id,
              validFrom:offer.validFrom??publication.validFrom,validUntil:offer.validUntil??publication.validUntil,
              sourceUrl:ORIGIN+"K-Citymarket/kaupat/"+encodeURIComponent(storeId),campaignType:"discount-only"});
          }
          continue;
        }
        if(!Number.isFinite(from)||!Number.isFinite(until)){reject("invalid-dates");sampleReject("invalid-dates",id);continue;}
        if(from>horizon){reject("future-outside-horizon");filteredByValidity++;sampleReject("future-outside-horizon",id);continue;}
        if(until<now){reject("expired");filteredByValidity++;sampleReject("expired",id);continue;}
        const qty=numeric(offer.pieceCountFrom);
        const quantity=qty!=null&&qty>1&&qty===numeric(offer.pieceCountTo)?qty:null;
        const unit=String(offer.baseUnit??"");
        const unitValue=numeric(offer.unitPrice);
        const offerKey=publicationId+":"+id;
        if(acceptedOfferKeys.has(offerKey)){duplicateOfferRows++;continue;}
        acceptedOfferKeys.add(offerKey);
        entry.rows.push({id:"citymarket-local-"+storeId+"-"+publicationId+"-"+id,title,name:title,productName:title,price,
          priceText:quantity ? price.toFixed(2).replace(".",",")+" € / "+quantity+" kpl" : price.toFixed(2).replace(".",",")+" €",
          previousPrice:regular!=null&&regular!==price?regular:null,
          unitPrice:unitValue==null?"":unitValue.toFixed(2).replace(".",",")+(unit?"/"+unit:""),
          imageUrl:String(offer.imageLarge??offer.image??""),
          storeId,storeName:String(store.name),storeLabel:String(store.name),chain:"K",storeType:"K-Citymarket",
          source:"K-Citymarket kauppakohtainen julkaisu",provider:"kcitymarket-local",offerId:id,
          additionalInfo:offer.description??null,benefitText:app!=null?"Mobiilitarjous":member!=null||hasPlussaLabel?"Plussa-tarjous":undefined,
          validFrom:offer.validFrom??publication.validFrom,validUntil:offer.validUntil??publication.validUntil,
          isPlussaOffer:member!=null||hasPlussaLabel,offerQuantity:quantity,
          sourceUrl:ORIGIN+"K-Citymarket/kaupat/"+encodeURIComponent(storeId),
          category:classifyCitymarketCategory(title),categoryPath:classifyCitymarketCategory(title),productGroup:classifyCitymarketCategory(title),mainCategory:classifyCitymarketCategory(title),campaignType:"campaign",debug:{publicationId,tjekStoreId:storeId,sourceScope:"SELECTED_STORE_PUBLICATION"}});
      }
      }
      entry.progress.accepted = entry.rows.length; entry.progress.updatedAt = new Date().toISOString();
      // A page may contain non-offer hotspots (links, images, navigation).
      // Do not mistake an empty offer-ID set for the end of pagination.
      if(hotspots.length===0)break;
      if(page===100)pageLimitReached=true;
    }
    completedPublications++;
  }
  if(pageLimitReached)throw new Error("Tjek publication exceeded the 100-page safety limit; results may be incomplete");
  if(failedOfferIds.size){
    entry.progress.error=`${failedOfferIds.size} Tjek offer detail requests failed`;
    throw new Error(entry.progress.error);
  }
  if(completedPublications!==uniquePublications.length)throw new Error(`Only ${completedPublications}/${uniquePublications.length} Tjek publications read`);
  entry.progress.accepted = entry.rows.length;
  console.info("[K-Citymarket] Tjek N183 offer coverage",JSON.stringify({storeName:selectedStoreName,storeId:entry.progress.storeId,publications:uniquePublications.length,pages:entry.progress.pages,discoveredOfferIds:entry.progress.offerIds,accepted:entry.rows.length,missingOfferDetails,duplicateOfferRows,filteredByValidity,rejectedReasons,rejectedSamples,unpricedCategories,unpricedOfferExamples}));
}


/** Optional national-publication photo index. Never imports Tjek prices or local campaigns. */
export type KCitymarketTjekImageDebug={fronts:number;publications:number;pages:number;offerIds:number;offersWithImage:number;uniqueImages:number;stage:string;error:string|null};
let nationalTjekImageDebug:KCitymarketTjekImageDebug={fronts:0,publications:0,pages:0,offerIds:0,offersWithImage:0,uniqueImages:0,stage:"not-started",error:null};
export function getKCitymarketNationalTjekImageDebug(){return {...nationalTjekImageDebug};}
export async function fetchKCitymarketNationalTjekImages(asOf=new Date()): Promise<Map<string,string>> {
  const stats:KCitymarketTjekImageDebug={fronts:0,publications:0,pages:0,offerIds:0,offersWithImage:0,uniqueImages:0,stage:"not-started",error:null};
  const images=new Map<string,string>();
  try {
    stats.stage="publication-discovery";
    // The fronts endpoint needs the same location context as the working store flow.
    // Discover a store solely to resolve publication geography; do not import its local campaigns.
    let fronts:unknown=[];
    try {
      const stores=asRows(await tjek("stores",{businessId:BUSINESS,pagination:{offset:0,limit:1000}}));
      const reference=stores.find(store=>store.coordinates && /citymarket/i.test(String(store.name??"")));
      if(reference)fronts=await tjek("fronts",{businessIds:[BUSINESS],coordinates:reference.coordinates});
    }catch(error){console.warn("[K-Citymarket] national Tjek fronts unavailable; trying public publication page",error);}
    stats.fronts=Array.isArray(fronts)?fronts.length:0;
    const now=asOf.getTime();
    const publications=(Array.isArray(fronts)?fronts:[]).flatMap(front =>
      front && typeof front==="object" && Array.isArray((front as Row).publications)
        ? (front as Row).publications as Row[] : [])
      .filter(p=>{const from=Date.parse(String(p.validFrom??"")),until=Date.parse(String(p.validUntil??""));
        return Number.isFinite(from)&&Number.isFinite(until)&&from<=now&&now<=until;});
    // The public Tjek business page embeds its current publication list. It is a
    // fallback when the geography-dependent fronts discovery misses national leaflets.
    {
      try{
        const page=await fetch(ORIGIN+"K-Citymarket",{cache:"no-store",signal:AbortSignal.timeout(12000)});
        if(page.ok){
          const html=(await page.text()).replace(/&quot;|&#34;|&#x22;/gi, '"' ).replace(/&amp;/g, "&");
          // Embedded JSON may contain whitespace or escaped quotation marks.
          const match=/"publications"\s*:\s*\[/.exec(html);
          if(match){
            const arrayStart=match.index+match[0].lastIndexOf("[");
            let depth=0,quoted=false,escaped=false,end=-1;
            for(let i=arrayStart;i<html.length;i++){
              const char=html[i];
              if(escaped){escaped=false;continue;}
              if(char==="\\"){if(quoted)escaped=true;continue;}
              if(char==='"'){quoted=!quoted;continue;}
              if(quoted)continue;
              if(char==='[')depth++;
              if(char===']'&&--depth===0){end=i+1;break;}
            }
            if(end>arrayStart){
              const embedded=JSON.parse(html.slice(arrayStart,end)) as Row[];
              for(const p of embedded){
                const from=Date.parse(String(p.validFrom??"")),until=Date.parse(String(p.validUntil??""));
                if(Number.isFinite(from)&&Number.isFinite(until)&&from<=now&&now<=until&&p.id&&!publications.some(existing=>existing.id===p.id))publications.unshift(p);
              }
            }
          }
        }
      }catch(error){console.warn("[K-Citymarket] public publication fallback unavailable",error);}
    }
    stats.publications=publications.length;
    stats.stage=publications.length?"reading-publications":"no-active-publications";
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
    stats.stage=stats.offerIds===0?"no-offer-hotspots":stats.offersWithImage===0?"no-offer-images":"matching-images";
    for(const [key,urls] of candidates)if(urls.size===1)images.set(key,[...urls][0]);
    stats.uniqueImages=images.size;
    if(images.size)stats.stage="image-index-ready";
    console.info("[K-Citymarket] national Tjek photo candidates",stats);
  }catch(error){stats.stage="failed";stats.error=error instanceof Error?error.message:String(error);console.warn("[K-Citymarket] optional national Tjek photo lookup unavailable",error);}
  nationalTjekImageDebug=stats;
  return images;
}

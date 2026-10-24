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
async function tjekOnce(name: string, params: Row): Promise<unknown> {
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
// Retry transient upstream timeouts in the collector, never on the user read path.
async function tjek(name: string, params: Row): Promise<unknown> {
  let failure: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await tjekOnce(name, params); } catch (error) { failure = error; }
  }
  throw failure;
}
type LocalProgress = { stage: string; storeName: string; storeId: string | null; publicationIds: string[]; pages: number; offerIds: number; accepted: number; error: string | null; updatedAt: string };
const localCache = new Map<string, { rows: Row[]; startedAt: number; finishedAt: number; running: boolean; progress: LocalProgress; promise?: Promise<void> }>();
const LOCAL_TTL = 15 * 60_000;
const FAILED_RETRY_TTL = 60 * 60_000;
const isActiveOffer = (row: Row, at = Date.now()) => {
  const from = Date.parse(String(row.validFrom ?? ""));
  const until = Date.parse(String(row.validUntil ?? ""));
  return Number.isFinite(from) && Number.isFinite(until) && from <= at && until >= at;
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
    const rows = await sql`SELECT offers, publication_ids, updated_at FROM public.ziiply_kcitymarket_tjek_snapshots WHERE (store_key = ${key} OR regexp_replace(lower(store_key), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(${key}), '[^a-z0-9]+', '', 'g')) ORDER BY CASE WHEN store_key = ${key} THEN 0 ELSE 1 END, updated_at DESC LIMIT 1`;
    if (!Array.isArray(rows[0]?.offers)) return null;
    const offers = rows[0].offers as Row[];
    localCache.set(key, { rows: offers, startedAt: 0, finishedAt: Date.now(), running: false,
      progress: { stage: "snapshot-ready", storeName: key, storeId: offers[0]?.storeId ? String(offers[0].storeId) : null,
        publicationIds: Array.isArray(rows[0].publication_ids) ? rows[0].publication_ids as string[] : [],
        pages: 0, offerIds: offers.length, accepted: offers.length, error: null, updatedAt: String(rows[0].updated_at || "") } });
    return offers;
  } catch (error) {
    console.warn("[K-Citymarket] snapshot read unavailable", error);
    return null;
  }
}
async function publishSnapshot(key: string, offers: Row[], publicationIds: string[]): Promise<void> {
  if (!process.env.DATABASE_URL) return;
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
export async function fetchKCitymarketSelectedStoreOffers(selectedStoreName: string): Promise<Row[]> {
  const key = normalize(selectedStoreName);
  const now = Date.now();
  // Every selected Citymarket reads its own K-Ruoka and Tjek snapshots.
  // Never special-case a city, store id or publication.
  const primary = (await readPublishedSnapshot("k ruoka " + key) ?? [])
    .filter(row => String((row.debug as Row | undefined)?.sourceScope ?? row.sourceScope ?? "") === "SELECTED_STORE_WEB_OFFERS"
      && normalize(row.storeName) === key
      && Date.parse(String(row.validFrom)) <= now && Date.parse(String(row.validUntil)) >= now);
  const fallback = (await readPublishedSnapshot(key) ?? [])
    .filter(row => normalize(row.storeName) === key
      && Date.parse(String(row.validFrom)) <= now && Date.parse(String(row.validUntil)) >= now);
  // Restore the original global live-Tjek recovery path for EVERY selected
  // Citymarket. Snapshots are a fast path, not a prerequisite for search.
  // A live scan is keyed by the normalized selected store name and verifies
  // the exact store against Tjek's own store list before accepting any offers.
  let entry = localCache.get(key);
  const shouldStart = !entry
    || (!entry.running && now - entry.finishedAt > (entry.progress.stage === "failed" ? FAILED_RETRY_TTL : LOCAL_TTL));
  if (shouldStart) {
    entry = {
      rows: [], startedAt: now, finishedAt: 0, running: true,
      progress: { stage: "starting", storeName: selectedStoreName, storeId: null,
        publicationIds: [], pages: 0, offerIds: 0, accepted: 0, error: null,
        updatedAt: new Date().toISOString() },
    };
    localCache.set(key, entry);
    const current = entry;
    current.promise = readKCitymarketSelectedStoreOffers(selectedStoreName, current)
      .then(() => { current.progress.stage = "complete"; })
      .catch(error => {
        current.progress.stage = "failed";
        current.progress.error = error instanceof Error ? error.message : String(error);
        console.warn("[K-Citymarket] live Tjek fallback failed", {
          storeName: selectedStoreName, progress: current.progress,
        });
      })
      .finally(() => {
        current.running = false;
        current.finishedAt = Date.now();
        current.progress.updatedAt = new Date().toISOString();
      });
  }
  if (entry && entry.running && entry.rows.length === 0) {
    // Do not hold up the offer search indefinitely; subsequent requests reuse
    // the progressive in-memory results while the complete scan continues.
    await Promise.race([
      entry.promise,
      new Promise<void>(resolve => setTimeout(resolve, 4000)),
    ]);
  }
  const live = (entry?.rows ?? []).filter(row => isActiveOffer(row, Date.now()));
  // Return verified rows from the exact selected store as soon as they have
  // been fetched. In serverless requests the process may end before a long
  // Tjek scan completes; suppressing these rows made every non-N183 store look
  // empty because its previous snapshot may not exist. The debug payload keeps
  // stage/pages/offerIds/running visible so partial coverage is never hidden.
  // A complete scan still wins; if no live rows arrived, use the last snapshot.
  const liveScanComplete = Boolean(entry && !entry.running && entry.progress.stage === "complete");
  const tjekRows = live.length ? live : fallback;
  if (entry && !liveScanComplete && live.length) {
    console.info("[K-Citymarket] serving verified progressive Tjek rows", JSON.stringify({
      storeName: selectedStoreName, storeId: entry.progress.storeId,
      stage: entry.progress.stage, pages: entry.progress.pages,
      offerIds: entry.progress.offerIds, accepted: live.length,
    }));
  }
  return [...primary, ...tjekRows].map(normalizeTjekPackagePrice);
}

/** Explicit background-job entry point. The interactive request never starts this. */
export async function refreshKCitymarketSelectedStoreSnapshot(selectedStoreName: string): Promise<Row[]> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing; cannot publish campaign snapshot");
  const key = normalize(selectedStoreName);
  // The Tjek refresher must never overwrite the verified K-Ruoka N183 feed.
  if (key.startsWith("k ruoka ")) throw new Error("Tjek refresh cannot write a K-Ruoka snapshot key");
  const entry = { rows: [] as Row[], startedAt: Date.now(), finishedAt: 0, running: true,
    progress: { stage: "starting", storeName: selectedStoreName, storeId: null, publicationIds: [] as string[], pages: 0, offerIds: 0, accepted: 0, error: null as string | null, updatedAt: new Date().toISOString() } };
  localCache.set(key, entry);
  try {
    await readKCitymarketSelectedStoreOffers(selectedStoreName, entry);
    if (!entry.progress.publicationIds.length || !entry.rows.length) {
      throw new Error("Tjek refresh returned no active campaign rows; previous snapshot preserved");
    }
    entry.rows = entry.rows.map(normalizeTjekPackagePrice);
    // Do not silently replace a richer, still-valid publication snapshot with a
    // suspiciously small result from the same publication set.
    // Read the prior snapshot without overwriting the live refresh progress in localCache.
    const sql = neon(process.env.DATABASE_URL);
    const previousRows = await sql`SELECT offers, publication_ids FROM public.ziiply_kcitymarket_tjek_snapshots WHERE store_key = ${key} AND valid_until > NOW() LIMIT 1`;
    const previous = Array.isArray(previousRows[0]?.offers) ? previousRows[0].offers as Row[] : null;
    const previousIds = Array.isArray(previousRows[0]?.publication_ids) ? previousRows[0].publication_ids as string[] : [];
    if (previous && previous.length >= 5 && entry.rows.length < Math.ceil(previous.length * 0.5)
      && previousIds.some(id => entry.progress.publicationIds.includes(id))) {
      throw new Error(`Tjek campaign coverage regression: ${entry.rows.length}/${previous.length} offers; previous snapshot preserved`);
    }
    await publishSnapshot(key, entry.rows, entry.progress.publicationIds);
    entry.progress.stage = "complete";
    return entry.rows;
  } catch (error) {
    entry.progress.stage = "failed";
    entry.progress.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    entry.running = false;
    entry.finishedAt = Date.now();
    entry.progress.updatedAt = new Date().toISOString();
  }
}
// Keep the already-deployed cron entry point compatible with the explicit collector.
export async function refreshKCitymarketCampaignCache(storeName: string) {
  const rows = await refreshKCitymarketSelectedStoreSnapshot(storeName);
  return { count: rows.length, pages: getKCitymarketLocalTjekDebug(storeName).pages };
}
async function readKCitymarketSelectedStoreOffers(selectedStoreName: string, entry: { rows: Row[]; progress: LocalProgress }): Promise<void> {
  const wanted=normalize(selectedStoreName);
  if (!wanted.includes("citymarket") || wanted.length < 13) { throw new Error("Invalid Citymarket store name"); }
  const stores=asRows(await tjek("stores",{businessId:BUSINESS,pagination:{offset:0,limit:1000}}));
  const matching=stores.filter(s => normalize(s.name)===wanted);
  // No substring fallback: never silently import another store's publication.
  if (matching.length!==1) { throw new Error("Tjek stores matching count: " + matching.length); }
  const store=matching[0], storeId=String(store.id??"");
  if (!storeId || !store.coordinates) { throw new Error("Tjek store location missing"); }
  entry.progress.storeId = storeId; entry.progress.stage = "discovering-publications";
  const fronts=await tjek("fronts",{businessIds:[BUSINESS],localBusinessIds:[storeId],coordinates:store.coordinates});
  if (!Array.isArray(fronts)) throw new Error("Invalid Tjek publication discovery response");
  const now=Date.now();
  const publications=(Array.isArray(fronts)?fronts:[]).flatMap(front => front && typeof front==="object" && Array.isArray((front as Row).publications) ? (front as Row).publications as Row[] : [])
    .filter((p, index, all) => all.findIndex(other => other.id === p.id) === index)
    .filter(p => {const from=Date.parse(String(p.validFrom??"")),until=Date.parse(String(p.validUntil??""));return Number.isFinite(from)&&Number.isFinite(until)&&from<=now&&now<=until;});
  if (!publications.length) {
    // The upstream Tjek fronts API may return an empty list even when the store
    // exists. Never present this as "0 campaigns" or publish an empty snapshot.
    const frontCount=fronts.length;
    const discovered=(fronts as Row[]).reduce((count,front)=>count+(Array.isArray(front.publications)?front.publications.length:0),0);
    const message=`Tjek ei palauttanut voimassa olevia kauppakohtaisia julkaisuja myymälälle ${String(store.name)} (storeId=${storeId}; fronts=${frontCount}; publications=${discovered}). Kaupan tarjousten määrää ei voitu vahvistaa. Aiempi tarjousaineisto säilytetään.`;
    entry.progress.stage = "source-unavailable";
    entry.progress.error = message;
    throw new Error(message);
  }
  entry.progress.publicationIds = publications.map(p => String(p.id ?? "")).filter(Boolean);
  entry.progress.stage = publications.length ? "reading-pages" : "no-active-publications";
  const failedOfferIds=new Set<string>();
  let completedPublications=0;
  let pageLimitReached=false;
  for(const publication of publications){
    const publicationId=String(publication.id??"");
    if(!publicationId)throw new Error("Tjek publication ID missing");
    const seen=new Set<string>();
    for(let page=1;page<=100;page++){
      let response: Response | undefined;
      let pageError: unknown;
      for (let attempt=0;attempt<3;attempt++) {
        try {
          response=await fetch("https://publication-viewer.tjek.com/api/paged-publications/"+encodeURIComponent(publicationId)+"/"+page,{cache:"no-store",headers:{Accept:"application/json"},signal:AbortSignal.timeout(12000)});
          if (response.status>=500 || response.status===429) throw new Error("Tjek page HTTP "+response.status);
          break;
        } catch (error) { pageError=error; response=undefined; }
      }
      if (!response) throw new Error(`Tjek publication ${publicationId} page ${page}: ${pageError instanceof Error ? pageError.message : String(pageError)}`, { cause: pageError });
      if(!response.ok){if(page>1&&(response.status===400||response.status===404))break;throw new Error("Tjek publication HTTP "+response.status);}
      const payload=await response.json() as Row;
      entry.progress.pages++;
      if (!Array.isArray(payload.hotspots)) throw new Error("Invalid Tjek page: hotspots missing");
      const hotspots=payload.hotspots;
      const ids=[...new Set(hotspots.map(h=>{ if(!h||typeof h!=="object")return ""; const hotspot=h as Row; const offer=hotspot.offer; return String(offer && typeof offer==="object" ? (offer as Row).id??"" : hotspot.offerId??hotspot.offerPublicId??""); }).filter(Boolean))];
      const missingIds=hotspots.filter(h=>!h||typeof h!=="object"||!((h as Row).offer && typeof (h as Row).offer==="object" && ((h as Row).offer as Row).id) && !(h as Row)?.offerId && !(h as Row)?.offerPublicId).length;
      console.info("[K-Citymarket] Tjek page coverage",{storeId,publicationId,page,hotspots:hotspots.length,uniqueOfferIds:ids.length,unrecognizedHotspots:missingIds});
      if(missingIds>0)console.warn("[K-Citymarket] Tjek hotspots without recognized offer ID",{publicationId,page,hotspots:hotspots.length,uniqueOfferIds:ids.length,unrecognizedHotspots:missingIds});
      const freshIds=ids.filter(id=>!seen.has(id));
      entry.progress.offerIds += freshIds.length;
      freshIds.forEach(id=>seen.add(id));
      for(let offset=0;offset<freshIds.length;offset+=24){
      const fetched=await Promise.all(freshIds.slice(offset,offset+24).map(async id=>{
        try {const result=await tjek("offer",{publicId:id});if(!result||typeof result!=="object"||Array.isArray(result))throw new Error("Invalid Tjek offer detail");return {id,offer:result as Row};}catch{failedOfferIds.add(id);return null;}
      }));
      for(const fetchedEntry of fetched){
        if(!fetchedEntry)continue;
        const {id,offer}=fetchedEntry;
        if(String(offer.publicationPublicId??publicationId)!==publicationId)continue;
        const title=String(offer.name??"").trim();
        const regular=numeric(offer.price),member=numeric(offer.membershipPrice),app=numeric(offer.appPrice);
        const price=app??member??regular??numeric(offer.fromPrice);
        const from=Date.parse(String(offer.validFrom??publication.validFrom??""));
        const until=Date.parse(String(offer.validUntil??publication.validUntil??""));
        if(!title||price==null||price<=0||!Number.isFinite(from)||!Number.isFinite(until)||from>now||until<now){ console.warn("[K-Citymarket] rejected Tjek offer", {publicationId,id,missingTitle:!title,invalidPrice:price==null||price<=0,invalidDates:!Number.isFinite(from)||!Number.isFinite(until),inactive:from>now||until<now}); continue; }
        const qty=numeric(offer.pieceCountFrom);
        const quantity=qty!=null&&qty>1&&qty===numeric(offer.pieceCountTo)?qty:null;
        const unit=String(offer.baseUnit??"");
        const unitValue=numeric(offer.unitPrice);
        entry.rows.push({id:"citymarket-local-"+storeId+"-"+publicationId+"-"+id,title,name:title,productName:title,price,
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
      console.info("[K-Citymarket] Tjek page parsed",{storeId,publicationId,page,acceptedTotal:entry.rows.length,offerIdsTotal:entry.progress.offerIds,failedOfferRequests:failedOfferIds.size});
      entry.progress.accepted = entry.rows.length; entry.progress.updatedAt = new Date().toISOString();
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
  if(completedPublications!==publications.length)throw new Error(`Only ${completedPublications}/${publications.length} Tjek publications read`);
  if(entry.progress.offerIds >= 5 && entry.rows.length < Math.ceil(entry.progress.offerIds / 2)) throw new Error(`Tjek campaign scan incomplete: accepted ${entry.rows.length} of ${entry.progress.offerIds} offer IDs; previous snapshot preserved`);
  entry.progress.accepted = entry.rows.length;
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

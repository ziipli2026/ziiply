import { desktopSearchQueries, desktopSearchDecision, withDesktopCatalogEvidence, searchWords } from "./desktopNormalRelevance";
import { fetchNormalSearchCatalog, selectNormalSearchCatalog } from "./normalSearchCatalog";
import { finalizeNormalSearchResults, normalizeEan, readSearchProducts } from "../ziiplyCore";

export type NormalSearchStore = { chain: "S" | "K" | "LIDL" | "TOKMANNI" | "SPAR"; id: string | number; name: string; city?: string; address?: string; type?: "local" | "hyper" };
type Observer = (stage: string, data: Record<string, unknown>) => void;

function storeUrl(store: NormalSearchStore, intent: string) {
  if (store.chain === "LIDL") {
    const params = new URLSearchParams({ mode: "research", storeName: store.name, city: store.city ?? "" });
    if (store.address) params.set("address", store.address);
    return `/api/lidl/products?${params}`;
  }
  if (store.chain === "SPAR" || store.chain === "TOKMANNI") {
    return `/api/tokmanni/products?${new URLSearchParams({ intent })}`;
  }
  const params = new URLSearchParams({ store: String(store.id) });
  if (store.chain === "S") {
    params.set("storeName", store.name);
    params.set("storeType", store.type ?? "hyper");
  }
  return `/api/${store.chain === "S" ? "s" : "k"}-products?${params}`;
}

function readStorePrice(item: any) {
  return Number(item?.price ?? item?.storeItems?.[0]?.price ?? item?.storeItem?.price ??
    item?.pricing?.price ?? item?.currentPrice ?? 0);
}

function shapeStoreRow(x: any, store: NormalSearchStore, source: string | undefined) {
  const rawPrice=readStorePrice(x);
  const responseSource=x.__providerSource||source;
  const priceIsEuros=x.priceAmountUnit === "eur" || (x.priceAmountUnit !== "cent" && store.chain==="S" && responseSource==="s-kaupat-normal-v220");
  const euro=Number.isFinite(rawPrice)&&rawPrice>0?(priceIsEuros?rawPrice:rawPrice/100):null;
  const product={...x,name:String(x.name||x.title||x.productName||""),__chain:store.chain,__store:store.chain === "SPAR" || store.chain === "TOKMANNI" ? "Tokmanni / SPAR verkkovalikoima" : store.name,__price:euro,__priceSource:responseSource||""};
  return {product, rawPrice, priceIsEuros, euro};
}

function rankStoreRows(query: string, rows: any[]) {
  return finalizeNormalSearchResults(
    query,
    rows,
    product => product.__price ?? Number.POSITIVE_INFINITY,
    product => product.ean || product.barcode || product.product?.ean,
    product => `${String(product.name || "").toLocaleLowerCase("fi")}:${String(product.__store || "")}`,
  );
}

// Shared UI cache policy for mobile and desktop: show a recent snapshot immediately,
// but always revalidate against the selected stores before committing final results.
// Cache never supplies prices to the basket comparison or the provider ranking.
const LIVE_SEARCH_CACHE_KEY = "ziiply-shared-normal-store-search-v1";
const LIVE_SEARCH_CACHE_TTL_MS = 20 * 60 * 1000;
const LIVE_SEARCH_CACHE_LIMIT = 24;
type CachedSearch = { key: string; savedAt: number; rows: any[] };
function searchCacheIdentity(query: string, stores: NormalSearchStore[]) {
  return JSON.stringify([query.trim().normalize("NFKC").toLocaleLowerCase("fi"),
    stores.map(store => [store.chain, String(store.id), store.name, store.city ?? "", store.address ?? "", store.type ?? ""]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]);
}
function readCachedSearch(key: string): any[] {
  if (typeof window === "undefined") return [];
  try {
    const data = JSON.parse(window.sessionStorage.getItem(LIVE_SEARCH_CACHE_KEY) || "[]") as CachedSearch[];
    const hit = Array.isArray(data) ? data.find(entry => entry.key === key && Date.now() - entry.savedAt >= 0 && Date.now() - entry.savedAt < LIVE_SEARCH_CACHE_TTL_MS) : null;
    return hit && Array.isArray(hit.rows) ? hit.rows.filter(row => Number(row.__price) > 0 && row.priceVerified !== false) : [];
  } catch { return []; }
}
function rememberCachedSearch(key: string, rows: any[]) {
  if (typeof window === "undefined" || !rows.length) return;
  try {
    const old = JSON.parse(window.sessionStorage.getItem(LIVE_SEARCH_CACHE_KEY) || "[]") as CachedSearch[];
    const entries = (Array.isArray(old) ? old : []).filter(entry => entry.key !== key && Date.now() - entry.savedAt < LIVE_SEARCH_CACHE_TTL_MS);
    entries.unshift({ key, savedAt: Date.now(), rows });
    window.sessionStorage.setItem(LIVE_SEARCH_CACHE_KEY, JSON.stringify(entries.slice(0, LIVE_SEARCH_CACHE_LIMIT)));
  } catch { /* Storage can be disabled or full; live search still works. */ }
}

export async function searchNormalStores(query: string, stores: NormalSearchStore[], options: {
  signal?: AbortSignal;
  observe?: Observer;
  trace?: Observer;
  onInitialRows?: (rows: any[]) => void;
  onCachedRows?: (rows: any[]) => void;
} = {}) {
  const {signal, observe} = options;
  const cacheKey = searchCacheIdentity(query, stores);
  if (options.onCachedRows && !signal?.aborted) {
    const cached = readCachedSearch(cacheKey);
    if (cached.length) options.onCachedRows(cached);
  }
  const report: Observer = (stage, data) => observe?.(stage, data);
  const trace: Observer = (stage, data) => options.trace?.(stage, data);
  let initialRowsPublished = false;
  async function fetchSearchData(url: string, exactQueries?: string[], initialStore?: NormalSearchStore) {
    const queries = exactQueries || desktopSearchQueries(query);
    let lastData: any = null;
    const collected:any[]=[];
    const requestErrors:string[]=[];
    for (const searchQuery of queries.length ? queries : [query]) {
      if(signal?.aborted)throw new Error("Debug-haun aikaraja tai uusi haku keskeytti pyynnön.");
      const params = new URLSearchParams(url.split("?")[1]);
      params.set("search", searchQuery);
      const requestUrl=url.split("?")[0]+"?"+params.toString();
      report("request",{requestUrl,searchQuery});
      const requestStarted=performance.now();
      try {
      const response = await fetch(requestUrl, { cache: "no-store", signal });
      trace("provider_http",{requestUrl,status:response.status,durationMs:Math.round(performance.now()-requestStarted)});
      report("http",{requestUrl,status:response.status,durationMs:Math.round(performance.now()-requestStarted),contentType:response.headers.get("content-type"),vercelId:response.headers.get("x-vercel-id"),vercelCache:response.headers.get("x-vercel-cache")});
      if (!response.ok) throw new Error(`Kauppahaku epäonnistui (HTTP ${response.status}).`);
      const data = await response.json();
      lastData = data;
      const items = readSearchProducts(data) as any[];
      trace("provider_response",{requestUrl,source:data?.source,status:data?.status,error:data?.error,count:items.length,products:items.slice(0,120)});
      report("response",{requestUrl,rawCount:items.length,source:data?.source,apiStatus:data?.status,error:data?.error});
      const usable=items.some((product:any)=>desktopSearchDecision(query,product).accepted);
      if(observe)report("qualification",{requestUrl,usable,acceptedCount:items.filter((product:any)=>desktopSearchDecision(query,product).accepted).length});
      // Qualification is repeated after Neon has supplied compatible name evidence.
      collected.push(...items.map((item:any)=>({...item,__providerSource:data?.source})));
      if (options.onInitialRows && !initialRowsPublished && !signal?.aborted &&
          (initialStore?.chain === "S" || initialStore?.chain === "K")) {
        const initialRows = items
          .map(item => shapeStoreRow(item, initialStore, data?.source).product)
          .filter(product => product.__price > 0 && product.priceVerified !== false &&
            desktopSearchDecision(query, product).accepted);
        const ranked = rankStoreRows(query, initialRows).slice(0, 100);
        if (ranked.length) {
          initialRowsPublished = true;
          options.onInitialRows(ranked);
        }
      }
      } catch(error) { if(signal?.aborted)throw error; requestErrors.push(String(error)); report("provider_variant_error",{requestUrl,error:String(error)}); }
    }
    if(!lastData && requestErrors.length)throw new Error(requestErrors.join("; "));
    return collected.length ? {...lastData,products:collected,variantErrors:requestErrors} : lastData;
  }
  // Start catalog lookup concurrently with the existing selected-store providers.
  // The catalog never supplies a store price or modifies recipe/offer engines.
  // All four chain families share the same EAN-first catalog evidence.
  // Catalog rows remain unpriced; only selected-store providers can supply verified prices.
  const neonPromise = stores.length > 0 ? fetchNormalSearchCatalog(query, signal) : Promise.resolve([]);
  const calls = stores.map(store => fetchSearchData(storeUrl(store, query), undefined, store).then(data => ({chain:store.chain,store,data})));
  const settledPromise=Promise.allSettled(calls);
  const neonRaw = await neonPromise;
  trace("neon_response",{count:neonRaw.length,products:neonRaw.slice(0,100)});
  const neonRows = selectNormalSearchCatalog(query, neonRaw)
    .slice(0,50)
    .map((x:any)=>({...x,__chain:"Neon",__store:"Tuoteluettelo",__price:null,__priceSource:"neon-catalog-unpriced"}));
  // The final result still waits for all selected stores and catalog enrichment.
  const settled=await settledPromise;
  const batches=settled.filter((x):x is PromiseFulfilledResult<any>=>x.status==="fulfilled").map(x=>x.value);
  const failures=settled.filter(x=>x.status==="rejected").map(x=>String(x.reason));
  if(!batches.length && failures.length)throw new Error(failures.join("; "));
  report("providers_settled",{failures,providers:batches.map(b=>({chain:b.chain,store:b.store?.name,error:b.data?.error}))});
  const catalogByEan=new Map<string,any>(neonRows.map((item:any)=>[normalizeEan(item.ean),item]));
  const withEvidence=(item:any)=>withDesktopCatalogEvidence(item,catalogByEan.get(normalizeEan(item.ean || item.barcode || item.product?.ean)));
  const itemsOf=(data:any):any[]=>readSearchProducts(data) as any[];
  // A named product may be indexed under a shorter current shop name.
  // Try at most two observed identities. Abbreviated brand punctuation
  // can hide one EAN even when a different product already has a quote.
  if(searchWords(query).length>=1 && neonRows.length>0){
    // Also recover missing catalog EANs for single-word searches such as maito.
    // Shop search can distinguish punctuation such as pesty/mullattu.
    // Only skip identities actually requested, not word-equivalent names.
    const lookupKey=(name:string)=>name.normalize('NFKC').toLocaleLowerCase('fi-FI').trim().replace(/\s+/g,' ');
    const tried=new Set(desktopSearchQueries(query).map(lookupKey));
    const fallbackNames=[...new Set<string>(neonRows.map((item:any)=>String(item.name || '')).filter(Boolean))]
      .filter(name=>!tried.has(lookupKey(name)));
    await Promise.all(batches.filter(batch => batch.chain === "S" || batch.chain === "K").map(async batch=>{
      const priced=itemsOf(batch.data).filter(item=>{
        const price=readStorePrice(item);
        return Number.isFinite(price)&&price>0&&desktopSearchDecision(query,withEvidence(item)).accepted;
      });
      const pricedEans=new Set(priced.map(item=>normalizeEan(item.ean)).filter(Boolean));
      const queryWords=' '+searchWords(query).join(' ')+' ';
      const brandLookups=[...new Set<string>(neonRows.filter((item:any)=>!pricedEans.has(normalizeEan(item.ean))).map((item:any)=>String(item.brand||'')).filter((brand:string)=>
        /\./.test(brand) && searchWords(brand).length>=2 && queryWords.includes(' '+searchWords(brand).join(' ')+' ')
      ))];
      const missingCatalogNames=neonRows.filter((item:any)=>!pricedEans.has(normalizeEan(item.ean)))
        .flatMap((item:any)=>[String(item.name||''),...(Array.isArray(item.aliases)?item.aliases.filter((alias:unknown)=>typeof alias==='string').map(String):[])])
        .filter(Boolean);
      // Recover missing EAN quotes even when another matching product is already priced.
      // Otherwise Jozo salt and Salonen bread can be silently omitted from the visible results.
      const lookupNames=[...neonRows.filter((item:any)=>!pricedEans.has(normalizeEan(item.ean)) && desktopSearchDecision(query,item).accepted).flatMap((item:any)=>[String(item.name||''),...(Array.isArray(item.aliases)?item.aliases:[])]),...missingCatalogNames,...brandLookups,...fallbackNames].filter((name,index,array)=>!tried.has(lookupKey(name)) && array.indexOf(name)===index).slice(0,3);
      if(!lookupNames.length)return;
      const store=batch.store;
      const url=storeUrl(store, query);
      try{
        report('catalog_name_lookup',{chain:batch.chain,store:store.name,names:lookupNames});
        const recovered=await fetchSearchData(url,lookupNames);
        // Name-based catalog lookups can return similarly named but
        // different-EAN products. Only recover identities actually
        // present in the Neon catalog; the primary store search above
        // remains free to return other relevant priced products.
        const missingEans=new Set(neonRows.map((item:any)=>normalizeEan(item.ean)).filter(Boolean));
        const matchingCatalogQuotes=itemsOf(recovered).filter(item=>{
          const ean=normalizeEan(item.ean||item.barcode||item.product?.ean);
          const price=readStorePrice(item);
          return missingEans.has(ean) && Number.isFinite(price) && price>0;
        });
        batch.data={...batch.data,products:[...itemsOf(batch.data),...matchingCatalogQuotes]};
      }catch(error){failures.push(String(error));report('catalog_name_lookup_error',{chain:batch.chain,error:String(error)});}
    }));
  }
  const rows:any[]=[];
  const research = new Map<string, any>();
  const productDecisions:any[]=[];
  for(const batch of batches){
    const items=readSearchProducts(batch.data) as any[];
    for(const x of items){
      if (batch.chain === "LIDL") {
        // Public research identifies products, not their local prices.
        // A future store-specific Lidl quote may be included only with
        // explicit verification and a matching, nonempty store identifier.
        const verifiedLocalPrice = x.priceVerified === true
          && x.priceScope === "local_store"
          && String(x.priceStoreId ?? "").trim().length > 0
          && String(batch.store.id ?? "").trim().length > 0
          && String(x.priceStoreId) === String(batch.store.id);
        if (!verifiedLocalPrice) {
          if (x.source === "lidl.fi-public-research" && x.priceVerified === false &&
              x.name && desktopSearchDecision(query, x).accepted) {
            const key = String(x.id ?? x.name);
            if (!research.has(key)) research.set(key, {
              ...x, ean: "", price: null, storeItems: [], __price: null,
              __chain: "LIDL", __store: "Lidlin julkinen tuoteluettelo",
            });
          }
          continue;
        }
      }
      const {product: baseProduct, rawPrice, priceIsEuros, euro}=shapeStoreRow(x,batch.store,batch.data?.source);
      const product=withEvidence(baseProduct);
      const normalRejected=!desktopSearchDecision(query,product).accepted;
      // Tokmanni's web catalog does not prove the price or availability at a
      // selected local EUROSPAR/Tokmanni store. Keep its products as catalog
      // evidence, but do not use web prices in a local cheapest-basket quote.
      const localPriceVerified = !["SPAR", "TOKMANNI", "LIDL"].includes(batch.chain)
        || (x.priceVerified === true && x.priceScope === "local_store"
          && String(x.priceStoreId ?? "").trim().length > 0
          && String(batch.store.id ?? "").trim().length > 0
          && String(x.priceStoreId) === String(batch.store.id));
      const included=!normalRejected && euro!==null && x.priceVerified!==false && localPriceVerified;
      productDecisions.push({product,rawPrice,priceIsEuros,displayPrice:euro,priceConversion:priceIsEuros?"euros_unchanged":"cents_divided_by_100",included,normalRejected,normalGateApplied:true});
      if(included)rows.push(product);
    }
  }
  // Aggregate diagnostic only: no product names, EANs, or raw provider payloads.
  // This identifies whether empty results arise from relevance, price, or
  // local-store verification, without altering the normal search result set.
  const decisionSummary = {
    query,
    providerRows: productDecisions.length,
    accepted: productDecisions.filter(d => d.included).length,
    rejectedByRelevance: productDecisions.filter(d => d.normalRejected).length,
    missingOrInvalidPrice: productDecisions.filter(d => !d.normalRejected && d.displayPrice === null).length,
    explicitlyUnverifiedPrice: productDecisions.filter(d => !d.normalRejected && d.displayPrice !== null && d.product.priceVerified === false).length,
    rejectedByOtherPriceGate: productDecisions.filter(d => !d.normalRejected && d.displayPrice !== null && d.product.priceVerified !== false && !d.included).length,
    perChain: Object.fromEntries([...new Set(productDecisions.map(d => String(d.product.__chain)))].map(chain => {
      const decisions = productDecisions.filter(d => String(d.product.__chain) === chain);
      return [chain, {total: decisions.length, accepted: decisions.filter(d => d.included).length,
        relevanceRejected: decisions.filter(d => d.normalRejected).length,
        priceRejected: decisions.filter(d => !d.normalRejected && !d.included).length}];
    })),
  };
  if (typeof window !== "undefined" && window.sessionStorage.getItem("ziiply-normal-search-diagnostic") === "1") console.info("[normal-search-decision-summary]", JSON.stringify(decisionSummary));
  report("decision_summary", decisionSummary);
  trace("decision_summary", decisionSummary);
  const rankedRows = rankStoreRows(query, rows);
  // Lidl public research and Neon catalog identities are useful for matching,
  // but neither establishes a current store price. Never show them as priced results.
  const sortedRows = rankedRows.slice(0, 100);
  if (!signal?.aborted && failures.length === 0) rememberCachedSearch(cacheKey, sortedRows);
  trace("lidl_catalog_research", {researchCount:research.size, catalogCount:neonRows.length, pricedLidlCount:rows.filter(row=>row.__chain==="LIDL").length});

  return {sortedRows, rankedRows, failures, batches, rows, productDecisions};
}

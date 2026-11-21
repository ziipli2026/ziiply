import { desktopSearchQueries, desktopSearchDecision, withDesktopCatalogEvidence, searchWords } from "./desktopNormalRelevance";
import { fetchNormalSearchCatalog, selectNormalSearchCatalog } from "./normalSearchCatalog";
import { comparePricedSearchResults, normalizeEan, readSearchProducts } from "../ziiplyCore";

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
  // Relevance is already checked upstream; the legacy second ranking gate
  // incorrectly removed valid paprika, salaatti and appelsiini products.
  const seen = new Set<string>();
  return rows
    .filter(product => Number.isFinite(product.__price) && product.__price > 0
      && desktopSearchDecision(query, product).accepted)
    .sort((a, b) => comparePricedSearchResults(a, b, product => product.__price))
    .filter(product => {
      const ean = normalizeEan(product.ean || product.barcode || product.product?.ean);
      const key = /^(?:\d{8}|\d{12,14})$/.test(ean)
        ? `ean:${ean}`
        : `fallback:${String(product.name || "").toLocaleLowerCase("fi")}:${String(product.__store || "")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export async function searchNormalStores(query: string, stores: NormalSearchStore[], options: {
  signal?: AbortSignal;
  observe?: Observer;
  trace?: Observer;
  onInitialRows?: (rows: any[]) => void;
} = {}) {
  const {signal, observe} = options;
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
  const neonPromise = stores.some(store => store.chain === "S" || store.chain === "K") ? fetchNormalSearchCatalog(query, signal) : Promise.resolve([]);
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
      const lookupNames=[...neonRows.filter((item:any)=>!pricedEans.has(normalizeEan(item.ean)) && desktopSearchDecision(query,item).accepted).flatMap((item:any)=>[String(item.name||''),...(Array.isArray(item.aliases)?item.aliases:[])]),...missingCatalogNames,...brandLookups,...fallbackNames].filter((name,index,array)=>!tried.has(lookupKey(name)) && array.indexOf(name)===index)
         .sort((a,b)=>lookupKey(a).localeCompare(lookupKey(b),'fi-FI')).slice(0,3);
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
      const {product: baseProduct, rawPrice, priceIsEuros, euro}=shapeStoreRow(x,batch.store,batch.data?.source);
      const product=withEvidence(baseProduct);
      const normalRejected=!desktopSearchDecision(query,product).accepted;
      const included=!normalRejected;
      productDecisions.push({product,rawPrice,priceIsEuros,displayPrice:euro,priceConversion:priceIsEuros?"euros_unchanged":"cents_divided_by_100",included,normalRejected,normalGateApplied:true});
      if(included)rows.push(product);
    }
  }
  const rankedRows = rankStoreRows(query, rows);
  // Scoped diagnostic: distinguish source absence from relevance, price and
  // EAN-deduplication losses without changing the returned search results.
  if (['mansikka', 'mustikka', 'suklaa', 'makkara', 'kala', 'muro', 'vadelma'].includes(query.toLocaleLowerCase('fi-FI'))) {
    const targetEans = new Set(['6417801801004', '6411020008015', '6407800000980', '6410405181091', '4010168056678', '8445292269520']);
    const tracked = rows.filter(item => targetEans.has(normalizeEan(item.ean || item.barcode || item.product?.ean)));
    trace('target_ean_final_decision', {
      query, inputCount:rows.length, rankedCount:rankedRows.length,
      catalogCount:neonRaw.length, catalogAcceptedCount:neonRows.length,
      tracked:tracked.map(item=>({
        ean:normalizeEan(item.ean || item.barcode || item.product?.ean),
        name:item.name, chain:item.__chain, store:item.__store,
        price:item.__price, accepted:desktopSearchDecision(query,item).accepted,
        inRanked:rankedRows.some(row=>normalizeEan(row.ean || row.barcode || row.product?.ean)===normalizeEan(item.ean || item.barcode || item.product?.ean))
      }))
    });
  }
  const sortedRows = [...rankedRows, ...research.values()].slice(0, 100);

  return {sortedRows, rankedRows, failures, batches, rows, productDecisions};
}

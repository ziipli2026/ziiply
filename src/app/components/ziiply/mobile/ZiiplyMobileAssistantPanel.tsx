"use client";
import { gostaWatchUrl } from "./gostaWatchLocation";
import { fetchSharedGostaWatch } from "./gostaWatchSharedRequest";
import { matchesGostaWatch } from "./gostaWatchMatch";
import JustiinaRecipeEditor from "../justiina/JustiinaRecipeEditor";
import type { RecipeIngredient } from "../justiina/recipeCore";
import JustiinaOnlineRecipes from "../justiina/JustiinaOnlineRecipes";
import ArvoSettingsPanel from "../ArvoSettingsPanel";

import React from "react";
import { searchZiiplyGostaOffersV146 } from "../offerSearch/ziiplyOfferSearchCore";
import type { ZiiplyAssistantKey } from "./ZiiplyMobileAssistantButton";

export type ZiiplyMobileAssistantPanelProps = {
  activeAssistant: ZiiplyAssistantKey | null;
  onClose: () => void;
  onSearchIngredients?: (terms: string[], items?: RecipeIngredient[]) => void;
  selectedChains?: Record<"s"|"k"|"lidl"|"tokmanni",boolean>;
  onChangeChain?: (chain: "s"|"k"|"lidl"|"tokmanni", enabled:boolean) => void;
  locationLabel?: string;
  onOpenStoreSettings?: () => void;
  onAddWatchOfferToCart?: (product: {name:string;title:string;price:number;priceAmountUnit:"eur";storeName:string;source:string;imageUrl?:string;packageSize?:string;chain?:string;isWeightedProduct?:boolean;ziiplyPricePendingWeight?:boolean;comparisonPriceText?:string;priceBasis?:string}) => boolean;
};

function watchStoreLabel(store: string, chain = ""): string {
  const name = String(store || "Kauppa")
    .replace(/\s*[·|–-]\s*(?:lidl-fi|etarjouslehdet|e-tarjouslehdet)\s*$/i, "")
    .replace(/\s*\((?:lidl-fi|etarjouslehdet|e-tarjouslehdet)\)\s*$/i, "")
    .trim();
  if (/^(?:Hyvinkää|Järvenpää|Tuusula|Helsinki|Espoo|Vantaa|Lahti|Tampere|Turku)\s*-\s*[^-]+$/i.test(name) && (chain.toUpperCase() === "LIDL" || /keskusta/i.test(name))) return "Lidl " + name;
  return name;
}

function watchPackageSize(offer: {title:string;packageSize?:string;unit?:string}): string {
  const explicit=String(offer.packageSize||"").trim();
  if (explicit && /\d/.test(explicit)) return explicit;
  // Lidl and other leaflet feeds may include the size only in the product title.
  // Extract an actual printed measurement, never infer a missing package size.
  const title=String(offer.title||"");
  const matches=[...title.matchAll(/\b(?:\d+\s*[x×]\s*)?\d+(?:[,.]\d+)?\s*(?:kg|g|ml|cl|dl|l|kpl|pkt|pss)\b/gi)];
  return matches.length ? matches[matches.length-1][0].replace(/\s+/g," ").trim() : "";
}

const assistantContent: Record<
  ZiiplyAssistantKey,
  {
    name: string;
    title: string;
    imageSrc: string;
    body: string;
  }
> = {
  justiina: {
    name: "Justiina",
    title: "Reseptit ja ruokaideat",
    imageSrc: "/assistants/justiina.png",
    body: "Tähän tulee reseptihaku, ateriavinkit ja korin perusteella ehdotetut ruuat.",
  },
  gosta: {
    name: "Gösta",
    title: "Tarjoukset ja hintatiedot",
    imageSrc: "/assistants/gosta.png",
    body: "Tähän tulee tarjoukset, hintahavainnot, säästövinkit ja tarjousvahdit.",
  },
  arvo: {
    name: "Arvo",
    title: "Arvon asetukset",
    imageSrc: "/assistants/arvo.png",
    body: "Tähän tulee omat parametrit: ruokavaliot, suosikit, kaupat, sijainti ja muut pysyvät valinnat.",
  },
};

export default function ZiiplyMobileAssistantPanel({
  activeAssistant,
  onClose,
  onSearchIngredients,
  selectedChains,
  onChangeChain,
  locationLabel,
  onOpenStoreSettings,
  onAddWatchOfferToCart,
}: ZiiplyMobileAssistantPanelProps) {
  const shareWatchOffer = async (offer: {title:string;price:string;store:string}) => {
    const price = offer.price ? (offer.price.includes("€") ? offer.price : offer.price + " €") : "";
    const text = [offer.title, price, watchStoreLabel(offer.store)].filter(Boolean).join(" · ");
    try {
      if (navigator.share) await navigator.share({title:offer.title,text});
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setWatchNotice("Tarjouksen tiedot kopioitu.");
      } else setWatchNotice("Jakaminen ei ole käytettävissä tässä selaimessa.");
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") setWatchNotice("Tarjouksen jakaminen epäonnistui.");
    }
  };
  const [watchQuery, setWatchQuery] = React.useState("");
  const [showWatchNotebook,setShowWatchNotebook]=React.useState(false);
  const [watchFilter,setWatchFilter]=React.useState<string|null>(null);
  const [savedWatches, setSavedWatches] = React.useState<string[]>(()=>{
    if(typeof window==="undefined")return [];
    try{const saved=JSON.parse(window.localStorage.getItem("ziiply-gosta-offer-watches-v1")||"[]");return Array.isArray(saved)?saved.filter((x:unknown):x is string=>typeof x==="string").slice(0,30):[];}catch{return [];}
  });
  const [watchNotice, setWatchNotice] = React.useState("");
  const [watchOffers,setWatchOffers]=React.useState<Array<{query:string;title:string;price:string;store:string;source:string;chain?:string;packageSize?:string;unit?:string;imageUrl?:string;validUntil?:string;comparisonPrice?:string;priceBasis?:string}>>(()=>{
    if(typeof window==="undefined")return [];
    try{const snapshot=JSON.parse(window.localStorage.getItem("ziiply-gosta-watch-results-v1")||"null");const watches=JSON.parse(window.localStorage.getItem("ziiply-gosta-offer-watches-v1")||"[]");const key=Array.isArray(watches)?watches.map((q:unknown)=>String(q).trim().toLocaleLowerCase("fi")).filter(Boolean).join("|"):"";return snapshot?.key===key&&Array.isArray(snapshot.offers)?snapshot.offers.filter((o:any)=>!o.validUntil||Date.parse(o.validUntil+"T23:59:59")>=Date.now()):[];}catch{return [];}
  });
  const [watchLoading,setWatchLoading]=React.useState(false);
  const [watchChecked,setWatchChecked]=React.useState(false);
  const [watchError,setWatchError]=React.useState("");
  const [watchRefresh,setWatchRefresh]=React.useState(0);
  const watchLastAutoScan=React.useRef(0);

  const [watchDebug,setWatchDebug]=React.useState("Ei tarkistusta vielä");
  const [watchRawDebug,setWatchRawDebug]=React.useState("Raakaa API-tarkistusta ei ole tehty");
  const [watchRawLoading,setWatchRawLoading]=React.useState(false);
  const runRawWatchDebug=async()=>{
    setWatchRawLoading(true);
    const terms=watchKey?watchKey.split("|"):["kahvi","limsa"];
    const started=Date.now();
    try{
      const {response,data}=await fetchSharedGostaWatch(await gostaWatchUrl(terms));
      const diagnostic=(data?.diagnostic??{}) as {inspected?:number;sources?:unknown[];nearby?:unknown[]};
      const offers=Array.isArray(data?.results)?data.results:[];
      const counts=Object.fromEntries(terms.map(q=>[q,offers.filter((offer:any)=>(Array.isArray(offer.watchQueries)?offer.watchQueries:[]).some((w:string)=>w.toLocaleLowerCase("fi")===q.toLocaleLowerCase("fi"))).length]));
      if(response.ok&&data?.ok&&Array.isArray(data.results)){
        // The API has already deduplicated offers by their product identity.
        // Never collapse distinct API offers by identical display title and price.
        const matched=offers.map((offer:any)=>({
          query:String((Array.isArray(offer.watchQueries)&&offer.watchQueries.length?offer.watchQueries:terms.filter(query=>matchesGostaWatch(query,offer)))[0]||""),
          title:String(offer.title||offer.name||offer.productName||"Tarjous"),
          price:String(offer.offerPrice??offer.price??""),
          store:String(offer.storeName||offer.chain||""),
          source:String(offer.source||offer.sourceType||offer.chain||""),
          chain:String(offer.chain||""),
          packageSize:String(offer.packageSize||offer.packSize||offer.size||offer.quantityText||offer.packageText||offer.packageSizeText||offer.packagingSize||""),
          imageUrl:String(offer.imageUrl||offer.pictureUrl||offer.image||""),
          unit:String(offer.unit||""),
          validUntil:String(offer.validUntil||""),
          comparisonPrice:String(offer.comparisonPriceText||offer.unitPrice||offer.comparisonPrice||""),
          priceBasis:String(offer.priceBasis||"")
        }));
        // Debug must obey the same snapshot rules as automatic refresh.
        if(!data.partial&&matched.length>0&&watchKey){setWatchOffers(matched);setWatchChecked(true);}
        if(!data.partial&&matched.length>0&&watchKey){try{window.localStorage.setItem("ziiply-gosta-watch-results-v1",JSON.stringify({key:watchKey,offers:matched,debug:"Tarkistettu "+new Date().toLocaleTimeString("fi-FI"),at:Date.now()}));window.dispatchEvent(new Event("ziiply-gosta-watch-results-changed"));}catch{}}
      }
      setWatchRawDebug("Tarjousvahdin oikea hakureitti | HTTP "+response.status+" | "+(Date.now()-started)+"ms | ok="+String(data?.ok)+" | osumia="+offers.length+" | hakusanakohtaiset="+JSON.stringify(counts)+" | tarkistettu="+String(diagnostic.inspected??"?")+" | lähteet="+JSON.stringify(diagnostic.sources||[])+" | lähikaupat="+JSON.stringify(diagnostic.nearby||[])+" | virhe="+String(data?.error||"ei")+" | esimerkki="+JSON.stringify(offers.slice(0,4)).slice(0,1200));
    }catch(error){setWatchRawDebug("Tarjousvahdin DEBUG-virhe: "+String(error));}
    finally{setWatchRawLoading(false);}
  };
  const watchKey=savedWatches.map(q=>q.trim().toLocaleLowerCase("fi")).filter(Boolean).join("|");
  React.useEffect(()=>{
    // Restore the latest successful scan when this panel is remounted.
    try {
      const cached=JSON.parse(window.localStorage.getItem("ziiply-gosta-watch-results-v1")||"null");
      if(cached?.key===watchKey&&Array.isArray(cached.offers)){
        // Show recent confirmed offers immediately while a fresh scan runs.
        if(Number.isFinite(cached.at)){
          setWatchOffers(cached.offers.filter((o:any)=>!o.validUntil||Date.parse(String(o.validUntil)+"T23:59:59")>=Date.now()));
          setWatchChecked(true);
        }
        if(typeof cached.debug==="string")setWatchDebug(cached.debug);
      }
    }catch{}
    try { const snapshot=JSON.parse(window.localStorage.getItem("ziiply-gosta-watch-results-v1")||"null"); if(snapshot?.key!==watchKey){setWatchOffers([]);setWatchChecked(false);} } catch {setWatchOffers([]);setWatchChecked(false);}
    if(!watchKey){setWatchOffers([]);setWatchChecked(false);return;}
    let cancelled=false;
    let running=false;
    const scan=async()=>{
      if(cancelled||running)return;
      running=true;
      watchLastAutoScan.current=Date.now();
      // Background refresh stays silent; keep the previous visible snapshot.
      const started=Date.now();
      setWatchDebug("Haku käynnissä: "+new Date().toLocaleTimeString("fi-FI")+" | hakusanat: "+watchKey);
      try{
        const terms=watchKey.split("|");
        const {response,data}=await fetchSharedGostaWatch(await gostaWatchUrl(terms));
        if(!response.ok||!data.ok)throw new Error(String(data.error||"Tarjousvahtien API epäonnistui"));
        const offers=Array.isArray(data.results)?data.results:[];
        // The API has already deduplicated offers by their product identity.
        // Never collapse distinct API offers by identical display title and price.
        const matched=offers.map((offer:any)=>({
          query:String((Array.isArray(offer.watchQueries)&&offer.watchQueries.length?offer.watchQueries:terms.filter(query=>matchesGostaWatch(query,offer)))[0]||""),
          title:String(offer.title||offer.name||offer.productName||"Tarjous"),
          price:String(offer.offerPrice??offer.price??""),
          store:String(offer.storeName||offer.chain||""),
          source:String(offer.source||offer.sourceType||offer.chain||""),
          chain:String(offer.chain||""),
          packageSize:String(offer.packageSize||offer.packSize||offer.size||offer.quantityText||offer.packageText||offer.packageSizeText||offer.packagingSize||""),
          imageUrl:String(offer.imageUrl||offer.pictureUrl||offer.image||""),
          unit:String(offer.unit||offer.unitPriceUnit||""),
          validUntil:String(offer.validUntil||""),
          comparisonPrice:String(offer.comparisonPriceText||offer.unitPrice||offer.comparisonPrice||""),
          priceBasis:String(offer.priceBasis||"")
        }));
        setWatchDebug("Aika: "+new Date().toLocaleTimeString("fi-FI")+" | kesto "+(Date.now()-started)+" ms | Neon-julkaisuja: "+data.diagnostic?.publications+" | tarjouksia tarkistettu: "+data.diagnostic?.inspected+" | osumia: "+matched.length+" | lähteet: "+JSON.stringify(data.diagnostic?.sources||[]).slice(0,600)+" | lähikaupat: "+JSON.stringify(data.diagnostic?.nearby||[]).slice(0,1500));
        if(cancelled)return;
        if(data.partial){
          // Background partial scans are diagnostic only; do not alarm the user.
        }
        if(!data.partial&&matched.length>0){setWatchOffers(matched);setWatchChecked(true);}
        else {
          // A partial scan must never replace a previously confirmed snapshot.
          try {
            const previous=JSON.parse(window.localStorage.getItem("ziiply-gosta-watch-results-v1")||"null");
            if(previous?.key===watchKey&&Array.isArray(previous.offers)){
              setWatchOffers(previous.offers.filter((o:any)=>!o.validUntil||Date.parse(String(o.validUntil)+"T23:59:59")>=Date.now()));setWatchChecked(true);
            } else if(!watchChecked && matched.length>0){
              setWatchOffers(matched);setWatchChecked(true);
            }
          }catch{}
        }
        if(!data.partial&&matched.length>0){try {window.localStorage.setItem("ziiply-gosta-watch-results-v1",JSON.stringify({key:watchKey,offers:matched,debug:"Tarkistettu "+new Date().toLocaleTimeString("fi-FI"),at:Date.now()}));window.dispatchEvent(new Event("ziiply-gosta-watch-results-changed"));}catch{}}
      }catch(error){
        setWatchDebug("VIRHE "+new Date().toLocaleTimeString("fi-FI")+" | "+String(error));
        // Automatic watcher refresh failures remain in diagnostics; retain the last successful offers.
      }finally{
        running=false;
        // No visible loading state for automatic refreshes.
      }
    };
    // Switching between cards remounts this panel. A recent successful
    // snapshot remains visible; do not start another network search on remount.
    let lastSuccessful=0;
    try{const cached=JSON.parse(window.localStorage.getItem("ziiply-gosta-watch-results-v1")||"null");if(cached?.key===watchKey&&Array.isArray(cached.offers))lastSuccessful=Number(cached.at)||0;}catch{}
    const initial=window.setTimeout(()=>{if(!lastSuccessful||Date.now()-lastSuccessful>=60*60*1000||watchRefresh>0)void scan();},200);
    const interval=window.setInterval(()=>{if(document.visibilityState==="visible"&&Date.now()-watchLastAutoScan.current>=60*60*1000)void scan();},60*60*1000);
    const resume=()=>{if(document.visibilityState==="visible"&&Date.now()-watchLastAutoScan.current>=5*60*1000)void scan();};
    document.addEventListener("visibilitychange",resume);
    return()=>{cancelled=true;window.clearTimeout(initial);window.clearInterval(interval);document.removeEventListener("visibilitychange",resume);};
  },[watchKey,watchRefresh]);

  React.useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("ziiply-gosta-offer-watches-v1") || "[]");
      setSavedWatches(Array.isArray(saved) ? saved.filter((value: unknown): value is string => typeof value === "string").slice(0, 30) : []);
    } catch { setSavedWatches([]); }
  }, [activeAssistant]);
  function saveWatch() {
    const query = watchQuery.trim();
    if (!query) return;
    const next = [query, ...savedWatches.filter(item => item.toLocaleLowerCase("fi") !== query.toLocaleLowerCase("fi"))].slice(0, 30);
    try { window.localStorage.setItem("ziiply-gosta-offer-watches-v1", JSON.stringify(next)); } catch {}
    setSavedWatches(next);
    window.dispatchEvent(new Event("ziiply-gosta-watch-changed"));
    setWatchQuery("");
    setWatchNotice("Vahti tallennettu. Tarjoukset ilmoitetaan haun valmistuttua, mikäli niitä on.");
    window.setTimeout(()=>setWatchNotice(current=>current==="Vahti tallennettu. Tarjoukset ilmoitetaan haun valmistuttua, mikäli niitä on."?"":current),4000);
    setShowWatchNotebook(false);
  }
  function removeWatch(query: string) {
    const next = savedWatches.filter(item => item !== query);
    try { window.localStorage.setItem("ziiply-gosta-offer-watches-v1", JSON.stringify(next)); } catch {}
    setSavedWatches(next);
    window.dispatchEvent(new Event("ziiply-gosta-watch-changed"));
    setWatchNotice("Tarjousvahti poistettu: " + query);
  }
  const [recipeMode,setRecipeMode]=React.useState<"online"|"own">("online");
  const [recipeCameraOpen,setRecipeCameraOpen]=React.useState(false);
  React.useEffect(()=>{setRecipeCameraOpen(false)},[activeAssistant]);
  const headerRef=React.useRef<HTMLDivElement|null>(null);
  const [headerHeight,setHeaderHeight]=React.useState(82);
  React.useLayoutEffect(()=>{
    const header=headerRef.current;
    if(!header)return;
    const measure=()=>setHeaderHeight(header.getBoundingClientRect().height);
    measure();
    const observer=new ResizeObserver(measure);observer.observe(header);
    return()=>observer.disconnect();
  },[activeAssistant]);
  if (!activeAssistant) return null;

  const content = assistantContent[activeAssistant];

  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+76px)] top-[calc(env(safe-area-inset-top)+96px)] z-[70] flex items-start justify-center px-3 sm:hidden">
      <section style={{"--recipe-panel-header-height":`${headerHeight}px`} as React.CSSProperties} className={`relative flex max-h-full w-full max-w-[520px] flex-col overflow-hidden rounded-[1.8rem] border-[3px] border-[#b99d62] ${activeAssistant==="justiina"||activeAssistant==="arvo"?"h-full":""} ${recipeCameraOpen?"bg-transparent":"bg-[#fff7df]"} shadow-[0_22px_60px_rgba(7,47,37,0.28)]`}>
        <div ref={headerRef} className="flex shrink-0 items-center gap-4 bg-gradient-to-b from-[#fff1c6] to-[#e3c17b] px-4 py-3">
          <div className="h-[58px] w-[58px] shrink-0 overflow-hidden rounded-full border-[3px] border-[#f8e8bf] bg-[#314633]">
            <img
              src={content.imageSrc}
              alt={content.name}
              draggable={false}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[22px] font-black leading-none text-[#27412a]">
              {content.name}
            </div>
            <div className="mt-1 text-[12px] font-black uppercase tracking-[0.08em] text-[#705f37]">
              {content.title}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-white/80 text-[22px] font-black text-[#3e3420] shadow-inner active:scale-[0.98]"
            aria-label="Sulje"
            title="Sulje"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-2 text-[14px] font-bold leading-snug text-[#374151]">
          {activeAssistant === "justiina" ? <div className="min-h-0 flex-1 overflow-y-auto"><div className="sticky top-0 z-10 flex gap-2 bg-[#fff7df] p-3"><button type="button" onClick={()=>setRecipeMode("online")} aria-pressed={recipeMode==="online"} className={`flex-1 rounded-xl p-2 font-bold ${recipeMode==="online"?"bg-[#174c3a] text-white":"border border-[#b99d62]"}`}>Hae reseptejä</button><button type="button" onClick={()=>setRecipeMode("own")} aria-pressed={recipeMode==="own"} className={`flex-1 rounded-xl p-2 font-bold ${recipeMode==="own"?"bg-[#174c3a] text-white":"border border-[#b99d62]"}`}>Omat / kuvaa</button></div>{recipeMode==="online"?<JustiinaOnlineRecipes onSearchIngredients={onSearchIngredients}/>:<JustiinaRecipeEditor onSearchIngredients={onSearchIngredients} onCameraOpenChange={setRecipeCameraOpen}/>}</div> : activeAssistant === "arvo" ? <ArvoSettingsPanel onClose={onClose} /> : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 rounded-2xl border-2 border-[#caa15d] bg-[#f7e7bd] px-3 py-2">
                <h2 className="font-serif text-lg font-black text-[#174c35]">Göstan tarjoushaku</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={()=>setShowWatchNotebook(v=>!v)} aria-label="Tallennetut tarjousvahdit" title="Tallennetut tarjousvahdit" className="rounded-lg border border-[#9c6d36] bg-[#fff4cf] px-3 py-2 text-xl">📒</button>
                  
                  <button type="button" onClick={()=>setWatchRefresh(n=>n+1)} disabled={watchLoading} aria-label="Päivitä tarjoukset" className="rounded-lg border border-[#9c6d36] bg-[#fff4cf] px-3 py-2 text-xl disabled:opacity-50">↻</button>
                </div>
              </div>
              {showWatchNotebook&&<div role="region" aria-label="Tallennetut tarjousvahdit" className="rounded-2xl border-2 border-[#b58a46] bg-[#fff9e9] p-3 shadow-md">
                <div className="mb-2 flex items-center justify-between"><strong className="font-serif text-lg text-[#174c35]">Tallennetut tarjousvahdit</strong><button type="button" onClick={()=>setShowWatchNotebook(false)} aria-label="Sulje vihko">✕</button></div>
                {savedWatches.length===0?<p className="text-sm">Ei tallennettuja tarjousvahteja.</p>:savedWatches.map(query=><div key={query} className="flex items-center justify-between gap-2 border-t border-[#e3d2ae] py-1">
                  <button type="button" onClick={()=>{setWatchFilter(query);setShowWatchNotebook(false);}} className="min-w-0 flex-1 break-words rounded-lg px-2 py-2 text-left font-bold">{query}</button>
                  <button type="button" onClick={()=>removeWatch(query)} className="rounded-lg border border-[#b58a46] px-2 py-1 text-xs">Poista</button>
                </div>)}
              </div>}
              <form onSubmit={event=>{event.preventDefault();saveWatch();}} className="flex items-center gap-2">
                <input value={watchQuery} onChange={event=>setWatchQuery(event.target.value)} placeholder="Hae tuotetta tai tarjousta" aria-label="Tarjousvahdin hakusana" className="min-w-0 flex-1 rounded-xl border-2 border-[#caa15d] bg-white px-3 py-3 text-base" />
                <button type="submit" disabled={!watchQuery.trim()} className="rounded-xl border-2 border-[#9c6d36] bg-[#fff4cf] px-3 py-3 font-black text-[#174c35] disabled:opacity-50">Tallenna</button>
              </form>
              {watchNotice&&<p role="status" className="rounded-xl bg-white/70 p-3 text-sm text-[#174c35]">{watchNotice}</p>}
              <div className="flex items-center justify-between gap-2"><h3 className="font-serif text-lg font-black text-[#174c35]">{watchFilter?watchFilter:"Tarjousvahdin osumat"} {watchChecked?"("+watchOffers.filter(o=>!watchFilter||o.query===watchFilter).length+")":""}</h3>
                {watchFilter&&<button type="button" onClick={()=>setWatchFilter(null)} className="rounded-lg border border-[#b58a46] px-2 py-1 text-xs">Kaikki vahdit</button>}
              </div>

              {!savedWatches.length&&<p className="rounded-xl bg-white/70 p-4 text-sm">Tallenna ensin hakusana. Löydetyt tarjoukset näkyvät tässä kortteina.</p>}
              <div className="grid grid-cols-1 gap-3">
                {watchOffers.filter(o=>!watchFilter||o.query===watchFilter).map((offer,index)=><article key={offer.query+"-"+offer.title+"-"+offer.store+"-"+offer.source+"-"+index} className="rounded-2xl border-2 border-[#caa15d] bg-[#fffaf0] p-3 shadow-sm">
                  <div className="text-xs font-bold text-[#76502b]">{watchStoreLabel(offer.store,offer.chain)}</div>
                  <div className="mt-2 flex items-start gap-3">{offer.imageUrl&&<img src={offer.imageUrl} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-lg bg-white object-contain" onError={event=>{event.currentTarget.style.display="none";}}/>}<div className="min-w-0 flex-1"><h4 className="text-base font-black text-[#174c35]">{offer.title}</h4>{watchPackageSize(offer)&&<div className="mt-1 text-sm font-semibold text-[#76502b]">{watchPackageSize(offer)}</div>}{offer.comparisonPrice&&<div className="mt-1 text-sm font-semibold text-[#76502b]">{offer.comparisonPrice}</div>}{!offer.comparisonPrice&&offer.priceBasis==="per-kg"&&<div className="mt-1 text-sm font-semibold text-[#76502b]">Hinta / kg</div>}</div></div>
                  <div className="mt-2 flex items-center justify-between"><span className="text-xs font-normal">Vahti: {offer.query}</span>{offer.price&&<strong className="rounded-lg bg-[#f3d58e] px-3 py-1 text-lg text-[#4b3217]">{/[€]/.test(offer.price)?offer.price:offer.price+" €"}</strong>}</div>
                  {onAddWatchOfferToCart&&<button type="button" onClick={()=>{const priceMatch=offer.price.replace(/\u00a0/g," ").match(/\d[\d\s]*(?:[,.]\d+)?/);const price=priceMatch?Number(priceMatch[0].replace(/\s/g,"").replace(",",".")):NaN;if(!Number.isFinite(price)||price<=0){setWatchNotice("Tarjouksella ei ole kelvollista hintaa.");return;}const added=onAddWatchOfferToCart({name:offer.title,title:offer.title,price,priceAmountUnit:"eur",storeName:watchStoreLabel(offer.store,offer.chain),source:offer.source,imageUrl:offer.imageUrl,packageSize:watchPackageSize(offer),chain:offer.chain,isWeightedProduct:offer.priceBasis==="per-kg"||(!watchPackageSize(offer)&&/(?:€|eur)\s*\/\s*kg\b/i.test([offer.comparisonPrice,offer.price,offer.unit].join(" "))),ziiplyPricePendingWeight:offer.priceBasis==="per-kg"||(!watchPackageSize(offer)&&/(?:€|eur)\s*\/\s*kg\b/i.test([offer.comparisonPrice,offer.price,offer.unit].join(" "))),comparisonPriceText:offer.comparisonPrice,priceBasis:offer.priceBasis});if(added)setWatchNotice("Tarjous lisätty ostoskoriin.");}} className="mt-2 mr-2 rounded-lg border border-[#174c35] bg-[#174c35] px-3 py-2 text-sm font-bold text-white">Lisää ostoskoriin</button>}
                  <button type="button" onClick={()=>void shareWatchOffer(offer)} className="mt-2 rounded-lg border border-[#9c6d36] bg-[#fff4cf] px-3 py-2 text-sm font-bold text-[#174c35]">Jaa / lähetä tarjous</button>
                </article>)}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export { ZiiplyMobileAssistantPanel };

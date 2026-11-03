"use client";
import { gostaWatchUrl } from "./gostaWatchLocation";
import { matchesGostaWatch } from "./gostaWatchMatch";
import JustiinaRecipeEditor from "../justiina/JustiinaRecipeEditor";
import ArvoSettingsPanel from "../ArvoSettingsPanel";

import React from "react";
import { searchZiiplyGostaOffersV146 } from "../offerSearch/ziiplyOfferSearchCore";
import type { ZiiplyAssistantKey } from "./ZiiplyMobileAssistantButton";

export type ZiiplyMobileAssistantPanelProps = {
  activeAssistant: ZiiplyAssistantKey | null;
  onClose: () => void;
  onSearchIngredients?: (terms: string[]) => void;
  selectedChains?: Record<"s"|"k"|"lidl"|"tokmanni",boolean>;
  onChangeChain?: (chain: "s"|"k"|"lidl"|"tokmanni", enabled:boolean) => void;
  locationLabel?: string;
  onOpenStoreSettings?: () => void;
};

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
}: ZiiplyMobileAssistantPanelProps) {
  const [watchQuery, setWatchQuery] = React.useState("");
  const [showWatchNotebook,setShowWatchNotebook]=React.useState(false);
  const [watchFilter,setWatchFilter]=React.useState<string|null>(null);
  const [savedWatches, setSavedWatches] = React.useState<string[]>([]);
  const [watchNotice, setWatchNotice] = React.useState("");
  const [watchOffers,setWatchOffers]=React.useState<Array<{query:string;title:string;price:string;store:string;source:string}>>([]);
  const [watchLoading,setWatchLoading]=React.useState(false);
  const [watchChecked,setWatchChecked]=React.useState(false);
  const [watchError,setWatchError]=React.useState("");
  const [watchRefresh,setWatchRefresh]=React.useState(0);
  const [showWatchDebug,setShowWatchDebug]=React.useState(false);
  const [watchDebug,setWatchDebug]=React.useState("Ei tarkistusta vielä");
  const [watchRawDebug,setWatchRawDebug]=React.useState("Raakaa API-tarkistusta ei ole tehty");
  const [watchRawLoading,setWatchRawLoading]=React.useState(false);
  const runRawWatchDebug=async()=>{
    setWatchRawLoading(true);
    const terms=savedWatches.length?savedWatches:["kahvi","limsa"];
    const started=Date.now();
    try{
      const response=await fetch(await gostaWatchUrl(terms),{cache:"no-store"});
      const data=await response.json();
      const offers=Array.isArray(data?.results)?data.results:[];
      const counts=Object.fromEntries(terms.map(q=>[q,offers.filter((offer:any)=>(Array.isArray(offer.watchQueries)?offer.watchQueries:[]).some((w:string)=>w.toLocaleLowerCase("fi")===q.toLocaleLowerCase("fi"))).length]));
      setWatchRawDebug("Tarjousvahdin oikea hakureitti | HTTP "+response.status+" | "+(Date.now()-started)+"ms | ok="+String(data?.ok)+" | osumia="+offers.length+" | hakusanakohtaiset="+JSON.stringify(counts)+" | tarkistettu="+String(data?.diagnostic?.inspected??"?")+" | lähteet="+JSON.stringify(data?.diagnostic?.sources||[])+" | lähikaupat="+JSON.stringify(data?.diagnostic?.nearby||[])+" | virhe="+String(data?.error||"ei")+" | esimerkki="+JSON.stringify(offers.slice(0,4)).slice(0,1200));
    }catch(error){setWatchRawDebug("Tarjousvahdin DEBUG-virhe: "+String(error));}
    finally{setWatchRawLoading(false);}
  };
  const watchKey=savedWatches.map(q=>q.trim().toLocaleLowerCase("fi")).filter(Boolean).join("|");
  React.useEffect(()=>{
    // Restore the latest successful scan when this panel is remounted.
    try {
      const cached=JSON.parse(window.localStorage.getItem("ziiply-gosta-watch-results-v1")||"null");
      if(cached?.key===watchKey&&Array.isArray(cached.offers)){
        setWatchOffers(cached.offers);
        setWatchChecked(true);
        if(typeof cached.debug==="string")setWatchDebug(cached.debug);
      }
    }catch{}
    if(!watchKey){setWatchOffers([]);setWatchChecked(false);return;}
    let cancelled=false;
    let running=false;
    const scan=async()=>{
      if(cancelled||running)return;
      running=true;
      setWatchLoading(true);
      setWatchError("");
      const started=Date.now();
      setWatchDebug("Haku käynnissä: "+new Date().toLocaleTimeString("fi-FI")+" | hakusanat: "+watchKey);
      try{
        const terms=watchKey.split("|");
        const response=await fetch(await gostaWatchUrl(terms),{cache:"no-store"});
        const data=await response.json();
        if(!response.ok||!data.ok)throw new Error(String(data.error||"Tarjousvahtien API epäonnistui"));
        const offers=Array.isArray(data.results)?data.results:[];
        const seen=new Set<string>();
        const matched=offers.flatMap((offer:any)=>(Array.isArray(offer.watchQueries)?offer.watchQueries:terms.filter(query=>matchesGostaWatch(query,offer))).map((query:string)=>({
          query,title:String(offer.title||offer.name||offer.productName||"Tarjous"),
          price:String(offer.offerPrice??offer.price??""),
          store:String(offer.storeName||offer.chain||""),
          source:String(offer.source||offer.sourceType||offer.chain||"")
        }))).filter((offer:any)=>{const key=[offer.query,offer.title,offer.price,offer.store,offer.source].join("|");if(seen.has(key))return false;seen.add(key);return true;});
        setWatchDebug("Aika: "+new Date().toLocaleTimeString("fi-FI")+" | kesto "+(Date.now()-started)+" ms | Neon-julkaisuja: "+data.diagnostic?.publications+" | tarjouksia tarkistettu: "+data.diagnostic?.inspected+" | osumia: "+matched.length+" | lähteet: "+JSON.stringify(data.diagnostic?.sources||[]).slice(0,600)+" | lähikaupat: "+JSON.stringify(data.diagnostic?.nearby||[]).slice(0,1500));
        if(cancelled)return;
        setWatchOffers(matched);
        setWatchChecked(true);
        try {window.localStorage.setItem("ziiply-gosta-watch-results-v1",JSON.stringify({key:watchKey,offers:matched,debug:"Tarkistettu "+new Date().toLocaleTimeString("fi-FI"),at:Date.now()}));}catch{}
      }catch(error){
        setWatchDebug("VIRHE "+new Date().toLocaleTimeString("fi-FI")+" | "+String(error));
        if(!cancelled)setWatchError("Tarjousten tarkistus epäonnistui.");
      }finally{
        running=false;
        if(!cancelled)setWatchLoading(false);
      }
    };
    const initial=window.setTimeout(()=>{void scan();},200);
    const interval=window.setInterval(()=>{if(document.visibilityState==="visible")void scan();},60*60*1000);
    const resume=()=>{if(document.visibilityState==="visible")void scan();};
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
    setWatchNotice("Tarjousvahti tallennettu vihkoon: " + query);
    setShowWatchNotebook(false);
  }
  function removeWatch(query: string) {
    const next = savedWatches.filter(item => item !== query);
    try { window.localStorage.setItem("ziiply-gosta-offer-watches-v1", JSON.stringify(next)); } catch {}
    setSavedWatches(next);
    window.dispatchEvent(new Event("ziiply-gosta-watch-changed"));
    setWatchNotice("Tarjousvahti poistettu: " + query);
  }
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
          {activeAssistant === "justiina" ? <JustiinaRecipeEditor onSearchIngredients={onSearchIngredients} onCameraOpenChange={setRecipeCameraOpen} /> : activeAssistant === "arvo" ? <ArvoSettingsPanel onClose={onClose} /> : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 rounded-2xl border-2 border-[#caa15d] bg-[#f7e7bd] px-3 py-2">
                <h2 className="font-serif text-lg font-black text-[#174c35]">Göstan tarjoushaku</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={()=>setShowWatchNotebook(v=>!v)} aria-label="Tallennetut tarjousvahdit" title="Tallennetut tarjousvahdit" className="rounded-lg border border-[#9c6d36] bg-[#fff4cf] px-3 py-2 text-xl">📒</button>
                  <button type="button" onClick={()=>setShowWatchDebug(v=>!v)} aria-label="Tarjousvahdin debuggeri" className="rounded-lg border border-[#9c6d36] bg-[#fff4cf] px-2 py-2 text-xs font-bold">DEBUG</button>
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
              {showWatchDebug&&<div className="rounded-xl border-2 border-red-600 bg-white p-3 text-xs font-mono text-slate-900 break-words"><strong>Göstan tarjousvahti – diagnostiikka</strong><p>Tallennettuja vahteja: {savedWatches.length} | {savedWatches.join(", ")||"ei yhtään"}</p><p>{watchDebug}</p><button type="button" disabled={watchRawLoading} className="my-2 rounded border border-red-700 bg-red-50 p-2" onClick={()=>{void runRawWatchDebug();}}>{watchRawLoading?"Tarkistetaan API...":"TUTKI RAAKA API"}</button><pre className="whitespace-pre-wrap break-all">{watchRawDebug}</pre><p>Haku käynnissä: {String(watchLoading)} | tarkistettu: {String(watchChecked)} | virhe: {watchError||"ei"}</p><button type="button" className="mt-2 rounded border p-2" onClick={()=>navigator.clipboard?.writeText(watchDebug+"\\n"+watchRawDebug)}>Kopioi diagnostiikka</button></div>}
              {watchNotice&&<p role="status" className="text-sm text-[#17573c]">{watchNotice}</p>}
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-serif text-lg font-black text-[#174c35]">{watchFilter?watchFilter:"Tarjousvahdin osumat"} {watchChecked?"("+watchOffers.filter(o=>!watchFilter||o.query===watchFilter).length+")":""}</h3>
                {watchFilter&&<button type="button" onClick={()=>setWatchFilter(null)} className="rounded-lg border border-[#b58a46] px-2 py-1 text-xs">Kaikki vahdit</button>}
              </div>
              {watchLoading&&<p className="text-sm">Haetaan tuoreita tarjouksia…</p>}
              {watchError&&<p role="alert" className="text-sm text-red-700">{watchError}</p>}
              {!savedWatches.length&&<p className="rounded-xl bg-white/70 p-4 text-sm">Tallenna ensin hakusana. Löydetyt tarjoukset näkyvät tässä kortteina.</p>}
              {savedWatches.length>0&&watchChecked&&!watchLoading&&watchOffers.length===0&&<p className="rounded-xl bg-white/70 p-4 text-sm">Tarjouksia ei löytynyt.</p>}
              <div className="grid grid-cols-1 gap-3">
                {watchOffers.filter(o=>!watchFilter||o.query===watchFilter).map((offer,index)=><article key={offer.query+"-"+offer.title+"-"+offer.store+"-"+offer.source+"-"+index} className="rounded-2xl border-2 border-[#caa15d] bg-[#fffaf0] p-3 shadow-sm">
                  <div className="text-xs font-bold text-[#76502b]">{offer.store||"Kauppa"}{offer.source&&" · "+offer.source}</div>
                  <h4 className="mt-1 text-base font-black text-[#174c35]">{offer.title}</h4>
                  <div className="mt-2 flex items-center justify-between"><span className="text-xs font-normal">Vahti: {offer.query}</span>{offer.price&&<strong className="rounded-lg bg-[#f3d58e] px-3 py-1 text-lg text-[#4b3217]">{offer.price} €</strong>}</div>
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

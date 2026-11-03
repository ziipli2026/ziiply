"use client";
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
  const [savedWatches, setSavedWatches] = React.useState<string[]>([]);
  const [watchNotice, setWatchNotice] = React.useState("");
  const [watchOffers,setWatchOffers]=React.useState<Array<{query:string;title:string;price:string;store:string;source:string}>>([]);
  const [watchLoading,setWatchLoading]=React.useState(false);
  const [watchChecked,setWatchChecked]=React.useState(false);
  const [watchError,setWatchError]=React.useState("");
  const [watchRefresh,setWatchRefresh]=React.useState(0);
  const watchKey=savedWatches.map(q=>q.trim().toLocaleLowerCase("fi")).filter(Boolean).join("|");
  React.useEffect(()=>{
    if(!watchKey){setWatchOffers([]);setWatchChecked(false);return;}
    let cancelled=false;
    let running=false;
    const scan=async()=>{
      if(cancelled||running)return;
      running=true;
      setWatchLoading(true);
      setWatchError("");
      try{
        const results=await Promise.allSettled(watchKey.split("|").map(async query=>{
          const response=await searchZiiplyGostaOffersV146({query,context:{areaLabel:locationLabel||""}});
          return response.results.map((offer:any)=>({
            query,
            title:String(offer.title||offer.name||offer.productName||"Tarjous"),
            price:String(offer.offerPrice||offer.price||""),
            store:String(offer.storeName||offer.chain||""),
            source:String(offer.source||offer.sourceType||offer.offerSource||"")
          }));
        }));
        if(cancelled)return;
        setWatchOffers(results.flatMap(result=>result.status==="fulfilled"?result.value:[]));
        setWatchChecked(true);
        if(results.every(result=>result.status==="rejected"))setWatchError("Tarjousten tarkistus epäonnistui. Yritä uudelleen.");
        else if(results.some(result=>result.status==="rejected"))setWatchError("Osa tarjoushauista epäonnistui.");
      }catch{
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
  },[watchKey,locationLabel,watchRefresh]);

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
            <div className="space-y-4">
              <h2 className="text-xl font-black text-[#244a28]">Tarjousvahti</h2>
              <p>Tallenna tuotteet tai hakusanat, joiden tarjouksia haluat seurata.</p>
              <form onSubmit={(event) => { event.preventDefault(); saveWatch(); }} className="flex gap-2">
                <input value={watchQuery} onChange={event => { setWatchQuery(event.target.value); setWatchNotice(""); }} placeholder="Tuote tai hakusana" aria-label="Tarjousvahdin hakusana" className="min-w-0 flex-1 rounded-xl border border-[#8bb56d] bg-white px-3 py-3 text-base" />
                <button type="submit" disabled={!watchQuery.trim()} className="rounded-xl bg-[#17573c] px-4 py-3 font-black text-white disabled:opacity-50">Tallenna</button>
              </form>
              {watchNotice && <p role="status" className="text-[#17573c]">{watchNotice}</p>}
              <h3 className="font-black">Tallennetut tarjousvahdit ({savedWatches.length})</h3>
              {savedWatches.length === 0 ? <p>Ei vielä tallennettuja tarjousvahteja.</p> : (
                <ul className="space-y-2">
                  {savedWatches.map(query => (
                    <li key={query} className="flex items-center justify-between gap-2 rounded-xl bg-white/80 p-3">
                      <span className="min-w-0 break-words">{query}</span>
                      <button type="button" onClick={() => removeWatch(query)} aria-label={`Poista tarjousvahti: ${query}`} className="shrink-0 rounded-lg border border-[#b99d62] px-3 py-2">Poista</button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="rounded-xl border border-[#b99d62] bg-white/80 p-3" aria-live="polite">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black">Tarjousosumat {watchChecked?"("+watchOffers.length+")":""}</h3>
                  <button type="button" disabled={watchLoading} onClick={()=>setWatchRefresh(n=>n+1)} className="rounded-lg border border-[#b99d62] px-3 py-2 text-xs disabled:opacity-50">Päivitä</button>
                </div>
                {watchLoading&&<p className="mt-2 text-sm">Haetaan tarjouksia…</p>}
                {watchError&&<p role="alert" className="mt-2 text-sm text-red-700">{watchError}</p>}
                {watchChecked&&!watchLoading&&watchOffers.length===0&&<p className="mt-2 text-sm">Ei löytyneitä tarjouksia.</p>}
                {watchOffers.map((offer,index)=><div key={offer.query+"-"+offer.title+"-"+offer.store+"-"+offer.source+"-"+index} className="mt-2 border-t pt-2 text-sm">
                  <strong>{offer.title}</strong>{offer.price&&<span> · {offer.price} €</span>}
                  <div className="text-xs font-normal">{offer.store}{offer.source&&" · "+offer.source} · Vahti: {offer.query}</div>
                </div>)}
              </div>
              <p className="text-xs font-normal text-[#687285]">Tarjousvahdit tallennetaan tähän selaimeen. Haku käynnistyy sivun latautuessa ja selaimen aktivoituessa. Suljetun selaimen ajastettu haku vaatii palvelinpuolen toteutuksen.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export { ZiiplyMobileAssistantPanel };

"use client";
import JustiinaRecipeEditor from "../../justiina/JustiinaRecipeEditor";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useDesktopVoiceInput } from "./useDesktopVoiceInput";

type Product = { id?:string|number;ean?:string|number;name?:string;title?:string;productName?:string;pictureUrl?:string;imageUrl?:string;image?:string;__store?:string;__price?:number };
export default function DesktopJustiinaSearchCard({onClose,onOpenCart,onVoiceTranscript,query,onQueryChange,loading,onSearch,message,debug,results,delay,onDelayChange,onAddToCart,onAddInputToCart,onReopenResults,onOpenScanner}:{onVoiceTranscript:(text:string)=>void;onClose:()=>void;onOpenCart:()=>void;query:string;onQueryChange:(value:string)=>void;loading:boolean;onSearch:()=>void;message:string;debug:Record<string,unknown>;results:Product[];delay:0|1|2;onDelayChange:()=>void;onAddToCart:(product:Product)=>void;onAddInputToCart:(text:string)=>void;onReopenResults:()=>void;onOpenScanner:()=>void}){
const voice = useDesktopVoiceInput(onVoiceTranscript);
const [listExpanded,setListExpanded]=useState(false);
const inputRef=useRef<HTMLInputElement|null>(null);
const measureRef=useRef<HTMLSpanElement|null>(null);
useEffect(()=>{
  const check=()=>{
    const input=inputRef.current,measure=measureRef.current;
    if(!input||!measure)return;
    setListExpanded(Boolean(query)&&measure.getBoundingClientRect().width>Math.max(80,(input.closest("[data-justiina-search-grid]")?.getBoundingClientRect().width||480)/2-122));
  };
  check();
  window.addEventListener("resize",check);
  return()=>window.removeEventListener("resize",check);
},[query]);
return <div className="fixed left-1/2 top-[var(--desktop-overlay-top,128px)] z-50 flex max-h-[calc(100dvh-var(--desktop-overlay-top,128px)-28px)] w-[min(522px,94vw)] -translate-x-1/2 flex-col overflow-hidden rounded-[28px] border-[3px] border-[#174c3a] bg-[#fff3cf] p-4 shadow-[0_28px_80px_rgba(34,54,43,.28)]">
  <div className="relative flex items-center justify-center px-12 text-center">
    <button type="button" onClick={onClose} aria-label="Sulje Justiinan haku" className="absolute left-0 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border-[3px] border-[#5a321b] bg-[#9a612d] text-[23px] font-black leading-none text-[#fff0c8]">×</button>
    <div className="min-w-0"><div className="text-[10px] font-black uppercase tracking-[.22em] text-[#7c745d]">JUSTIINA · TUOTEHAKU</div><h2 className="font-serif text-[25px] font-black italic leading-tight text-[#174c3a]">Tuotteet ja vertailu</h2></div>
    <button type="button" onClick={onClose} aria-label="Sulje Justiinan haku" className="absolute right-0 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border-[3px] border-[#5a321b] bg-[#9a612d] text-[23px] font-black leading-none text-[#fff0c8]">×</button>
    <button type="button" onClick={onDelayChange} title="Vaihda hakutahtia" aria-label={`Hakutahti: ${delay===2?"Normaali, 2 sekuntia":delay===1?"Nopea, 1 sekunti":"Heti, 0 sekuntia"}. Vaihda hakutahtia.`} className="absolute left-12 top-0 flex h-9 items-center gap-1 rounded-full border-2 border-[#b89959] bg-[#fff8dd] px-2 text-[11px] font-black text-[#174c3a] shadow-sm hover:bg-[#f7e8b9]">⏱ <span>{delay===2?"2 s":delay===1?"1 s":"0 s"}</span></button>
  </div>
  <div className="mt-2 flex min-h-0 flex-col">
    <div data-justiina-search-grid className="relative mt-2 grid grid-cols-2 items-center gap-x-3">
      <div className="relative col-start-1 row-start-1 flex h-full min-h-[126px] min-w-0 items-center">
        <div role="status" aria-live="polite" className="absolute bottom-[calc(50%+36px)] left-0 right-0 px-1 text-center text-[12px] font-bold leading-tight text-[#765f3f]">{!loading && results.length===0 ? (message||"Kirjoita tuote, tuoteryhmä tai ostoslista.") : ""}</div>
      <form onSubmit={(e:FormEvent)=>{e.preventDefault();if(query.trim())onSearch()}} className={`relative z-20 h-[54px] min-w-0 ${listExpanded?"col-span-2":"col-span-1"}`}>
        <div className="relative h-[54px]">
          <span ref={measureRef} aria-hidden="true" className="pointer-events-none absolute -left-[9999px] top-0 whitespace-pre font-serif text-[17px] font-black">{query||""}</span>
          <input ref={inputRef} autoFocus type="text" value={query.replace(/\r?\n/g," ")} onChange={e=>onQueryChange(e.target.value)} placeholder="Kirjoita tähän…" aria-label="Hae tuotteita" className="block h-[54px] w-full min-w-0 rounded-[24px] border-[3px] border-[#b89959] bg-[#fffdf5] px-4 pr-[96px] text-center font-serif text-[17px] font-black text-[#6f6657] outline-none placeholder:text-[15px] placeholder:text-[#8b806e]"/>
          {query.trim()&&<><button type="button" onClick={()=>{onQueryChange("");setListExpanded(false);inputRef.current?.focus()}} aria-label="Tyhjennä hakukenttä" className="absolute right-[51px] top-[8px] z-40 grid h-9 w-9 place-items-center rounded-full border-2 border-[#d0aa4f] bg-[#fff1c9]">🧽</button><button type="submit" aria-label="Hae kirjoitetut tuotteet" className="absolute right-[7px] top-[8px] z-40 grid h-9 w-9 place-items-center rounded-full border-2 border-[#477350] bg-[#e2edcf]">🧺</button></>}
        </div>
      </form>
      </div>
      <div className="col-start-2 row-start-1 min-w-0 self-center"><JustiinaRecipeEditor onSearchIngredients={terms=>onVoiceTranscript(terms.join(", "))}/></div>
    </div>
    {loading ? <div role="status" aria-live="polite" aria-label="Justiina hakee tuotteita" className="relative mt-2 h-[38px] overflow-hidden rounded-xl border border-[#d0aa58] bg-[#fff8dd]">
      <style>{`@keyframes justiina-cart-drive{0%{left:-58px}100%{left:calc(100% + 8px)}}@keyframes justiina-cart-bob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-4px) rotate(2deg)}}@media(prefers-reduced-motion:reduce){.justiina-cart-drive,.justiina-cart-bob{animation:none!important}.justiina-cart-drive{left:12px!important}}`}</style>
      <div aria-hidden="true" className="absolute left-4 right-4 top-[15px] border-t-2 border-dashed border-[#65866b]" />
      <span aria-hidden="true" className="justiina-cart-drive absolute top-[2px] z-10 text-[25px] leading-none" style={{animation:"justiina-cart-drive 3.8s linear infinite"}}><span className="justiina-cart-bob inline-block" style={{animation:"justiina-cart-bob .55s ease-in-out infinite"}}>🛒</span></span>
      <span className="absolute inset-x-0 bottom-[1px] z-20 text-center text-[11px] font-black text-[#174c3a] [text-shadow:0_1px_2px_#fff8dd,0_-1px_2px_#fff8dd]">Justiina kerää tuotteita ostoskoriin…</span>
    </div> : results.length>0 ? <button type="button" onClick={onReopenResults} aria-label="Avaa tehdyn haun tuotevalinta" className="mt-1 rounded-xl border border-[#d0aa58] bg-[#fff8dd] px-3 py-2 text-center text-[12px] font-bold text-[#174c3a] hover:bg-[#f7e8b9]">Tehty haku: <span className="font-black">{query.trim()}</span> · {results.length} tuotetta löytyi <span aria-hidden="true">→</span></button> : null}
    {voice.message && <div role="status" aria-live="polite" className="mt-1 text-center text-[13px] font-bold text-[#174c3a]">{voice.message}</div>}
    <div className="mt-2 flex shrink-0 items-center gap-2"><button type="button" onClick={()=>void voice.toggle()} disabled={voice.state==="processing"} aria-label={voice.state==="recording"?"Lopeta äänitys":"Äänitä ostoslista"} aria-pressed={voice.state==="recording"} title={voice.state==="recording"?"Lopeta äänitys":"Äänitä ostoslista"} className="relative h-[104px] min-w-0 flex-1 overflow-hidden rounded-[20px] border-2 border-[#c89b44] bg-gradient-to-b from-[#2f3326] to-[#0f140f] p-0 disabled:cursor-wait"><img src={voice.state==="recording"?"/ui/voice/aanita-on.webp":voice.state==="processing"?"/ui/voice/aanita-search.webp":"/ui/voice/aanita-off.webp"} alt="" draggable={false} className="absolute inset-[4%] h-[92%] w-[92%] object-contain" /></button><button type="button" onClick={onOpenCart} aria-label="Avaa ostoskori" title="Avaa ostoskori" className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full border-[4px] border-[#7b6034] bg-[#d8c08c] shadow-[0_5px_12px_rgba(0,0,0,0.18),inset_0_2px_0_rgba(255,255,255,0.55)]"><span className="flex h-[46px] w-[46px] items-center justify-center rounded-full border-[2px] border-[#efe2b8] bg-[#16472c] text-[26px] leading-none">🧺</span></button><button type="button" onClick={onOpenScanner} aria-label="Avaa EAN-skanneri" title="Avaa EAN-skanneri" className="relative h-[104px] min-w-0 flex-1 overflow-hidden rounded-[20px] border-2 border-[#c89b44] bg-gradient-to-b from-[#2f3326] to-[#0f140f] p-0"><img src="/ui/scanner/scanner-idle.webp" alt="" draggable={false} className="absolute inset-[4%] h-[92%] w-[92%] object-contain" /></button></div>
  </div>
</div>
}

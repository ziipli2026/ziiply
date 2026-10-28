"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SearchDebugObserver = (stage: string, data?: Record<string, unknown>) => void;
type DebugEvent = { at: string; stage: string; data: Record<string, unknown> };
type Report = { version: string; startedAt: string; query: string; status: string; events: DebugEvent[] };

export default function DesktopSearchDebug({query,snapshot,runSearch,top}: {
  top: number;
  query: string;
  snapshot: Record<string,unknown>;
  runSearch: (query:string,observe:SearchDebugObserver,signal:AbortSignal)=>Promise<unknown>;
}) {
  const [mounted,setMounted]=useState(false);
  useEffect(()=>{setMounted(true)},[]);
  const [open,setOpen]=useState(false);
  const [input,setInput]=useState("");
  const [report,setReport]=useState<Report|null>(null);
  const reportRef=useRef<Report|null>(null);
  const active=useRef<AbortController|null>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{active.current?.abort();if(timer.current)clearTimeout(timer.current)},[]);
  function publish(next:Report){reportRef.current=next;setReport(next)}
  async function start(){
    active.current?.abort();
    if(timer.current)clearTimeout(timer.current);
    const controller=new AbortController();active.current=controller;
    const term=(input||query).trim();
    publish({version:"desktop-search-debug-v2",startedAt:new Date().toISOString(),query:term,status:"Haetaan",events:[]});
    const observe:SearchDebugObserver=(stage,data={})=>{
      if(active.current!==controller||controller.signal.aborted)return;
      const current=reportRef.current!;
      const status=stage==="complete"?(Array.isArray(data.failures)&&data.failures.length?"Valmis – palveluvirheitä":data.displayedCount?"Valmis – tuotteita löytyi":"Valmis – ei hyväksyttyjä tuotteita"):["error","validation_error"].includes(stage)?"Virhe":stage==="request"?`Odotetaan vastausta: ${data.requestUrl}`:stage==="http"?`HTTP ${data.status} · ${data.requestUrl}`:stage==="request_error"?`Pyyntö epäonnistui: ${data.error}`:current.status;
      publish({...current,status,events:[...current.events,{at:new Date().toISOString(),stage,data}]});
    };
    timer.current=setTimeout(()=>{
      if(active.current!==controller)return;
      const current=reportRef.current!;
      publish({...current,status:"Aikakatkaisu (30 s)",events:[...current.events,{at:new Date().toISOString(),stage:"timeout",data:{error:"Debug-haku ei valmistunut 30 sekunnissa. Tarkista viimeinen request/http/response-vaihe. Aikakatkaisu ei yksin todista Vercel-häiriötä."}}]});
      controller.abort();
    },30000);
    try{await runSearch(term,observe,controller.signal)}catch(error){observe("error",{error:String(error)})}
    finally{if(active.current===controller&&timer.current){clearTimeout(timer.current);timer.current=null}}
  }
  function save(){
    const payload={...(reportRef.current??{version:"desktop-search-debug-v2",status:"Ei debug-hakua vielä",events:[]}),exportedAt:new Date().toISOString(),page:{origin:location.origin,path:location.pathname,userAgent:navigator.userAgent,online:navigator.onLine},ui:snapshot};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
    const link=document.createElement("a");link.href=url;link.download=`ziiply-haku-debug-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;
    document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const button="rounded-lg border-2 border-[#17573c] bg-[#fff8df] px-3 py-2 text-sm font-bold text-[#17573c]";
  if(!mounted)return null;
  return createPortal(<aside aria-label="Normaalin tuotehaun debug" style={{position:"fixed",top:top+12,right:40,zIndex:2147483000,maxWidth:"calc(100vw - 80px)",maxHeight:`calc(100dvh - ${top+36}px)`,overflow:"auto"}} className="rounded-xl border-2 border-[#986b36] bg-[#f7e7bd] p-2 shadow-xl">
    <div className="mb-1 text-xs font-black text-[#17573c]">TUOTEHAKU · DEBUG v2</div>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={button} onClick={()=>{setOpen(true);void start()}}>Debug-haku</button>
      <button type="button" className={button} onClick={save}>Tallenna JSON</button>
      <button type="button" className={button} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?"Piilota":"Näytä raportti"}</button>
    </div>
    {open&&<div className="mt-2 w-[580px] max-w-full">
      <label className="block text-sm font-bold">Debug-hakusana<input value={input} onChange={e=>setInput(e.target.value)} placeholder={query||"Kirjoita hakusana"} className="ml-2 max-w-full rounded border bg-white px-2 py-1 text-black"/></label>
      <p role="status" className="my-2 text-sm font-bold">{report?.status||"Ei debug-hakua vielä"} · {report?.query||query}</p>
      <p className="text-xs">Sama tuotehaku ja valitut S-/K-kaupat. Uusi painallus aloittaa uuden debug-haun. Aikaraja 30 s.</p>
      <pre className="mt-2 max-h-[40vh] overflow-auto whitespace-pre-wrap break-all rounded bg-white p-2 text-xs text-black">{JSON.stringify(report??{ui:snapshot},null,2)}</pre>
    </div>}
  </aside>,document.body);
}

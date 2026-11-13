"use client";
import {useState} from "react";
export type NormalSearchTraceEvent={at:string;stage:string;data:unknown};
export default function DesktopNormalSearchTrace({events,onClear}:{events:NormalSearchTraceEvent[];onClear:()=>void}){
 const [open,setOpen]=useState(false);
 function download(){
  const payload={format:"ziiply-desktop-normal-search-trace-v1",exportedAt:new Date().toISOString(),page:typeof location!=="undefined"?location.pathname:"",userAgent:typeof navigator!=="undefined"?navigator.userAgent:"",eventCount:events.length,events};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download="ziiply-desktop-hakudebug-"+new Date().toISOString().replace(/[:.]/g,"-")+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <div className="shrink-0 rounded-xl border-2 border-[#986b36] bg-[#fff7df] p-2 text-[#173b2b]">
  <div className="flex flex-wrap items-center gap-2">
   <strong className="text-sm">Tuotehaun debug · {events.length} tapahtumaa</strong>
   <button type="button" onClick={()=>setOpen(v=>!v)} className="rounded border border-[#986b36] px-2 py-1 text-xs font-bold">{open?"Piilota":"Näytä loki"}</button>
   <button type="button" onClick={download} className="rounded bg-[#17573c] px-3 py-1 text-xs font-bold text-white">Tallenna JSON</button>
   <button type="button" onClick={onClear} className="rounded border border-[#986b36] px-2 py-1 text-xs font-bold">Tyhjennä</button>
  </div>
  {open&&<pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-all rounded bg-white p-2 text-[11px]">{JSON.stringify(events.slice(-120),null,2)}</pre>}
 </div>;
}

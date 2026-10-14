"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
const KEY="ziiply-desktop-recipe-search-debug-v1";
const EVENT="ziiply-desktop-recipe-debug-changed";
type Entry={at:string;stage:string;detail:unknown};
let entries:Entry[]=[];
export function readDesktopRecipeDebug():Entry[]{
 if(typeof window==="undefined")return [];
 if(!entries.length){try{const stored=JSON.parse(sessionStorage.getItem(KEY)||"[]");entries=Array.isArray(stored)?stored:[]}catch{entries=[]}}
 return entries;
}
export function appendDesktopRecipeDebug(stage:string,detail:unknown){
 if(typeof window==="undefined")return;
 entries=[...readDesktopRecipeDebug(),{at:new Date().toISOString(),stage,detail}];
 try{sessionStorage.setItem(KEY,JSON.stringify(entries))}catch{}
 window.dispatchEvent(new Event(EVENT));
}
export function startDesktopRecipeDebug(detail:unknown){
 entries=[];try{sessionStorage.removeItem(KEY)}catch{}
 appendDesktopRecipeDebug("recipe_input",detail);
}
export default function DesktopRecipeSearchDebug({active}:{active:boolean}){
 const [log,setLog]=useState<Entry[]>([]),[open,setOpen]=useState(false),[notice,setNotice]=useState("");
 const textRef=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{const update=()=>setLog([...readDesktopRecipeDebug()]);update();window.addEventListener(EVENT,update);return()=>window.removeEventListener(EVENT,update)},[]);
 useEffect(()=>{if(!open)return;const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};window.addEventListener("keydown",escape);textRef.current?.focus();return()=>window.removeEventListener("keydown",escape)},[open]);
 const text=open?JSON.stringify({version:"desktop-recipe-search-debug-v1",view:"desktop-preview",boundary:"Actual client requests and API responses; provider-internal upstream requests are not captured",events:log},null,2):"";
 const copy=async()=>{try{await navigator.clipboard.writeText(text);setNotice("DEBUG kopioitu.")}catch{textRef.current?.focus();textRef.current?.select();setNotice("Teksti valittu. Kopioi Cmd+C tai Ctrl+C.")}};
 return <>{(active||log.length>0)&&<button type="button" onClick={()=>{setOpen(true);setNotice("")}} className="fixed bottom-3 right-4 z-[180] rounded-lg border-2 border-[#b89552] bg-[#174c3a] px-4 py-2 text-xs font-black text-white shadow-lg">RESEPTI DEBUG ({log.length})</button>}
 {open&&typeof document!=="undefined"&&createPortal(<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-5"><section role="dialog" aria-modal="true" aria-label="Reseptin ostosten haun DEBUG" className="flex h-[min(85dvh,850px)] w-[min(1100px,96vw)] min-w-0 flex-col gap-3 rounded-2xl border-[3px] border-[#b89552] bg-[#fff8e5] p-4 shadow-2xl"><div className="flex shrink-0 flex-wrap items-center gap-3"><strong className="mr-auto text-[#174c3a]">Reseptin ostosten haku · DEBUG</strong><button type="button" onClick={()=>void copy()} className="rounded-lg bg-[#174c3a] px-4 py-2 font-bold text-white">Kopioi DEBUG</button><button type="button" onClick={()=>setOpen(false)} className="rounded-lg border border-[#b89552] px-4 py-2 font-bold">Sulje ×</button></div><p className="text-xs text-[#665b45]">Koko viimeisin haku: resepti, ainesvaiheet, API-vastaukset, hintamuunnokset, hylkäyssyyt ja korivalinnat. Tiedot säilyvät sivun päivityksessä; uusi haku aloittaa uuden lokin.</p><textarea ref={textRef} readOnly value={text} aria-label="Kopioitava reseptihaun DEBUG" className="min-h-0 flex-1 resize-none rounded-lg border border-[#b89552] bg-white p-3 font-mono text-xs text-[#26352b]"/><div role="status" className="min-h-5 text-sm font-bold text-[#174c3a]">{notice}</div></section></div>,document.body)}</>;
}

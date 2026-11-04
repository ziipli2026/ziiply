"use client";
import React from "react";
import { fetchSharedGostaWatch } from "../mobile/gostaWatchSharedRequest";

type Offer={query:string;title:string;price:string;store:string;source:string};
const TERMS="ziiply-gosta-offer-watches-v1";
const RESULTS="ziiply-gosta-watch-results-v1";
export default function DesktopGostaWatch(){
 const [terms,setTerms]=React.useState<string[]>([]);
 const [query,setQuery]=React.useState("");
 const [offers,setOffers]=React.useState<Offer[]>([]);
 const [ready,setReady]=React.useState(false);
 const [loading,setLoading]=React.useState(false);
 const [open,setOpen]=React.useState(false);
 const [error,setError]=React.useState("");
 const key=terms.map(x=>x.trim().toLocaleLowerCase("fi")).filter(Boolean).join("|");
 React.useEffect(()=>{
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(TERMS)||"[]");setTerms(Array.isArray(v)?v.filter((x:unknown):x is string=>typeof x==="string"&&!!x.trim()).slice(0,30):[]);}catch{setTerms([]);}};
  read();window.addEventListener("storage",read);window.addEventListener("ziiply-gosta-watch-changed",read);
  return()=>{window.removeEventListener("storage",read);window.removeEventListener("ziiply-gosta-watch-changed",read);};
 },[]);
 React.useEffect(()=>{
  setError("");
  setLoading(false);
  try{const cached=JSON.parse(localStorage.getItem(RESULTS)||"null");if(cached?.key===key&&Array.isArray(cached.offers)){setOffers(cached.offers);setReady(true);}}catch{}
  if(!key){setOffers([]);setReady(false);return;}
  let cancelled=false,running=false,last=0;
  const scan=async()=>{
   if(cancelled||running||document.visibilityState!=="visible")return;
   running=true;setLoading(true);
   try{
    const params=new URLSearchParams({q:key});
    // The watcher reads stored offers only; GPS must not delay the request.
    const {response,data}=await fetchSharedGostaWatch("/api/offers/watch?"+params.toString());
    if(!response.ok||!data.ok||!Array.isArray(data.results))throw Error(String(data.error||"Tarjoushaku epäonnistui"));
    const next:Offer[]=data.results.flatMap((offer:any)=>(Array.isArray(offer.watchQueries)&&offer.watchQueries.length?offer.watchQueries:[""]).map((term:string)=>({query:String(term),title:String(offer.title||offer.name||offer.productName||"Tarjous"),price:String(offer.offerPrice??offer.price??""),store:String(offer.storeName||offer.chain||""),source:String(offer.source||offer.chain||"")})));
    if(!cancelled){
     setOffers(current=>data.partial&&current.length>next.length?current:next);
     setReady(true);setError(data.partial?"Osa kaupoista jäi tarkistamatta.":"");
     if(!data.partial){try{localStorage.setItem(RESULTS,JSON.stringify({key,offers:next,at:Date.now()}));window.dispatchEvent(new Event("ziiply-gosta-watch-results-changed"));}catch{}}
     last=Date.now();
    }
   }catch(e){if(!cancelled)setError("Päivitys epäonnistui; aiemmat tulokset säilyvät.");}
   finally{running=false;if(!cancelled)setLoading(false);}
  };
  const timer=window.setTimeout(()=>{void scan();},0); // Every newly saved term changes key and triggers this immediately.
  const resume=()=>{if(document.visibilityState==="visible"&&Date.now()-last>5*60*1000)void scan();};
  const interval=window.setInterval(resume,60*1000);
  window.addEventListener("focus",resume);document.addEventListener("visibilitychange",resume);
  return()=>{cancelled=true;clearTimeout(timer);clearInterval(interval);window.removeEventListener("focus",resume);document.removeEventListener("visibilitychange",resume);};
 },[key]);
 const save=(next:string[])=>{const previous=new Set(terms.map(t=>t.toLocaleLowerCase("fi")));const added=next.some(t=>!previous.has(t.toLocaleLowerCase("fi")));localStorage.setItem(TERMS,JSON.stringify(next));setTerms(next);if(added)setError("");window.dispatchEvent(new Event("ziiply-gosta-watch-changed"));};
 return <section className="rounded-xl border border-amber-300 bg-amber-50/90 px-3 py-2 text-sm text-slate-900" aria-label="Göstan tarjousvahti">
  <div className="flex items-center justify-between gap-2">
   <strong>Göstan tarjousvahti</strong>
   {ready&&offers.length>0&&<button type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open} className="rounded-lg bg-amber-200 px-3 py-1 font-bold">🛍️ {offers.length}</button>}
  </div>
  <form className="mt-2 flex gap-2" onSubmit={e=>{e.preventDefault();const q=query.trim();if(q){save([q,...terms.filter(x=>x.toLocaleLowerCase("fi")!==q.toLocaleLowerCase("fi"))].slice(0,30));setQuery("");}}}>
   <input aria-label="Vahdittava hakusana" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Lisää vahti, esim. kahvi" className="min-w-0 flex-1 rounded-md border px-2 py-1"/>
   <button className="rounded-md bg-amber-200 px-3 font-semibold" type="submit">Tallenna</button>
  </form>
  {terms.length>0&&<div className="mt-2 flex flex-wrap gap-2">{terms.map(term=><button key={term} type="button" title="Poista vahti" onClick={()=>save(terms.filter(x=>x!==term))} className="rounded-full border border-amber-300 px-2 py-0.5">{term} ×</button>)}</div>}
  {loading&&<p className="mt-1 text-xs text-slate-600">Tarkistetaan tarjouksia…</p>}
  {error&&<p className="mt-1 text-xs text-amber-800">{error}</p>}
  {ready&&offers.length===0&&<p className="mt-1 text-xs">Ei tarjousosumia.</p>}
  {open&&ready&&<div className="mt-2 max-h-64 overflow-y-auto">{offers.map((o,i)=><div key={i} className="border-t border-amber-200 py-1"><strong>{o.title}</strong> · {o.price} · {o.store} <span className="text-xs">({o.query})</span></div>)}</div>}
 </section>;
}

"use client";
import React from "react";
import { fetchSharedGostaWatch } from "../mobile/gostaWatchSharedRequest";

import { mapWatchOffers, readWatchResults, saveWatchResults, watchCartPrice, watchPackageSize, type WatchOffer } from "../mobile/gostaWatchResults";

type Props = { onAddOffer: (offer: WatchOffer) => boolean };
const TERMS="ziiply-gosta-offer-watches-v1";
export default function DesktopGostaWatch({ onAddOffer }: Props){
 const [terms,setTerms]=React.useState<string[]>([]);
 const [query,setQuery]=React.useState("");
 const [offers,setOffers]=React.useState<WatchOffer[]>([]);
 const [ready,setReady]=React.useState(false);
 const [loading,setLoading]=React.useState(false);
 const [open,setOpen]=React.useState(true);
 const [error,setError]=React.useState("");
 const [notice,setNotice]=React.useState("");
 const [checkedKey,setCheckedKey]=React.useState("");
 const key=terms.map(x=>x.trim().toLocaleLowerCase("fi")).filter(Boolean).join("|");
 React.useEffect(()=>{
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(TERMS)||"[]");setTerms(Array.isArray(v)?v.filter((x:unknown):x is string=>typeof x==="string"&&!!x.trim()).slice(0,30):[]);}catch{setTerms([]);}};
  read();window.addEventListener("storage",read);window.addEventListener("ziiply-gosta-watch-changed",read);
  return()=>{window.removeEventListener("storage",read);window.removeEventListener("ziiply-gosta-watch-changed",read);};
 },[]);
 React.useEffect(()=>{
  setError("");
  setLoading(false);
  if (!key) { setOffers([]); setReady(false); return; }
  const cached = readWatchResults();
  setOffers(cached?.offers ?? []);
  setReady(Boolean(cached));
  let cancelled=false,running=false,last=0;
  const scan=async()=>{
   if(cancelled||running||document.visibilityState!=="visible")return;
   running=true;setLoading(true);
   const started=Date.now();
   try{
    const params=new URLSearchParams({q:key});
    // Store-scoped offer watch requires coordinates, just like the mobile API.
    // Never silently fall back to old nationwide publication-only results.
    if(!navigator.geolocation)throw Error("Sijaintitieto ei ole käytettävissä");
    const position=await new Promise<GeolocationPosition>((resolve,reject)=>
      navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,maximumAge:300000,timeout:6000}));
    params.set("lat",String(position.coords.latitude));
    params.set("lon",String(position.coords.longitude));
    const {response,data}=await fetchSharedGostaWatch("/api/offers/watch?"+params.toString());
    if(!response.ok||!data.ok||!Array.isArray(data.results))throw Error(String(data.error||"Tarjoushaku epäonnistui"));
    if (!cancelled) {
     saveWatchResults(key, mapWatchOffers(data.results, key.split("|")), Boolean(data.partial), started);
     setOffers(readWatchResults()?.offers ?? []);
     setReady(true);
     setCheckedKey(key);
     setError(data.partial ? "Osa kaupoista jäi tarkistamatta." : "");
     last=Date.now();
    }
   }catch(e){if(!cancelled)setError((e instanceof Error && (/Sijaintitieto/.test(e.message)||e.name==="GeolocationPositionError"))?"Salli selaimessa sijainti Göstan lähikauppatarjousten hakemiseksi. Aiemmat tulokset säilyvät.":"Päivitys epäonnistui; aiemmat tulokset säilyvät.");}
   finally{running=false;if(!cancelled)setLoading(false);}
  };
  const timer=window.setTimeout(()=>{void scan();},0); // Every newly saved term changes key and triggers this immediately.
  const resume=()=>{if(document.visibilityState==="visible"&&Date.now()-last>5*60*1000)void scan();};
  const interval=window.setInterval(resume,60*1000);
  window.addEventListener("focus",resume);document.addEventListener("visibilitychange",resume);
  return()=>{cancelled=true;clearTimeout(timer);clearInterval(interval);window.removeEventListener("focus",resume);document.removeEventListener("visibilitychange",resume);};
 },[key]);
 const save=(next:string[])=>{const previous=new Set(terms.map(t=>t.toLocaleLowerCase("fi")));const added=next.find(t=>!previous.has(t.toLocaleLowerCase("fi")));localStorage.setItem(TERMS,JSON.stringify(next));setTerms(next);setCheckedKey("");setNotice(added?`Vahti tallennettu. Tarjoukset ilmoitetaan haun valmistuttua, mikäli niitä on.`:"Vahtilista päivitetty.");setError("");window.dispatchEvent(new Event("ziiply-gosta-watch-changed"));};
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
  {notice&&<p role="status" className="mt-1 text-xs text-emerald-800">{notice}</p>}
  {loading&&<p className="mt-1 text-xs text-slate-600">Tarkistetaan tarjouksia…</p>}
  {error&&<p className="mt-1 text-xs text-amber-800">{error}</p>}
  {ready&&checkedKey===key&&!loading&&offers.length===0&&<p className="mt-1 text-xs">Tarkistus valmis: ei voimassa olevia tarjousosumia.</p>}
  {open && ready && <div className="mt-2 max-h-64 overflow-y-auto">
   {offers.map((offer, index) => {
    const pricing = watchCartPrice(offer);
    const packageSize = watchPackageSize(offer);
    return <div key={index} className="flex items-center justify-between gap-2 border-t border-amber-200 py-2">
     <div className="min-w-0">
      <strong>{offer.title}</strong>
      <div>{offer.store} · {offer.query}</div>
      <div>{[packageSize, offer.comparisonPrice].filter(Boolean).join(" · ")}</div>
     </div>
     {pricing && <div className="shrink-0 text-right">
      <strong>{pricing.price.toLocaleString("fi-FI", { style: "currency", currency: "EUR" })}{pricing.weighted ? "/kg" : ""}</strong>
      <button type="button" className="ml-2 rounded-md bg-amber-200 px-2 py-1" onClick={() => {
       if (onAddOffer(offer)) setNotice("Tarjous lisätty ostoskoriin.");
      }}>Lisää ostoskoriin</button>
     </div>}
    </div>;
   })}
  </div>}
 </section>;
}

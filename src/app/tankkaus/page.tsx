"use client";

import { useEffect, useState } from "react";
import DesktopFuelPhotoReport from "../components/ziiply/desktop/DesktopFuelPhotoReport";

type Station = { id:string; name:string; chain?:string; address?:string; distanceKm:number; diesel:number|null; price95:number|null; price98:number|null; observedDiesel?:string|null; observed95?:string|null; observed98?:string|null };
type Coords = {lat:number;lon:number};
const fmt=(n:number|null)=>n==null||!Number.isFinite(n)?"–":n.toLocaleString("fi-FI",{minimumFractionDigits:3,maximumFractionDigits:3});
export default function TankkausPage(){
 const [mode,setMode]=useState<"home"|"prices"|"report">("home");
 const [embedded,setEmbedded]=useState(false);
 useEffect(()=>{
  const send=()=>{
   if(window.parent===window)return;
   const selectors=["html","body","main","main > div","main section","main section > div","main section > div + div",'[role="dialog"]'];
   const layers=selectors.map(selector=>{const el=document.querySelector(selector);if(!el)return {selector,found:false};const cs=getComputedStyle(el),r=el.getBoundingClientRect();return {selector,found:true,tag:el.tagName,classes:String(el.className).slice(0,220),background:cs.backgroundColor,border:cs.border,shadow:cs.boxShadow,position:cs.position,zIndex:cs.zIndex,rect:{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}}});
   window.parent.postMessage({type:"ziiply-fuel-debug",payload:{time:new Date().toISOString(),url:location.href,viewport:{width:innerWidth,height:innerHeight},layers}}, "https://ziiply.fi");
  };
  send();const id=window.setInterval(send,3000);return()=>window.clearInterval(id);
 },[mode,embedded]);

 useEffect(()=>{const params=new URLSearchParams(window.location.search);const requested=params.get("mode");if(requested==="prices"||requested==="report"){setMode(requested);setEmbedded(true);}},[]);
 useEffect(()=>{if(!embedded)return;const previousBody=document.body.style.background;const previousHtml=document.documentElement.style.background;document.body.style.setProperty("background","transparent","important");document.documentElement.style.setProperty("background","transparent","important");return()=>{document.body.style.background=previousBody;document.documentElement.style.background=previousHtml;};},[embedded]);
 const [coords,setCoords]=useState<Coords|null>(null);
 const [stations,setStations]=useState<Station[]>([]);
 const [status,setStatus]=useState("Sijaintia ei ole vielä haettu.");
 const [loading,setLoading]=useState(false);
 const [fuel,setFuel]=useState<"diesel"|"price95"|"price98">("price95");
 const radius=100;
 const load=()=>{
  if(!navigator.geolocation){setStatus("Selain ei tue paikannusta.");return;}
  setLoading(true);setStatus("Haetaan sijaintia…");
  navigator.geolocation.getCurrentPosition(async pos=>{
   const point={lat:pos.coords.latitude,lon:pos.coords.longitude};setCoords(point);
   try{
    const response=await fetch(`/api/fuel/stations?lat=${point.lat}&lon=${point.lon}`,{cache:"no-store"});
    if(!response.ok)throw Error("Asemien haku epäonnistui.");
    const data=await response.json();
    if(!data.ok||!Array.isArray(data.stations))throw Error("Hintatietoja ei saatu.");
    setStations(data.stations);setStatus("Hinnat järjestetty sijaintisi perusteella.");
   }catch(e){setStatus(e instanceof Error?e.message:"Haku epäonnistui.");}finally{setLoading(false);}
  },e=>{setStatus("Sijaintia ei saatu: "+e.message+". Salli sijainti selaimessa.");setLoading(false);},{enableHighAccuracy:false,timeout:12000,maximumAge:60000});
 };
 useEffect(()=>{if(mode==="prices"&&!coords)load();},[mode]);
 const visible=stations.filter(s=>s.distanceKm<=radius&&s[fuel]!=null).sort((a,b)=>(a[fuel]??99)-(b[fuel]??99)||a.distanceKm-b.distanceKm);
 return <main className={embedded ? "h-dvh overflow-hidden bg-transparent p-0 text-[#174c35]" : "min-h-screen bg-[#fff4cf] px-4 py-8 text-[#174c35]"}>
  <div className={embedded ? "mx-auto h-full max-w-[720px]" : "mx-auto max-w-5xl"}>
   {!embedded&&<header className="mb-7 text-center"><a href="/" className="text-sm font-bold underline">Ziiply.fi</a><h1 className="mt-3 text-4xl font-black">Tankataan yhdessä halvemmalla!</h1><p className="mt-2 text-lg font-bold">Yksi kuva. Kaikkien hyöty.</p><p className="mt-2">Auta muita autoilijoita ilmoittamalla polttoainehintoja. Hintojen katselu on aina ilmaista.</p></header>}
   {!embedded&&<nav className="mb-6 grid grid-cols-2 gap-3"><button onClick={()=>setMode("report")} className="rounded-2xl border-2 border-[#17573c] bg-[#e3edc9] p-5 text-lg font-black shadow">📷 Ilmoita hinnat</button><button onClick={()=>setMode("prices")} className="rounded-2xl border-2 border-[#17573c] bg-white p-5 text-lg font-black shadow">⛽ Katso hinnat</button></nav>}
   {mode==="home"&&<p className="text-center">Valitse hintojen ilmoittaminen tai lähialueen hintojen katselu.</p>}
   {mode==="prices"&&<section className={embedded ? "h-full min-h-0 flex flex-col rounded-[28px] border-[3px] border-[#754322] bg-[#fff4cf] p-2 sm:p-3 overflow-hidden" : "rounded-[28px] border-[3px] border-[#754322] bg-[#f3e4c1] p-2 sm:p-4 shadow-inner h-[min(76dvh,900px)] flex flex-col min-h-0"}>
    <div className={`flex items-center gap-2 rounded-[22px] border-2 border-[#c9a15b] bg-[#f9eac4] p-2 sm:p-3 `}>
      <button onClick={()=>setFuel("diesel")} aria-pressed={fuel==="diesel"} className={`flex-1 rounded-2xl border-[3px] px-2 py-3 font-bold text-xs sm:text-sm ${fuel==="diesel"?"bg-[#d8eaf4] border-[#79a8bf] text-[#20577b]":"bg-[#e9f4fa] border-[#9cbcca] text-[#20577b]"}`}>DI · Näytä halvin diesel</button>
      <h2 className="hidden sm:block shrink-0 text-center font-serif text-base italic font-black text-[#20523d]">Göstan<br/>polttoainevertailu</h2>
      <button onClick={()=>setFuel("price95")} aria-pressed={fuel==="price95"} className={`flex-1 rounded-2xl border-[3px] px-2 py-3 font-bold text-xs sm:text-base ${fuel==="price95"?"bg-[#f4dfc1] border-[#d5a46d] text-[#92501e]":"bg-[#fff0d9] border-[#d5a46d] text-[#92501e]"}`}>95 · Näytä halvin bensa</button>
      {embedded&&<button type="button" aria-label="Sulje hintavertailu" onClick={()=>window.parent.postMessage({type:"ziiply-fuel-close"},"https://ziiply.fi")} className="shrink-0 h-11 w-11 rounded-full border-[3px] border-[#17573c] bg-[#754322] text-2xl font-bold text-white" >×</button>}
    </div>
    <h2 className="sm:hidden text-center font-serif italic font-black text-[#20523d] py-1">Göstan polttoainevertailu</h2>
    <div className="mt-0 flex min-h-0 flex-1 flex-col rounded-[24px] border-[3px] border-[#c59a53] bg-[#fff4cf] p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
       <span className="font-semibold">Kaikki ketjut · Edullisin ensin · 100 km säteellä</span>
       <button onClick={load} disabled={loading} className="rounded-lg bg-[#17573c] px-3 py-1.5 font-bold text-white disabled:opacity-50">Päivitä sijainti</button>
      </div>
      <p role="status" className="my-2 text-center text-xs text-[#685b46]">{status}</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
       <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{visible.map(s=><article key={s.id} className="rounded-xl border border-[#c59a53] bg-[#fff9e6] p-3"><h3 className="font-black">{s.name}</h3><p className="text-sm">{s.address}</p><p className="text-xs font-semibold">{s.distanceKm.toLocaleString("fi-FI",{maximumFractionDigits:1})} km päässä</p><div className="mt-2 grid grid-cols-3 gap-1">{([["95E10",s.price95,s.observed95,"price95"],["98E5",s.price98,s.observed98,"price98"],["Diesel",s.diesel,s.observedDiesel,"diesel"]] as const).map(([label,value,observed,key])=><div key={key} className={`min-w-0 rounded-lg border p-1.5 text-center ${fuel===key?"border-[#17573c] bg-[#e3edc9]":"border-[#d5c6a6] bg-white"}`}><div className="text-xs font-bold">{label}</div><div className="text-base font-black tabular-nums">{fmt(value)}</div><div className="text-[10px]">€/l</div><div className="text-[10px] leading-tight">{observed?new Date(observed).toLocaleString("fi-FI",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}):"Ei havaintoa"}</div></div>)}</div></article>)}</div>
       {!loading&&coords&&visible.length===0&&<p className="text-center py-10">Ei ilmoitettuja hintoja tällä alueella ja polttoainetyypillä.</p>}
      </div>
    </div>
   </section>}
   {mode==="report"&&<DesktopFuelPhotoReport embedded={embedded} onClose={()=>{if(embedded&&window.parent!==window){window.parent.postMessage({type:"ziiply-fuel-close"},"https://ziiply.fi");}else{setMode("home");}}}/>}
  </div>
 </main>;
}

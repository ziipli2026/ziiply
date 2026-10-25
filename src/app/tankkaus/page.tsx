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
 const [radius,setRadius]=useState(25);
 const [order,setOrder]=useState<"distance"|"price">("distance");
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
 const visible=stations.filter(s=>s.distanceKm<=radius&&s[fuel]!=null).sort((a,b)=>order==="distance"?a.distanceKm-b.distanceKm:(a[fuel]??99)-(b[fuel]??99)||a.distanceKm-b.distanceKm);
 return <main className={embedded ? "h-dvh overflow-hidden bg-transparent p-0 text-[#174c35]" : "min-h-screen bg-[#fff4cf] px-4 py-8 text-[#174c35]"}>
  <div className={embedded ? "mx-auto h-full max-w-5xl" : "mx-auto max-w-5xl"}>
   {!embedded&&<header className="mb-7 text-center"><a href="/" className="text-sm font-bold underline">Ziiply.fi</a><h1 className="mt-3 text-4xl font-black">Tankataan yhdessä halvemmalla!</h1><p className="mt-2 text-lg font-bold">Yksi kuva. Kaikkien hyöty.</p><p className="mt-2">Auta muita autoilijoita ilmoittamalla polttoainehintoja. Hintojen katselu on aina ilmaista.</p></header>}
   {!embedded&&<nav className="mb-6 grid grid-cols-2 gap-3"><button onClick={()=>setMode("report")} className="rounded-2xl border-2 border-[#17573c] bg-[#e3edc9] p-5 text-lg font-black shadow">📷 Ilmoita hinnat</button><button onClick={()=>setMode("prices")} className="rounded-2xl border-2 border-[#17573c] bg-white p-5 text-lg font-black shadow">⛽ Katso hinnat</button></nav>}
   {mode==="home"&&<p className="text-center">Valitse hintojen ilmoittaminen tai lähialueen hintojen katselu.</p>}
   {mode==="prices"&&<section className={embedded ? "h-full min-h-0 flex flex-col bg-transparent p-0" : "rounded-[28px] border-[3px] border-[#754322] bg-[#f3e4c1] p-2 sm:p-4 shadow-inner h-[min(76dvh,900px)] flex flex-col min-h-0"}>
    <div className={`flex items-center gap-2 rounded-[22px] border-2 border-[#c9a15b] bg-[#f9eac4] p-2 sm:p-3 `}>
      <button onClick={()=>setFuel("diesel")} aria-pressed={fuel==="diesel"} className={`flex-1 rounded-2xl border-[3px] px-2 py-3 font-bold text-xs sm:text-base ${fuel==="diesel"?"bg-[#d8eaf4] border-[#79a8bf] text-[#20577b]":"bg-[#e9f4fa] border-[#9cbcca] text-[#20577b]"}`}>DI · Näytä halvin diesel</button>
      <h2 className="hidden sm:block shrink-0 text-center font-serif text-xl italic font-black text-[#20523d]">Göstan<br/>polttoainevertailu</h2>
      <button onClick={()=>setFuel("price95")} aria-pressed={fuel==="price95"} className={`flex-1 rounded-2xl border-[3px] px-2 py-3 font-bold text-xs sm:text-base ${fuel==="price95"?"bg-[#f4dfc1] border-[#d5a46d] text-[#92501e]":"bg-[#fff0d9] border-[#d5a46d] text-[#92501e]"}`}>95 · Näytä halvin bensa</button>
      {embedded&&<button type="button" aria-label="Sulje hintavertailu" onClick={()=>window.parent.postMessage({type:"ziiply-fuel-close"},"https://ziiply.fi")} className="shrink-0 h-11 w-11 rounded-full border-[3px] border-[#17573c] bg-[#754322] text-2xl font-bold text-white" >×</button>}
    </div>
    <h2 className="sm:hidden text-center font-serif italic font-black text-[#20523d] py-1">Göstan polttoainevertailu</h2>
    <div className="mt-2 flex min-h-0 flex-1 flex-col rounded-[24px] border-[3px] border-[#c59a53] bg-[#fff4cf] p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
       <span className="font-semibold">Kaikki ketjut</span>
       <label>Polttoaine <select aria-label="Polttoaine" value={fuel} onChange={e=>setFuel(e.target.value as typeof fuel)} className="rounded border p-1"><option value="price95">95E10</option><option value="price98">98E5</option><option value="diesel">Diesel</option></select></label>
       <label>Alue <select aria-label="Hakualue" value={radius} onChange={e=>setRadius(Number(e.target.value))} className="rounded border p-1"><option value={10}>10 km</option><option value={25}>25 km</option><option value={50}>50 km</option><option value={100}>100 km</option></select></label>
       <label>Järjestys <select aria-label="Järjestys" value={order} onChange={e=>setOrder(e.target.value as typeof order)} className="rounded border p-1"><option value="distance">Lähin ensin</option><option value="price">Halvin ensin</option></select></label>
       <button onClick={load} disabled={loading} className="rounded-lg bg-[#17573c] px-3 py-1.5 font-bold text-white disabled:opacity-50">Päivitä sijainti</button>
      </div>
      <p role="status" className="my-2 text-center text-xs text-[#685b46]">{status}</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
       <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{visible.map(s=><article key={s.id} className="rounded-xl border border-[#c59a53] bg-[#fff9e6] p-3"><h3 className="font-black">{s.name}</h3><p className="text-sm">{s.address}</p><p className="my-1 text-2xl font-black">{fmt(s[fuel])} €/l</p><p className="text-sm">{s.distanceKm.toLocaleString("fi-FI",{maximumFractionDigits:1})} km</p><p className="text-xs">Havainto: {(()=>{const t=fuel==="diesel"?s.observedDiesel:fuel==="price95"?s.observed95:s.observed98;return t?new Date(t).toLocaleString("fi-FI"):"Ei aikaleimaa";})()}</p></article>)}</div>
       {!loading&&coords&&visible.length===0&&<p className="text-center py-10">Ei ilmoitettuja hintoja tällä alueella ja polttoainetyypillä.</p>}
      </div>
    </div>
   </section>}
   {mode==="report"&&<DesktopFuelPhotoReport embedded={embedded} onClose={()=>{if(embedded&&window.parent!==window){window.parent.postMessage({type:"ziiply-fuel-close"},"https://ziiply.fi");}else{setMode("home");}}}/>}
  </div>
 </main>;
}

"use client";

import { useEffect, useState } from "react";
import DesktopFuelPhotoReport from "../components/ziiply/desktop/DesktopFuelPhotoReport";

type Station = { id:string; name:string; chain?:string; address?:string; distanceKm:number; diesel:number|null; price95:number|null; price98:number|null; observedDiesel?:string|null; observed95?:string|null; observed98?:string|null };
type Coords = {lat:number;lon:number};
const fmt=(n:number|null)=>n==null||!Number.isFinite(n)?"–":n.toLocaleString("fi-FI",{minimumFractionDigits:3,maximumFractionDigits:3});
export default function TankkausPage(){
 const [mode,setMode]=useState<"home"|"prices"|"report">("home");
 const [embedded,setEmbedded]=useState(false);
 useEffect(()=>{const params=new URLSearchParams(window.location.search);const requested=params.get("mode");if(requested==="prices"||requested==="report"){setMode(requested);setEmbedded(true);}},[]);
 const [coords,setCoords]=useState<Coords|null>(null);
 const [stations,setStations]=useState<Station[]>([]);
 const [status,setStatus]=useState("Sijaintia ei ole vielä haettu.");
 const [loading,setLoading]=useState(false);
 const [fuel,setFuel]=useState<"diesel"|"price95"|"price98">("price95");
 const [radius,setRadius]=useState(25);
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
 return <main className="min-h-screen bg-[#fff4cf] px-4 py-8 text-[#174c35]">
  <div className="mx-auto max-w-5xl">
   {!embedded&&<header className="mb-7 text-center"><a href="/" className="text-sm font-bold underline">Ziiply.fi</a><h1 className="mt-3 text-4xl font-black">Tankataan yhdessä halvemmalla!</h1><p className="mt-2 text-lg font-bold">Yksi kuva. Kaikkien hyöty.</p><p className="mt-2">Auta muita autoilijoita ilmoittamalla polttoainehintoja. Hintojen katselu on aina ilmaista.</p></header>}
   {!embedded&&<nav className="mb-6 grid grid-cols-2 gap-3"><button onClick={()=>setMode("report")} className="rounded-2xl border-2 border-[#17573c] bg-[#e3edc9] p-5 text-lg font-black shadow">📷 Ilmoita hinnat</button><button onClick={()=>setMode("prices")} className="rounded-2xl border-2 border-[#17573c] bg-white p-5 text-lg font-black shadow">⛽ Katso hinnat</button></nav>}
   {mode==="home"&&<p className="text-center">Valitse hintojen ilmoittaminen tai lähialueen hintojen katselu.</p>}
   {mode==="prices"&&<section className="rounded-2xl border-2 border-[#17573c] bg-white p-4">
    <div className="flex flex-wrap items-center gap-3"><label className="font-bold">Polttoaine <select aria-label="Polttoaine" value={fuel} onChange={e=>setFuel(e.target.value as typeof fuel)} className="ml-2 rounded border p-2"><option value="price95">95E10</option><option value="price98">98E5</option><option value="diesel">Diesel</option></select></label><label className="font-bold">Etäisyys <select aria-label="Etäisyys" value={radius} onChange={e=>setRadius(Number(e.target.value))} className="ml-2 rounded border p-2"><option value={10}>10 km</option><option value={25}>25 km</option><option value={50}>50 km</option><option value={100}>100 km</option></select></label><button onClick={load} disabled={loading} className="rounded-lg bg-[#17573c] px-4 py-2 font-bold text-white disabled:opacity-50">Päivitä sijainti</button></div>
    <p role="status" className="my-3 text-sm">{status}</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visible.map(s=><article key={s.id} className="rounded-xl border border-[#b38a4a] bg-[#fff9e6] p-4"><h2 className="font-black">{s.name}</h2><p className="text-sm">{s.address}</p><p className="my-2 text-2xl font-black">{fmt(s[fuel])} €/l</p><p className="text-sm">{s.distanceKm.toLocaleString("fi-FI",{maximumFractionDigits:1})} km</p><p className="text-xs">Havainto: {(()=>{const t=fuel==="diesel"?s.observedDiesel:fuel==="price95"?s.observed95:s.observed98;return t?new Date(t).toLocaleString("fi-FI"):"Ei aikaleimaa";})()}</p></article>)}</div>
    {!loading&&coords&&visible.length===0&&<p>Ei ilmoitettuja hintoja tällä alueella ja polttoainetyypillä.</p>}
   </section>}
   {mode==="report"&&<DesktopFuelPhotoReport onClose={()=>setMode("home")}/>}
  </div>
 </main>;
}

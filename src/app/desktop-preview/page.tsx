"use client";

import { useEffect, useState } from "react";

type Assistant = "gosta" | "justiina" | "arvo";

const assistants = [
  {
    key: "gosta" as const,
    name: "Gösta",
    title: "Tarjoukset",
    subtitle: "Hinnat ja tarjoukset",
    image: "/assistants/gosta.png",
    frame: "border-[#8bb56d] bg-gradient-to-b from-[#f4ffe3] via-[#e0f0bd] to-[#c6dc91]",
    ink: "text-[#244a28]",
  },
  {
    key: "justiina" as const,
    name: "Justiina",
    title: "Reseptit",
    subtitle: "Ruokaideat ja haku",
    image: "/assistants/justiina.png",
    frame: "border-[#c69655] bg-gradient-to-b from-[#fff6da] via-[#ffe9a2] to-[#edc66c]",
    ink: "text-[#6b331e]",
  },
  {
    key: "arvo" as const,
    name: "Arvo",
    title: "Asetukset",
    subtitle: "Omat valinnat",
    image: "/assistants/arvo.png",
    frame: "border-[#b99d62] bg-gradient-to-b from-[#fff3d0] via-[#ead4a1] to-[#d3b474]",
    ink: "text-[#314633]",
  },
];

export default function DesktopPreviewPage() {
  const [active, setActive] = useState<Assistant>("justiina");
  const [scannerMode, setScannerMode] = useState<"checking" | "camera" | "external">("checking");
  const [workspace, setWorkspace] = useState<Assistant | null>(null);
  const [location, setLocation] = useState("");
  const [gpsOn, setGpsOn] = useState(true);
  const [appliedLocation, setAppliedLocation] = useState("GPS");
  const [locationStatus, setLocationStatus] = useState("Haetaan GPS-sijaintia…");
  const [mapOpen, setMapOpen] = useState(false);
  const [weather, setWeather] = useState({ value: "—", detail: "haetaan" });
  const [electricity, setElectricity] = useState({ value: "—", detail: "haetaan" });
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStores, setSelectedStores] = useState<Record<string, any>>({});
  const [storeMode, setStoreMode] = useState<"hyper" | "local">("hyper");
  const [storeModeChosen, setStoreModeChosen] = useState(false);
  const [storeCompareScope, setStoreCompareScope] = useState<"none" | "between_chains" | "within_chain">("none");
  const [betweenMode, setBetweenMode] = useState<"one" | "many">("one");
  const [withinChain, setWithinChain] = useState<"S" | "K" | null>(null);
  const [storePickerOpen, setStorePickerOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems] = useState<any[]>([]);
  const now = new Date();
  const month = ["TAMMIKUU","HELMIKUU","MAALISKUU","HUHTIKUU","TOUKOKUU","KESÄKUU","HEINÄKUU","ELOKUU","SYYSKUU","LOKAKUU","MARRASKUU","JOULUKUU"][now.getMonth()];

  function applyLocation() {
    const value = location.trim();
    if (!value) return;
    setAppliedLocation(value);
    setGpsOn(false);
    setLocationStatus(`Valittu sijainti: ${value}`);
    fetch(`/api/store-search?search=${encodeURIComponent(value)}`, {cache:"no-store"}).then(r=>r.json()).then(d=>{ const items=Array.isArray(d?.items)?d.items:[]; setStores(items); if(items.length) setSelectedStores({}); }).catch(()=>setStores([]));
  }

  function useGps() {
    if (!navigator.geolocation) {
      setLocationStatus("Sijaintia ei tueta tällä laitteella");
      return;
    }
    setLocationStatus("Haetaan sijaintia…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGpsOn(true);
        setAppliedLocation(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
        setLocationStatus("GPS-sijainti käytössä");
        fetch(`/api/store-search?gps=1&lat=${coords.latitude}&lon=${coords.longitude}`, {cache:"no-store"}).then(r=>r.json()).then(d=>{ const items=Array.isArray(d?.items)?d.items:[]; setStores(items); if(items.length) setSelectedStores({}); }).catch(()=>setStores([]));
      },
      () => setLocationStatus("Sijainnin käyttö ei onnistunut"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }


  useEffect(() => { useGps(); }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("https://api.porssisahko.net/v1/latest-prices.json", { cache: "no-store" }).then(r => r.json()).then(data => {
      const prices = Array.isArray(data?.prices) ? data.prices : [];
      const t = Date.now();
      const current = prices.find((p: any) => { const a = new Date(p.startDate ?? p.start).getTime(); const b = new Date(p.endDate ?? p.end).getTime(); return a <= t && t < b; });
      const n = Number(current?.price ?? current?.value ?? current?.priceWithTax);
      if (!cancelled && Number.isFinite(n)) setElectricity({ value: n.toLocaleString("fi-FI",{maximumFractionDigits:1}), detail: "c/kWh nyt" });
    }).catch(() => { if (!cancelled) setElectricity({value:"—",detail:"ei saatavilla"}); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({coords}) => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code&timezone=auto`, {cache:"no-store"});
        const d = await r.json(); const temp = Number(d?.current?.temperature_2m);
        if (Number.isFinite(temp)) setWeather({value:`${temp >= 0 ? "+" : ""}${Math.round(temp)}°`,detail: appliedLocation});
      } catch {}
    }, () => setWeather({value:"—",detail:appliedLocation}), {maximumAge:300000,timeout:5500});
  }, [appliedLocation]);

  useEffect(() => {
    const value = location.trim();
    if (!value || value === appliedLocation) return;
    const timer = window.setTimeout(() => applyLocation(), 1200);
    return () => window.clearTimeout(timer);
  }, [location]);

  useEffect(() => {
    const value = location.trim();
    if (!value || value === appliedLocation) return;
    const timer = window.setTimeout(() => applyLocation(), 1200);
    return () => window.clearTimeout(timer);
  }, [location]);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices?.enumerateDevices().then((devices) => {
      const cameras = devices.filter((d) => d.kind === "videoinput");
      const rear = cameras.some((d) => /(back|rear|environment|world|takakamera)/i.test(d.label));
      const touch = navigator.maxTouchPoints > 1;
      if (!cancelled) setScannerMode(rear || (touch && cameras.length > 0) ? "camera" : "external");
    }).catch(() => { if (!cancelled) setScannerMode("external"); });
    return () => { cancelled = true; };
  }, []);

  return (
    <main
      className="relative h-[100dvh] overflow-hidden text-[#050b2b] selection:bg-[#d9b96f]/35"
      style={{
        background:
          "radial-gradient(circle at 18% 5%, rgba(255,249,232,0.98) 0%, rgba(240,237,220,0.92) 25%, rgba(225,232,220,0.97) 52%, rgba(209,221,211,1) 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.11]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 16%, rgba(255,255,255,0.62) 0 1px, transparent 1.8px), radial-gradient(circle at 72% 42%, rgba(122,97,49,0.12) 0 1px, transparent 2px)",
          backgroundSize: "34px 34px, 48px 48px",
        }}
      />

      <div aria-hidden className="pointer-events-none absolute -left-32 top-24 h-[520px] w-[520px] rounded-full bg-[#f6e8b8]/35 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-40 bottom-[-80px] h-[620px] w-[620px] rounded-full bg-[#8ead91]/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute left-[44%] top-[10%] h-[190px] w-[190px] rotate-12 rounded-[44px] border border-[#8c7042]/10 bg-[#fff7df]/18 shadow-[0_30px_80px_rgba(70,60,35,0.05)]" />

      <div className="relative mx-auto flex h-[100dvh] w-full max-w-[1560px] flex-col px-8 py-5 xl:px-12 xl:py-6">
        <header className="grid grid-cols-[auto_minmax(520px,1fr)_minmax(380px,0.72fr)] items-center gap-5 border-b border-[#64745f]/20 pb-4">
          <div className="flex items-center gap-3">
            <img src="/ziiplylogo_mobile.png" alt="Ziiply" className="h-[66px] w-[66px] object-contain drop-shadow-[0_4px_10px_rgba(21,79,50,0.10)]" />
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.22em] text-[#6d765f]">Yksi haku. Kaikki hinnat.</div>
              <div className="mt-0.5 text-[17px] font-black text-[#314633]">Ziiply</div>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-[760px] grid-cols-4 gap-2.5">
            {[
              ["☀️", "SÄÄ", weather.value, weather.detail, "from-[#fffdf0] to-[#ffedb8] border-[#b5cbb4]"],
              ["⚡", "SÄHKÖ", electricity.value, electricity.detail, "from-[#fff6ce] to-[#ffdf75] border-[#d2b363]"],
              ["⛽", "AJOAINE", "—", "€/l", "from-[#fff1da] to-[#ffc795] border-[#c78b63]"],
            ].map(([icon, title, value, detail, theme]) => (
              <button key={title} type="button" className={`group relative flex h-[66px] items-center gap-3 rounded-[19px] border bg-gradient-to-b ${theme} px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_4px_10px_rgba(52,48,32,.10)] transition hover:-translate-y-0.5`}>
                <span className="text-[27px] drop-shadow-sm">{icon}</span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-black tracking-[0.12em] text-[#625b43]">{title}</span>
                  <span className="mt-0.5 block text-[19px] font-black leading-none text-[#102a24]">{value}</span>
                  <span className="mt-1 block truncate text-[9px] font-black text-[#706a58]">{detail}</span>
                </span>
              </button>
            ))}
            <button type="button" onClick={() => { window.open("https://calendar.google.com/calendar/u/0/r", "_blank", "noopener,noreferrer"); }} className="group relative flex h-[66px] items-center gap-3 rounded-[19px] border border-[#c9a86d] bg-gradient-to-b from-[#fffaf0] to-[#ffe39a] px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_4px_10px_rgba(52,48,32,.10)] transition hover:-translate-y-0.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-[11px] border-2 border-[#8a5b1d] bg-[#fff9e8] text-[21px] font-black text-[#17322a] shadow-sm">{now.getDate()}</span>
              <span>
                <span className="block text-[9px] font-black tracking-[0.12em] text-[#625b43]">{month}</span>
                <span className="mt-0.5 block text-[14px] font-black leading-none text-[#102a24]">Kalenteri</span>
                <span className="mt-1 block text-[9px] font-black text-[#8a5b1d]">Avaa kalenteri →</span>
              </span>
            </button>
          </div>

          <div className="grid h-[66px] min-w-0 grid-cols-[52px_minmax(180px,1fr)_64px] items-center gap-2 rounded-[22px] border-[2px] border-[#0b4638] bg-[linear-gradient(180deg,#fffdf5_0%,#f7edd2_100%)] p-[5px] shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_4px_12px_rgba(34,54,43,.10)]">
            <button type="button" onClick={() => gpsOn ? setGpsOn(false) : useGps()} title={gpsOn ? "GPS päällä" : "GPS pois"} className={`relative grid h-[52px] w-[52px] place-items-center rounded-[16px] border-2 shadow-[inset_0_1px_0_rgba(255,255,255,.72)] ${gpsOn ? "border-[#2f9f58] bg-gradient-to-b from-[#ebfff0] to-[#98dfad]" : "border-[#c77a7a] bg-gradient-to-b from-[#fff1f1] to-[#f0caca]"}`}>
              <span className="text-[23px]">📍</span>
              <span className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full border border-white bg-[#159447] shadow-sm" />
            </button>
            <label className="relative min-w-0 rounded-[15px] border border-[#b89552] bg-gradient-to-b from-[#fff8e7] to-[#efd79d] px-3 py-1.5 shadow-inner">
              <span className="block text-[8px] font-black uppercase tracking-[0.12em] text-[#756848]">Paikkakunta tai postinumero</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") applyLocation(); }} aria-label="Paikkakunta tai postinumero" className="mt-0.5 block w-full bg-transparent text-[15px] font-black text-[#241b13] outline-none placeholder:text-[#766e5c]" placeholder="05510 tai Hyvinkää" />
            </label>
            <button type="button" onClick={() => setMapOpen(true)} title="Avaa kartta" className="group grid h-[52px] w-[64px] place-items-center rounded-[16px] border-2 border-[#65a99c] bg-gradient-to-b from-[#c8eee8] to-[#86cabf] shadow-[inset_0_1px_0_rgba(255,255,255,.65)]">
              <img src="/icons/ziiply-compass.png" alt="Avaa kartta" className="h-[43px] w-[43px] object-contain drop-shadow-[0_3px_6px_rgba(7,61,50,.24)] transition group-hover:scale-105" />
            </button>
          </div>
          <div className="absolute right-12 top-[94px] z-20 flex items-center gap-2 rounded-full border border-[#6f806a]/20 bg-[#fffaf0]/90 px-3 py-1.5 text-[10px] font-black text-[#536252] shadow-sm">
            <span className={`h-2 w-2 rounded-full ${gpsOn ? "bg-[#159447]" : "bg-[#c08b35]"}`} />
            {locationStatus}
          </div>
        </header>

        {storePickerOpen && <div className="absolute inset-0 z-[90] grid place-items-center bg-[#17352a]/35 p-10 backdrop-blur-[3px]"><div className="w-full max-w-[760px] rounded-[30px] bg-[#f8f3e7] p-6 shadow-2xl"><div className="flex items-center justify-between"><div><div className="text-[11px] font-black uppercase tracking-[.15em] text-[#7d745e]">Kauppavalinta</div><div className="text-[25px] font-black">Kaupat · {appliedLocation}</div></div><button onClick={()=>setStorePickerOpen(false)} className="rounded-full bg-white px-4 py-2 font-black">Sulje ×</button></div><section className="relative mt-4 overflow-hidden rounded-[26px] border-[3px] border-[#b38a4a] bg-[#fcf5de] px-4 pb-3 pt-3 shadow-[0_5px_0_rgba(105,72,28,.14),0_14px_24px_rgba(46,32,12,.10),inset_0_0_0_2px_rgba(255,255,255,.48)]">
<div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(#c9ad6b_0.9px,transparent_0.9px)] [background-size:17px_17px]"/>
<div className="relative z-10 grid grid-cols-[1fr_58px_1fr] items-center gap-4">
<button disabled={storeCompareScope==="within_chain"} onClick={()=>{setStoreMode("hyper");setStoreModeChosen(true)}} className={`min-h-[42px] rounded-[18px] border-2 px-4 py-2 text-[14px] font-black shadow-[inset_0_0_0_2px_rgba(255,255,255,.35)] ${storeModeChosen&&storeMode==="hyper"?"border-[#07502c] bg-gradient-to-b from-[#13864a] to-[#07502b] text-[#fff4d4]":"border-[#d2ad68] bg-gradient-to-b from-[#fff9e4] to-[#edd49a] text-[#5a4424]"}`}>🏬 Tavaratalot</button>
<div className={`flex flex-col items-center ${storeCompareScope==="between_chains"&&storeModeChosen?"":"invisible"}`}><span className="text-[9px] font-black text-[#6a5330]">Yksi</span><button onClick={()=>{setBetweenMode(v=>v==="one"?"many":"one");setSelectedStores({})}} className={`relative my-0.5 h-[38px] w-[20px] rounded-full border ${betweenMode==="many"?"border-[#07502c] bg-[#0a6d39]":"border-[#b99b62] bg-[#d8c69d]"}`}><span className={`absolute left-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-all ${betweenMode==="many"?"top-[20px]":"top-[2px]"}`}/></button><span className="text-[9px] font-black text-[#6a5330]">Monta</span></div>
<button disabled={storeCompareScope==="within_chain"} onClick={()=>{setStoreMode("local");setStoreModeChosen(true)}} className={`min-h-[42px] rounded-[18px] border-2 px-4 py-2 text-[14px] font-black shadow-[inset_0_0_0_2px_rgba(255,255,255,.35)] ${storeModeChosen&&storeMode==="local"?"border-[#07502c] bg-gradient-to-b from-[#13864a] to-[#07502b] text-[#fff4d4]":"border-[#d2ad68] bg-gradient-to-b from-[#fff9e4] to-[#edd49a] text-[#5a4424]"}`}>🏪 Lähikaupat</button>
</div>
<div className="relative z-10 my-1.5 text-center text-[11px] font-black uppercase tracking-[.14em] text-[#66543a]">{storeModeChosen&&storeCompareScope!=="none"?"Hakutapa":"Valitse hakutapa"}</div>
<div className="relative z-10 grid grid-cols-2 gap-4"><button onClick={()=>{setStoreCompareScope("between_chains");setWithinChain(null)}} className={`rounded-[18px] border-2 px-4 py-2.5 text-[14px] font-black ${storeCompareScope==="between_chains"?"border-[#07502c] bg-gradient-to-b from-[#13864a] to-[#07502b] text-[#fff4d4]":"border-[#d2ad68] bg-gradient-to-b from-[#fff9e4] to-[#edd49a] text-[#5a4424]"}`}>Ketjujen väliltä</button><button onClick={()=>{setStoreCompareScope("within_chain");setWithinChain(null);setStoreModeChosen(false)}} className={`rounded-[18px] border-2 px-4 py-2.5 text-[14px] font-black ${storeCompareScope==="within_chain"?"border-[#07502c] bg-gradient-to-b from-[#13864a] to-[#07502b] text-[#fff4d4]":"border-[#d2ad68] bg-gradient-to-b from-[#fff9e4] to-[#edd49a] text-[#5a4424]"}`}>Ketjun sisältä</button></div>
{storeCompareScope==="within_chain"&&<div className="relative z-10 mt-3 grid grid-cols-2 gap-4"><button onClick={()=>setWithinChain("S")} className={`rounded-[16px] border-2 p-2.5 text-[13px] font-black ${withinChain==="S"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff9e4] text-[#5a4424]"}`}>S-ryhmä</button><button onClick={()=>setWithinChain("K")} className={`rounded-[16px] border-2 p-2.5 text-[13px] font-black ${withinChain==="K"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff9e4] text-[#5a4424]"}`}>K-ryhmä</button></div>}
</section>
<div className="mt-3 flex items-center justify-between rounded-[16px] bg-white/55 px-4 py-3"><span className="text-[12px] font-black">{storeCompareScope==="between_chains"?(betweenMode==="one"?"Valitse yksi kauppa":"Valitse vertailukaupat"):storeCompareScope==="within_chain"?(withinChain?`${withinChain}-ryhmän kaupat`:"Valitse S- tai K-ryhmä"):"Valitse hakutapa yllä"}</span><span className="text-[12px] font-black text-[#267348]">{Object.keys(selectedStores).length} valittu</span></div><div className="mt-3 grid max-h-[390px] grid-cols-2 gap-3 overflow-auto">{stores.length ? stores.map((s:any)=>{ const key=String(s.id); const selected=Boolean(selectedStores[key]); return <button key={key} onClick={()=>setSelectedStores(prev=>{const next={...prev}; if(next[key]) delete next[key]; else next[key]=s; return next;})} className={`rounded-[18px] border-2 p-4 text-left ${selected?"border-[#159447] bg-[#ecf8e9]":"border-[#b8a77e]/35 bg-white/70"}`}><span className="flex items-center justify-between"><span className="block text-[15px] font-black">{s.name}</span><span className={`grid h-7 w-7 place-items-center rounded-full font-black ${selected?"bg-[#159447] text-white":"bg-[#eee7d7] text-transparent"}`}>✓</span></span><span className="text-[11px] font-bold text-[#737768]">{s.city || ""} {s.postalCode || ""}</span></button>}) : <div className="col-span-2 rounded-[18px] bg-white/60 p-8 text-center font-bold text-[#737768]">Kirjoita paikkakunta ylhäällä tai käytä GPS:ää.</div>}</div></div></div>}

        {cartOpen && <div className="absolute inset-0 z-[90] grid place-items-center bg-[#17352a]/35 p-10 backdrop-blur-[3px]"><div className="w-full max-w-[720px] rounded-[30px] bg-[#fff8df] p-6 shadow-2xl"><div className="flex items-center justify-between"><div><div className="text-[11px] font-black uppercase tracking-[.15em] text-[#7d745e]">Ziiply</div><div className="text-[27px] font-black">🛒 Ostosvihko</div></div><button onClick={()=>setCartOpen(false)} className="rounded-full bg-white px-4 py-2 font-black">Sulje ×</button></div><div className="mt-5 rounded-[22px] border border-[#b89552]/30 bg-white/60 p-8 text-center"><div className="text-[18px] font-black">{cartItems.length ? `${cartItems.length} tuotetta` : "Vihko on vielä tyhjä"}</div><div className="mt-2 text-[12px] font-bold text-[#737768]">Justiinan ja Göstan tuotteet tulevat samaan ostosvihkoon.</div></div></div></div>}

        {mapOpen && (
          <div className="absolute inset-0 z-[80] grid place-items-center bg-[#17352a]/35 p-10 backdrop-blur-[3px]">
            <div className="w-full max-w-[900px] rounded-[30px] border border-[#6e7d68]/25 bg-[#f8f3e7] p-6 shadow-[0_30px_90px_rgba(20,40,31,.35)]">
              <div className="flex items-center justify-between">
                <div><div className="text-[11px] font-black uppercase tracking-[.15em] text-[#7d745e]">Ziiply · kartta</div><div className="mt-1 text-[27px] font-black text-[#17352a]">{appliedLocation}</div></div>
                <button onClick={() => setMapOpen(false)} className="rounded-full border border-[#6f806a]/25 bg-white px-4 py-2 text-[13px] font-black">Sulje ×</button>
              </div>
              <div className="relative mt-5 grid h-[430px] place-items-center overflow-hidden rounded-[24px] border border-[#7b8b75]/25 bg-[linear-gradient(30deg,#dce8cf_25%,#f1e7c9_25%,#f1e7c9_50%,#d5e3cf_50%,#d5e3cf_75%,#efe1bd_75%)] bg-[length:90px_90px]">
                <div className="text-center"><img src="/icons/ziiply-compass.png" alt="" className="mx-auto h-24 w-24"/><div className="mt-4 text-[18px] font-black text-[#244b38]">Kauppakartta</div><div className="mt-1 text-[13px] font-bold text-[#687267]">Sijainti: {appliedLocation}</div><div className="mt-4 text-[12px] font-bold text-[#7b745f]">Seuraavaksi tähän kytketään Ziiplyn kauppapisteet ja etäisyydet.</div></div>
              </div>
            </div>
          </div>
        )}

        <section className="grid min-h-0 flex-1 items-center gap-8 py-5 lg:grid-cols-[0.76fr_1.24fr] xl:gap-11">
          <div className="relative max-w-[570px]">
            <div className="mb-4 rounded-[28px] border-[3px] border-[#b38a4a] bg-[#fcf5de] p-4 shadow-[0_5px_0_rgba(105,72,28,.14),inset_0_0_0_2px_rgba(255,255,255,.48)]">
<div className="flex items-center justify-between"><div><span className="block text-[9px] font-black uppercase tracking-[.16em] text-[#786642]">Kaupat</span><span className="text-[18px] font-black text-[#17352a]">{appliedLocation}</span></div></div>
<div className="mt-3 grid grid-cols-[1fr_46px_1fr] items-center gap-3"><button disabled={storeCompareScope==="within_chain"} onClick={()=>{setStoreMode("hyper");setStoreModeChosen(true)}} className={`rounded-[17px] border-2 px-3 py-2 text-[12px] font-black ${storeModeChosen&&storeMode==="hyper"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df] text-[#5a4424]"}`}>🏬 Tavaratalot</button><div className={`text-center ${storeCompareScope==="between_chains"&&storeModeChosen?"":"opacity-30"}`}><span className="block text-[8px] font-black">Yksi</span><button disabled={!(storeCompareScope==="between_chains"&&storeModeChosen)} onClick={()=>{setBetweenMode(v=>v==="one"?"many":"one");setSelectedStores({})}} className={`relative mx-auto h-[30px] w-[17px] rounded-full ${betweenMode==="many"?"bg-[#0a6d39]":"bg-[#d8c69d]"}`}><span className={`absolute left-[2px] h-[11px] w-[11px] rounded-full bg-white ${betweenMode==="many"?"top-[17px]":"top-[2px]"}`}/></button><span className="block text-[8px] font-black">Monta</span></div><button disabled={storeCompareScope==="within_chain"} onClick={()=>{setStoreMode("local");setStoreModeChosen(true)}} className={`rounded-[17px] border-2 px-3 py-2 text-[12px] font-black ${storeModeChosen&&storeMode==="local"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df] text-[#5a4424]"}`}>🏪 Lähikaupat</button></div>
<div className="my-1 text-center text-[9px] font-black uppercase tracking-[.14em] text-[#66543a]">Hakutapa</div><div className="grid grid-cols-2 gap-3"><button onClick={()=>{setStoreCompareScope("between_chains");setWithinChain(null)}} className={`rounded-[15px] border-2 py-2 text-[11px] font-black ${storeCompareScope==="between_chains"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df]"}`}>Ketjujen väliltä</button><button onClick={()=>{setStoreCompareScope("within_chain");setWithinChain(null);setStoreModeChosen(false)}} className={`rounded-[15px] border-2 py-2 text-[11px] font-black ${storeCompareScope==="within_chain"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df]"}`}>Ketjun sisältä</button></div>
<div className="mt-3 grid grid-cols-2 gap-3">{["S","K","LIDL","SPAR"].map(chain=>{const matches=stores.filter((s:any)=>{const n=String(s.name||"").toUpperCase();return chain==="S"?/^(S-MARKET|SALE|ALEPA|PRISMA)/.test(n):chain==="K"?/^K-/.test(n):chain==="LIDL"?n.includes("LIDL"):/(TOKMANNI|SPAR)/.test(n)});const store=matches[0];const selected=Boolean(store&&selectedStores[String(store.id)]);const bg=chain==="S"?(storeMode==="hyper"?"/ui/store-backgrounds/store-bg-prisma-v3.svg":"/ui/store-backgrounds/store-bg-alepa-v3.svg"):chain==="K"?(storeMode==="hyper"?"/ui/store-backgrounds/store-bg-kcitymarket-v3.svg":"/ui/store-backgrounds/store-bg-kmarket-v3.svg"):chain==="LIDL"?"/ui/store-backgrounds/store-bg-lidl-v3.svg":"/ui/store-backgrounds/store-bg-spar-v3.svg";const logo=chain==="S"?"/storelogos/s-group.png":chain==="K"?"/storelogos/k-group.png":chain==="LIDL"?"/storelogos/lidl.png":"/storelogos/spar.png";return <button key={chain} onClick={()=>{if(!store)return;setSelectedStores(prev=>{const key=String(store.id);if(betweenMode==="one")return selected?{}:{[key]:store};const next={...prev};if(next[key])delete next[key];else next[key]=store;return next})}} className={`relative h-[122px] overflow-hidden rounded-[20px] border-[2.5px] text-center shadow-[0_5px_10px_rgba(52,38,14,.08),inset_0_0_0_1px_rgba(255,255,255,.9)] ${selected?"border-[#5c7858] bg-[#edf0d2]":"border-[#d9c18e] bg-[#fffaf0]"}`}><img src={bg} alt="" className="pointer-events-none absolute bottom-[-34px] left-[-20px] h-[145px] w-[calc(100%+40px)] object-cover object-bottom opacity-60"/><span className="absolute left-2 top-2 z-20 flex h-8 w-10 items-center justify-center rounded-lg border border-[#b89552] bg-[#fffef9]/90 p-1"><img src={logo} alt={chain} className="h-full w-full object-contain"/></span><span className={`absolute right-2 top-2 z-20 grid h-7 w-7 place-items-center rounded-full border font-black ${selected?"border-[#536d4f] bg-[#648060] text-white":"border-[#d0ad68] bg-[#fff8dc] text-transparent"}`}>✓</span><span className="absolute left-3 right-3 top-[48px] z-20 block truncate text-[14px] font-black text-[#171713]">{store?.name||`${chain} ei löytynyt`}</span><span className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full border border-[#d4c18e] bg-white/85 px-4 py-1 text-[10px] font-black">{selected?"Valittu":"Vaihda"}</span></button>})}</div>
<button onClick={()=>setStorePickerOpen(true)} className="mt-3 w-full rounded-[15px] border border-[#b89552]/45 bg-white/55 px-3 py-2 text-left text-[10px] font-black">{Object.keys(selectedStores).length} kauppaa valittu · Muuta valintoja</button></div>
            <div aria-hidden className="absolute -left-7 -top-10 -z-10 h-[118%] w-[112%] -rotate-2 rounded-[46px] border border-[#806b45]/10 bg-[#fffaf0]/26 shadow-[0_30px_80px_rgba(54,68,52,0.06)]" />
            <div className="mb-5 inline-flex rounded-full border border-[#73846d]/25 bg-[#f8f5ed]/72 px-4 py-2 text-[12px] font-black uppercase tracking-[0.18em] text-[#68705c] shadow-sm">
              Ruokaostokset fiksummin
            </div>
            <h1 className="text-[clamp(48px,4.7vw,76px)] font-black leading-[0.91] tracking-[-0.06em] text-[#050b2b] drop-shadow-[0_2px_0_rgba(255,255,255,0.58)]">
              Viilaa ruokakorisi huokeammaks
            </h1>
            <p className="mt-6 max-w-[500px] text-[clamp(18px,1.6vw,25px)] font-black leading-[1.22] tracking-[-0.025em] text-[#686d5c]">
              Gösta, Justiina ja Arvo auttavat arjen valinnoissa.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <span className="rotate-[-1deg] rounded-full border border-[#77906f]/25 bg-[#f4ffe3]/72 px-4 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-[#36553b] shadow-sm">Tarjoukset</span>
              <span className="rotate-[1deg] rounded-full border border-[#c69a58]/25 bg-[#fff1c8]/72 px-4 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-[#704b27] shadow-sm">Hintavertailu</span>
              <span className="rotate-[-1deg] rounded-full border border-[#9b8762]/25 bg-[#f3e7c9]/72 px-4 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-[#4f553e] shadow-sm">Ostoskorit</span>
            </div>
            <p className="mt-6 max-w-[480px] text-[16px] font-bold leading-relaxed text-[#697468]">
              Etsi hinnat ja tarjoukset, suunnittele ostokset ja pidä omat valintasi yhdessä paikassa.
            </p>
          </div>

          <div className="relative max-h-[calc(100dvh-150px)] rounded-[42px] border border-[#756443]/15 bg-[#f8f5ed]/92 p-5 shadow-[0_34px_90px_rgba(34,54,43,0.22)] ring-1 ring-[#fffaf0]/95 backdrop-blur-[4px] xl:p-8">
            <div aria-hidden className="absolute -right-4 -top-5 h-24 w-24 rotate-6 rounded-[26px] border border-[#8b7145]/15 bg-[#fff0bd]/55 shadow-[0_16px_35px_rgba(91,67,30,0.10)]" />
            <div aria-hidden className="absolute -bottom-5 left-12 h-16 w-40 -rotate-2 rounded-[22px] border border-[#61785d]/12 bg-[#dce8d8]/60 shadow-[0_14px_30px_rgba(41,67,46,0.08)]" />
            <div className="mb-6 flex items-end justify-between gap-4 px-1">
              <div>
                <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#7a806e]">Mitä tehdään?</div>
                <h2 className="mt-1 text-[30px] font-black tracking-[-0.035em]">Valitse apuri</h2>
              </div>
              <div className="hidden text-right text-[13px] font-bold leading-tight text-[#818777] xl:block">
                Sama Ziiply,<br />enemmän työtilaa.
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 xl:gap-5">
              {assistants.map((item) => {
                const selected = active === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => { setActive(item.key); setWorkspace(item.key); }}
                    className={[
                      "group relative min-h-[0] h-[clamp(330px,46vh,430px)] overflow-hidden rounded-[34px] border-[3px] p-5 text-center transition duration-200 hover:-translate-y-2 hover:rotate-[0.3deg] hover:shadow-[0_28px_54px_rgba(35,54,42,0.22)] active:translate-y-0",
                      item.frame,
                      selected ? "ring-4 ring-[#0a7f3a]/18 shadow-[0_22px_42px_rgba(35,54,42,0.18)]" : "shadow-[0_14px_30px_rgba(35,54,42,0.12)] ring-1 ring-white/70",
                    ].join(" ")}
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#7f6a3e_1px,transparent_1px)] [background-size:12px_12px]" />
                    {selected && (
                      <div className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[#0a7f3a] text-lg font-black text-white shadow-md">
                        ✓
                      </div>
                    )}
                    <div className="relative z-10 mx-auto mt-5 h-[clamp(150px,19vh,205px)] w-[clamp(150px,19vh,205px)] overflow-hidden rounded-full border-[6px] border-[#f7e7c4] bg-[#314633] shadow-[0_11px_0_rgba(65,45,20,0.16),0_24px_38px_rgba(40,55,38,0.18)] xl:h-[clamp(170px,21vh,220px)] xl:w-[clamp(170px,21vh,220px)]">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]" />
                    </div>
                    <div className={["relative z-10 mt-6 text-[36px] font-black leading-none tracking-[-0.045em] drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]", item.ink].join(" ")}>
                      {item.name}
                    </div>
                    <div className="relative z-10 mt-3 text-[13px] font-black uppercase tracking-[0.12em] text-[#1e2f2a]">
                      {item.title}
                    </div>
                    <div className="relative z-10 mt-1 text-[14px] font-bold text-[#687285]">
                      {item.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>

            {workspace && (
              <div className="absolute inset-5 z-40 flex flex-col rounded-[32px] border border-[#756443]/20 bg-[#f8f5ed]/[0.99] p-6 shadow-[0_28px_80px_rgba(34,54,43,.28)] xl:inset-8">
                <div className="flex items-center justify-between border-b border-[#71806d]/20 pb-4">
                  <div><div className="text-[11px] font-black uppercase tracking-[.16em] text-[#7a806e]">Desktop-työtila</div><div className="mt-1 text-[30px] font-black text-[#14291f]">{assistants.find(x => x.key === workspace)?.name} · {assistants.find(x => x.key === workspace)?.title}</div></div>
                  <button onClick={() => setWorkspace(null)} className="rounded-full border border-[#71806d]/25 bg-white/70 px-4 py-2 text-[13px] font-black">← Apurit</button>
                </div>
                <div className="grid min-h-0 flex-1 grid-cols-[1fr_300px] gap-5 pt-5">
                  <div className="rounded-[26px] border border-[#7b876f]/18 bg-white/55 p-6">
                    <div className="text-[12px] font-black uppercase tracking-[.14em] text-[#788170]">{workspace === "gosta" ? "Tarjoukset & kampanjat" : workspace === "justiina" ? "Tuotehaku & reseptit" : "Kaupat & asetukset"}</div>
                    <h3 className="mt-2 text-[26px] font-black text-[#193429]">{workspace === "gosta" ? "Mitä tarjouksia etsitään?" : workspace === "justiina" ? "Mitä etsitään tänään?" : "Omat valinnat"}</h3>
                    {workspace !== "arvo" ? <input autoFocus placeholder={workspace === "gosta" ? "Hae tarjouksista…" : "Hae tuotetta…"} className="mt-5 w-full rounded-[18px] border-2 border-[#a88c58]/50 bg-[#fffdf5] px-5 py-4 text-[17px] font-black outline-none" /> : <div className="mt-5 grid grid-cols-2 gap-3"><button className="rounded-[18px] border border-[#82917d]/30 bg-[#f5f1e5] p-5 text-left font-black">🏪 Kaupat<br/><span className="text-[12px] text-[#788170]">{location}</span></button><button className="rounded-[18px] border border-[#82917d]/30 bg-[#f5f1e5] p-5 text-left font-black">⚙️ Asetukset<br/><span className="text-[12px] text-[#788170]">Omat valinnat</span></button></div>}
                    {workspace === "justiina" && <div className="mt-4 grid grid-cols-3 gap-3"><button className="rounded-[16px] border border-[#a88c58]/35 bg-[#fff8df] p-4 text-left text-[12px] font-black">🔎 Tuotehaku</button><button className="rounded-[16px] border border-[#a88c58]/35 bg-[#fff8df] p-4 text-left text-[12px] font-black">📷 EAN-skanneri</button><button onClick={() => setCartOpen(true)} className="rounded-[16px] border border-[#a88c58]/35 bg-[#fff8df] p-4 text-left text-[12px] font-black">🛒 Ostosvihko</button></div>}
                    {workspace === "gosta" && <div className="mt-4 flex gap-3"><button className="rounded-full bg-[#2f7750] px-5 py-3 text-[13px] font-black text-white">Tarjoukset</button><button className="rounded-full border border-[#2f7750]/30 bg-white px-5 py-3 text-[13px] font-black">Kampanjat</button></div>}
                  </div>
                  <aside className="rounded-[26px] border border-[#b89552]/30 bg-gradient-to-b from-[#fff8e7] to-[#efddb3] p-5">
                    <div className="text-[11px] font-black uppercase tracking-[.14em] text-[#786642]">EAN / skanneri</div>
                    <div className="mt-3 text-[19px] font-black text-[#1b382c]">{scannerMode === "camera" ? "Kameraskannaus" : scannerMode === "external" ? "HID / EAN-lukija" : "Tarkistetaan laitetta…"}</div>
                    <p className="mt-2 text-[12px] font-bold leading-relaxed text-[#6d6654]">{scannerMode === "camera" ? "Tabletilla voit käyttää takakameraa tai ulkoista lukijaa." : "Skannaa Eyoyolla / USB-HID-lukijalla tai kirjoita EAN."}</p>
                    <input inputMode="numeric" placeholder="Skannaa tai kirjoita EAN" className="mt-5 w-full rounded-[14px] border border-[#a88c58] bg-[#fffdf5] px-4 py-3 text-[14px] font-black outline-none" />
                    {scannerMode === "camera" && <button className="mt-3 w-full rounded-[14px] bg-[#2f7750] px-4 py-3 text-[13px] font-black text-white">📷 Avaa skanneri</button>}
                  </aside>
                </div>
              </div>
            )}
<div className="mt-3 flex items-center justify-between rounded-[22px] border border-[#77856e]/15 bg-white/48 px-5 py-4">
              <div className="text-[14px] font-bold text-[#657064]">
                Valittuna <span className="font-black text-[#243a2b]">{assistants.find((x) => x.key === active)?.name}</span>
              </div>
              <button onClick={() => setWorkspace(active)} className="rounded-full bg-[#214c32] px-6 py-3 text-[14px] font-black text-white shadow-[0_8px_18px_rgba(33,76,50,0.22)]">
                Jatka →
              </button>
            </div>
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-[#64745f]/15 pt-3 text-[12px] font-bold text-[#747d6e]">
          <span>Ziiply Oy</span>
          <span>One search. All prices. · {scannerMode === "camera" ? "📷 Tablet-skannaus valmis" : scannerMode === "external" ? "⌨ HID/EAN-lukija valmis" : "Skanneria tarkistetaan…"}</span>
        </footer>
      </div>
    </main>
  );
}

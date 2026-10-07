"use client";

import { useEffect, useState } from "react";
import { GOSTA_OFFER_CATEGORY_SUGGESTIONS_V147, mapZiiplyGostaOfferToCardOfferV147, searchZiiplyGostaOffersV146 } from "../components/ziiply/offerSearch/ziiplyOfferSearchCore";

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
  const [gostaChainPicker, setGostaChainPicker] = useState(false);
  const [gostaChain, setGostaChain] = useState<"S"|"K"|"LIDL"|"TOKMANNI"|"EUROSPAR"|null>(null);
  const [gostaOffers, setGostaOffers] = useState<any[]>([]);
  const [gostaTab, setGostaTab] = useState<"offers"|"campaigns">("offers");
  const [gostaCategory, setGostaCategory] = useState("");
  const [gostaLoading, setGostaLoading] = useState(false);
  const [location, setLocation] = useState("");
  const [gpsOn, setGpsOn] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{latitude:number;longitude:number}|null>(null);
  const [appliedLocation, setAppliedLocation] = useState("");
  const [locationResolved, setLocationResolved] = useState(false);
  const [userLocationAction, setUserLocationAction] = useState(false);
  const [locationStatus, setLocationStatus] = useState("Kirjoita paikkakunta tai käytä GPS:ää");
  const [gpsToast, setGpsToast] = useState("GPS ei päällä");
  const [mapOpen, setMapOpen] = useState(false);
  const [weather, setWeather] = useState({ value: "—", detail: "haetaan" });
  const [electricity, setElectricity] = useState({ value: "—", detail: "haetaan" });
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStores, setSelectedStores] = useState<Record<string, any>>({});
  const [lidlStores, setLidlStores] = useState<any[]>([]);
  const [sparStores, setSparStores] = useState<any[]>([]);
  const [storeMode, setStoreMode] = useState<"hyper" | "local">("hyper");
  const [storeModeChosen, setStoreModeChosen] = useState(false);
  const [storeCompareScope, setStoreCompareScope] = useState<"none" | "between_chains" | "within_chain">("none");
  const [betweenMode, setBetweenMode] = useState<"one" | "many">("one");
  const [withinChain, setWithinChain] = useState<"S" | "K" | null>(null);
  const [pickerChain, setPickerChain] = useState<"S"|"K"|"LIDL"|"SPAR"|null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [cartNotice, setCartNotice] = useState("");
  const [cartIncrementKey, setCartIncrementKey] = useState("");
  const [justiinaQuery, setJustiinaQuery] = useState("");
  const [justiinaDelay, setJustiinaDelay] = useState<0|1|2>(2);
  const [justiinaLoading, setJustiinaLoading] = useState(false);
  const [justiinaResults, setJustiinaResults] = useState<any[]>([]);
  const [justiinaMessage, setJustiinaMessage] = useState("");
  const now = new Date();
  const month = ["TAMMIKUU","HELMIKUU","MAALISKUU","HUHTIKUU","TOUKOKUU","KESÄKUU","HEINÄKUU","ELOKUU","SYYSKUU","LOKAKUU","MARRASKUU","JOULUKUU"][now.getMonth()];


  function distanceKm(s:any){ if(!gpsCoords)return Number(s?.distanceKm ?? Number.POSITIVE_INFINITY); const lat=Number(s?.latitude ?? s?.lat); const lon=Number(s?.longitude ?? s?.lon ?? s?.lng); if(!Number.isFinite(lat)||!Number.isFinite(lon))return Number(s?.distanceKm ?? Number.POSITIVE_INFINITY); const r=6371, p1=gpsCoords.latitude*Math.PI/180, p2=lat*Math.PI/180, dp=(lat-gpsCoords.latitude)*Math.PI/180, dl=(lon-gpsCoords.longitude)*Math.PI/180; const a=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2; return 2*r*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); }
  function byDistance(items:any[]){return [...items].sort((a,b)=>distanceKm(a)-distanceKm(b));}
  function storeKind(s:any){const chain=String(s?.chain||s?.type||s?.brand||"").toLowerCase();const n=String(s?.name||"").toLowerCase();if(chain==="lidl")return "lidl";if(chain.includes("tokmanni")||chain.includes("spar"))return "spar";if(n.includes("prisma"))return "sHyper";if(n.includes("citymarket"))return "kHyper";if(n.includes("s-market")||n.includes("sale")||n.includes("alepa"))return "sLocal";if(n.includes("k-market")||n.includes("k-supermarket"))return "kLocal";if(n.includes("lidl"))return "lidl";if(n.includes("tokmanni")||n.includes("spar"))return "spar";return ""}
  function applyModeDefaults(nextMode:"hyper"|"local"){const wanted=[nextMode==="hyper"?"sHyper":"sLocal",nextMode==="hyper"?"kHyper":"kLocal","lidl","spar"];const defaults=wanted.map(k=>stores.find((s:any)=>storeKind(s)===k)).filter(Boolean);setSelectedStores(prev=>{const selectedKinds=new Set(Object.values(prev).map((s:any)=>storeKind(s)));const next:any={};for(const s of defaults as any[]){const k=storeKind(s);if(selectedKinds.has(k))next[String(s.id)]=s}return next})}

  function applyLocation() {
    const value = location.trim();
    if (!value) return;
    setAppliedLocation(value);
    setUserLocationAction(true);
    setLocationResolved(true);
    setGpsOn(false);
    setGpsCoords(null);
    setLocationStatus(`Valittu sijainti: ${value}`);
    loadIndependentStores(value); fetch(`/api/store-search?search=${encodeURIComponent(value)}`, {cache:"no-store"}).then(r=>r.json()).then(d=>{ const items=Array.isArray(d?.items)?d.items:[]; setStores(items) }).catch(()=>setStores([]));
  }

  function desktopCartKey(p:any){return String(p?.ean||p?.id||p?.offerId||p?.title||p?.name||"").trim()}
  function flashCartNotice(message:string){setCartNotice(message);window.setTimeout(()=>setCartNotice(current=>current===message?"":current),2200)}
  function addDesktopCartItem(p:any){
    const key=desktopCartKey(p);if(!key)return;
    setCartItems(current=>{const found=current.find(x=>desktopCartKey(x)===key);if(found){setCartIncrementKey(key);window.setTimeout(()=>setCartIncrementKey(currentKey=>currentKey===key?"":currentKey),900);return current.map(x=>desktopCartKey(x)===key?{...x,quantity:Number(x.quantity||1)+1}:x)}flashCartNotice(`Lisätty ostoskoriin: ${p?.title||p?.name||"tuote"}`);return [...current,{...p,source:"gosta",quantity:1}]});
  }
  function changeDesktopCartQuantity(p:any,delta:number){const key=desktopCartKey(p);setCartItems(current=>current.map(x=>desktopCartKey(x)===key?{...x,quantity:Math.max(1,Number(x.quantity||1)+delta)}:x))}
  function removeDesktopCartItem(p:any){const key=desktopCartKey(p);setCartItems(current=>current.filter(x=>desktopCartKey(x)!==key));flashCartNotice(`Poistettu ostoskorista: ${p?.title||p?.name||"tuote"}`)}
  function clearDesktopCart(){setCartItems([]);flashCartNotice("Ostoskori tyhjennetty")}
  const desktopCartCount=cartItems.reduce((sum:number,p:any)=>sum+Number(p.quantity||1),0);

  async function openDesktopGostaChain(chain:"S"|"K"|"LIDL"|"TOKMANNI"|"EUROSPAR", store:any) {
    setGostaChainPicker(false);setGostaChain(chain);setGostaTab("offers");setGostaCategory("");setGostaOffers([]);setGostaLoading(true);
    const ctx:any={storeMode,storeCompareScope,withinChain};
    if(chain==="S"){ctx.sStoreId=store?.externalId||store?.id;ctx.sStoreName=store?.name}
    if(chain==="K"){ctx.kStoreId=store?.externalId||store?.id;ctx.kStoreName=store?.name}
    if(chain==="LIDL"){ctx.lidlStoreKey=store?.storeKey||store?.externalId||store?.id;ctx.lidlStoreName=store?.name||"Lidl"}
    if(chain==="TOKMANNI"){ctx.tokmanniStoreId=store?.externalId||store?.id;ctx.tokmanniStoreName=store?.name||"Tokmanni"}
    if(chain==="EUROSPAR"){ctx.eurosparStoreId=store?.externalId||store?.id;ctx.eurosparStoreName=store?.name||"Eurospar";ctx.eurosparStoreChain=store?.chain}
    try{const r=await searchZiiplyGostaOffersV146({query:"",terms:[],context:ctx});setGostaOffers((r.results||[]).map(mapZiiplyGostaOfferToCardOfferV147))}catch{setGostaOffers([])}finally{setGostaLoading(false)}
  }

  async function runDesktopJustiinaSearch(raw=justiinaQuery) {
    const query=String(raw||"").trim(); if(!query)return;
    const selected=Object.values(selectedStores) as any[];
    const s=selected.find(x=>{const k=storeKind(x);return k==="sHyper"||k==="sLocal"});
    const k=selected.find(x=>{const t=storeKind(x);return t==="kHyper"||t==="kLocal"});
    if(!s&&!k){setJustiinaMessage("Valitse ensin S- tai K-kauppa.");return}
    setJustiinaLoading(true);setJustiinaMessage("");setJustiinaResults([]);
    if(justiinaDelay) await new Promise(r=>window.setTimeout(r,justiinaDelay*1000));
    try{
      const calls:any[]=[];
      if(s)calls.push(fetch(`/api/s-products?search=${encodeURIComponent(query)}&store=${encodeURIComponent(String(s.externalId||s.id))}&storeName=${encodeURIComponent(String(s.name||""))}`,{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>({chain:"S",store:s,data:d})));
      if(k)calls.push(fetch(`/api/k-products?search=${encodeURIComponent(query)}&store=${encodeURIComponent(String(k.externalId||k.id))}`,{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>({chain:"K",store:k,data:d})));
      const batches=await Promise.all(calls);const rows:any[]=[];
      for(const b of batches){const items=Array.isArray(b.data?.products)?b.data.products:Array.isArray(b.data?.items)?b.data.items:Array.isArray(b.data)?b.data:[];for(const x of items.slice(0,8)){const p=Number(x?.price??x?.storeItems?.[0]?.price??x?.storeItem?.price??0);rows.push({...x,__chain:b.chain,__store:b.store?.name,__price:p})}}
      setJustiinaResults(rows);if(!rows.length)setJustiinaMessage(`Hakemaasi "${query}" ei löydy.`);
    }catch{setJustiinaMessage("Haku ei onnistunut. Yritä uudelleen.")}finally{setJustiinaLoading(false)}
  }

  async function loadIndependentStores(search:string, coords?:{latitude:number;longitude:number}) { const lp=new URLSearchParams(); if(search) lp.set("search",search); if(coords){lp.set("lat",String(coords.latitude));lp.set("lon",String(coords.longitude));lp.set("gps","1")} try{const r=await fetch(`/api/lidl/store-search?${lp}`,{cache:"no-store"});const d=await r.json();setLidlStores(Array.isArray(d?.items)?d.items:[])}catch{setLidlStores([])} const sp=new URLSearchParams(); if(search)sp.set("search",search);if(coords){sp.set("lat",String(coords.latitude));sp.set("lon",String(coords.longitude))} try{const r=await fetch(`/api/eurospar-stores?${sp}`,{cache:"no-store"});const d=await r.json();setSparStores(Array.isArray(d?.items)?d.items:[])}catch{setSparStores([])} }

  function useGps() {
    if (!navigator.geolocation) {
      setLocationStatus("Sijaintia ei tueta tällä laitteella");
      return;
    }
    setLocationStatus("Haetaan sijaintia…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGpsOn(true);
        setUserLocationAction(true);
        setLocationResolved(true);
        setGpsCoords({latitude:coords.latitude,longitude:coords.longitude});
        setGpsToast("GPS päällä"); window.setTimeout(()=>setGpsToast(""),1800);
        setAppliedLocation(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
        setLocationStatus("GPS-sijainti käytössä");
        loadIndependentStores("", {latitude:coords.latitude,longitude:coords.longitude});
        fetch(`/api/store-search?gps=1&lat=${coords.latitude}&lon=${coords.longitude}`, {cache:"no-store"}).then(r=>r.json()).then(d=>{ const items=Array.isArray(d?.items)?d.items:[]; setStores(items) }).catch(()=>setStores([]));
      },
      () => setLocationStatus("Sijainnin käyttö ei onnistunut"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }


  useEffect(() => {
    let cancelled = false;
    fetch("/api/desktop-electricity", { cache: "no-store" }).then(r => r.json()).then(data => {
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
        <header className="grid grid-cols-[auto_minmax(360px,0.68fr)_minmax(650px,1fr)] items-center gap-5 border-b border-[#64745f]/20 pb-4">
          <div className="flex items-center gap-3">
            <img src="/ziiplylogo_mobile.png" alt="Ziiply" className="h-[66px] w-[66px] object-contain drop-shadow-[0_4px_10px_rgba(21,79,50,0.10)]" />
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.22em] text-[#6d765f]">Yksi haku. Kaikki hinnat.</div>
              <div className="mt-0.5 text-[17px] font-black text-[#314633]">Ziiply</div>
            </div>
          </div>

          <div className="relative grid h-[66px] min-w-0 grid-cols-[52px_minmax(180px,1fr)_64px] items-center gap-2 rounded-[22px] border-[2px] border-[#0b4638] bg-[linear-gradient(180deg,#fffdf5_0%,#f7edd2_100%)] p-[5px] shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_4px_12px_rgba(34,54,43,.10)]">
            <div className="grid h-[52px] w-[52px] place-items-center"><button type="button" onClick={() => { if(gpsOn){setGpsOn(false);setGpsCoords(null);setUserLocationAction(false);setLocationResolved(false);setAppliedLocation("");setStores([]);setLidlStores([]);setSparStores([]);setSelectedStores({});setGpsToast("GPS ei päällä");window.setTimeout(()=>setGpsToast(""),1800)} else useGps(); }} title={gpsOn ? "GPS päällä" : "GPS pois"} className={`relative grid h-[52px] w-[52px] place-items-center rounded-[16px] border-2 shadow-[inset_0_1px_0_rgba(255,255,255,.72)] ${gpsOn ? "border-[#2f9f58] bg-gradient-to-b from-[#ebfff0] to-[#98dfad]" : "border-[#c77a7a] bg-gradient-to-b from-[#fff1f1] to-[#f0caca]"}`}>
              <span className="text-[23px]">📍</span>{gpsToast&&<span className="absolute left-1/2 top-[62px] z-50 w-max -translate-x-1/2 rounded-full border border-[#6f806a]/20 bg-[#fffaf0] px-3 py-1.5 text-[10px] font-black text-[#536252] shadow-lg">{gpsToast}</span>}
              <span className={`absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full border border-white shadow-sm ${gpsOn?"bg-[#159447]":"bg-[#a44f4f]"}`} />
            </button></div>
            <label className="relative min-w-0 rounded-[15px] border border-[#b89552] bg-gradient-to-b from-[#fff8e7] to-[#efd79d] px-3 py-1.5 shadow-inner">
              <span className="block text-[8px] font-black uppercase tracking-[0.12em] text-[#756848]">Paikkakunta tai postinumero</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") applyLocation(); }} aria-label="Paikkakunta tai postinumero" className="mt-0.5 block w-full bg-transparent text-[15px] font-black text-[#241b13] outline-none placeholder:text-[#766e5c]" placeholder="05510 tai Hyvinkää" />
            </label>
            <button type="button" onClick={() => setMapOpen(true)} title="Avaa kartta" className="group grid h-[52px] w-[64px] place-items-center rounded-[16px] border-2 border-[#65a99c] bg-gradient-to-b from-[#c8eee8] to-[#86cabf] shadow-[inset_0_1px_0_rgba(255,255,255,.65)]">
              <img src="/icons/ziiply-compass.png" alt="Avaa kartta" className="h-[43px] w-[43px] object-contain drop-shadow-[0_3px_6px_rgba(7,61,50,.24)] transition group-hover:scale-105" />
            </button>
          </div>

          <div className="ml-auto grid w-full max-w-[900px] grid-cols-5 gap-2.5">
            {[
              ["☀️", "SÄÄ", weather.value, weather.detail, "from-[#fffdf0] to-[#ffedb8] border-[#b5cbb4]"],
              ["⚡", "SÄHKÖ", electricity.value, electricity.detail, "from-[#fff6ce] to-[#ffdf75] border-[#d2b363]"],
              ["⛽", "AJOAINE", "—", "€/l", "from-[#fff1da] to-[#ffc795] border-[#c78b63]"],
            ].map(([icon, title, value, detail, theme]) => (
              <div key={title} className={`group relative flex h-[66px] items-center gap-3 rounded-[19px] border bg-gradient-to-b ${theme} px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_4px_10px_rgba(52,48,32,.10)] transition hover:-translate-y-0.5`}>
                <span className="text-[27px] drop-shadow-sm">{icon}</span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-black tracking-[0.12em] text-[#625b43]">{title}</span>
                  <span className="mt-0.5 block text-[19px] font-black leading-none text-[#102a24]">{value}</span>
                  <span className="mt-1 block truncate text-[9px] font-black text-[#706a58]">{detail}</span>
                </span>
              </div>
            ))}
            <button type="button" onClick={() => { window.open("https://calendar.google.com/calendar/u/0/r", "_blank", "noopener,noreferrer"); }} className="group relative flex h-[66px] items-center gap-3 rounded-[19px] border border-[#c9a86d] bg-gradient-to-b from-[#fffaf0] to-[#ffe39a] px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_4px_10px_rgba(52,48,32,.10)] transition hover:-translate-y-0.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-[11px] border-2 border-[#8a5b1d] bg-[#fff9e8] text-[21px] font-black text-[#17322a] shadow-sm">{now.getDate()}</span>
              <span>
                <span className="block text-[9px] font-black tracking-[0.12em] text-[#625b43]">{month}</span>
                <span className="mt-0.5 block text-[14px] font-black leading-none text-[#102a24]">Kalenteri</span>
                <span className="mt-1 block text-[9px] font-black text-[#8a5b1d]">Avaa kalenteri →</span>
              </span>
            </button>
            <button type="button" onClick={()=>setCartOpen(true)} className="group relative flex h-[66px] items-center gap-3 rounded-[19px] border border-[#5d8b6c] bg-gradient-to-b from-[#eff9e8] to-[#cfe8bd] px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_4px_10px_rgba(52,48,32,.10)] transition hover:-translate-y-0.5">
              <span className="relative text-[27px]">🛒{desktopCartCount>0&&<span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#12683f] px-1 text-[9px] font-black text-white">{desktopCartCount}</span>}</span>
              <span className="min-w-0"><span className="mt-0.5 block text-[14px] font-black leading-none text-[#153e2c]">Kori</span><span className="mt-1 block text-[9px] font-black text-[#51705a]">{desktopCartCount?desktopCartCount+" kpl":"Avaa kori →"}</span></span>
            </button>
          </div>
        </header>

        

        {cartNotice&&<div className="fixed left-1/2 top-[142px] z-[110] max-w-[760px] -translate-x-1/2 rounded-[18px] bg-[#08a36d] px-8 py-4 text-center text-[16px] font-black text-white shadow-2xl">{cartNotice}</div>}
        {cartOpen && <div className="fixed bottom-[24px] left-[24px] right-[24px] top-[128px] z-[90] flex flex-col overflow-hidden rounded-[30px] border-[3px] border-[#315d45] bg-[#f7efd7] p-5 shadow-[0_30px_90px_rgba(20,40,31,.35)]"><div className="grid grid-cols-[auto_minmax(360px,1fr)_auto] items-center gap-8 border-b border-[#b89552]/35 pb-4"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-[#7d745e]">Ziiply</div><div className="font-serif text-[30px] font-black italic text-[#174c3a]">Ostoskori</div></div><div className="flex items-center justify-center gap-5 rounded-[16px] border border-[#d9c28c] bg-[#fff8df] px-5 py-2"><div className="text-[11px] font-bold text-[#6d604c]">Ostelusvihko on tallennettuja ostoslistoja varten.</div><button type="button" className="whitespace-nowrap rounded-full border-2 border-[#315d45] bg-[#f4e6bd] px-5 py-2 text-[11px] font-black text-[#174c3a]">Tallenna kori Ostelusvihkoon</button></div><div className="flex items-center gap-3"><div className="rounded-full bg-[#dfead4] px-5 py-2 text-[13px] font-black text-[#174c3a]">{desktopCartCount} kpl</div>{cartItems.length>0&&<button onClick={clearDesktopCart} className="rounded-full border-2 border-[#9a4e3e] bg-[#fff6e8] px-4 py-2 text-[12px] font-black text-[#8b3d31]">Tyhjennä kori</button>}<button onClick={()=>setCartOpen(false)} aria-label="Sulje" className="rounded-full border-2 border-[#5a321b] bg-[#9a612d] px-4 py-2 text-[18px] font-black leading-none text-[#fff0c8]">×</button></div></div>{cartItems.length===0?<div className="grid min-h-0 flex-1 place-items-center"><div className="text-center"><div className="text-[54px]">🛒</div><div className="mt-3 text-[22px] font-black text-[#174c3a]">Ostoskori on tyhjä</div></div></div>:<div className="mt-4 min-h-0 flex-1 overflow-y-auto"><div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{cartItems.map((p:any,i:number)=><div key={desktopCartKey(p)||i} className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-4 rounded-[20px] border-2 border-[#d0aa58] bg-[#fffaf0] p-3 shadow-[0_4px_0_rgba(72,73,48,.08)]">{p.pictureUrl?<img src={p.pictureUrl} alt="" className="h-[72px] w-[72px] rounded-[14px] bg-white object-contain"/>:<div className="grid h-[72px] w-[72px] place-items-center rounded-[14px] bg-[#f1ead7] text-[28px]">🛍️</div>}<div className="min-w-0"><div className="line-clamp-2 text-[14px] font-black leading-tight text-[#26352b]">{p.title||p.name}</div><div className="mt-1 text-[11px] font-bold text-[#76684f]">{p.storeName||"Ziiply"}</div>{p.discountText&&<div className="mt-1 line-clamp-1 text-[10px] font-bold text-[#8a6437]">{p.discountText}</div>}</div><div className="text-right">{p.price!=null&&<div className="text-[19px] font-black text-[#174c3a]">{String(p.price).replace(".",",")}{typeof p.price==="number"?" €":""}</div>}<div className="mt-2 flex items-center justify-end gap-2"><button onClick={()=>changeDesktopCartQuantity(p,-1)} className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#315d45] bg-white text-[18px] font-black">−</button><span className="min-w-8 text-center text-[15px] font-black">{Number(p.quantity||1)}</span><button onClick={()=>changeDesktopCartQuantity(p,1)} className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#315d45] bg-[#dfead4] text-[18px] font-black">+</button></div><button onClick={()=>removeDesktopCartItem(p)} className="mt-2 rounded-full border border-[#a57b55] bg-white px-3 py-1.5 text-[10px] font-black text-[#6d4c32]">Poista tuote</button></div></div>)}</div></div>}</div>}

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

        <section className="grid min-h-0 flex-1 items-stretch gap-8 py-5 lg:grid-cols-[0.92fr_1.08fr] xl:gap-11">
          <div className="relative max-w-none flex h-full flex-col justify-start self-stretch">
            <div className="relative h-full min-h-0 overflow-visible rounded-[28px] border-[3px] border-[#b38a4a] bg-[#fcf5de] p-4 shadow-[0_5px_0_rgba(105,72,28,.14),inset_0_0_0_2px_rgba(255,255,255,.48)]">
<div className="grid grid-cols-[1fr_46px_1fr] items-center gap-3"><button disabled={storeCompareScope==="within_chain"} onClick={()=>{setStoreMode("hyper");setStoreModeChosen(true);applyModeDefaults("hyper")}} className={`h-[40px] rounded-[17px] border-2 px-3 text-[12px] font-black ${storeModeChosen&&storeMode==="hyper"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df] text-[#5a4424]"}`}>🏬 Tavaratalot</button><div className="text-center"><span className="block text-[8px] font-black">Yksi</span><button onClick={()=>{setBetweenMode(v=>v==="one"?"many":"one");setSelectedStores({})}} className={`relative mx-auto h-[30px] w-[17px] rounded-full ${betweenMode==="many"?"bg-[#0a6d39]":"bg-[#d8c69d]"}`}><span className={`absolute left-[2px] h-[11px] w-[11px] rounded-full bg-white ${betweenMode==="many"?"top-[17px]":"top-[2px]"}`}/></button><span className="block text-[8px] font-black">Monta</span></div><button disabled={storeCompareScope==="within_chain"} onClick={()=>{setStoreMode("local");setStoreModeChosen(true);applyModeDefaults("local")}} className={`h-[40px] rounded-[17px] border-2 px-3 text-[12px] font-black ${storeModeChosen&&storeMode==="local"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df] text-[#5a4424]"}`}>🏪 Lähikaupat</button></div>
<div className="my-1 text-center text-[9px] font-black uppercase tracking-[.14em] text-[#66543a]">Hakutapa</div><div className="grid grid-cols-[1fr_46px_1fr] gap-3"><button onClick={()=>{setStoreCompareScope("between_chains");setWithinChain(null)}} className={`h-[40px] rounded-[17px] border-2 px-3 text-[11px] font-black ${storeCompareScope==="between_chains"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df]"}`}>Ketjujen väliltä</button><div aria-hidden /><button onClick={()=>{setStoreCompareScope("within_chain");setWithinChain(null);setStoreModeChosen(false)}} className={`h-[40px] rounded-[17px] border-2 px-3 text-[11px] font-black ${storeCompareScope==="within_chain"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df]"}`}>Ketjun sisältä</button></div>
<div className="mt-3 grid grid-cols-2 gap-3">{["S","K","LIDL","SPAR"].map(chain=>{const pool=chain==="LIDL"?lidlStores:chain==="SPAR"?sparStores:stores;const matches=byDistance(pool.filter((s:any)=>{const k=storeKind(s);return chain==="S"?(k==="sHyper"||k==="sLocal"):chain==="K"?(k==="kHyper"||k==="kLocal"):chain==="LIDL"?k==="lidl":k==="spar"}));const candidate=matches.find((s:any)=>{const k=storeKind(s);return chain==="S"?k===(storeMode==="hyper"?"sHyper":"sLocal"):chain==="K"?k===(storeMode==="hyper"?"kHyper":"kLocal"):chain==="LIDL"?k==="lidl":k==="spar"});const manuallySelected=Object.values(selectedStores).find((s:any)=>{const k=storeKind(s);return chain==="S"?(k==="sHyper"||k==="sLocal"):chain==="K"?(k==="kHyper"||k==="kLocal"):chain==="LIDL"?k==="lidl":k==="spar"});const store=(gpsOn||(userLocationAction&&locationResolved))?candidate:(manuallySelected||null);const selected=Boolean(store&&selectedStores[String(store.id)]);const bg=chain==="S"?(storeMode==="hyper"?"/ui/store-backgrounds/store-bg-prisma-v3.svg":"/ui/store-backgrounds/store-bg-alepa-v3.svg"):chain==="K"?(storeMode==="hyper"?"/ui/store-backgrounds/store-bg-kcitymarket-v3.svg":"/ui/store-backgrounds/store-bg-kmarket-v3.svg"):chain==="LIDL"?"/ui/store-backgrounds/store-bg-lidl-v3.svg":"/ui/store-backgrounds/store-bg-spar-v3.svg";const logo=chain==="S"?"/storelogos/s-group.png":chain==="K"?"/storelogos/k-group.png":chain==="LIDL"?"/storelogos/lidl.png":"/storelogos/spar.png";return <button key={chain} onClick={()=>{if(!store)return;setSelectedStores(prev=>{const key=String(store.id);if(betweenMode==="one")return {[key]:store};const next={...prev};if(next[key])delete next[key];else next[key]=store;return next})}} className={`relative h-[122px] overflow-visible rounded-[20px] border-[2.5px] text-center shadow-[0_5px_10px_rgba(52,38,14,.08),inset_0_0_0_1px_rgba(255,255,255,.9)] ${selected?"border-[#5c7858] bg-[#edf0d2]":"border-[#d9c18e] bg-[#fffaf0]"}`}><img src={bg} alt="" className="pointer-events-none absolute bottom-[-34px] left-[-20px] h-[145px] w-[calc(100%+40px)] object-cover object-bottom opacity-60"/><span className="absolute left-2 top-2 z-20 flex h-8 w-10 items-center justify-center rounded-lg border border-[#b89552] bg-[#fffef9]/90 p-1"><img src={logo} alt={chain} className="h-full w-full object-contain"/></span><span className={`absolute right-2 top-2 z-20 grid h-7 w-7 place-items-center rounded-full border font-black ${selected?"border-[#536d4f] bg-[#648060] text-white":"border-[#d0ad68] bg-[#fff8dc] text-transparent"}`}>✓</span><span className="absolute left-3 right-3 top-[48px] z-20 block truncate text-[14px] font-black text-[#171713]">{store?.name||`${chain} ei löytynyt`}</span>{store&&Number.isFinite(distanceKm(store))?<span className="absolute left-3 right-3 top-[68px] z-20 block text-[9px] font-black text-[#667064]">{distanceKm(store).toFixed(1)} km</span>:null}<span onClick={(e)=>{e.stopPropagation();setPickerChain(pickerChain===chain?null:chain as any)}} className="absolute bottom-2 left-1/2 z-30 -translate-x-1/2 rounded-full border border-[#d4c18e] bg-white/90 px-4 py-1 text-[10px] font-black">{selected?"Valittu":"Vaihda"}</span>{pickerChain===chain&&<span onClick={(e)=>e.stopPropagation()} className="absolute left-2 right-2 top-[112px] z-50 max-h-[210px] overflow-auto rounded-[16px] border-2 border-[#b89552] bg-[#fffaf0] p-2 text-left shadow-2xl">{byDistance((chain==="LIDL"?lidlStores:chain==="SPAR"?sparStores:stores).filter((s:any)=>{const k=storeKind(s);return chain==="S"?k===(storeMode==="hyper"?"sHyper":"sLocal"):chain==="K"?k===(storeMode==="hyper"?"kHyper":"kLocal"):chain==="LIDL"?k==="lidl":k==="spar"})).map((s:any)=><span key={String(s.id)} onClick={()=>{setSelectedStores(prev=>{const next:any={};for(const [id,x] of Object.entries(prev)){const k=storeKind(x);if(chain==="S"?(k!=="sHyper"&&k!=="sLocal"):chain==="K"?(k!=="kHyper"&&k!=="kLocal"):chain==="LIDL"?k!=="lidl":k!=="spar")next[id]=x}next[String(s.id)]=s;return next});setPickerChain(null)}} className="block cursor-pointer rounded-xl px-3 py-2 text-[11px] font-black hover:bg-[#e9f2dd]">{s.name}{Number.isFinite(distanceKm(s))?<small className="ml-2 font-bold text-[#6d7468]">{distanceKm(s).toFixed(1)} km</small>:null}</span>)}</span>}</button>})}</div>
</div>
                      </div>

          <div className="relative max-h-[calc(100dvh-150px)] rounded-[42px] border border-[#756443]/15 bg-[#f8f5ed]/92 p-5 shadow-[0_34px_90px_rgba(34,54,43,0.22)] ring-1 ring-[#fffaf0]/95 xl:p-8">
            <div aria-hidden className="absolute -right-4 -top-5 h-24 w-24 rotate-6 rounded-[26px] border border-[#8b7145]/15 bg-[#fff0bd]/55 shadow-[0_16px_35px_rgba(91,67,30,0.10)]" />
            <div aria-hidden className="absolute -bottom-5 left-12 h-16 w-40 -rotate-2 rounded-[22px] border border-[#61785d]/12 bg-[#dce8d8]/60 shadow-[0_14px_30px_rgba(41,67,46,0.08)]" />
            <div className="grid grid-cols-3 gap-4 xl:gap-5 -mt-3">
              {assistants.map((item) => {
                const selected = active === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => { setActive(item.key); if(item.key==="gosta"){setWorkspace(null);setGostaChainPicker(true)}else{setGostaChainPicker(false);setWorkspace(item.key)} }}
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

            {gostaChainPicker && <div className="fixed bottom-0 left-0 right-0 top-[112px] z-[49] bg-[#e8eadf]/95" onClick={e=>e.stopPropagation()} />}
            {gostaChainPicker && (()=>{const chainOf=(s:any)=>{const k=storeKind(s);const raw=String(s?.chain||s?.type||s?.brand||s?.name||"").toLowerCase();if(k==="spar"||raw.includes("tokmanni")||raw.includes("spar"))return "SPAR";if(k==="lidl"||raw.includes("lidl"))return "LIDL";if(k.startsWith("s"))return "S";if(k.startsWith("k"))return "K";return ""};const selectedByChain=new Map<string,any>();Object.values(selectedStores).forEach((s:any)=>selectedByChain.set(chainOf(s),s));const order=["S","K","SPAR","LIDL"];const visible=order.map(ch=>selectedByChain.get(ch)).filter(Boolean) as any[];const meta:any={S:["/storelogos/s-group.png","S-ryhmä"],K:["/storelogos/k-group.png","K-ryhmä"],SPAR:["/storelogos/spar.png","Tokmanni / Spar"],LIDL:["/storelogos/lidl.png","Lidl"]};return <div className="fixed bottom-[24px] left-[24px] right-[24px] top-[128px] z-50 flex flex-col overflow-hidden rounded-[28px] border-[3px] border-[#5a321b] bg-[#efe0bd] p-4 shadow-[0_28px_80px_rgba(34,54,43,.28)]"><div className="relative rounded-[20px] border-2 border-[#caa15d] bg-[#f7e7bd] px-4 py-2.5 text-center"><button onClick={()=>setGostaChainPicker(false)} aria-label="Sulje" className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border-2 border-[#5a321b] bg-[#9a612d] px-3 py-1.5 text-[17px] font-black leading-none text-[#fff0c8]">×</button><div className="font-serif text-[22px] font-black italic text-[#174c35]">Tarjous- ja kampanjahaku</div></div><div className="mx-auto mt-3 flex min-h-0 w-full max-w-[760px] flex-1 flex-col rounded-[22px] border-2 border-[#b58a46] bg-[#fff4cf] p-4"><div className="text-center font-serif text-[23px] font-black italic text-[#174c35]">Valitse kaupparyhmä</div><div className="mt-1 text-center text-[13px] font-black text-[#6d604c]">Mistä kaupparyhmästä haetaan tarjoukset?</div><div className="mx-auto mt-3 grid min-h-0 w-full max-w-[620px] flex-1 grid-cols-2 gap-3">{visible.map((store:any)=>{const ch=chainOf(store);const m=meta[ch];const offerChain:any=ch==="SPAR"?(String(store?.chain||"").toUpperCase()==="EUROSPAR"?"EUROSPAR":"TOKMANNI"):ch;return <button key={ch} onClick={()=>void openDesktopGostaChain(offerChain,store)} className="grid min-h-0 place-items-center rounded-[20px] border-[3px] border-[#17573c] bg-[#fff8d9] p-3 shadow-[0_7px_0_rgba(72,73,48,.18)]"><img src={m[0]} alt="" className="h-[58px] w-[82px] object-contain"/><div className="mt-1 text-[16px] font-black text-[#17573c]">{m[1]}</div></button>})}</div>{visible.length===0&&<div className="m-auto rounded-[20px] border-2 border-[#b58a46] bg-[#fff9e7] p-6 text-center text-[15px] font-black">Valitse ensin kauppaketju pääruudulta.</div>}</div></div>})()}

            {gostaChain && <div className="fixed bottom-0 left-0 right-0 top-[112px] z-[49] bg-[#e8eadf]/95" onClick={e=>e.stopPropagation()} />}
            {gostaChain && (()=>{const campaigns=gostaOffers.filter((x:any)=>x.campaignType==="campaign");const offers=gostaOffers.filter((x:any)=>x.campaignType!=="campaign");const showCampaigns=campaigns.length>0;const source=gostaTab==="campaigns"?campaigns:offers;const cats=Array.from(new Set(source.map((x:any)=>String(x.category||"Muu")).filter(Boolean)));const visible=gostaCategory?source.filter((x:any)=>String(x.category||"Muu")===gostaCategory):[];return <div className="fixed bottom-[24px] left-[24px] right-[24px] top-[128px] z-50 flex flex-col overflow-hidden rounded-[28px] border-[3px] border-[#5a321b] bg-[#efe0bd] p-4 shadow-[0_28px_80px_rgba(34,54,43,.28)]"><div className="relative rounded-[20px] border-2 border-[#caa15d] bg-[#f7e7bd] px-4 py-2.5 text-center"><button onClick={()=>setGostaChain(null)} aria-label="Sulje" className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border-2 border-[#5a321b] bg-[#9a612d] px-3 py-1.5 text-[17px] font-black leading-none text-[#fff0c8]">×</button><div className="font-serif text-[22px] font-black italic text-[#174c35]">Tarjous- ja kampanjahaku</div></div><div className="mt-3 flex items-center justify-center gap-3"><button onClick={()=>{setGostaTab("offers");setGostaCategory("")}} className={`rounded-full border-2 px-6 py-2 text-[14px] font-black ${gostaTab==="offers"?"border-[#17573c] bg-[#17573c] text-white":"border-[#b58a46] bg-[#fff4cf] text-[#174c35]"}`}>Tarjoukset <span className="opacity-70">({offers.length})</span></button>{showCampaigns&&<button onClick={()=>{setGostaTab("campaigns");setGostaCategory("")}} className={`rounded-full border-2 px-6 py-2 text-[14px] font-black ${gostaTab==="campaigns"?"border-[#17573c] bg-[#17573c] text-white":"border-[#b58a46] bg-[#fff4cf] text-[#174c35]"}`}>Kampanjat <span className="opacity-70">({campaigns.length})</span></button>}</div><div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-[22px] border-2 border-[#b58a46] bg-[#fff4cf] p-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">{cats.map((cat:any)=>{const count=source.filter((x:any)=>String(x.category||"Muu")===cat).length;const icon=String(cat).toLowerCase().includes("kahvi")?"☕":String(cat).toLowerCase().includes("maito")?"🥛":String(cat).toLowerCase().includes("kala")?"🐟":String(cat).toLowerCase().includes("leip")?"🥐":String(cat).toLowerCase().includes("hevi")?"🍎":String(cat).toLowerCase().includes("juoma")?"🥤":String(cat).toLowerCase().includes("valmis")?"🍽️":String(cat).toLowerCase().includes("kuiva")?"🥣":String(cat).toLowerCase().includes("make")?"🍬":String(cat).toLowerCase().includes("lasten")?"🏷️":String(cat).toLowerCase().includes("lemm")?"🐾":String(cat).toLowerCase().includes("hyg")?"🧴":String(cat).toLowerCase().includes("koti")?"🏠":"🏷️";return <button key={cat} onClick={()=>setGostaCategory(cat)} className="flex min-h-[78px] items-center gap-4 rounded-[20px] border-[3px] border-[#17573c] bg-[#fff9dd] px-5 py-3 text-left text-[#174c35] shadow-[0_4px_0_rgba(72,73,48,.12)] transition hover:-translate-y-0.5 hover:bg-[#f1f0c9]"><span className="text-[28px]">{icon}</span><span className="min-w-0 flex-1 text-[15px] font-black leading-tight">{cat} <span className="whitespace-nowrap">({count})</span></span></button>})}</div></div>{gostaCategory&&<div className="absolute inset-x-4 bottom-4 top-[150px] z-10 overflow-y-auto rounded-[22px] border-2 border-[#b58a46] bg-[#fff4cf] p-4 shadow-[0_12px_35px_rgba(34,54,43,.18)]"><div className="sticky top-0 z-20 mb-3 flex items-center justify-between rounded-[16px] border border-[#c9a55f] bg-[#fff4cf]/95 px-3 py-2 shadow-sm"><button type="button" onClick={()=>setGostaCategory("")} className="rounded-full border-2 border-[#17573c] bg-[#fff9dd] px-4 py-2 text-[12px] font-black text-[#174c35] shadow-sm">← Kategoriat</button><div className="min-w-0 px-4 text-center text-[13px] font-black text-[#174c35]">{gostaCategory}</div><div className="w-[104px]" aria-hidden /></div>{gostaLoading?<div className="grid h-full place-items-center text-[16px] font-black text-[#174c35]">Haetaan tarjouksia…</div>:visible.length===0?<div className="grid h-full place-items-center text-[15px] font-black text-[#6d604c]">Ei tuloksia.</div>:<div className="grid grid-cols-2 gap-3 xl:grid-cols-3">{visible.map((p:any,i:number)=><div key={String(p.id||i)} className="flex min-h-[142px] gap-3 rounded-[20px] border-2 border-[#d0aa58] bg-[#fffaf0] p-3 shadow-[0_4px_0_rgba(72,73,48,.10)]">{p.pictureUrl&&<img src={p.pictureUrl} alt="" className="h-24 w-24 shrink-0 rounded-[14px] bg-white object-contain"/>}<div className="min-w-0 flex-1"><div className="line-clamp-3 text-[13px] font-black leading-tight text-[#26352b]">{p.title||p.name}</div><div className="mt-1 text-[10px] font-bold text-[#76684f]">{p.storeName}</div>{p.price!=null&&<div className="mt-2 text-[18px] font-black text-[#174c3a]">{String(p.price).replace(".",",")}{typeof p.price==="number"?" €":""}</div>}{p.discountText&&<div className="mt-1 line-clamp-2 text-[10px] font-bold text-[#8a6437]">{p.discountText}</div>}<div className="relative mt-2 inline-block"><button type="button" onClick={()=>addDesktopCartItem(p)} className="rounded-full border-2 border-[#17613f] bg-[#17854d] px-3 py-1.5 text-[11px] font-black text-white">🛒 Lisää koriin</button>{cartIncrementKey===desktopCartKey(p)&&<span className="absolute -right-3 -top-3 grid h-8 min-w-8 place-items-center rounded-full bg-[#08a36d] px-2 text-[13px] font-black text-white shadow-lg">+1</span>}</div></div></div>)}</div>}</div>}</div>})()}

            {workspace && workspace==="justiina" && (
              <div className="fixed left-1/2 top-[152px] z-50 flex h-[min(620px,calc(100dvh-190px))] w-[min(1120px,92vw)] -translate-x-1/2 flex-col overflow-hidden rounded-[28px] border-[3px] border-[#174c3a] bg-[#fff3cf] p-6 shadow-[0_28px_80px_rgba(34,54,43,.28)]">
                <div className="relative flex items-start justify-between"><button onClick={()=>setWorkspace(null)} aria-label="Sulje" className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full border-2 border-[#5a321b] bg-[#9a612d] px-3 py-1.5 text-[17px] font-black leading-none text-[#fff0c8]">×</button><div className="pl-16"><div className="text-[11px] font-black uppercase tracking-[.28em] text-[#7c745d]">HAKU</div><h2 className="font-serif text-[38px] font-black italic leading-none text-[#174c3a]">Tuotteet ja vertailu</h2></div><button onClick={()=>setCartOpen(true)} className="rounded-full border-[3px] border-[#0d633a] bg-[#118545] px-7 py-3 font-serif text-[20px] font-black italic text-[#fff3d2] shadow-[inset_0_-5px_0_rgba(0,0,0,.12)]">Vihkonen</button></div>
                <div className="mx-auto mt-5 flex w-full max-w-[820px] flex-1 flex-col">
                  <div className="grid grid-cols-[1fr_130px] items-center gap-5">
                    <div className="rounded-[24px] border-2 border-[#d0aa58] bg-[#fff8dd] p-4 text-center"><img src="/assistants/justiina.png" alt="Justiina" className="mx-auto h-[145px] w-[145px] object-contain"/><div className="mt-1 font-serif text-[20px] font-black italic text-[#174c3a]">Justiina</div></div>
                    <button type="button" onClick={()=>setJustiinaDelay(v=>v===2?1:v===1?0:2)} className="rounded-[22px] border-2 border-[#d0aa58] bg-[#fff8dd] p-4 text-center"><div className="mx-auto grid h-[70px] w-[70px] place-items-center rounded-full border-[7px] border-[#8b7145] bg-[#d8c18b] text-[28px]">⏱</div><div className="mt-2 text-[10px] font-black uppercase tracking-[.18em] text-[#174c3a]">Hakutahti</div><div className="text-[13px] font-black text-[#75664e]">{justiinaDelay===2?"Normaali · 2 s":justiinaDelay===1?"Nopea · 1 s":"Heti · 0 s"}</div></button>
                  </div>
                  <form onSubmit={e=>{e.preventDefault();void runDesktopJustiinaSearch()}} className="mt-5 flex gap-3"><input autoFocus value={justiinaQuery} onChange={e=>setJustiinaQuery(e.target.value)} placeholder="maito, kahvi" className="min-w-0 flex-1 rounded-[24px] border-[3px] border-[#b89959] bg-[#fffdf5] px-6 py-4 text-center font-serif text-[26px] font-black text-[#6f6657] outline-none placeholder:text-[#8b806e]"/><button type="submit" disabled={justiinaLoading||!justiinaQuery.trim()} className="rounded-[22px] border-[3px] border-[#0d633a] bg-[#118545] px-7 text-[17px] font-black text-white disabled:opacity-40">{justiinaLoading?"Haetaan…":"Hae"}</button></form>{justiinaMessage&&<div className="mt-3 text-center text-[13px] font-black text-[#765f3f]">{justiinaMessage}</div>}{justiinaResults.length>0&&<div className="mt-3 grid max-h-[210px] grid-cols-2 gap-2 overflow-auto pr-1">{justiinaResults.map((p:any,i)=><div key={String(p.id||p.ean||i)} className="flex min-h-[82px] items-center gap-3 rounded-[18px] border-2 border-[#d0aa58] bg-[#fffaf0] p-2 text-left">{(p.pictureUrl||p.imageUrl||p.image)&&<img src={p.pictureUrl||p.imageUrl||p.image} alt="" className="h-14 w-14 rounded-xl object-contain bg-white"/>}<div className="min-w-0 flex-1"><div className="line-clamp-2 text-[12px] font-black text-[#26352b]">{p.name||p.title||p.productName}</div><div className="mt-1 text-[10px] font-bold text-[#76684f]">{p.__store}</div></div>{p.__price>0&&<div className="text-[15px] font-black text-[#174c3a]">{p.__price.toFixed(2).replace(".",",")} €</div>}</div>)}</div>}
                  <div className="mt-6 grid grid-cols-2 gap-6">
                    <button className="rounded-[24px] border-[4px] border-[#6e5b32] bg-[#2c3429] p-5 text-[20px] font-black text-[#ffe0a0] shadow-lg"><div className="mb-2 text-[38px]">🎙️</div>Äänitä</button>
                    <button className="rounded-[24px] border-[4px] border-[#6e5b32] bg-[#2c3429] p-5 text-[20px] font-black text-[#ffe0a0] shadow-lg"><div className="mb-2 text-[38px]">📷</div>Filmaa</button>
                  </div>
                </div>
                
              </div>
            )}
            {workspace && workspace!=="justiina" && (
              <div className="absolute inset-5 z-40 flex flex-col rounded-[32px] border border-[#756443]/20 bg-[#f8f5ed]/[0.99] p-6 shadow-[0_28px_80px_rgba(34,54,43,.28)] xl:inset-8">
                <div className="flex items-center justify-between"><div className="text-[26px] font-black text-[#14291f]">{assistants.find(x=>x.key===workspace)?.name}</div><button onClick={()=>setWorkspace(null)} className="rounded-full bg-white px-4 py-2 font-black">← Takaisin</button></div>
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

"use client";

import ArvoSettingsPanel from "../components/ziiply/ArvoSettingsPanel";
import { readArvoPreferences, effectiveArvoDiets, ARVO_DIETS, type ArvoPreferences } from "../components/ziiply/ArvoSettingsPanel";

import { useEffect, useRef, useState } from "react";
import { getKSearchTerms, getNormalSearchQueries, normalizeEan, pickBestKProduct, pickBestSProduct, rankNormalSearchResults, productGroupGate, isComparisonAttributeCompatible } from "../components/ziiply/ziiplyCore";
import { getLearnedSearchBoost, getLearnedStructureBoost, rememberSearchChoice } from "../components/ziiply/search/searchIntentMemory";
import { resolveKWeightLabel, resolvePriceWeightLabel } from "../components/ziiply/kWeightLabelResolver";
import { parseMobileVoiceList } from "../components/ziiply/desktop/justiina/mobileVoiceList";
import DesktopJustiinaSearchCard from "../components/ziiply/desktop/justiina/DesktopJustiinaSearchCard";
import ZiiplyDesktopScannerCard from "../components/ziiply/desktop/justiina/ZiiplyDesktopScannerCard";
import dynamic from "next/dynamic";
import DesktopAssistantCards from "../components/ziiply/desktop/DesktopAssistantCards";
import ZiiplyDesktopNotebookCard from "../components/ziiply/cards/ZiiplyDesktopNotebookCard";
import ZiiplyDesktopCompareCard from "../components/ziiply/desktop/ZiiplyDesktopCompareCard";
import { GOSTA_OFFER_CATEGORY_SUGGESTIONS_V147, getResolvedGostaCategoryV166, getLastZiiplyKruokaDebugV174, mapZiiplyGostaOfferToCardOfferV147, searchZiiplyGostaOffersV146, cleanZiiplyGostaOfferResultsV146, filterZiiplyGostaOfferResultsV146 } from "../components/ziiply/offerSearch/ziiplyOfferSearchCore";
import { getPreciseProductCategoryV170 } from "../components/ziiply/offerSearch/ziiplyOfferCategoryCore";
import { getOfferPrice, splitOfferDisplayPrice } from "../components/ziiply/cards/ZiiplyMobileOfferSearchCard";

const DesktopFuelPhotoReport=dynamic(()=>import("../components/ziiply/desktop/DesktopFuelPhotoReport"),{ssr:false});

type Assistant = "gosta" | "justiina" | "arvo";

// Shared geometry for desktop Gosta overlays (fuel, offers, future electricity).
const GOSTA_DESKTOP_OVERLAY_SHELL = "fixed bottom-[24px] left-1/2 top-[var(--desktop-overlay-top)] flex w-[min(1040px,calc(100vw-48px))] -translate-x-1/2 flex-col overflow-hidden rounded-[28px] border-[3px] border-[#5a321b] bg-[#efe0bd] p-4 shadow-[0_28px_80px_rgba(34,54,43,.28)]";


// Preload fuel brand images once on the persistent desktop page, before fuel cards mount.
const FUEL_LOGO_URLS = ["/storelogos/Neste.png","/storelogos/ABC.png","/storelogos/St1.png","https://commons.wikimedia.org/wiki/Special:FilePath/Gulf_Oil_logo.svg","https://commons.wikimedia.org/wiki/Special:FilePath/RITOIL_Logo.svg"];
const fuelLogoPreloads: HTMLImageElement[] = [];
function preloadFuelLogos() {
  if (typeof window === "undefined" || fuelLogoPreloads.length) return;
  for (const url of FUEL_LOGO_URLS) {
    const image = new window.Image();
    image.decoding = "async";
    image.src = url;
    fuelLogoPreloads.push(image);
  }
}

function FuelBrandLogo({ brand }: { brand: "Neste" | "ABC" | "St1" | "SEO" | "Muut" }) {
  const logos: Record<string,string> = {
    Neste: "/storelogos/Neste.png",
    ABC: "/storelogos/ABC.png",
    St1: "/storelogos/St1.png",
  };
  const [failed, setFailed] = useState(false);
  useEffect(() => { preloadFuelLogos(); }, []);
  if (brand === "SEO" && !failed) return <img src="/storelogos/SEO.jpeg" alt="SEO" className="h-full w-full object-contain p-1" loading="eager" fetchPriority="high" onError={() => setFailed(true)} />;
  if (!logos[brand] || failed) return <span>{brand === "Muut" ? "G/R" : brand}</span>;
  return <img src={logos[brand]} alt={brand} onError={() => setFailed(true)} className="h-full w-full object-contain p-1" loading="eager" fetchPriority="high" />;
}

function FuelStationTypeIllustration({ kind, className }: { kind: "traffic" | "cold" | "pump"; className: string }) {
  const images = {
    traffic: "/fuel-icons/traffic-station.png",
    cold: "/fuel-icons/cold-station.png",
    pump: "/fuel-icons/fuel-pump.png",
  };
  return <img src={images[kind]} alt="" aria-hidden="true" className={className} style={{ objectFit: "contain" }} loading="eager" draggable={false} />;
}

// Keep the desktop category order identical to the mobile Gösta category labels.
function desktopCategoryRank(category: string): number {
  const normalize = (value: string) => value.toLocaleLowerCase("fi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const normalized = normalize(category);
  if (["muu", "muut", "other"].includes(normalized)) return GOSTA_OFFER_CATEGORY_SUGGESTIONS_V147.length + 1;
  const index = GOSTA_OFFER_CATEGORY_SUGGESTIONS_V147.findIndex(label => normalize(label) === normalized);
  return index >= 0 ? index : GOSTA_OFFER_CATEGORY_SUGGESTIONS_V147.length;
}
function sortDesktopCategories(categories: string[]): string[] {
  return [...categories].sort((a,b) => desktopCategoryRank(a) - desktopCategoryRank(b) || a.localeCompare(b, "fi"));
}

function FuelStationCardDetails({ chain, station }: { chain: string; station: any }) {
  const price = (v: unknown) => v != null && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v).toFixed(3).replace(".", ",") : "–";
  const compact = chain.includes("Gulf") || chain.includes("Ritoil") || chain === "Muut";
  return <div className="pointer-events-none absolute inset-x-0 top-1 z-10 flex h-[calc(100%-8px)] min-w-0 flex-col items-center text-center">
    <div className="flex w-[calc(100%-128px)] min-w-0 flex-col items-center">
      <div className={`w-full text-center font-black leading-[1.05] text-[#111827] ${compact ? "whitespace-nowrap text-[clamp(9px,.72vw,12px)]" : "text-[clamp(12px,1vw,16px)]"}`}>{chain}</div>
      <div className="w-full text-center text-[clamp(11px,.9vw,14px)] font-bold leading-[1.1] text-[#111827]">{station?.name || "Ei asemaa saatavilla"}</div>
      {station && <div className="text-[12px] font-bold leading-[1.1] text-black">{Number(station.distanceKm).toFixed(1).replace(".", ",")} km</div>}
    </div>
    {station && <div className="absolute bottom-1.5 left-2 flex w-14 shrink-0 flex-col items-center whitespace-nowrap text-[clamp(10px,.8vw,13px)] font-extrabold leading-[1.05] text-[#172b24]">
      <div className="flex items-center justify-center gap-1"><span>DI</span><span>{price(station.diesel)}</span></div>
      <div className="flex items-center justify-center gap-1"><span>BE</span><span>{price(station.price95)} / {price(station.price98)}</span></div>
    </div>}
  </div>;
}

function FuelStationBackdrop({ chain }: { chain: "Neste" | "ABC" | "St1" | "SEO" | "Muut" }) {
  // Each chain has a distinct architectural silhouette, not a recolored common building.
  const pump = (x:number, color:string) => <g key={x}><rect x={x} y="112" width="20" height="37" rx="3" fill="#f2f0e7" stroke={color} strokeWidth="2.5"/><rect x={x+4} y="117" width="12" height="13" fill="#9eb9b8"/><path d={`M${x+20} 119 q12 1 12 13 v13`} stroke="#666b65" strokeWidth="3" fill="none"/></g>;
  return <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[66%] overflow-hidden opacity-[.58]">
    <svg viewBox="0 0 440 160" preserveAspectRatio="xMidYMax slice" className="h-full w-full">
      <path d="M0 151 H440 V160 H0Z" fill="#c3b8a4" opacity=".35"/>
      {chain === "Neste" && <g transform="translate(118 0)">
        <path d="M136 70 L156 48 H343 L358 70 V150 H136Z" fill="#e0ebe7" stroke="#91aaa5" strokeWidth="2"/>
        <path d="M148 72 H345 V84 H148Z" fill="#328b85"/>
        <path d="M158 90 H214 V137 H158Z M222 90 H278 V137 H222Z M286 90 H333 V137 H286Z" fill="#8bbdb9" stroke="#f4f7ef" strokeWidth="5"/>
        <path d="M-8 77 L45 42 H256 L284 61 V82 H-8Z" fill="#eaf0eb" stroke="#327e7a" strokeWidth="3"/>
        <path d="M-5 70 H280 V82 H-5Z" fill="#228e89"/><path d="M12 82 V150 M246 82 V150" stroke="#a2aaa6" strokeWidth="7"/>
        {pump(38,"#348f8a")}{pump(203,"#348f8a")}
      </g>}
      {chain === "ABC" && <g transform="translate(118 0)">
        <path d="M76 66 L110 31 H343 L383 66 V150 H76Z" fill="#e6e8dd" stroke="#a0ad9c" strokeWidth="2"/>
        <path d="M111 32 H341 L379 67 H77Z" fill="#167a4b"/>
        <path d="M96 75 H361 V90 H96Z" fill="#237f53"/>
        <path d="M112 95 H171 V141 H112Z M180 95 H239 V141 H180Z M248 95 H308 V141 H248Z M316 95 H351 V141 H316Z" fill="#a2c6b1" stroke="#f2f3e9" strokeWidth="5"/>
        <path d="M-10 93 L32 70 H155 L179 87 V99 H-10Z" fill="#e7eee1" stroke="#1e7647" strokeWidth="3"/>
        <path d="M-5 91 H178 V103 H-5Z" fill="#16824b"/><path d="M17 103 V150 M151 103 V150" stroke="#9aa99a" strokeWidth="7"/>
        {pump(42,"#247e51")}
      </g>}
      {chain === "St1" && <g transform="translate(118 0)">
        <path d="M182 72 L197 52 H393 V150 H182Z" fill="#e9e7e3" stroke="#aaa9a4" strokeWidth="2"/>
        <path d="M188 69 H392 V81 H188Z" fill="#c7353d"/>
        <path d="M204 88 H251 V139 H204Z M260 88 H307 V139 H260Z M316 88 H377 V139 H316Z" fill="#a7bbc1" stroke="#f5f3ef" strokeWidth="5"/>
        <path d="M-15 69 L22 44 H262 L294 69 V88 H-15Z" fill="#f1f0eb" stroke="#bd3039" strokeWidth="3"/>
        <path d="M-10 73 H293 V89 H-10Z" fill="#d33c42"/><path d="M18 89 V151 M265 89 V151" stroke="#9a9d9d" strokeWidth="8"/>
        <path d="M-8 69 H289" stroke="#f7f7f1" strokeWidth="5"/>
        {pump(55,"#d23b42")}{pump(218,"#d23b42")}
      </g>}
      {chain === "SEO" && <g transform="translate(118 0)">
        <path d="M164 81 L196 57 H374 L399 81 V150 H164Z" fill="#e9e5d9" stroke="#a8ad99" strokeWidth="2"/>
        <path d="M196 58 H375 L396 82 H165Z" fill="#3c7841"/>
        <path d="M183 92 H233 V140 H183Z M241 92 H291 V140 H241Z M299 92 H381 V140 H299Z" fill="#a5b9aa" stroke="#f0f0e4" strokeWidth="5"/>
        <path d="M5 97 L26 78 H189 L206 97 V109 H5Z" fill="#f3f1e4" stroke="#397443" strokeWidth="3"/>
        <path d="M6 101 H205 V113 H6Z" fill="#48844b"/><path d="M27 113 V150 M186 113 V150" stroke="#9aa59a" strokeWidth="7"/>
        {pump(55,"#3d8046")}{pump(145,"#3d8046")}
      </g>}
      {chain === "Muut" && <g transform="translate(118 0)">
        <path d="M142 84 L181 43 H321 L356 84 V150 H142Z" fill="#e6ddc8" stroke="#ae9b7b" strokeWidth="2"/>
        <path d="M181 43 H322 L359 85 H141Z" fill="#9b7950"/>
        <path d="M162 94 H221 V143 H162Z M230 94 H287 V143 H230Z M295 94 H335 V143 H295Z" fill="#aebdb8" stroke="#f4ecdc" strokeWidth="5"/>
        <path d="M15 107 L34 88 H139 L155 107 V116 H15Z" fill="#f0e5ce" stroke="#ac8852" strokeWidth="3"/>
        <path d="M15 107 H155 V119 H15Z" fill="#b69259"/><path d="M37 119 V150 M136 119 V150" stroke="#b3a48e" strokeWidth="6"/>
        {pump(56,"#b38b52")}
      </g>}
    </svg>
  </div>;
}


function ZiiplyVintageMillLoader() {
  return <div className="flex w-full flex-col items-center pt-3" role="status" aria-label="Etsitään parhaita tarjouksia">
    <svg viewBox="0 0 560 300" className="w-[min(560px,94%)] max-h-[300px] drop-shadow-[0_12px_10px_rgba(75,48,24,0.22)]" aria-hidden="true">
      <defs>
        <linearGradient id="ziiply-mill-wood" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e0b77b"/><stop offset=".45" stopColor="#9b6237"/><stop offset="1" stopColor="#60371f"/></linearGradient>
        <radialGradient id="ziiply-mill-stone" cx=".32" cy=".23" r=".8"><stop stopColor="#e6dcc7"/><stop offset=".35" stopColor="#b7ae99"/><stop offset=".75" stopColor="#807969"/><stop offset="1" stopColor="#504b42"/></radialGradient>
        <filter id="ziiply-mill-granite"><feTurbulence type="fractalNoise" baseFrequency=".13" numOctaves="3" seed="8" result="grain"/><feColorMatrix in="grain" type="saturate" values="0" result="gray"/><feBlend in="SourceGraphic" in2="gray" mode="multiply"/></filter>
      </defs>
      <ellipse cx="277" cy="266" rx="205" ry="16" fill="#76552e" opacity=".17"/>
      <path d="M130 175 L400 175 L427 199 L412 254 L145 254 L119 225Z" fill="url(#ziiply-mill-wood)" stroke="#55351f" strokeWidth="7" strokeLinejoin="round"/>
      <path d="M130 175 L400 175 L427 199 L148 203Z" fill="#c99861" stroke="#634025" strokeWidth="5"/>
      <path d="M147 220 L412 215 M147 239 L411 234" stroke="#432819" strokeWidth="3" opacity=".5"/>
      <path d="M159 202 L159 253 M393 200 L393 253" stroke="#3c291e" strokeWidth="10"/>
      <circle cx="273" cy="121" r="104" fill="#5c5549" stroke="#645746" strokeWidth="8"/>
      <circle cx="270" cy="117" r="96" fill="url(#ziiply-mill-stone)" filter="url(#ziiply-mill-granite)"/>
      <g className="origin-[270px_117px] animate-[ziiplyVintageStone_9s_linear_infinite]">
        <circle cx="270" cy="117" r="83" fill="none" stroke="#645f55" strokeWidth="4" strokeDasharray="7 12" opacity=".36"/>
        <path d="M270 32 V88 M270 149 V202 M185 117 H240 M301 117 H355 M210 57 L248 95 M292 140 L330 178" stroke="#615b50" strokeWidth="5" opacity=".32"/>
      </g>
      <circle cx="270" cy="117" r="25" fill="#48301d" stroke="#aa7a48" strokeWidth="6"/>
      <circle cx="270" cy="117" r="11" fill="#bc8e56" stroke="#50341d" strokeWidth="4"/>
      <g className="origin-[375px_103px] animate-[ziiplyVintageCrank_9s_ease-in-out_infinite]">
        <path d="M370 104 H426 L440 56" fill="none" stroke="#4e2e1b" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M370 104 H426 L440 56" fill="none" stroke="#b37b45" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="426" y="34" width="79" height="23" rx="11" fill="url(#ziiply-mill-wood)" stroke="#613b23" strokeWidth="4"/>
        <ellipse cx="499" cy="45" rx="6" ry="11" fill="#754626"/>
      </g>
      <path d="M105 206 Q67 193 57 222 L65 256 Q92 268 123 248 L129 220 Q119 209 105 206Z" fill="#bea072" stroke="#896842" strokeWidth="4"/>
      <ellipse cx="93" cy="212" rx="32" ry="10" fill="#d9b474" stroke="#886a43" strokeWidth="5"/>
      <path d="M431 254 Q465 223 484 246 M447 257 Q489 231 514 247 M457 263 Q488 251 528 262" fill="none" stroke="#c59549" strokeWidth="4" strokeLinecap="round"/>
      <g fill="#c9974f"><ellipse cx="150" cy="268" rx="4" ry="2"/><ellipse cx="163" cy="274" rx="4" ry="2"/><ellipse cx="399" cy="269" rx="4" ry="2"/></g>
    </svg>
    <div className="-mt-2 text-center font-serif text-[clamp(16px,1.6vw,23px)] font-bold italic text-[#174c35]">Etsitään parhaita tarjouksia…</div>
    <div className="mt-2 text-[#b78d4c]">──── ❧ ────</div>
    <style>{'@keyframes ziiplyVintageStone { to { transform: rotate(360deg); } } @keyframes ziiplyVintageCrank { 0%,100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } } @media (prefers-reduced-motion: reduce) { svg g { animation: none !important; } }'}</style>
  </div>;
}

export default function DesktopPreviewPage() {
  const desktopHeaderRef = useRef<HTMLElement | null>(null);
  const [desktopOverlayTop, setDesktopOverlayTop] = useState(128);
  useEffect(() => {
    const header = desktopHeaderRef.current;
    if (!header) return;
    const measure = () => setDesktopOverlayTop(Math.ceil(header.getBoundingClientRect().bottom));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  const [active, setActive] = useState<Assistant | null>(null);
  const [scannerMode, setScannerMode] = useState<"checking" | "camera" | "external">("checking");
  const [workspace, setWorkspace] = useState<Assistant | null>(null);
  const [justiinaArvo,setJustiinaArvo]=useState<ArvoPreferences|null>(null);
  useEffect(()=>{
    const refresh=()=>setJustiinaArvo(readArvoPreferences());
    refresh();
    window.addEventListener("ziiply-arvo-preferences-updated",refresh);
    window.addEventListener("storage",refresh);
    return ()=>{window.removeEventListener("ziiply-arvo-preferences-updated",refresh);window.removeEventListener("storage",refresh);};
  },[]);
  const [justiinaPeopleOverride,setJustiinaPeopleOverride]=useState<number|null>(null);

  const [gostaChainPicker, setGostaChainPicker] = useState(false);
  const [chooseStoresNoticeFor, setChooseStoresNoticeFor] = useState<Assistant|null>(null);
  const [gostaChain, setGostaChain] = useState<"S"|"K"|"LIDL"|"TOKMANNI"|"EUROSPAR"|null>(null);
  const [gostaOffers, setGostaOffers] = useState<any[]>([]);
  const [gostaTab, setGostaTab] = useState<"offers"|"campaigns">("offers");
  const [gostaCategory, setGostaCategory] = useState("");
  const [gostaLoading, setGostaLoading] = useState(false);
  const [showGostaMill, setShowGostaMill] = useState(false);
  useEffect(() => {
    if (!gostaLoading) { setShowGostaMill(false); return; }
    const delay = window.setTimeout(() => setShowGostaMill(true), 400);
    return () => window.clearTimeout(delay);
  }, [gostaLoading]);
  const [gostaDebugOpen, setGostaDebugOpen] = useState(false);
  const [gostaDebugCopied, setGostaDebugCopied] = useState(false);
  useEffect(()=>setGostaDebugCopied(false),[gostaChain,gostaTab,gostaCategory,gostaOffers]);
  const [location, setLocation] = useState("");
  const [gpsOn, setGpsOn] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{latitude:number;longitude:number}|null>(null);
  const [appliedLocation, setAppliedLocation] = useState("");
  const [locationResolved, setLocationResolved] = useState(false);
  const [userLocationAction, setUserLocationAction] = useState(false);
  const [locationStatus, setLocationStatus] = useState("Kirjoita paikkakunta tai käytä GPS:ää");
  const [gpsToast, setGpsToast] = useState("GPS käynnistyy…");
  const [mapOpen, setMapOpen] = useState(false);
  const [fuelSelected, setFuelSelected] = useState(false);
  const [fuelMode, setFuelMode] = useState<"nearby" | "compare">("nearby");
  const [fuelStations, setFuelStations] = useState<any[]>([]);
  const [fuelLoading, setFuelLoading] = useState(false);
  const [fuelError, setFuelError] = useState("");
  const [fuelType, setFuelType] = useState<"diesel" | "price95" | "price98">("diesel");
  const [fuelReportOpen,setFuelReportOpen]=useState(false);
  const [fuelSort, setFuelSort] = useState<"distance" | "diesel" | "price95">("distance");
  const [fuelGroups,setFuelGroups]=useState<string[]>([]);
  const [fuelTraffic,setFuelTraffic]=useState(true);
  const [fuelCold,setFuelCold]=useState(true);
  const [fuelScope,setFuelScope]=useState<"between"|"within">("between");
  const [fuelCompared,setFuelCompared]=useState(false);
  const [fuelStationSide,setFuelStationSide]=useState<"both"|"traffic"|"cold">("both");
  const [fuelStationIndex,setFuelStationIndex]=useState<Record<string,number>>({});
  const fuelCandidates=(group:string)=>fuelStations.filter((s:any)=>fuelGroupOf(s)===group && (fuelStationSide==="both" ? [s.diesel,s.price95,s.price98].some(value=>value!=null && Number.isFinite(Number(value)) && Number(value)>0) : (fuelStationSide==="traffic"?fuelIsTraffic(s):!fuelIsTraffic(s)))).sort((a:any,b:any)=>a.distanceKm-b.distanceKm);
  const fuelSelectedStation=(group:string)=>{const items=fuelCandidates(group);return items.length?items[(fuelStationIndex[group]||0)%items.length]:null;};
  const fuelChangeStation=(group:string)=>{setFuelStationIndex(prev=>({...prev,[group]:((prev[group]||0)+1)%Math.max(1,fuelCandidates(group).length)}));setFuelCompared(false);};
  const fuelClosestPrice=(type:"diesel"|"price95"|"price98")=>{
    const nearest=fuelStations.filter((station:any)=>{
      const value=station[type];
      return value!=null && Number.isFinite(Number(value)) && Number(value)>0
        && station.distanceKm!=null && Number.isFinite(Number(station.distanceKm));
    }).reduce((nearest:any,station:any)=>!nearest || Number(station.distanceKm)<Number(nearest.distanceKm)?station:nearest,null);
    return nearest?Number(nearest[type]):undefined;
  };

  const fuelGroupOf=(s:any)=>{const t=String(s.chain||"").toLowerCase();return t.includes("neste")?"Neste":t.includes("st1")||t.includes("shell")?"St1":t.includes("abc")?"ABC":t.includes("seo")?"SEO":t.includes("gulf")?"Gulf":t.includes("ritoil")?"Ritoil":"Muut";};
  const fuelIsTraffic=(s:any)=>s.isTrafficStation===true;
  const fuelVisible=fuelStations.filter((s:any)=>fuelGroups.includes(fuelGroupOf(s)) && (fuelStationSide==="both" || (fuelStationSide==="traffic" ? fuelIsTraffic(s) : !fuelIsTraffic(s))));

  useEffect(() => {
    if (!gpsCoords) { setFuelStations([]); setFuelLoading(false); setFuelError("Käynnistä GPS, jotta lähimmät asemat voidaan järjestää etäisyyden mukaan."); return; }
    const controller = new AbortController();
    setFuelLoading(true); setFuelError("");
    fetch(`/api/fuel/stations?lat=${gpsCoords.latitude}&lon=${gpsCoords.longitude}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || "Asematietojen haku epäonnistui"); return data; })
      .then(data => setFuelStations((Array.isArray(data.stations) ? data.stations : []).filter((station: any) => !/\bteboil\b/i.test(String(station?.chain ?? "") + " " + String(station?.name ?? "")))))
      .catch(error => { if (!controller.signal.aborted) { setFuelStations([]); setFuelError(String(error.message || error)); } })
      .finally(() => { if (!controller.signal.aborted) setFuelLoading(false); });
    return () => controller.abort();
  }, [gpsCoords?.latitude, gpsCoords?.longitude]);

  const [weather, setWeather] = useState({ value: "—", detail: "haetaan" });
  const [electricity, setElectricity] = useState({ value: "—", detail: "haetaan" });
  const [electricityOpen, setElectricityOpen] = useState(false);
  const [electricityPrices, setElectricityPrices] = useState<{start:number;end:number;price:number}[]>([]);
  const [electricityOfferTypes, setElectricityOfferTypes] = useState<string[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [storeMode, setStoreMode] = useState<"hyper" | "local">("hyper");
  const [selectedChain, setSelectedChain] = useState<"S"|"K"|"LIDL"|"SPAR"|null>(null);
  const [betweenMode, setBetweenMode] = useState<"one" | "many">("one");
  const [allStoreSelections, setAllStoreSelections] = useState<{hyper:Record<string,any>;local:Record<string,any>}>({hyper:{},local:{}});
  const [lidlStores, setLidlStores] = useState<any[]>([]);
  const [sparStores, setSparStores] = useState<any[]>([]);
  const [storeCompareScope, setStoreCompareScope] = useState<"none" | "between_chains" | "within_chain">("none");

  const [withinChain, setWithinChain] = useState<"S" | "K" | null>(null);
  const [withinStoreSlots,setWithinStoreSlots]=useState<Record<"S"|"K",Array<any|null>>>({S:[null,null],K:[null,null]});
  const [withinPicker,setWithinPicker]=useState<{chain:"S"|"K";slot:number}|null>(null);

  const [storeModeChosen, setStoreModeChosen] = useState(false);
  // Restore all desktop store choices after reload; do not overwrite saved choices before hydration.
  const [desktopStoreChoicesHydrated, setDesktopStoreChoicesHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("ziiply-desktop-store-choices-v1");
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.storeMode === "hyper" || saved.storeMode === "local") setStoreMode(saved.storeMode);
        if (["S","K","LIDL","SPAR",null].includes(saved.selectedChain)) setSelectedChain(saved.selectedChain);
        if (saved.betweenMode === "one" || saved.betweenMode === "many") setBetweenMode(saved.betweenMode);
        if (saved.allStoreSelections && typeof saved.allStoreSelections === "object") {
          setAllStoreSelections({
            hyper: saved.allStoreSelections.hyper && typeof saved.allStoreSelections.hyper === "object" ? saved.allStoreSelections.hyper : {},
            local: saved.allStoreSelections.local && typeof saved.allStoreSelections.local === "object" ? saved.allStoreSelections.local : {},
          });
        }
        if (["none","between_chains","within_chain"].includes(saved.storeCompareScope)) setStoreCompareScope(saved.storeCompareScope);
        if (["S","K",null].includes(saved.withinChain)) setWithinChain(saved.withinChain);
        if (saved.withinStoreSlots && typeof saved.withinStoreSlots === "object") {
          setWithinStoreSlots({
            S: Array.isArray(saved.withinStoreSlots.S) ? saved.withinStoreSlots.S.slice(0,2) : [null,null],
            K: Array.isArray(saved.withinStoreSlots.K) ? saved.withinStoreSlots.K.slice(0,2) : [null,null],
          });
        }
        if (typeof saved.storeModeChosen === "boolean") setStoreModeChosen(saved.storeModeChosen);
      }
    } catch {}
    setDesktopStoreChoicesHydrated(true);
  }, []);
  useEffect(() => {
    if (!desktopStoreChoicesHydrated) return;
    try {
      window.localStorage.setItem("ziiply-desktop-store-choices-v1", JSON.stringify({
        storeMode,selectedChain,betweenMode,allStoreSelections,storeCompareScope,withinChain,withinStoreSlots,storeModeChosen,
      }));
    } catch {}
  }, [storeMode,selectedChain,betweenMode,allStoreSelections,storeCompareScope,withinChain,withinStoreSlots,storeModeChosen,desktopStoreChoicesHydrated]);

  const selectedStores = (() => {
    if(storeCompareScope==="within_chain") { const chosen=withinChain?withinStoreSlots[withinChain].filter(Boolean):[]; return Object.fromEntries(chosen.map((store:any)=>[String(store.id),store])); }
    const current=allStoreSelections[storeMode];
    if(betweenMode==="many" || !selectedChain)return current;
    const selected=Object.values(current).find((store:any)=>{
      const name=String(store?.name||"").toLowerCase();
      return selectedChain==="S"?name.includes("prisma")||name.includes("s-market")||name.includes("alepa")||name.includes("sale"):selectedChain==="K"?name.includes("citymarket")||name.includes("k-supermarket")||name.includes("k-market"):selectedChain==="LIDL"?name.includes("lidl"):name.includes("tokmanni")||name.includes("spar");
    });
    if(selected)return {[String((selected as any).id)]:selected};
    const other=allStoreSelections[storeMode==="hyper"?"local":"hyper"];
    const previous=Object.values(other).find((store:any)=>{
      const name=String(store?.name||"").toLowerCase();
      return selectedChain==="S"?name.includes("prisma")||name.includes("s-market")||name.includes("alepa")||name.includes("sale"):selectedChain==="K"?name.includes("citymarket")||name.includes("k-supermarket")||name.includes("k-market"):selectedChain==="LIDL"?name.includes("lidl"):name.includes("tokmanni")||name.includes("spar");
    });
    // Never reuse a hypermarket as the active local-store selection (or vice versa).
    // Resolve the same nearest candidate that the visible chain card displays.
    const pool=selectedChain==="LIDL"?lidlStores:selectedChain==="SPAR"?sparStores:stores;
    const candidate=byDistance(pool.filter((store:any)=>{
      const kind=storeKind(store);
      return selectedChain==="S"?kind===(storeMode==="hyper"?"sHyper":"sLocal")
        :selectedChain==="K"?kind===(storeMode==="hyper"?"kHyper":"kLocal")
        :selectedChain==="LIDL"?kind==="lidl":kind==="spar";
    }))[0];
    return candidate?{[String(candidate.id)]:candidate}:{};
  })();
  const setSelectedStores = (update:Record<string,any>|((prev:Record<string,any>)=>Record<string,any>)) => {
    const mode=storeMode;
    setAllStoreSelections(prev=>({...prev,[mode]:typeof update==="function"?update(prev[mode]):update}));
  };



  const [pickerChain, setPickerChain] = useState<"S"|"K"|"LIDL"|"SPAR"|null>(null);
  const [pickerPlacement, setPickerPlacement] = useState({left: 0, top: 0, bottom: 0, width: 360});
  const [cartOpen, setCartOpen] = useState(false);
  const [cartPaperReady,setCartPaperReady]=useState(false);
  useEffect(()=>{let active=true;const img=new Image();img.decoding="async";img.onload=()=>{const done=()=>{if(active)setCartPaperReady(true)};if(typeof img.decode==="function")void img.decode().catch(()=>undefined).finally(done);else done()};img.onerror=()=>{if(active)setCartPaperReady(true)};img.src="/ui/cart/vihkonen.webp";return()=>{active=false}},[]);

  const [desktopScannerOpen,setDesktopScannerOpen]=useState(false);
  const desktopInStoreConfirmedRef=useRef<boolean|null>(null);
  const desktopPhysicalCollectionRef=useRef(false);
  const [desktopScannerCameraOn,setDesktopScannerCameraOn]=useState(false);
  const [desktopScannerEan,setDesktopScannerEan]=useState("");
  const [desktopScannerMessage,setDesktopScannerMessage]=useState("");
  const [desktopScannerIncrement,setDesktopScannerIncrement]=useState(false);
  const desktopScannerIncrementTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [desktopScannerLoading,setDesktopScannerLoading]=useState(false);
  const [desktopScannerFlash,setDesktopScannerFlash]=useState<"idle"|"success"|"error">("idle");
  const desktopScannerFlashTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  function flashDesktopScanner(state:"success"|"error"){if(desktopScannerFlashTimer.current)clearTimeout(desktopScannerFlashTimer.current);setDesktopScannerFlash(state);desktopScannerFlashTimer.current=setTimeout(()=>{setDesktopScannerFlash("idle");setDesktopScannerMessage("")},1100)}
  const desktopHidBufferRef=useRef("");
  const desktopHidLastKeyRef=useRef(0);
  useEffect(()=>{
    if(!desktopScannerOpen)return;
    const handleKey=(event:KeyboardEvent)=>{
      if(event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
      if(event.key==="Escape"){setDesktopScannerCameraOn(false);setDesktopScannerOpen(false);return}
      if(event.key==="Enter"){
        const code=desktopHidBufferRef.current;
        desktopHidBufferRef.current="";
        if(/^\d{8,14}$/.test(code)){setDesktopScannerEan(code);setDesktopScannerMessage("");void runDesktopScannerEanSearch(code,true);event.preventDefault()}
        return;
      }
      if(!/^\d$/.test(event.key))return;
      const now=Date.now();
      desktopHidBufferRef.current=(now-desktopHidLastKeyRef.current>500?"":desktopHidBufferRef.current)+event.key;
      desktopHidLastKeyRef.current=now;
      if(desktopHidBufferRef.current.length>14)desktopHidBufferRef.current=event.key;
    };
    window.addEventListener("keydown",handleKey);
    return()=>{window.removeEventListener("keydown",handleKey);desktopHidBufferRef.current=""};
  },[desktopScannerOpen]);
  const pasteDesktopScannerEan=async()=>{
    try{
      const pasted=(await navigator.clipboard.readText()).trim();
      if(!/^\d{8,14}$/.test(pasted)){setDesktopScannerMessage("Leikepöydällä ei ole kelvollista EAN-koodia (8–14 numeroa).");return}
      setDesktopScannerEan(pasted);
      setDesktopScannerMessage("");
      setDesktopScannerMessage("EAN "+pasted+" luettu. Haetaan tuotetta…");
      void runDesktopScannerEanSearch(pasted);
    }catch{setDesktopScannerMessage("Leikepöydän lukeminen estetty. Salli leikepöydän käyttö selaimessa.")}
  };

  useEffect(()=>{if(!desktopScannerOpen||!desktopScannerCameraOn)return;let stream:MediaStream|null=null;let video:HTMLVideoElement|null=null;let stopped=false;let scanTimer:ReturnType<typeof setInterval>|null=null;const region=document.getElementById("ziiply-desktop-scanner-region");if(!region)return;video=document.createElement("video");video.autoplay=true;video.muted=true;video.playsInline=true;video.style.cssText="width:100%;height:100%;object-fit:cover;";region.appendChild(video);const el=video;void navigator.mediaDevices?.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false}).then(async media=>{if(stopped){media.getTracks().forEach(t=>t.stop());return}stream=media;el.srcObject=media;await el.play().catch(()=>{});const Detector=(window as any).BarcodeDetector;if(Detector){const detector=new Detector({formats:["ean_13","ean_8","upc_a","upc_e"]});let busy=false;scanTimer=setInterval(async()=>{if(busy||stopped||el.readyState<2)return;busy=true;try{const codes=await detector.detect(el);const code=String(codes?.[0]?.rawValue||"");if(code){setDesktopScannerEan(code);setDesktopScannerMessage("EAN tunnistettu: "+code);void runDesktopScannerEanSearch(code,true);if(scanTimer)clearInterval(scanTimer)}}catch{}finally{busy=false}},350)}else setDesktopScannerMessage("Kameran automaattinen EAN-tunnistus ei ole käytettävissä tässä selaimessa. Syötä EAN käsin.")}).catch(()=>setDesktopScannerMessage("Kameraa ei saatu käyttöön. Voit syöttää EAN-koodin käsin."));return()=>{stopped=true;if(scanTimer)clearInterval(scanTimer);stream?.getTracks().forEach(t=>t.stop());el.srcObject=null;el.remove()}},[desktopScannerOpen,desktopScannerCameraOn]);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [desktopCheckedCartItems,setDesktopCheckedCartItems]=useState<Record<string,boolean>>({});
  const [reloadCartDecisionOpen,setReloadCartDecisionOpen]=useState(false);
  const desktopCartHydratedRef=useRef(false);
  useEffect(()=>{try{const raw=window.sessionStorage.getItem("ziiply-desktop-current-cart-v1");const items=raw?JSON.parse(raw):[];if(Array.isArray(items)&&items.length){setCartItems(items.map((item:any)=>{if(item?.ziiplyWeightLabel||item?.product?.ziiplyWeightLabel||String(item?.id||"").startsWith("weight-"))return {...item,price:null,product:{...(item.product||{}),price:null,ziiplyWeightLabel:true}};const value=Number(item?.price);return item?.storeName&&/^prisma|s[ -]?market/i.test(String(item.storeName))&&value>0&&value<0.1?{...item,price:null,priceNeedsRefresh:true}:item}));const nav=performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming|undefined;if(nav?.type==="reload")setReloadCartDecisionOpen(true)}}catch{}finally{desktopCartHydratedRef.current=true}},[]);
  useEffect(()=>{if(!desktopCartHydratedRef.current)return;try{window.sessionStorage.setItem("ziiply-desktop-current-cart-v1",JSON.stringify(cartItems))}catch{}},[cartItems]);
  const [desktopDebugLines,setDesktopDebugLines]=useState<string[]>([]);
  const desktopDebug=(message:string)=>setDesktopDebugLines(current=>[...current,`${new Date().toLocaleTimeString("fi-FI")} ${message}`].slice(-100));
  const [desktopPackageProposals,setDesktopPackageProposals]=useState<Array<{itemId:string;original:string;candidate:any;storeName:string}>>([]);
  const [desktopCheckoutOpen,setDesktopCheckoutOpen]=useState(false);
  const [desktopCompareNotice,setDesktopCompareNotice]=useState(false);
  const [desktopCompareStoreWarning,setDesktopCompareStoreWarning]=useState(false);
  const [desktopCompareLoading,setDesktopCompareLoading]=useState(false);
  const [desktopCartPricesChecked,setDesktopCartPricesChecked]=useState(false);
  const [desktopCompareResults,setDesktopCompareResults]=useState<Record<string,{store:any;rows:Array<{cartItemId:string;name:string;quantity:number;price:number|null;match:"ean"|"name"|"none"}>;total:number;missing:number}>>({});
  const [desktopCompareError,setDesktopCompareError]=useState("");
  const desktopCompareCache=useRef<Map<string,Record<string,{store:any;rows:Array<{cartItemId:string;name:string;quantity:number;price:number|null;match:"ean"|"name"|"none"}>;total:number;missing:number}>>>(new Map());
  const desktopCompareCacheTime=useRef(0);
  const desktopCompareIdentity=JSON.stringify([betweenMode,storeCompareScope,Object.values(selectedStores).sort((a:any,b:any)=>String(a.id).localeCompare(String(b.id))).map((store:any)=>[store.id,store.externalId,store.name]),cartItems.map((item:any)=>[item.id,item.ean,item.product?.ean,item.name,item.title,item.quantity,item.source,Boolean(item.product?.ziiplyWeightLabel)])]);
  const desktopCompareRunId=useRef(0);
  const desktopCompareRequestIdentity=useRef(desktopCompareIdentity);
  desktopCompareRequestIdentity.current=desktopCompareIdentity;
  useEffect(()=>{desktopCompareRunId.current+=1;setDesktopCompareResults({});setDesktopCompareNotice(false);setDesktopCompareLoading(false);setDesktopCompareError("");},[desktopCompareIdentity]);
  const desktopComparisonEdited=useRef(false);
  const desktopOriginalComparison=useRef<{key:string;results:Record<string,any>}|null>(null);
  const desktopComparisonEditedKey="ziiply-desktop-comparison-edited-v1";
  const desktopCompareStorageKey="ziiply-desktop-comparison-cache-v2";
  function desktopReadSavedComparison(key:string){
    try{
      const raw=window.localStorage.getItem(desktopCompareStorageKey);
      if(!raw)return null;
      const saved=JSON.parse(raw);
      return saved?.key===key&&Number.isFinite(saved?.savedAt)&&Date.now()-saved.savedAt<24*60*60*1000&&saved?.results&&typeof saved.results==="object"?saved.results:null;
    }catch{return null}
  }
  function desktopSaveComparison(key:string,results:Record<string,any>){
    // Only the latest comparison has a verified cache timestamp; do not extend older keys.
    desktopCompareCache.current.clear();
    desktopCompareCache.current.set(key,results);
    desktopOriginalComparison.current={key,results};
    desktopCompareCacheTime.current=Date.now();
    try{window.localStorage.setItem(desktopCompareStorageKey,JSON.stringify({key,results,savedAt:Date.now()}))}catch{}
  }
  // Cross-chain comparison: try the source name first, then brand-neutral
  // descriptions. A candidate must still match the milk type and package size.
  // Cross-chain comparison: search without store-specific brands, then verify milk type and volume.
  function desktopCompareSearchTerms(name:string):string[]{
    const base=name.trim();
    const withoutBrand=base.replace(/^(?:kotimaista|coop|xtra|pirkka|k-menu)\s+/i,"").trim();
    const terms=[base,withoutBrand];
    if(/\bkevyt\s*maito\b/i.test(withoutBrand))terms.push("kevytmaito","kevyt maito");
    return [...new Set(terms.filter(Boolean))];
  }
  function desktopCompareCompatibleName(source:string,candidate:string):boolean{
    const norm=(v:string)=>v.toLocaleLowerCase("fi").replace(/,/g,".").replace(/\s+/g," ").trim();
    const a=norm(source),b=norm(candidate);
    const milkType=(v:string)=>/\bkevyt\s*maito\b/.test(v)?"kevytmaito":/\brasvaton\s*maito\b/.test(v)?"rasvaton maito":/\btäys\s*maito\b/.test(v)?"täysmaito":"";
    const type=milkType(a);
    if(!type||milkType(b)!==type)return false;
    const volume=(v:string)=>{const m=v.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(l|dl|ml)(?=\s|$)/);return m?Number(m[1])*(m[2]==="l"?1000:m[2]==="dl"?100:1):null;};
    const sourceVolume=volume(a),candidateVolume=volume(b);
    return sourceVolume!==null&&candidateVolume===sourceVolume;
  }

  // Use the same query expansion and ranking as the mobile comparison.
  async function desktopFindCompareCandidates(name:string,ean:string,store:any,isS:boolean){
    // The selected store is authoritative: never search S products for a K store (or vice versa).
    const kind=storeKind(store);
    if(kind==="spar"){
      const queries=[...new Set([name,...getKSearchTerms(name)].filter(Boolean))].slice(0,6);
      const responses=await Promise.all(queries.map(async search=>{
        try{
          const params=new URLSearchParams({search,intent:name});
          const response=await fetch("/api/tokmanni/products?"+params.toString(),{cache:"no-store"});
          if(!response.ok)return [];
          const data=await response.json();
          return (Array.isArray(data?.items)?data.items:[]).map((p:any)=>({
            ...p,name:String(p.name||p.title||""),ean:String(p.ean||""),
            price:Math.round(Number(p.price??p.storeItems?.[0]?.price??0)*100),
            image:String(p.pictureUrl||p.imageUrl||"")
          })).filter((p:any)=>p.name&&Number.isFinite(p.price)&&p.price>0);
        }catch{return []}
      }));
      return responses.flat();
    }
    // Lidl normal-price search is not yet verified; never substitute another chain's prices.
    if(kind==="lidl")return [];
    if(!["sHyper","sLocal","kHyper","kLocal"].includes(kind))return [];
    isS=kind==="sHyper"||kind==="sLocal";
    const normalizedEan=normalizeEan(ean);
    const packageNeutral=name.replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|l|dl|ml|kpl|pkt|pss)\b/gi," ").replace(/\s+/g," ").trim();
    const queries=[...new Set([...desktopCompareSearchTerms(name),...(normalizedEan?[normalizedEan]:[]),name,packageNeutral,...(packageNeutral!==name?(isS?getNormalSearchQueries(packageNeutral):getKSearchTerms(packageNeutral)):[]),...(isS?getNormalSearchQueries(name):getKSearchTerms(name))].map(v=>String(v||"").trim()).filter(Boolean))].slice(0,16);
    const responses=await Promise.all(queries.map(async search=>{
      try{
        const kStoreId=String(store.id||"");
        const selectedStoreId=isS?kStoreId:(/^\d+$/.test(kStoreId)?kStoreId:"");
        if(!selectedStoreId)return [];
        const params=new URLSearchParams({search,store:selectedStoreId});
        if(isS){params.set("storeName",String(store.name||""));}
        const response=await fetch((isS?"/api/s-products?":"/api/k-products?")+params.toString(),{cache:"no-store"});
        if(!response.ok)return [];
        const data=await response.json();
        const products=Array.isArray(data?.products)?data.products:Array.isArray(data?.items)?data.items:Array.isArray(data)?data:[];
        return products.map((p:any)=>({
          ...p,
          name:String(p.name||p.title||"").trim(),
          ean:String(p.ean||p.gtin||p.barcode||""),
          price:isS&&data?.source==="s-kaupat-normal-v220"?Math.round(Number(p.price??p.storeItems?.[0]?.price??0)*100):Number(p.price??p.storeItems?.[0]?.price??0)
        })).filter((p:any)=>p.name&&Number.isFinite(p.price)&&p.price>0);
      }catch{return []}
    }));
    return responses.flat();
  }
  // Never attach a different package's price to the original cart product.
  // Unknown package sizes are not proof of equivalence.
  function desktopPackageSize(name:string):number|null{
    const matches=[...String(name).toLocaleLowerCase("fi").replace(/,/g,".").matchAll(/(\d+(?:\.\d+)?)\s*(kg|g|l|dl|ml)\b/g)];
    if(!matches.length)return null;
    const match=matches[matches.length-1];
    const n=Number(match[1]);const unit=match[2];
    return n*(unit==="kg"||unit==="l"?1000:unit==="dl"?100:1);
  }
  function desktopPackageCompatible(source:string,candidate:string):boolean{
    const a=desktopPackageSize(source),b=desktopPackageSize(candidate);
    return a!==null&&b!==null&&a===b;
  }
  function desktopFindPackageAlternative(candidates:any[],name:string,ean:string){
    const sourceSize=desktopPackageSize(name);
    if(sourceSize===null)return null;
    // Require the same manufacturer/brand AND the same product identity; weight alone is not sufficient.
    const tokens=(value:string)=>String(value).toLocaleLowerCase("fi")
      .replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|l|dl|ml|kpl|pkt|pss)\b/g," ")
      .replace(/[^a-zåäö0-9 ]/g," ").split(/\s+/).filter(w=>w.length>2);
    const sourceWords=tokens(name);
    if(sourceWords.length<2)return null;
    const sourceBrand=sourceWords[0];
    const sourceEan=normalizeEan(ean);
    return candidates.map((p:any)=>{
      const size=desktopPackageSize(String(p.name||""));
      const words=tokens(String(p.name||""));
      const overlap=sourceWords.filter(w=>words.includes(w)).length;
      const sameBrand=words[0]===sourceBrand || tokens(String(p.brandName||p.brand||"")).includes(sourceBrand);
      const sameProduct=sourceWords.every(w=>words.includes(w));
      return {p,size,sameBrand,sameProduct,overlap};
    }).filter(x=>x.size!==null&&x.size!==sourceSize&&Number(x.p.price)>0
      &&normalizeEan(String(x.p.ean||""))!==sourceEan&&x.sameBrand&&x.sameProduct)
      .sort((a,b)=>Math.abs(Number(a.size)-sourceSize)-Math.abs(Number(b.size)-sourceSize)
        ||Number(a.size)-Number(b.size)||Number(a.p.price)-Number(b.p.price))[0]?.p||null;
  }
  function desktopFindSimilarAlternative(candidates:any[],name:string,ean:string){
    const original=String(name).toLocaleLowerCase("fi");
    const brand=original.split(/\s+/)[0];
    const category=/ketsupp|ketchup/.test(original)?"ketchup":null;
    if(!category)return null; // Do not substitute unrelated foods.
    const originalEan=normalizeEan(ean);
    const sourceSize=desktopPackageSize(name);
    return candidates.filter((p:any)=>{
      const n=String(p.name||"").toLocaleLowerCase("fi");
      return n.startsWith(brand+" ")&&/ketsupp|ketchup/.test(n)&&Number(p.price)>0
        &&normalizeEan(String(p.ean||""))!==originalEan;
    }).sort((a:any,b:any)=>{
      const aSize=desktopPackageSize(String(a.name||"")),bSize=desktopPackageSize(String(b.name||""));
      const da=sourceSize!==null&&aSize!==null?Math.abs(aSize-sourceSize):999999;
      const db=sourceSize!==null&&bSize!==null?Math.abs(bSize-sourceSize):999999;
      return da-db||Number(a.price)-Number(b.price);
    })[0]||null;
  }
  function desktopPickCompareCandidate(candidates:any[],name:string,ean:string,isS:boolean){
    // Alkuperäisen korin EAN on ensisijainen: Halvin-valinta kuuluu vain muokattuun vertailukoriin.
    const sourceEan=normalizeEan(ean);
    if(sourceEan){const exact=candidates.filter((p:any)=>normalizeEan(String(p?.ean||p?.product?.ean||""))===sourceEan&&desktopPackageCompatible(name,String(p.name||""))&&Number(p?.price)>0);if(exact.length)return exact.reduce((a:any,b:any)=>Number(a.price)<=Number(b.price)?a:b)}
    const sameSize=candidates.filter((p:any)=>desktopPackageCompatible(name,String(p.name||"")));
    // K prices come from a third-party feed, not live K-Ruoka availability.
    // Never treat a fuzzy name/size match as proof that this exact EAN is sold in the selected K store.
    const compatible=sameSize.filter((p:any)=>isComparisonAttributeCompatible(name,String(p.name||"")));
    const sourceOwn=/^(?:pirkka|k-menu|coop|xtra|kotimaista|rainbow)\b/i.test(name);
    const ownRe=isS?/^(?:coop|xtra|kotimaista|rainbow)\b/i:/^(?:pirkka|k-menu)\b/i;
    const own=compatible.filter((p:any)=>ownRe.test(p.name));
    const pool=sourceOwn&&own.length?own:compatible;
    const best=isS?pickBestSProduct(pool,name,sourceEan):pickBestKProduct(pool,name,sourceEan);
    return best||null;
  }

  async function openDesktopComparison(){
    setDesktopDebugLines([]);
    desktopDebug(`Vertailu käynnistyy: tila=${betweenMode}, korissa=${cartItems.length}, kauppanäkymä=${storeMode}`);
    desktopDebug(`Tavaratalot-valinnat: ${Object.values(allStoreSelections.hyper).map((x:any)=>`${x.name} [${x.id}]`).join(" | ")||"EI VALINTAA"}`);
    desktopDebug(`Lähikaupat-valinnat: ${Object.values(allStoreSelections.local).map((x:any)=>`${x.name} [${x.id}]`).join(" | ")||"EI VALINTAA"}`);
    desktopDebug(`Hintahaun aktiiviset valinnat: ${Object.values(selectedStores).map((x:any)=>`${x.name} [${x.id}]`).join(" | ")||"EI VALINTAA"}`);
    const requestIdentity=desktopCompareIdentity;
    const runId=++desktopCompareRunId.current;
    setDesktopCompareError("");
    const allSelected=Object.values(selectedStores) as any[];
    const selected=allSelected.filter(x=>["sHyper","sLocal","kHyper","kLocal","lidl","spar"].includes(storeKind(x))).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    const unsupportedSelected=allSelected.filter(x=>!["sHyper","sLocal","kHyper","kLocal","lidl","spar"].includes(storeKind(x)));
    desktopDebug(`Valitut kaupat (${selected.length}): ${selected.map(x=>`${x.name} [id=${x.id}, externalId=${x.externalId}, type=${storeKind(x)}]`).join(" | ")||"EI YHTÄÄN"}`);
    desktopDebug(`Vertailutapa=${storeCompareScope}, ketjun sisäinen=${withinChain||"-"}, paikat=${JSON.stringify(withinStoreSlots[withinChain||"S"]?.map(x=>x?.name||null))}`);
    if(betweenMode==="one" && storeCompareScope!=="within_chain"){
      setDesktopCartPricesChecked(false);
      setDesktopCompareNotice(false);
      setJustiinaResultsOpen(false);
      setWorkspace(null);
      setCartOpen(true);
      if(unsupportedSelected.length){setDesktopCompareLoading(false);flashCartNotice("Hintahaku ei vielä tue valittua kauppaa: "+unsupportedSelected.map(store=>String(store.name||"Tuntematon kauppa")).join(", ")+".");return}
      if(selected.length!==1){setDesktopCompareLoading(false);flashCartNotice("Valitse yksi kauppa hintojen hakua varten.");return}
      const store=selected[0];const storeName=String(store.name||"");
      desktopDebug(`Kauppa: ${storeName}, id=${store.id}, externalId=${store.externalId}, ketju=${storeKind(store)}`);
      // A store switch invalidates every previously displayed price, including items
      // without storeName. Never attribute another store's cached price to this one.
      setCartItems(current=>current.map(item=>isDesktopMemoItem(item)?item:{...item,price:null,storeName,priceNeedsRefresh:true}));
      const isS=["sHyper","sLocal"].includes(storeKind(store));
      setDesktopCompareLoading(true);
      try{
        const updates=await Promise.all(cartItems.map(async item=>{
          if((isS&&String(item.source||"").toLowerCase()==="offer")||item?.product?.ziiplyWeightLabel||Boolean(resolvePriceWeightLabel(String(item.ean||item.product?.ean||""))))return null;
          const name=String(item.name||item.title||"").trim();if(!name)return null;
          const ean=String(item.ean||item.product?.ean||"").trim();
          try{
            // Reuse the same expanded queries and product matcher as the two-store comparison.
            desktopDebug(`Haku alkaa: ${name}, EAN=${ean}, source=${item.source}`);
            const candidates=await desktopFindCompareCandidates(name,ean,store,isS);
            desktopDebug(`API-ehdokkaita ${candidates.length}: ${name}; ${candidates.slice(0,8).map((p:any)=>`${p.name} [${p.ean}] ${p.price}c`).join(" | ")}`);
            const matched=candidates.find((candidate:any)=>ean&&normalizeEan(candidate.ean)===normalizeEan(ean)&&Number(candidate.price)>0);
            desktopDebug(`EAN-osuma: ${matched?`${matched.name} ${matched.price}c`:"EI"}`);
            const cents=matched?Number(matched.price):NaN;
            if(Number.isFinite(cents)&&cents>0)return {price:cents/100,proposal:null};
            let alternative=desktopFindPackageAlternative(candidates,name,ean)||desktopFindSimilarAlternative(candidates,name,ean);
            if(!alternative&&isS&&/^felix\b/i.test(name)&&/ketsupp|ketchup/i.test(name)){
              // Exact sugar-free search can return no rows; query the selected S-store again
              // with short product-category terms, never with another store's prices.
              const fallbackQueries=["Felix ketsuppi","Felix ketchup"];
              const fallbackResponses=await Promise.all(fallbackQueries.map(async search=>{
                try{
                  const params=new URLSearchParams({search,store:String(store.id),storeName:String(store.name||"")});
                  const response=await fetch("/api/s-products?"+params.toString(),{cache:"no-store"});
                  if(!response.ok)return [];
                  const data=await response.json();
                  const rows=Array.isArray(data?.products)?data.products:Array.isArray(data?.items)?data.items:[];
                  return rows.map((p:any)=>({...p,name:String(p.name||p.title||""),ean:String(p.ean||p.gtin||p.barcode||""),price:data?.source==="s-kaupat-normal-v220"?Math.round(Number(p.price||0)*100):Number(p.price||0)}));
                }catch{return []}
              }));
              const fallbackCandidates=fallbackResponses.flat();
              desktopDebug(`Korvaavan ketsupin lisähaku: ${fallbackCandidates.length} ehdokasta`);
              alternative=desktopFindSimilarAlternative(fallbackCandidates,name,ean);
            }
            desktopDebug(`Pakkausvaihtoehto: ${alternative?`${alternative.name} ${alternative.price}c`:"EI"}`);
            return {price:null,proposal:alternative||null};
          }catch(error){desktopDebug(`HAKUVIRHE: ${String(error)}`);return null}
        }));
        if(desktopCompareRequestIdentity.current!==requestIdentity||desktopCompareRunId.current!==runId){desktopDebug("TULOKSET HYLÄTTY: korin tai kaupan identiteetti muuttui haun aikana");return;}
        const eligibleCount=cartItems.filter(item=>(!isS||String(item.source||"").toLowerCase()!=="offer")&&!item?.product?.ziiplyWeightLabel&&!resolvePriceWeightLabel(String(item.ean||item.product?.ean||""))).length;
        const pricedCount=updates.filter(result=>result?.price!=null).length;
        setDesktopPackageProposals(updates.flatMap((result,i)=>result?.proposal?[{itemId:desktopCartKey(cartItems[i]),original:String(cartItems[i].name||cartItems[i].title||""),candidate:result.proposal,storeName}]:[]));
        // Zero matches is a valid result: keep all prices unknown rather than
        // leaving old prices visible under the newly selected store.
        if(eligibleCount>0&&pricedCount===0){flashCartNotice("Valitusta kaupasta ei löytynyt vahvistettuja hintoja.");}
        setCartItems(current=>current.map((item,i)=>{
          if((isS&&String(item.source||"").toLowerCase()==="offer")||item?.product?.ziiplyWeightLabel||Boolean(resolvePriceWeightLabel(String(item.ean||item.product?.ean||""))))return item;
          return {...item,price:updates[i]?.price??null,priceCheckedAt:Date.now(),storeName:String(store.name||""),priceNeedsRefresh:updates[i]?.price==null};
        }));
        setDesktopCartPricesChecked(true);
        // Prices refresh in the open cart without a full-screen notification.
      }finally{if(desktopCompareRunId.current===runId)setDesktopCompareLoading(false)}
      return;
    }
    setDesktopCompareNotice(true);
    setDesktopCompareLoading(false);
    setDesktopCompareResults({});
    if(unsupportedSelected.length){setDesktopCompareError("Vertailu ei vielä tue valittuja kauppoja: "+unsupportedSelected.map(store=>String(store.name||"Tuntematon kauppa")).join(", ")+". Valitse tuettuja kauppoja.");return}
    if(selected.length<2){desktopDebug("KESKEYTYS: alle kaksi tuettua kauppaa");setDesktopCompareResults({});setDesktopCompareError("Vertailuun tarvitaan vähintään kaksi valittua kauppaa.");return}
    const eligible=cartItems.filter(x=>String(x.source||"").toLowerCase()!=="offer"&&!x?.product?.ziiplyWeightLabel&&!resolvePriceWeightLabel(String(x.ean||x.product?.ean||"")));
    if(!eligible.length){setDesktopCompareResults({});setDesktopCompareError("Ostoskorissa ei ole vertailukelpoisia tuotteita.");return}
    const key=JSON.stringify([[...selected].sort((a,b)=>String(a.id).localeCompare(String(b.id))).map(x=>[x.id,x.externalId,x.name]),eligible.map(x=>[x.id,x.ean,x.product?.ean,x.name,x.title,x.quantity,x.source])]);
    // Aina kun avataan uusi vertailu, palautetaan ensin alkuperäisen korin tulos.
    // Muokattua vertailukoria ei koskaan saa käyttää uuden avauksen lähteenä.
    const mustRecompare=desktopComparisonEdited.current || (()=>{try{return window.localStorage.getItem(desktopComparisonEditedKey)===key}catch{return false}})();
    if(mustRecompare){desktopCompareCache.current.delete(key);desktopOriginalComparison.current=null;try{window.localStorage.removeItem(desktopCompareStorageKey)}catch{}}
    const memoryFresh=Date.now()-desktopCompareCacheTime.current<24*60*60*1000;
    const cached=mustRecompare?null:((memoryFresh?(desktopOriginalComparison.current?.key===key?desktopOriginalComparison.current.results:desktopCompareCache.current.get(key)):null)||desktopReadSavedComparison(key));
    if(cached){desktopDebug(`Välimuistista vertailu: ${Object.entries(cached).map(([id,v]:any)=>`${id}: ${v.rows?.filter((x:any)=>x.price!=null).length||0}/${v.rows?.length||0} hintaa`).join(" | ")}`);desktopCompareCache.current.set(key,cached);desktopOriginalComparison.current={key,results:cached};setDesktopCompareResults(structuredClone(cached));setDesktopCompareLoading(false);return}
    setDesktopCompareLoading(true);setDesktopCompareResults({});
    try{
      const results=await Promise.all(selected.map(async store=>{
        const kind=storeKind(store);const isS=kind==="sHyper"||kind==="sLocal";
        desktopDebug(`Kauppahaku alkaa: ${store.name}, id=${store.id}, externalId=${store.externalId}, ketju=${kind}, tuotteita=${eligible.length}`);
        const rows=await Promise.all(eligible.map(async item=>{
          const name=String(item.name||item.title||"").trim();
          const ean=String(item.ean||item.product?.ean||"").trim();
          try{
            const candidates=await desktopFindCompareCandidates(name,ean,store,isS);
            const matched=desktopPickCompareCandidate(candidates,name,ean,isS);
            desktopDebug(`${store.name}: ${name} EAN=${ean||"-"} → ehdokkaita=${candidates.length}, osuma=${matched?`${matched.name} (${matched.price}c)`:"EI"}, ehdokkaat=${candidates.slice(0,3).map((p:any)=>`${p.name} (${p.price}c)`).join(" | ")||"-"}`);
            const price=matched?Number(matched.price)/100:null;
            const exact=matched&&ean&&normalizeEan(matched.ean)===normalizeEan(ean);
            const alternative=matched?null:desktopFindPackageAlternative(candidates,name,ean);
            return {cartItemId:String(item.id||""),name:matched?String(matched.name):name,ean:matched?String(matched.ean||""):ean,quantity:Number(item.quantity||1),price,image:String((matched as any)?.pictureUrl||(matched as any)?.image||(matched as any)?.imageUrl||(matched as any)?.product?.image||(matched as any)?.product?.imageUrl||item?.image||item?.product?.image||""),match:(exact?"ean":matched?"name":"none") as "ean"|"name"|"none",packageAlternative:alternative};
          }catch(error){desktopDebug(`HAKUVIRHE ${store.name} / ${name}: ${String(error)}`);return {cartItemId:String(item.id||""),name,quantity:Number(item.quantity||1),price:null,match:"none" as const}}
        }));
        desktopDebug(`Kauppahaku valmis: ${store.name}, hinnat=${rows.filter(x=>x.price!=null).length}/${rows.length}`);
        return [String(store.id),{store,rows,total:rows.reduce((n,r)=>n+(r.price??0)*r.quantity,0),missing:rows.filter(r=>r.price==null).length}] as const;
      }));
      if(desktopCompareRequestIdentity.current!==requestIdentity||desktopCompareRunId.current!==runId){desktopDebug("TULOKSET HYLÄTTY: vertailun identiteetti tai ajon tunnus vaihtui");return;}
      const next=Object.fromEntries(results);desktopSaveComparison(key,next);desktopComparisonEdited.current=false;try{window.localStorage.removeItem(desktopComparisonEditedKey)}catch{}setDesktopCompareResults(structuredClone(next));
    }catch(error){desktopDebug(`VERTAILUVIRHE: ${String(error)}`);if(desktopCompareRequestIdentity.current===requestIdentity&&desktopCompareRunId.current===runId)setDesktopCompareError("Vertailuhaku epäonnistui. Yritä uudelleen.")}finally{desktopDebug("Vertailuhaku päättyi");if(desktopCompareRunId.current===runId)setDesktopCompareLoading(false)}
  }

  // Älä vertaa erikokoisia pakkauksia pelkän pakkaushinnan perusteella.
  // Halvin saa vaihtaa merkkiä, mutta ei tuotteen määrää tai olennaisia ominaisuuksia.
  // Palautetaan null, jos pakkausmäärä puuttuu: silloin automaattista vaihtoa ei tehdä.
  function desktopCheapestPack(name:string){
    const n=name.toLocaleLowerCase("fi").replace(/(\d),(\d)/g,"$1.$2");
    const m=n.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|l|dl|cl)\b/)||n.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|dl|cl)\b/);
    if(!m)return null;
    const multi=m.length===4;
    const count=multi?Number(m[1]):1,amount=Number(multi?m[2]:m[1]),unit=multi?m[3]:m[2];
    const scale=unit==="kg"||unit==="l"?1000:unit==="dl"?100:unit==="cl"?10:1;
    return {amount:count*amount*scale,type:unit==="kg"||unit==="g"?"weight":"volume"};
  }
  function desktopIsFilterCoffee(v:string){const n=v.toLocaleLowerCase("fi");return /kahvi/.test(n)&&/(suodatin|jauhat|jauhettu|jauhe|keskipaahto|tumma paahto|vaalea paahto)/.test(n)&&!/(kapseli|pikakahvi|papukahvi|kahvipapu|juoma|valmisjuoma)/.test(n);}
  function desktopCheapestSearchQueries(name:string){
    if(!desktopIsFilterCoffee(name))return [];
    return ["suodatinkahvi 500g","suodatinkahvi 500 g","kahvi suodatin 500g","kahvi 500g","kahvi 500 g","suodatinjauhatus","jauhettu kahvi"];
  }
  function desktopCheapestCompatible(source:string,candidate:string){
    const a=desktopCheapestPack(source),b=desktopCheapestPack(candidate);
    if(!a||!b||a.type!==b.type||Math.abs(a.amount-b.amount)>a.amount*0.02)return false;
    const n=(v:string)=>v.toLocaleLowerCase("fi").replace(/[-–]/g," ").replace(/\s+/g," ");
    const x=n(source),y=n(candidate);
    if(desktopIsFilterCoffee(source)){
      if(!desktopIsFilterCoffee(candidate))return false;
      if(/kofeiiniton/.test(x)!==/kofeiiniton/.test(y))return false;
      if(/luomu/.test(x)!==/luomu/.test(y))return false;
      if(/laktoositon/.test(x)!==/laktoositon/.test(y))return false;
      return true;
    }
    const attributes=[
      /laktoositon/,/vähälaktoosinen/,/gluteeniton/,/rasvaton/,/kevyt/,/täysmaito/,
      /kofeiiniton/,/papu(?:kahvi)?/,/suodatin(?:kahvi)?/,/pika(?:kahvi)?/,
      /luomu/,/maustamaton/,/sokeriton/,/täysjyvä/
    ];
    return attributes.every(re=>re.test(x)===re.test(y));
  }

  async function desktopChangeCompareMatchMode(storeId:string, match:any, mode:"cheapest"|"same_quality"|"own_brands"|"same_brand") {
    const result=desktopCompareResults[storeId]; if(!result)return [];
    const rowId=String(match?.id||match?.cartItemId||"");
    const cartItem=cartItems.find((item:any)=>String(item.id||"")===rowId);
    const name=String(match?.sourceProductName||match?.name||cartItem?.name||cartItem?.title||"").trim();
    if(!name)return [];
    const store=result.store;const kind=storeKind(store);const isS=kind==="sHyper"||kind==="sLocal";
    try{
      const products=await desktopFindCompareCandidates(name,String(cartItem?.ean||cartItem?.product?.ean||""),store,isS);
      if(mode==="cheapest"&&desktopIsFilterCoffee(name)){
        const extra=await Promise.all(desktopCheapestSearchQueries(name).map(async query=>desktopFindCompareCandidates(query,"",store,isS)));
        products.push(...extra.flat());
      }
      const candidates=products.filter((product:any)=>mode==="cheapest"&&desktopIsFilterCoffee(name)?desktopIsFilterCoffee(String(product.name||"")):productGroupGate(name,product.name)).map((product:any,index:number)=>({
        ...product,id:String(product.id||product.ean||index),name:product.name,
        price:Number(product.price),product:{...(product.product||{}),id:product.id||product.ean||index,name:product.name,ean:product.ean},
        sourceProductName:name,cartItem,quantity:Number(cartItem?.quantity||match?.quantity||1),isMissingComparisonItem:false
      }));
      const originalBrand=name.split(/\s+/)[0]?.toLocaleLowerCase("fi")||"";
      const ownBrand=kind==="spar"?/(^|\s)(spar|eurospar|first price)(\s|$)/i:kind==="lidl"?/(^|\s)(milbona|cien|chef select|pikok|combino)(\s|$)/i:isS?/(^|\s)(coop|xtra|kotimaista)(\s|$)/i:/(^|\s)(pirkka|k-menu)(\s|$)/i;
      let filtered=candidates;
      if(mode==="own_brands")filtered=candidates.filter((p:any)=>ownBrand.test(p.name));
      if(mode==="same_brand")filtered=candidates.filter((p:any)=>p.name.toLocaleLowerCase("fi").includes(originalBrand));
      filtered=filtered.sort((a:any,b:any)=>Number(a.price)-Number(b.price));
      if(mode==="cheapest"){
        const compatible=filtered.filter((p:any)=>desktopCheapestCompatible(name,p.name));
        if(!compatible.length){flashCartNotice("Saman kokoista ja ominaisuuksiltaan vastaavaa tuotetta ei löytynyt.");return []}
        const currentPrice=Number(match?.price);
        const cheapest=compatible.find((p:any)=>Number.isFinite(Number(p.price))&&Number(p.price)>0);
        if(!cheapest){flashCartNotice("Vaihtoehdolle ei löytynyt kelvollista hintaa.");return []}
        if(!Number.isFinite(currentPrice)||currentPrice<=0){flashCartNotice("Nykyisen tuotteen hintaa ei tunneta. Automaattista vaihtoa ei tehdä.");return compatible}
        if(Number(cheapest.price)>=Math.round(currentPrice*100)){flashCartNotice("Nykyinen tuote on jo yhtä halpa tai halvempi.");return compatible}
        await desktopSelectCompareAlternative(storeId,match,{...cheapest,comparisonSelectionMode:"cheapest"});
        return compatible;
      }
      return filtered.slice(0,20);
    }catch{flashCartNotice("Vaihtoehtoisia tuotteita ei saatu haettua. Kokeile uudelleen.");return []}
  }
  async function desktopSelectCompareAlternative(storeId:string, match:any, alternative:any) {
    const chosen=desktopCompareResults[storeId];if(!chosen)return;
    const rowId=String(match?.id||match?.cartItemId||"");
    if(!rowId||!chosen.rows.some((row:any)=>String(row.cartItemId)===rowId)){flashCartNotice("Vertailutuotetta ei löytynyt. Avaa vertailu uudelleen.");return}
    const priceCents=Number(alternative?.price);
    if(!Number.isFinite(priceCents)||priceCents<=0){flashCartNotice("Valitun vaihtoehdon hinta ei ole kelvollinen.");return}
    desktopComparisonEdited.current=true;
    try{const eligible=cartItems.filter(x=>String(x.source||"").toLowerCase()!=="offer"&&!x?.product?.ziiplyWeightLabel&&!resolvePriceWeightLabel(String(x.ean||x.product?.ean||"")));const selected=(Object.values(selectedStores) as any[]).filter(x=>["sHyper","sLocal","kHyper","kLocal","lidl","spar"].includes(storeKind(x)));const key=JSON.stringify([[...selected].sort((a,b)=>String(a.id).localeCompare(String(b.id))).map(x=>[x.id,x.externalId,x.name]),eligible.map(x=>[x.id,x.ean,x.product?.ean,x.name,x.title,x.quantity,x.source])]);window.localStorage.setItem(desktopComparisonEditedKey,key)}catch{}
    const rows=chosen.rows.map((row:any)=>row.cartItemId===rowId?{...row,name:String(alternative?.name||row.name),ean:String(alternative?.ean||alternative?.product?.ean||""),price:priceCents/100,image:String(alternative?.pictureUrl||alternative?.image||alternative?.imageUrl||alternative?.product?.image||alternative?.product?.imageUrl||row.image||""),match:"name" as const}:row);
    setDesktopCompareResults(current=>{
      const existing=current[storeId];if(!existing)return current;
      const updatedRows=existing.rows.map((row:any)=>String(row.cartItemId)===rowId?{...row,name:String(alternative?.name||row.name),price:priceCents/100,image:String(alternative?.image||alternative?.imageUrl||alternative?.product?.image||alternative?.product?.imageUrl||row.image||""),match:"name" as const,qualityMode:String(alternative?.comparisonSelectionMode||"cheapest")}:row);
      return {...current,[storeId]:{...existing,rows:updatedRows,total:updatedRows.reduce((sum:number,row:any)=>sum+(row.price??0)*Number(row.quantity||1),0),missing:updatedRows.filter((row:any)=>row.price==null).length}};
    });
    flashCartNotice("Tuotevaihtoehto päivitetty vertailuun.");
  }

  const [cartNotice, setCartNotice] = useState("");
  const [cartIncrementKey, setCartIncrementKey] = useState("");
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [savedLists, setSavedLists] = useState<any[]>([]);
  const [saveListOpen, setSaveListOpen] = useState(false);
  const [saveListName, setSaveListName] = useState("");
  const [openedSavedListId, setOpenedSavedListId] = useState<string|null>(null);
  const [justiinaQuery, setJustiinaQuery] = useState("");
  const [justiinaActiveTerm, setJustiinaActiveTerm] = useState("");
  const [justiinaDelay, setJustiinaDelay] = useState<0|1|2>(2);
  const [justiinaLoading, setJustiinaLoading] = useState(false);
  const [justiinaResults, setJustiinaResults] = useState<any[]>([]);
  const [justiinaResultsOpen, setJustiinaResultsOpen] = useState(false);
  const [desktopListPrompt, setDesktopListPrompt] = useState(false);
  const [desktopListPending, setDesktopListPending] = useState(false);
  const desktopVoiceRunRef = useRef(0);
  const desktopVoiceWaitRef = useRef<null | (() => void)>(null);
  function resumeDesktopVoiceList() {
    const resolve = desktopVoiceWaitRef.current;
    desktopVoiceWaitRef.current = null;
    resolve?.();
  }
  function cancelDesktopVoiceList() {
    desktopVoiceRunRef.current += 1;
    setDesktopListPending(false);
    setDesktopListPrompt(false);
    resumeDesktopVoiceList();
  }
  useEffect(() => {
    if (workspace !== "justiina") cancelDesktopVoiceList();
    // List progression is controlled only by explicit choice, not overlay closing.
  }, [workspace, justiinaResultsOpen]);
  useEffect(() => () => cancelDesktopVoiceList(), []);

  async function runDesktopVoiceList(transcript: string) {
    cancelDesktopVoiceList();
    const runId = desktopVoiceRunRef.current;
    const terms = parseMobileVoiceList(transcript);
    justiinaUserEditedRef.current = false;
    setDesktopListPending(terms.length > 1);
    for (let index = 0; index < terms.length; index++) {
      if (runId !== desktopVoiceRunRef.current) return;
      setJustiinaActiveTerm(terms[index]);
      const found = await runDesktopJustiinaSearch(terms[index], runId);
      if (runId !== desktopVoiceRunRef.current) return;
      // Mobile V509: keep this product's choices open until selection or return.
      if (found) {
        // Wait for an explicit selection or dismissal, including the last item.
        await new Promise<void>(resolve => { desktopVoiceWaitRef.current = resolve; });
      }
    }
    if (runId === desktopVoiceRunRef.current) {
      setDesktopListPending(false);
      setJustiinaResultsOpen(false);
      setWorkspace(null);
      setCartOpen(true);
    }
  }
  function requestDesktopListExit() {
    if (desktopVoiceWaitRef.current) {
      if (desktopListPending) { setDesktopListPrompt(true); return; }
      setJustiinaResultsOpen(false);
      resumeDesktopVoiceList();
      return;
    }
    setJustiinaResultsOpen(false);
    setWorkspace(null);
  }
  function confirmDesktopListSkip() {
    setDesktopListPrompt(false);
    setJustiinaResultsOpen(false);
    resumeDesktopVoiceList();
  }
  function cancelDesktopListEntirely() {
    cancelDesktopVoiceList();
    setJustiinaResultsOpen(false);
    setWorkspace(null);
  }
  const justiinaUserEditedRef = useRef(false);
  const justiinaAddedDuringSelectionRef = useRef(false);
  const justiinaLastSearchedRef = useRef("");
  const justiinaSuppressedTermsRef = useRef(new Set<string>());
  const [justiinaMessage, setJustiinaMessage] = useState("");
  const now = new Date();
  const month = ["TAMMIKUU","HELMIKUU","MAALISKUU","HUHTIKUU","TOUKOKUU","KESÄKUU","HEINÄKUU","ELOKUU","SYYSKUU","LOKAKUU","MARRASKUU","JOULUKUU"][now.getMonth()];



  // Match mobile: map only the user's selected stores, including manual overrides.
  const desktopMapStores=(Object.values(selectedStores) as any[]).filter(store=>{
    const name=String(store?.name||"").trim();
    return name&&!/valitse ensin|ei valittu/i.test(name);
  }).map(store=>{
    const coordinate=(value:any)=>value==null||value===""?null:Number.isFinite(Number(value))?Number(value):null;
    return {...store,address:String(store.address||store.streetAddress||""),
      city:String(store.city||appliedLocation||"Suomi"),
      latitude:coordinate(store.latitude??store.lat??store.location?.lat??store.coordinates?.latitude),
      longitude:coordinate(store.longitude??store.lng??store.lon??store.location?.lng??store.location?.lon??store.coordinates?.longitude)};
  });
  function desktopMapStoreQuery(store?:any){
    if(store?.latitude!=null&&store?.longitude!=null)return `${store.latitude},${store.longitude}`;
    return [store?.name,store?.address,store?.city,"Suomi"].filter(Boolean).join(", ");
  }
  function desktopMapRouteUrl(store:any){
    const destination=encodeURIComponent(desktopMapStoreQuery(store));
    const origin=gpsCoords?encodeURIComponent(`${gpsCoords.latitude},${gpsCoords.longitude}`):"";
    return origin?`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`:
      `https://www.google.com/maps/search/?api=1&query=${destination}`;
  }
  const desktopMapQuery=desktopMapStores.length>1?desktopMapStores.map(store=>[store.name,store.city].filter(Boolean).join(", ")).join(" | "):
    desktopMapStores.length?desktopMapStoreQuery(desktopMapStores[0]):`${appliedLocation||"Hyvinkää"}, Suomi`;
  const desktopMapIframeSrc=`https://maps.google.com/maps?q=${encodeURIComponent(desktopMapQuery)}&z=13&output=embed`;

  function distanceKm(s:any){ if(!gpsCoords)return Number(s?.distanceKm ?? Number.POSITIVE_INFINITY); const lat=Number(s?.latitude ?? s?.lat); const lon=Number(s?.longitude ?? s?.lon ?? s?.lng); if(!Number.isFinite(lat)||!Number.isFinite(lon))return Number(s?.distanceKm ?? Number.POSITIVE_INFINITY); const r=6371, p1=gpsCoords.latitude*Math.PI/180, p2=lat*Math.PI/180, dp=(lat-gpsCoords.latitude)*Math.PI/180, dl=(lon-gpsCoords.longitude)*Math.PI/180; const a=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2; return 2*r*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); }
  function byDistance(items:any[]){return [...items].sort((a,b)=>distanceKm(a)-distanceKm(b));}
  function storeKind(s:any){const chain=String(s?.chain||s?.type||s?.brand||"").toLowerCase();const n=String(s?.name||"").toLowerCase();if(chain==="lidl")return "lidl";if(chain.includes("tokmanni")||chain.includes("spar"))return "spar";if(n.includes("prisma"))return "sHyper";if(n.includes("citymarket"))return "kHyper";if(n.includes("s-market")||n.includes("sale")||n.includes("alepa"))return "sLocal";if(n.includes("k-market")||n.includes("k-supermarket"))return "kLocal";if(n.includes("lidl"))return "lidl";if(n.includes("tokmanni")||n.includes("spar"))return "spar";return ""}
  function applyModeDefaults(nextMode:"hyper"|"local"){
    // Keep manual choices for each store type. In between-chain multi mode,
    // complete only missing chains using the nearest matching store in the new type.
    if(betweenMode!=="many" || storeCompareScope==="within_chain")return;
    const source=allStoreSelections[storeMode];
    const wanted=new Set(Object.values(source).map((store:any)=>{
      const kind=storeKind(store);
      return kind==="sHyper"||kind==="sLocal"?"S":kind==="kHyper"||kind==="kLocal"?"K":kind==="lidl"?"LIDL":kind==="spar"?"SPAR":"";
    }).filter(Boolean));
    if(!wanted.size)return;
    setAllStoreSelections(prev=>{
      const next={...prev[nextMode]};
      const present=new Set(Object.values(next).map((store:any)=>{
        const kind=storeKind(store);
        return kind==="sHyper"||kind==="sLocal"?"S":kind==="kHyper"||kind==="kLocal"?"K":kind==="lidl"?"LIDL":kind==="spar"?"SPAR":"";
      }));
      for(const chain of wanted){
        if(present.has(chain))continue;
        const pool=chain==="LIDL"?lidlStores:chain==="SPAR"?sparStores:stores;
        const expected=chain==="S"?(nextMode==="hyper"?"sHyper":"sLocal"):chain==="K"?(nextMode==="hyper"?"kHyper":"kLocal"):chain==="LIDL"?"lidl":"spar";
        const candidate=byDistance(pool.filter((store:any)=>storeKind(store)===expected))[0];
        if(candidate){next[String(candidate.id)]=candidate;present.add(chain)}
      }
      return {...prev,[nextMode]:next};
    });
  }

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

  useEffect(()=>{try{const raw=window.localStorage.getItem("ziiply-desktop-ostelusvihko-v1");if(raw){const lists=JSON.parse(raw).map((list:any)=>({...list,items:(list.items||[]).map(desktopNotebookItem)}));setSavedLists(lists);window.localStorage.setItem("ziiply-desktop-ostelusvihko-v1",JSON.stringify(lists))}}catch{}},[]);
  function persistSavedLists(next:any[]){setSavedLists(next);try{window.localStorage.setItem("ziiply-desktop-ostelusvihko-v1",JSON.stringify(next))}catch{}}
  function beginSaveCart(){if(!cartItems.length){flashCartNotice("Ostoskori on tyhjä");return}const d=new Date();setSaveListName(`Ostelusvihko ${d.toLocaleDateString("fi-FI")}`);setSaveListOpen(true)}

  // Notebook data contains identity and quantity only. Prices belong to a store cache.
  function desktopNotebookItem(item:any){
    const p=item.product||{};
    return {id:item.id,name:item.name||item.title||p.name,title:item.title||item.name||p.name,
      ean:item.ean||p.ean,
      quantity:Number(item.quantity||1),source:item.source,chain:item.chain,storeName:item.storeName,
      product:{id:p.id,name:p.name||item.name||item.title,ean:p.ean||item.ean,
        brandName:p.brandName,category:p.category,
        ziiplyWeightLabel:p.ziiplyWeightLabel},ziiplyWeightLabel:item.ziiplyWeightLabel};
  }
  function desktopPriceKey(item:any,storeName:string){
    const ean=normalizeEan(item.ean||item.product?.ean||"");
    return ean&&storeName?JSON.stringify([ean,storeName]):"";
  }
  function desktopRememberPrices(items:any[]){
    try{
      const cache=JSON.parse(window.localStorage.getItem("ziiply-desktop-product-prices-v1")||"{}");
      for(const item of items){
        const key=desktopPriceKey(item,String(item.storeName||""));
        const at=Number(item.priceCheckedAt);
        if(key&&Number(item.price)>0&&Number.isFinite(at)&&at<=Date.now()&&Date.now()-at<86400000)
          cache[key]={price:Number(item.price),checkedAt:at};
      }
      window.localStorage.setItem("ziiply-desktop-product-prices-v1",JSON.stringify(cache));
    }catch{}
  }
  function desktopRestoreNotebookItem(item:any){
    const clean=desktopNotebookItem(item);
    const selected=(Object.values(selectedStores) as any[]).find(s=>String(s.name||"")===String(clean.storeName||""));
    const storeName=selected?String(selected.name||""):"";
    let hit:any=null;
    try{hit=JSON.parse(window.localStorage.getItem("ziiply-desktop-product-prices-v1")||"{}")[desktopPriceKey(clean,storeName)]}catch{}
    const valid=hit&&Number(hit.price)>0&&Number(hit.checkedAt)<=Date.now()&&Date.now()-Number(hit.checkedAt)<86400000;
    return {...clean,price:valid?Number(hit.price):null,priceCheckedAt:valid?hit.checkedAt:undefined,priceNeedsRefresh:true};
  }

  useEffect(()=>{desktopRememberPrices(cartItems)},[cartItems]);
  function restoreSavedList(list:any){desktopCompareCache.current.clear();setDesktopCompareResults({});setCartItems((list.items||[]).map(desktopRestoreNotebookItem));setNotebookOpen(false);setCartOpen(true);flashCartNotice("Ostelusvihko palautettu ostoskoriin")}
  function saveCartToNotebook(){desktopRememberPrices(cartItems);const name=saveListName.trim()||"Ostelusvihko";persistSavedLists([{id:String(Date.now()),name,createdAt:new Date().toISOString(),items:cartItems.map(desktopNotebookItem)},...savedLists]);setSaveListOpen(false);flashCartNotice(`Tallennettu Ostelusvihkoon: ${name}`)}

  function desktopCartPrice(value:any):number|null{if(value==null||value==="")return null;const normalized=String(value).replace(/\s/g,"").replace("€","").replace(",",".");const price=Number(normalized);return Number.isFinite(price)&&price>=0?price:null}
  function isDesktopMemoItem(p:any){return p?.isMemo===true||p?.manual===true||p?.source==="manual"||p?.source==="memo"||(!p?.ean&&!p?.offerId&&!p?.storeName&&desktopCartPrice(p?.price)==null)}
  function desktopCartKey(p:any){return String(p?.ean||p?.id||p?.offerId||p?.title||p?.name||"").trim()}
  useEffect(()=>{
    const handleArvoAdd=(event:Event)=>{
      const name=(event as CustomEvent<{name?:string}>).detail?.name?.trim();
      if (!name) return;
      // Shopping list only: never record this as a confirmed purchase.
      addDesktopCartItem({name,title:name,source:"arvo",quantity:1,price:null});
      flashCartNotice(name+" lisätty ostoslistalle");
    };
    window.addEventListener("ziiply-arvo-add-to-shopping-list",handleArvoAdd);
    return ()=>window.removeEventListener("ziiply-arvo-add-to-shopping-list",handleArvoAdd);
  });
  function flashCartNotice(message:string){setCartNotice(message);window.setTimeout(()=>setCartNotice(current=>current===message?"":current),2200)}
  function addDesktopCartItem(p:any){
    if(desktopScannerOpen && desktopPhysicalCollectionRef.current && p?.__physicalScannerAdd===true){p={...p,collected:true};}
    if(p?.__physicalScannerAdd!==undefined){const {__physicalScannerAdd,...clean}=p;p=clean;}
    const key=desktopCartKey(p);if(!key)return;
    if(p?.source==="justiina" && p?.__chain && justiinaQuery.trim())rememberSearchChoice(justiinaQuery,{...p,name:String(p.name||p.title||""),ean:p.ean==null?null:String(p.ean)},"added_to_cart");
    setCartItems(current=>{const found=current.find(x=>desktopCartKey(x)===key);if(found){setCartIncrementKey(key);window.setTimeout(()=>setCartIncrementKey(currentKey=>currentKey===key?"":currentKey),900);return isDesktopMemoItem(found)?current:current.map(x=>desktopCartKey(x)===key?{...x,collected:p.collected?true:Boolean(x.collected),quantity:p.collected&&!x.collected?Number(x.quantity||1):Number(x.quantity||1)+1}:x)}flashCartNotice(`Lisätty: ${p?.title||p?.name||"tuote"}`);return [...current,{...p,source:p?.source||"normal",quantity:1}]});
  }
  function changeDesktopCartQuantity(p:any,delta:number){const key=desktopCartKey(p);setCartItems(current=>current.flatMap(x=>desktopCartKey(x)!==key?[x]:Number(x.quantity||1)+delta<=0?[]:[{...x,quantity:Number(x.quantity||1)+delta}]))}
  function removeDesktopCartItem(p:any){const key=desktopCartKey(p);setCartItems(current=>current.filter(x=>desktopCartKey(x)!==key));flashCartNotice(`Poistettu ostoskorista: ${p?.title||p?.name||"tuote"}`)}
  async function shareDesktopCart(){const groups=new Map<string,Map<string,{name:string;quantity:number}>>();for(const p of cartItems){const store=String(p.storeName||"Kauppa").trim()||"Kauppa";const name=String(p.title||p.name||"Tuote").trim();const qty=Number(p.quantity||1);if(!groups.has(store))groups.set(store,new Map());const items=groups.get(store)!;const key=name.toLocaleLowerCase("fi");const old=items.get(key);if(old)old.quantity+=Number.isFinite(qty)&&qty>0?qty:1;else items.set(key,{name,quantity:Number.isFinite(qty)&&qty>0?qty:1})}const lines=["Ziiply – Ostoslista",""];for(const [store,items] of groups){lines.push(store+" ("+Array.from(items.values()).length+" tuotetta)","");for(const item of items.values())lines.push(item.quantity+" × "+item.name);lines.push("")}lines.push("Ostoslista tehty Ziiplyllä");const message=lines.join("\n");try{if(navigator.share)await navigator.share({title:"Ziiply – Ostoslista",text:message});else if(navigator.clipboard){await navigator.clipboard.writeText(message);flashCartNotice("Ostoskori kopioitu leikepöydälle")}else flashCartNotice("Jakaminen ei ole käytettävissä")}catch(e:any){if(e?.name!=="AbortError")flashCartNotice("Jakaminen epäonnistui")}}
  function clearDesktopCart(){setCartItems([]);flashCartNotice("Ostoskori tyhjennetty")}
  const desktopCartCount=cartItems.reduce((sum:number,p:any)=>sum+Number(p.quantity||1),0);

  // One immutable result set per actual chain/store, independent of selector mode.
  const offerWarmCache=useRef<Map<string,{time:number;results:any[];diagnostic?:any}>>(new Map());
  const offerDiagnostics=useRef<Map<string,any>>(new Map());
  const offerWarmPending=useRef<Map<string,Promise<any[]>>>(new Map());
  const offerRequestId=useRef(0);
  const offerViewState=useRef<Map<string,{tab:"offers"|"campaigns";category:string}>>(new Map());
  const activeOfferKey=useRef("");
  useEffect(()=>{try{const saved=JSON.parse(window.sessionStorage.getItem("ziiply-desktop-offers-cache-v9")||"[]");if(Array.isArray(saved))for(const [key,value] of saved){if(typeof key==="string"&&Array.isArray(value?.results)){offerWarmCache.current.set(key,value);if(value.diagnostic)offerDiagnostics.current.set(key,value.diagnostic)}}}catch{}},[]);
  function offerContext(chain:string,store:any){const ctx:any={};if(chain==="S"){ctx.sStoreId=store?.externalId||store?.id;ctx.sStoreName=store?.name}if(chain==="K"){ctx.kStoreId=store?.externalId||store?.id;ctx.kStoreName=store?.name}if(chain==="LIDL"){ctx.lidlStoreKey=store?.storeKey||store?.externalId||store?.id;ctx.lidlStoreName=store?.name||"Lidl"}if(chain==="TOKMANNI"){ctx.tokmanniStoreId=store?.externalId||store?.id;ctx.tokmanniStoreName=store?.name||"Tokmanni"}if(chain==="EUROSPAR"){ctx.eurosparStoreId=store?.externalId||store?.id;ctx.eurosparStoreName=store?.name||"Eurospar";ctx.eurosparStoreChain=store?.chain}return ctx}
  function offerKey(chain:string,store:any){const ctx=offerContext(chain,store);return JSON.stringify([chain,ctx.sStoreId||ctx.kStoreId||ctx.lidlStoreKey||ctx.tokmanniStoreId||ctx.eurosparStoreId||store?.id||store?.name])}
  function warmOffers(chain:string,store:any) {
    const ctx=offerContext(chain,store), key=offerKey(chain,store);
    const hit=offerWarmCache.current.get(key);
    // Cached offers are a quick first paint, but refresh them after 15 minutes.
    if(hit && Date.now()-hit.time<15*60*1000)return Promise.resolve(hit.results);
    const pending=offerWarmPending.current.get(key);
    if(pending)return pending;
    const promise=searchZiiplyGostaOffersV146({query:"",terms:[],context:ctx,captureDiagnostics:true})
      .then(r=>{
        const input=r.diagnosticInput||[];
        const cleaned=cleanZiiplyGostaOfferResultsV146(r.results||[]);
        const results=cleaned.map(mapZiiplyGostaOfferToCardOfferV147);
        const diagnostic={query:r.querySnapshot,context:ctx,store,receivedAt:new Date().toISOString(),input,coreResults:r.results||[],
          sharedCoreRemoved:input.filter(p=>!r.results.includes(p)),
          desktopRemoved:r.results.filter(p=>!cleaned.includes(p))};
        offerDiagnostics.current.set(key,diagnostic);
        offerWarmCache.current.set(key,{time:Date.now(),results,diagnostic});
        try{window.sessionStorage.setItem("ziiply-desktop-offers-cache-v9",JSON.stringify([...offerWarmCache.current]))}catch{}
        return results;
      })
      .catch(error=>{
        offerDiagnostics.current.set(key,{query:"",context:ctx,store,input:[],coreResults:[],error:String(error?.message||error)});
        throw error;
      }).finally(()=>offerWarmPending.current.delete(key));
    offerWarmPending.current.set(key,promise);
    return promise;
  }

  useEffect(()=>{for(const store of Object.values(selectedStores) as any[]){const kind=storeKind(store);const chain=kind==="sHyper"||kind==="sLocal"?"S":kind==="kHyper"||kind==="kLocal"?"K":kind==="lidl"?"LIDL":/eurospar/i.test(String(store?.chain||"")+" "+String(store?.name||""))?"EUROSPAR":"TOKMANNI";void warmOffers(chain,store).catch(()=>{})}},[selectedStores]);
  async function openDesktopGostaChain(chain:"S"|"K"|"LIDL"|"TOKMANNI"|"EUROSPAR", store:any) {
    const key=offerKey(chain,store);const request=++offerRequestId.current;
    if(activeOfferKey.current)offerViewState.current.set(activeOfferKey.current,{tab:gostaTab,category:gostaCategory});
    activeOfferKey.current=key;const previous=offerViewState.current.get(key);
    setGostaChainPicker(false);setGostaChain(chain);setGostaTab(previous?.tab||"offers");setGostaCategory(previous?.category||"");
    const cached=offerWarmCache.current.get(key);
    if(cached && Date.now()-cached.time<15*60*1000){setGostaOffers(cached.results);setGostaLoading(false);return}
    setGostaOffers([]);setGostaLoading(true);
    try{const results=await warmOffers(chain,store);if(request===offerRequestId.current)setGostaOffers(results)}
    catch{if(request===offerRequestId.current)setGostaOffers([])}
    finally{if(request===offerRequestId.current)setGostaLoading(false)}
  }
  async function runDesktopScannerEanSearch(code:string,physicalScan=false) {
    if(physicalScan && desktopInStoreConfirmedRef.current===null){
      const selectedName=String((Object.values(selectedStores) as any[])[0]?.name||"valitussa kaupassa");
      desktopInStoreConfirmedRef.current=window.confirm(`Oletko nyt kaupassa ${selectedName}?\n\nOK = Kyllä, Peruuta = Ei`);
    }
    const collect=physicalScan && desktopInStoreConfirmedRef.current===true;
    desktopPhysicalCollectionRef.current=collect;
    const weightLabel=resolvePriceWeightLabel(code);
    const kWeightLabel=resolveKWeightLabel(code);
    if(weightLabel){
      const scannedEan=weightLabel.scannedEan;
      const canonical=kWeightLabel?.canonicalEan||scannedEan;
      const bank=await fetch("/api/ean-bank?ean="+encodeURIComponent(canonical),{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null);
      const name=String(bank?.product?.name||"").trim()||`Tuntematon punnittu tuote (PLU ${weightLabel.plu})`;
      const price=null; // Never use the encoded weight-label total as a cart item price.
      setCartItems(current=>{
        const found=current.find((x:any)=>{
          const other=resolvePriceWeightLabel(String(x.ean||x.product?.ean||""));
          return other?.plu===weightLabel.plu||String(x.ean||"")===scannedEan;
        });
        if(found){
          const key=String(found.id||"");
          const firstCollection=collect && !Boolean(found.collected);
          if(firstCollection)setDesktopCheckedCartItems(previous=>({...previous,[key]:true}));
          return current.map((x:any)=>x!==found?x:{
            ...x,collected:firstCollection?true:Boolean(x.collected),name,title:name,ean:scannedEan,price,quantity:firstCollection?Number(x.quantity||1):Number(x.quantity||1)+(physicalScan?1:0),
            product:{...(x.product||{}),name,ean:scannedEan,ziiplyWeightLabel:true},
            ziiplyWeightLabel:true,weightPlu:weightLabel.plu
          });
        }
        const id="weight-"+weightLabel.plu;
        // Do not auto-collect a weighed item merely because a HID reader was used.
        return [...current,{id,name,title:name,ean:scannedEan,price,collected:collect,
          quantity:1,source:"search",product:{name,ean:scannedEan,ziiplyWeightLabel:true},
          ziiplyWeightLabel:true,weightPlu:weightLabel.plu}];
      });
      setDesktopScannerLoading(false);
      setDesktopScannerMessage("Vaakatuote lisätty");
      if(physicalScan)flashDesktopScanner("success");
      return;
    }
    const alreadyInCart=cartItems.some(item=>String(item.ean||item.product?.ean||"")===code);
    if(alreadyInCart){
      if(desktopScannerFlashTimer.current)clearTimeout(desktopScannerFlashTimer.current);
      if(desktopScannerIncrementTimer.current)clearTimeout(desktopScannerIncrementTimer.current);
      setDesktopScannerLoading(false);
      setDesktopScannerFlash("idle");
      setDesktopScannerMessage("");
      const firstCollection=collect && cartItems.some(item=>String(item.ean||item.product?.ean||"")===code&&!item.collected);
      setDesktopScannerIncrement(!firstCollection);
      if(firstCollection)setDesktopScannerMessage("✓ Kerätty");
      setCartItems(current=>current.map(item=>String(item.ean||item.product?.ean||"")===code?{...item,collected:collect?true:Boolean(item.collected),quantity:collect&&!item.collected?Number(item.quantity||1):Number(item.quantity||1)+1}:item));
      desktopScannerIncrementTimer.current=setTimeout(()=>{setDesktopScannerIncrement(false);setDesktopScannerMessage(current=>current==="✓ Kerätty"?"":current)},900);
      return;
    }
    setDesktopScannerIncrement(false);
    setDesktopScannerFlash("idle");
    setDesktopScannerLoading(true);
    setDesktopScannerMessage("");
    const selected=Object.values(selectedStores) as any[];
    const stores=selected.filter(x=>["sHyper","sLocal","kHyper","kLocal"].includes(storeKind(x)));
    try {
      // Mobile scanner's first identity source: persistent EAN bank. The bank
      // identifies the product, not its price or store availability.
      const bankResponse=await fetch("/api/ean-bank?ean="+encodeURIComponent(code),{cache:"no-store"});
      const bankData=bankResponse.ok?await bankResponse.json().catch(()=>null):null;
      const bankProduct=bankData?.product;
      const knownName=String(bankProduct?.name||"").trim();
      // Known Neon EAN identity must never wait for chain price searches.
      if(knownName){
        addDesktopCartItem({id:code,ean:code,name:knownName,title:knownName,price:0,source:"justiina",__physicalScannerAdd:physicalScan});
        setDesktopScannerLoading(false);
        setDesktopScannerMessage("TUOTE LISÄTTY");
        flashDesktopScanner("success");
      }
      // Store-specific price discovery is independent and must not block recognition.
      const results=await Promise.all(stores.map(async store=>{
        const kind=storeKind(store);
        const sChain=kind==="sHyper"||kind==="sLocal";
        const params=new URLSearchParams({search:knownName||code,store:String(store.externalId||store.id)});
        if(sChain)params.set("storeName",String(store.name||""));
        const response=await fetch((sChain?"/api/s-products?":"/api/k-products?")+params.toString(),{cache:"no-store"});
        if(!response.ok)return [];
        const data=await response.json();
        const items=Array.isArray(data?.products)?data.products:Array.isArray(data?.items)?data.items:Array.isArray(data)?data:[];
        return items.filter((p:any)=>{
          const eans=[p.ean,p.eanCode,p.barcode,p.gtin,p.code,p.product?.ean].filter(Boolean).map(String);
          return eans.includes(code)||(knownName&&String(p.name||p.title||"").trim().toLocaleLowerCase("fi")===knownName.toLocaleLowerCase("fi"));
        }).map((p:any)=>({...p,__store:store.name,__price:Number(p.price??p.storeItems?.[0]?.price??0),__chain:sChain?"S":"K",__priceIsEuros:sChain&&data?.source==="s-kaupat-normal-v220"}));
      }));
      const matches=results.flat();
      if(matches.length){
        const matched=matches[0] as any;
        const name=String(matched.name||matched.title||knownName||"Tuote");
        const rawPrice=Number(matched.__price||0);
        const priceEur=rawPrice>0?(matched.__priceIsEuros?rawPrice:rawPrice/100):0;
        if(knownName){
          if(priceEur>0)setCartItems(current=>current.map(item=>String(item.ean||"")===code?{...item,price:priceEur,storeName:String(matched.__store||""),chain:matched.__chain}:item));
        }else{
          addDesktopCartItem({id:code,ean:code,name,title:name,price:priceEur,storeName:String(matched.__store||""),source:"justiina",chain:matched.__chain,__physicalScannerAdd:physicalScan});
          setDesktopScannerMessage("TUOTE LISÄTTY");
          flashDesktopScanner("success");
        }
      }else if(!knownName){
        setDesktopScannerMessage("❌ Tuotetta ei tunnistettu — ei lisätty koriin");
        flashDesktopScanner("error");
      }
    }catch{setDesktopScannerMessage("Tuotehaku epäonnistui. Yritä uudelleen.");flashDesktopScanner("error")}finally{setDesktopScannerLoading(false)}
  }

  // Search results are not subject to the eight-item shopping basket limit.
  function rankDesktopJustiinaResults(products:any[], query:string):any[]{
    const normalize=(value:string)=>String(value||"").toLocaleLowerCase("fi").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
    const needle=normalize(query);
    const words=needle.split(" ").filter(Boolean);
    const score=(product:any)=>{
      const name=normalize(String(product.name||product.title||product.product?.name||""));
      if(!name)return -100;
      if(name===needle)return 1000;
      let value=0;
      if(name.startsWith(needle))value+=500;
      else if(name.includes(needle))value+=300;
      const matched=words.filter(w=>name.split(" ").some(token=>token===w||token.startsWith(w)));
      value+=matched.length*80;
      if(words.length&&matched.length===words.length)value+=120;
      if(words.length&&matched.length===0)value-=250;
      value-=Math.max(0,name.length-needle.length)*0.08;
      return value;
    };
    // API search may return related-category products (e.g. milk for "piimä").
    // Only show products whose names actually match every search term.
    const matchesQuery=(product:any)=>{
      const name=normalize(String(product.name||product.title||product.product?.name||""));
      const tokens=name.split(" ").filter(Boolean);
      return words.length>0&&words.every(word=>tokens.some(token=>token===word||token.startsWith(word)));
    };
    return products.filter(matchesQuery)
      .filter(product=>getLearnedSearchBoost(query,{...product,name:String(product.name||product.title||product.product?.name||"")}).reason!=="blocked_by_intent_guardrail")
      .map((product,index)=>({product,index,rank:score(product)+getLearnedStructureBoost(query,{...product,name:String(product.name||product.title||product.product?.name||"")}).boost}))
      .sort((a,b)=>b.rank-a.rank||a.index-b.index).map(row=>row.product);
  }

  async function runDesktopJustiinaSearch(raw=justiinaQuery, voiceRunId?:number) {
    const query=String(raw||"").trim(); if(!query)return;
    const selected=Object.values(selectedStores) as any[];
    const s=selected.find(x=>{const k=storeKind(x);return k==="sHyper"||k==="sLocal"});
    const k=selected.find(x=>{const t=storeKind(x);return t==="kHyper"||t==="kLocal"});
    if(!s&&!k){setJustiinaMessage("Valitse ensin S- tai K-kauppa.");return}
    setJustiinaResults([]);setJustiinaResultsOpen(true);
    setJustiinaLoading(true);setJustiinaMessage("");
    if(justiinaDelay && voiceRunId === undefined) await new Promise(r=>window.setTimeout(r,justiinaDelay*1000));
    try{
      async function fetchSearchData(url: string) {
        const queries = [...new Set(getNormalSearchQueries(query))].slice(0, 6);
        let lastData: any = null;
        for (const searchQuery of queries.length ? queries : [query]) {
          if (voiceRunId !== undefined && voiceRunId !== desktopVoiceRunRef.current) return null;
          const params = new URLSearchParams(url.split("?")[1]);
          params.set("search", searchQuery);
          const response = await fetch(url.split("?")[0] + "?" + params.toString(), { cache: "no-store" });
          if (!response.ok) throw new Error(`Kauppahaku epäonnistui (HTTP ${response.status}).`);
          const data = await response.json();
          lastData = data;
          const items = Array.isArray(data?.products) ? data.products : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
          if (rankNormalSearchResults(query, items).length > 0) return data;
        }
        return lastData;
      }
      const calls:any[]=[];
      if(s)calls.push(fetchSearchData(`/api/s-products?search=${encodeURIComponent(query)}&store=${encodeURIComponent(String(s.externalId||s.id))}&storeName=${encodeURIComponent(String(s.name||""))}`).then(d=>({chain:"S",store:s,data:d})));
      if(k)calls.push(fetchSearchData(`/api/k-products?search=${encodeURIComponent(query)}&store=${encodeURIComponent(String(k.id))}`).then(d=>({chain:"K",store:k,data:d})));
      const batches=await Promise.all(calls);const rows:any[]=[];
      for(const b of batches){const items=Array.isArray(b.data?.products)?b.data.products:Array.isArray(b.data?.items)?b.data.items:Array.isArray(b.data)?b.data:[];for(const x of rankNormalSearchResults(query,items).slice(0,40)){const rawPrice=Number(x?.storeItems?.[0]?.price??x?.price??0);const priceIsEuros=b.chain==="S"&&b.data?.source==="s-kaupat-normal-v220";const euro=Number.isFinite(rawPrice)&&rawPrice>0?(priceIsEuros?rawPrice:rawPrice/100):null;rows.push({...x,__chain:b.chain,__store:b.store?.name,__price:euro,__priceSource:b.data?.source||""})}}
      if (voiceRunId !== undefined && voiceRunId !== desktopVoiceRunRef.current) return false;
      setJustiinaResults(rows);justiinaLastSearchedRef.current=query.trim();justiinaUserEditedRef.current=false;justiinaAddedDuringSelectionRef.current=false;setJustiinaResultsOpen(rows.length>0);if(!rows.length)setJustiinaMessage(`Hakemaasi "${query}" ei löydy.`);
      return rows.length > 0;
    }catch{if (voiceRunId !== undefined && voiceRunId !== desktopVoiceRunRef.current) return false;setJustiinaMessage("Haku ei onnistunut. Yritä uudelleen.");return false}finally{setJustiinaLoading(false)}
  }

  useEffect(()=>{
    if(workspace!=="justiina")return;
    if(justiinaQuery.trim().length<2)return;
    // Sama ehto kuin mobiilissa: pelkkä paluu/remount ei laukaise uutta hakua.
    if(!justiinaUserEditedRef.current || justiinaLastSearchedRef.current===justiinaQuery.trim() || justiinaSuppressedTermsRef.current.has(justiinaQuery.trim().toLowerCase()))return;
    const timer=window.setTimeout(()=>{void runDesktopVoiceList(justiinaQuery)},justiinaDelay*1000);
    return ()=>window.clearTimeout(timer);
  // Deliberately trigger only on user query edits, not result updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[justiinaQuery,workspace]);

  const independentStoresRequestRef = useRef(0);
  async function loadIndependentStores(search:string, coords?:{latitude:number;longitude:number}) {
    // GPS lookup and the initial no-GPS directory lookup can overlap on mount.
    // Only the newest request may update the visible store lists; otherwise a
    // slower empty initial response can erase the GPS-ranked Tokmanni/Spar list.
    const requestId = ++independentStoresRequestRef.current;
    const lp = new URLSearchParams();
    /* Fetch the full Lidl store list for the desktop picker; local search must not restrict selectable stores. */
    try {
      const response = await fetch(`/api/lidl/store-search?${lp}`, {cache:"no-store"});
      const data = await response.json();
      if (requestId === independentStoresRequestRef.current) setLidlStores(Array.isArray(data?.items) ? data.items : []);
    } catch {
      if (requestId === independentStoresRequestRef.current) setLidlStores([]);
    }
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    if (coords) {
      sp.set("lat", String(coords.latitude));
      sp.set("lon", String(coords.longitude));
    }
    try {
      const response = await fetch(`/api/eurospar-stores?${sp}`, {cache:"no-store"});
      const data = await response.json();
      if (requestId === independentStoresRequestRef.current) setSparStores(Array.isArray(data?.items) ? data.items : []);
    } catch {
      if (requestId === independentStoresRequestRef.current) setSparStores([]);
    }
  }

  function useGps() {
    if (!navigator.geolocation) {
      setLocationStatus("Sijaintia ei tueta tällä laitteella");
      setGpsToast("GPS ei käytettävissä");
      return;
    }
    setLocationStatus("Haetaan sijaintia…");
    setGpsToast("GPS käynnistyy…");
    const onSuccess = ({coords}:GeolocationPosition) => {
      setGpsOn(true);
      setUserLocationAction(true);
      setLocationResolved(true);
      setGpsCoords({latitude:coords.latitude,longitude:coords.longitude});
      setGpsToast("GPS päällä");
      window.setTimeout(()=>setGpsToast(""),1800);
      setAppliedLocation(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
      setLocationStatus("GPS-sijainti käytössä");
      loadIndependentStores("", {latitude:coords.latitude,longitude:coords.longitude});
      fetch(`/api/store-search?gps=1&lat=${coords.latitude}&lon=${coords.longitude}`, {cache:"no-store"}).then(r=>r.json()).then(d=>{
        const items=Array.isArray(d?.items)?d.items:[];
        if(items.length)setStores(items);
      }).catch(()=>undefined);
    };
    const onError = (error:GeolocationPositionError) => {
      setGpsOn(false);
      const detail=error.code===1?"Sijaintilupa estetty tai selaimen asetuksissa kielletty.":error.code===3?"Sijainnin haku aikakatkaistiin.":"Sijaintia ei saatu laitteelta.";
      setLocationStatus(detail+" Voit yrittää GPS-painikkeesta uudelleen.");
      setGpsToast(`GPS-virhe ${error.code}: ${detail}`);
    };
    // Desktop browsers often fail a high-accuracy GPS request even when location is permitted.
    // Start with network/Wi-Fi positioning, and keep the button available for retries.
    navigator.geolocation.getCurrentPosition(onSuccess,onError,{enableHighAccuracy:false,timeout:20000,maximumAge:300000});
  }

  // Load store directories even if browser geolocation is denied.
  useEffect(()=>{loadIndependentStores("");fetch("/api/store-search?search=",{cache:"no-store"}).then(r=>r.json()).then(d=>setStores(current=>current.length?current:(Array.isArray(d?.items)?d.items:[]))).catch(()=>undefined)},[]);
  // GPS is the default on desktop; geolocation permission still belongs to the browser.
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("Sijaintia ei tueta tällä laitteella");
      return;
    }
    useGps();
    // Run once on mount; do not reset manually selected stores on subsequent renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/desktop-electricity", { cache: "no-store" }).then(r => r.json()).then(data => {
      const prices = Array.isArray(data?.prices) ? data.prices : [];
      const chartPrices = prices.map((p:any)=>({start:new Date(p.startDate ?? p.start).getTime(),end:new Date(p.endDate ?? p.end).getTime(),price:Number(p.price ?? p.value ?? p.priceWithTax)})).filter((p:any)=>Number.isFinite(p.start)&&Number.isFinite(p.end)&&p.end>p.start&&Number.isFinite(p.price)).sort((a:any,b:any)=>a.start-b.start);
      if(!cancelled)setElectricityPrices(chartPrices);
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
        ["--desktop-overlay-top" as string]: `${desktopOverlayTop}px`,
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

      <div className="relative mx-auto flex h-[100dvh] min-h-0 w-full max-w-[1800px] flex-col overflow-hidden px-8 pb-2 pt-3 xl:px-12 xl:pb-2 xl:pt-3">
        <header ref={desktopHeaderRef} className="grid grid-cols-[auto_minmax(360px,0.68fr)_minmax(650px,1fr)] items-center gap-5 border-b border-[#64745f]/20 pb-4">
          <div className="flex items-center gap-3">
            <img src="/ziiplylogo_mobile.png" alt="Ziiply" className="h-[66px] w-[66px] object-contain drop-shadow-[0_4px_10px_rgba(21,79,50,0.10)]" />
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.22em] text-[#6d765f]">Yksi haku. Kaikki hinnat.</div>
              <div className="mt-0.5 text-[17px] font-black text-[#314633]">Ziiply</div>
            </div>
          </div>

          <div className="relative grid h-[66px] min-w-0 grid-cols-[52px_minmax(180px,1fr)_64px] items-center gap-2 rounded-[22px] border-[2px] border-[#0b4638] bg-[linear-gradient(180deg,#fffdf5_0%,#f7edd2_100%)] p-[5px] shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_4px_12px_rgba(34,54,43,.10)]">
            <div className="grid h-[52px] w-[52px] place-items-center"><button type="button" onClick={() => { useGps(); }} title={gpsOn ? "Päivitä GPS-sijainti" : locationStatus} className={`relative grid h-[52px] w-[52px] place-items-center rounded-[16px] border-2 shadow-[inset_0_1px_0_rgba(255,255,255,.72)] ${gpsOn ? "border-[#2f9f58] bg-gradient-to-b from-[#ebfff0] to-[#98dfad]" : "border-[#c77a7a] bg-gradient-to-b from-[#fff1f1] to-[#f0caca]"}`}>
              <span className="text-[23px]">📍</span>{gpsToast&&<span className="absolute left-1/2 top-[62px] z-50 w-max -translate-x-1/2 rounded-full border border-[#6f806a]/20 bg-[#fffaf0] px-3 py-1.5 text-[10px] font-black text-[#536252] shadow-lg">{gpsToast}</span>}
              <span className={`absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full border border-white shadow-sm ${gpsOn?"bg-[#159447]":"bg-[#a44f4f]"}`} />
            </button></div>
            <label className="relative min-w-0 rounded-[15px] border border-[#b89552] bg-gradient-to-b from-[#fff8e7] to-[#efd79d] px-3 py-1.5 shadow-inner">
              <span className="block text-[8px] font-black uppercase tracking-[0.12em] text-[#756848]">Paikkakunta tai postinumero</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") applyLocation(); }} aria-label="Paikkakunta tai postinumero" className="mt-0.5 block w-full bg-transparent text-[15px] font-black text-[#241b13] outline-none placeholder:text-[#766e5c]" placeholder="05510 tai Hyvinkää" />
            </label>
            <button type="button" onClick={() => setMapOpen(true)} title="Avaa kartta" className="group grid h-[52px] w-[64px] place-items-center rounded-[16px] border-2 border-[#65a99c] bg-gradient-to-b from-[#c8eee8] to-[#86cabf] shadow-[inset_0_1px_0_rgba(255,255,255,.65)]">
              <img src="/icons/ziiply-compass.png" alt="Avaa kartta" className="h-[43px] w-[43px] object-contain drop-shadow-[0_3px_6px_rgba(7,61,50,.24)] transition " />
            </button>
          </div>

          <div className="ml-auto grid w-full max-w-[900px] grid-cols-4 gap-2.5">
            {[
              ["☀️", "SÄÄ", weather.value, "", "from-[#fffdf0] to-[#ffedb8] border-[#b5cbb4]"],
              ["⚡", "SÄHKÖ", electricity.value, electricity.detail, "from-[#fff6ce] to-[#ffdf75] border-[#d2b363]"],
              ["⛽", "AJOAINE", "DI 2,51", "BE 2,33 / 2,41", "from-[#fff1da] to-[#ffc795] border-[#c78b63]"],
            ].map(([icon, title, value, detail, theme]) => (
              <button type="button" key={title} onClick={() => { if (title === "AJOAINE") {setElectricityOpen(false);setFuelSelected(v => !v);setFuelCompared(false);} else if (title === "SÄHKÖ") {setElectricityOpen(true);} }} aria-pressed={title === "AJOAINE" ? fuelSelected : title === "SÄHKÖ" ? electricityOpen : undefined} className={`group relative flex h-[66px] items-center gap-3 rounded-[19px] border bg-gradient-to-b ${theme} px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_4px_10px_rgba(52,48,32,.10)] transition  ${title === "AJOAINE" || title === "SÄHKÖ" ? `cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#17573c] ${(title === "AJOAINE" && fuelSelected) || (title === "SÄHKÖ" && electricityOpen) ? "ring-[3px] ring-[#17573c] ring-offset-2" : ""}` : "cursor-default"}`} >
                <span className="text-[27px] drop-shadow-sm">{icon}</span>
                {title === "AJOAINE" ? (
                  <span className="min-w-0 flex-1">
                    <span className="block text-[9px] font-black tracking-[0.12em] text-[#625b43]">AJOAINE</span>
                    <span className="mt-0.5 grid grid-cols-[20px_minmax(0,1fr)] items-baseline gap-x-1 text-[13px] font-black leading-[1.15] text-[#102a24] tabular-nums">
                      <span>DI</span><span className="whitespace-nowrap">{fuelClosestPrice("diesel")!=null?Number(fuelClosestPrice("diesel")).toFixed(2).replace(".",","):"—"}</span>
                      <span className="mt-0.5">BE</span><span className="mt-0.5 whitespace-nowrap">{fuelClosestPrice("price95")!=null?Number(fuelClosestPrice("price95")).toFixed(2).replace(".",","):"—"} / {fuelClosestPrice("price98")!=null?Number(fuelClosestPrice("price98")).toFixed(2).replace(".",","):"—"}</span>
                    </span>
                  </span>
                ) : (
                  <span className="min-w-0">
                    <span className="block text-[9px] font-black tracking-[0.12em] text-[#625b43]">{title}</span>
                    <span className="mt-0.5 block text-[19px] font-black leading-none text-[#102a24]">{value}</span>
                    <span className="mt-1 block truncate text-[9px] font-black text-[#706a58]">{detail}</span>
                  </span>
                )}
              </button>
            ))}
            <button type="button" onClick={() => { window.open("https://calendar.google.com/calendar/u/0/r", "_blank", "noopener,noreferrer"); }} className="group relative flex h-[66px] items-center gap-3 rounded-[19px] border border-[#c9a86d] bg-gradient-to-b from-[#fffaf0] to-[#ffe39a] px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_4px_10px_rgba(52,48,32,.10)] transition ">
              <span className="flex h-10 w-10 items-center justify-center rounded-[11px] border-2 border-[#8a5b1d] bg-[#fff9e8] text-[21px] font-black text-[#17322a] shadow-sm">{now.getDate()}</span>
              <span>
                <span className="block text-[9px] font-black tracking-[0.12em] text-[#625b43]">{month}</span>
                <span className="mt-0.5 block text-[14px] font-black leading-none text-[#102a24]">Kalenteri</span>
                <span className="mt-1 block text-[9px] font-black text-[#8a5b1d]">Avaa kalenteri →</span>
              </span>
            </button>

          </div>
        </header>

        

        {saveListOpen&&<div className="fixed inset-0 z-[120] grid place-items-center bg-[#17352a]/35 p-10"><div className="w-full max-w-[560px] rounded-[26px] border-[3px] border-[#315d45] bg-[#fff6d9] p-6 shadow-2xl"><div className="font-serif text-[28px] font-black italic text-[#174c3a]">Tallenna Ostelusvihkoon</div><label className="mt-5 block text-[10px] font-black uppercase tracking-[.16em] text-[#756848]">Vihkon nimi</label><input autoFocus value={saveListName} onChange={e=>setSaveListName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveCartToNotebook()}} className="mt-2 w-full rounded-[16px] border-2 border-[#b89552] bg-white px-4 py-3 text-[16px] font-black outline-none"/><div className="mt-5 flex justify-end gap-3"><button onClick={()=>setSaveListOpen(false)} className="rounded-full border-2 border-[#9b8051] px-5 py-2 font-black">Peru</button><button onClick={saveCartToNotebook} className="rounded-full border-2 border-[#315d45] bg-[#dfead4] px-6 py-2 font-black text-[#174c3a]">Tallenna</button></div></div></div>}
        {reloadCartDecisionOpen&&<div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#1c271c]/65 px-4"><div role="dialog" aria-modal="true" aria-label="Säilytetäänkö ostoskori?" className="w-full max-w-[420px] rounded-[22px] border-[3px] border-[#b89552] bg-[#fff3d3] p-6 text-center text-[#174c35] shadow-2xl"><h2 className="font-serif text-[24px] font-black">Säilytetäänkö ostoskorin tavarat?</h2><p className="mt-3 text-[15px]">Ostoskori sisältää {cartItems.length} tuotetta.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" onClick={()=>{setReloadCartDecisionOpen(false);setCartOpen(false);setNotebookOpen(false);setDesktopCompareNotice(false);setWorkspace(null);setActive(null)}} className="rounded-full border-2 border-[#17573c] bg-[#17573c] px-5 py-3 font-black text-white">Säilytä tavarat</button><button type="button" onClick={()=>{setCartItems([]);setReloadCartDecisionOpen(false);setCartOpen(false);setNotebookOpen(false);setDesktopCompareNotice(false);setWorkspace(null);setActive(null);try{window.sessionStorage.removeItem("ziiply-desktop-current-cart-v1")}catch{}}} className="rounded-full border-2 border-[#b58a46] bg-[#fff9e9] px-5 py-3 font-black">Tyhjennä kori</button></div></div></div>}
        {desktopScannerOpen&&<div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/65 p-4"><div className="relative h-[min(680px,92dvh)] w-[min(440px,95vw)] overflow-hidden rounded-[24px] bg-[#f4edda]">
<ZiiplyDesktopScannerCard className="[&>footer]:hidden" regionId="ziiply-desktop-scanner-region" loading={desktopScannerLoading} flashState={desktopScannerFlash} scannerMessage={desktopScannerMessage} onClose={()=>{desktopInStoreConfirmedRef.current=null;desktopPhysicalCollectionRef.current=false;setDesktopScannerCameraOn(false);setDesktopScannerOpen(false)}} />
{desktopScannerIncrement&&<div className="pointer-events-none absolute inset-0 z-[90] flex items-center justify-center"><span className="rounded-2xl border-[3px] border-[#245c28] bg-[#d7ffd2] px-12 py-6 text-[48px] font-black text-[#123d18] shadow-xl">+1</span></div>}
<div className="pointer-events-none absolute inset-x-0 bottom-[112px] z-[70] flex justify-center"><button type="button" className="pointer-events-auto rounded-full border-2 border-[#17573c] bg-[#e2edcf] px-5 py-3 font-black text-[#174c35]" onClick={()=>setDesktopScannerCameraOn(v=>!v)}>{desktopScannerCameraOn?"Sulje kamera":"Käynnistä kamera"}</button></div>
<div className="absolute bottom-3 left-3 right-3 z-[100] rounded-xl bg-[#fff5dc] p-3 shadow-xl"><div className="flex flex-wrap items-center justify-center gap-3"><button type="button" onClick={()=>{setDesktopScannerMessage("");void pasteDesktopScannerEan()}} className="flex min-h-[64px] flex-1 items-center justify-center rounded-[17px] border-[3px] border-[#8d6e3d] bg-[#f8ecd0] px-3 py-2 text-center text-[13px] font-black uppercase leading-tight text-[#28492f] shadow-[inset_0_2px_0_rgba(255,255,255,0.7)]">Liitä EAN</button><button type="button" aria-label="Avaa ostoskori" title="Avaa ostoskori" onClick={()=>{setDesktopScannerCameraOn(false);setDesktopScannerOpen(false);setCartOpen(true)}} className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border-[5px] border-[#7b6034] bg-[#d8c08c] shadow-[0_6px_16px_rgba(0,0,0,0.22),inset_0_2px_0_rgba(255,255,255,0.55)]"><span className="flex h-[54px] w-[54px] items-center justify-center rounded-full border-[3px] border-[#efe2b8] bg-[#16472c] text-[31px] leading-none text-[#fff6d9]">🧺</span></button><button type="button" onClick={()=>{setDesktopScannerCameraOn(false);setDesktopScannerOpen(false)}} className="flex min-h-[64px] flex-1 items-center justify-center rounded-[17px] border-[3px] border-[#7d2b1d] bg-[linear-gradient(180deg,#c64235_0%,#922016_100%)] px-3 py-2 text-center text-[13px] font-black uppercase leading-tight text-[#fff3dc] shadow-[inset_0_2px_0_rgba(255,255,255,0.20)]">Sulje kamera</button></div></div></div></div>}
        <ZiiplyDesktopNotebookCard open={notebookOpen} lists={savedLists} currentCartCount={cartItems.length} openedListId={openedSavedListId} onToggleList={(id)=>setOpenedSavedListId(openedSavedListId===id?null:id)} onSaveCurrentCart={beginSaveCart} onRestoreList={restoreSavedList} onDeleteList={(id)=>persistSavedLists(savedLists.filter((list:any)=>list.id!==id))} onClose={()=>setNotebookOpen(false)} />
        {cartNotice&&!(workspace==="justiina"&&justiinaResultsOpen)&&<div role="status" className="fixed left-1/2 top-[calc(var(--desktop-overlay-top)+29px)] z-[110] flex h-[44px] w-[min(340px,calc(100vw-240px))] min-w-0 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-[14px] bg-[#08a36d] px-3 text-center text-[14px] font-black text-white shadow-2xl"><span className="block min-w-0 truncate whitespace-nowrap">{cartNotice}</span></div>}
        {/* Debug overlay hidden from the desktop UI; comparison logging remains available internally. */}
        {cartOpen && cartPaperReady && <div className="fixed bottom-[24px] left-[24px] right-[24px] top-[var(--desktop-overlay-top)] z-[90] flex overflow-hidden rounded-[30px] border-[3px] border-[#8a6c3d] bg-[#f7edcf] p-3 shadow-[0_30px_90px_rgba(20,40,31,.35)]">
<div className="relative mx-auto min-h-0 w-full max-w-[1600px] flex-1 overflow-hidden" style={{backgroundImage:"url('/ui/cart/desktop-virtanen.svg')",backgroundSize:"100% 100%",backgroundPosition:"center",backgroundRepeat:"no-repeat"}}>
 <div className="absolute left-[4%] right-[4%] top-[2.5%] z-10 flex items-start justify-between gap-4">
  <h2 className="px-2 font-serif text-[clamp(25px,2.5vw,40px)] font-black italic text-[#174c3a]">Tavarainkeruu</h2>

 </div>
 {cartOpen && desktopPackageProposals.length>0 && <div role="dialog" aria-label="Korvaavan tuotteen hyväksyntä" className="absolute inset-0 z-[35] flex items-center justify-center bg-[#372713]/25 px-4 py-4"><div className="w-full max-w-[560px] max-h-[90%] overflow-y-auto rounded-xl border border-[#967648] bg-[#f5e2b7] px-5 py-4 shadow-[0_10px_30px_rgba(58,40,16,.28)]"><div className="mb-3 border-b border-[#bba075] pb-3"><div><h3 className="font-serif text-[23px] font-bold italic leading-tight text-[#174c3a]">Korvaava tuote löytyi</h3></div></div>{desktopPackageProposals.map(proposal=><div key={proposal.itemId} className="mt-2"><div className="border-b border-[#c4a979] pb-3"><p className="text-[11px] font-bold uppercase tracking-wider text-[#776248]">Ostoskorissa</p><p className="mt-0.5 text-[14px] font-semibold leading-snug text-[#42321f]">{proposal.original}</p><div className="my-1 text-center text-lg leading-none text-[#35634c]">↓</div><p className="text-[11px] font-bold uppercase tracking-wider text-[#35634c]">Ehdotettu korvaava tuote</p><p className="mt-0.5 text-[15px] font-bold leading-snug text-[#203c30]">{proposal.candidate.name}</p><p className="mt-1 text-right font-serif text-[23px] font-bold text-[#174c3a]">{(Number(proposal.candidate.price)/100).toFixed(2).replace(".",",")} €</p></div><p className="mt-3 text-[12px] font-semibold leading-snug text-[#87482f]">Huom! Ei täsmälleen sama tuote. Tarkista erot esimerkiksi sokerin ja suolan määrässä.</p><div className="mt-4 flex flex-wrap justify-end gap-2"><button className="rounded-md border border-[#174c3a] bg-[#24543c] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#17432e]" onClick={()=>{setCartItems(current=>current.map(item=>desktopCartKey(item)!==proposal.itemId?item:{...item,name:String(proposal.candidate.name),title:String(proposal.candidate.name),ean:String(proposal.candidate.ean||""),image:String(proposal.candidate.image||proposal.candidate.imageUrl||proposal.candidate.pictureUrl||""),pictureUrl:String(proposal.candidate.pictureUrl||proposal.candidate.imageUrl||proposal.candidate.image||""),product:{...(item.product||{}),name:String(proposal.candidate.name),title:String(proposal.candidate.name),ean:String(proposal.candidate.ean||""),image:String(proposal.candidate.image||proposal.candidate.imageUrl||proposal.candidate.pictureUrl||"")},price:Number(proposal.candidate.price)/100,storeName:proposal.storeName,priceNeedsRefresh:false}));setDesktopPackageProposals(current=>current.filter(x=>x.itemId!==proposal.itemId))}}>Hyväksy vaihto</button><button className="rounded-md border border-[#99794a] bg-[#f9eccd] px-4 py-2 text-[13px] font-bold text-[#59482d] hover:bg-[#e8d5aa]" onClick={()=>{setCartItems(current=>current.filter(item=>desktopCartKey(item)!==proposal.itemId));setDesktopPackageProposals(current=>current.filter(x=>x.itemId!==proposal.itemId))}}>Poista tuote korista</button></div></div>)}</div></div>}
 {cartOpen && betweenMode==="one" && desktopCompareLoading && <div role="status" aria-live="polite" className="absolute left-1/2 top-[17%] z-20 w-max max-w-[calc(100%-32px)] -translate-x-1/2 rounded-xl border-2 border-[#b58a46] bg-[#fff4cf]/95 px-8 py-2 text-center text-[15px] font-black text-[#174c35] shadow-sm">⏳ Haetaan tai päivitetään valitun kaupan hintoja…</div>}
 <div className="absolute inset-x-[4.5%] bottom-[65px] top-[156px] overflow-y-auto">
 {cartItems.length===0?<p className="py-8 text-center font-serif text-[24px] font-bold text-[#503d2a]">Ostoskori on tyhjä</p>:cartItems.map((p:any,i:number)=><div key={desktopCartKey(p)||i} className="grid min-h-[86px] grid-cols-[60px_minmax(0,1fr)_220px_220px] items-center border-b border-[#8f744f]/25 py-[4px] text-[#3c2c1b]">
  <button type="button" aria-label={p.collected?"Merkitse keräämättömäksi":"Merkitse kerätyksi"} onClick={()=>setCartItems(current=>current.map(x=>desktopCartKey(x)===desktopCartKey(p)?{...x,collected:!x.collected}:x))} className="text-center font-serif text-[20px]">{p.collected?"☑":"☐"}</button>
  <div className="flex min-w-0 items-center gap-3 pl-[30px] pr-[12px]"><div className="min-w-0"><div className="line-clamp-2 text-[clamp(16px,1.2vw,21px)] font-bold">{p.title||p.name}</div><div className="text-[15px] text-[#66543d]">{p.storeName||""} {p.collected?"· Kerätty":"· Ei kerätty"}</div>{p.discountText&&<div className="truncate text-[14px] italic text-[#77513c]">{p.discountText}</div>}{p.unitPrice&&<div className="text-[14px] text-[#66543d]">{p.unitPrice}</div>}{p.validityText&&<div className="text-[14px] text-[#66543d]">{p.validityText}</div>}</div></div>
  <div className="flex w-full translate-x-[13px] items-center justify-center gap-2">{!isDesktopMemoItem(p)&&<><button onClick={()=>changeDesktopCartQuantity(p,-1)} aria-label="Vähennä määrää" className="grid h-10 w-10 place-items-center rounded-full border border-[#315d45] bg-[#fff8df] font-bold">−</button><span className="min-w-6 text-center text-[19px] font-bold">{Number(p.quantity||1)}</span><button onClick={()=>changeDesktopCartQuantity(p,1)} aria-label="Lisää määrää" className="grid h-10 w-10 place-items-center rounded-full border border-[#315d45] bg-[#fff8df] font-bold">+</button></>}</div>
  <div className="flex items-center justify-center px-2">{!isDesktopMemoItem(p)&&<span className="whitespace-nowrap font-serif text-[clamp(17px,1.35vw,23px)] font-bold">{desktopCartPrice(p.price)!=null?desktopCartPrice(p.price)!.toFixed(2).replace(".",",")+" €":"—"}</span>}</div>
 </div>)}
 </div>
 <div className="absolute left-[65px] top-[72px] z-10 flex items-center gap-[70px]"><button onClick={()=>{setCartOpen(false);setNotebookOpen(true)}} title="Ostoslistat" aria-label="Ostoslistat" className="grid h-[60px] w-[68px] place-items-center border-0 bg-transparent p-0 text-[#65431e] drop-shadow-[0_2px_2px_#6a4b2955] disabled:opacity-40"><svg aria-hidden="true" viewBox="0 0 64 64" className="h-[49px] w-[49px] drop-shadow-[1px_2px_1px_#5b411f66]" fill="none" stroke="#624522" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><rect x="12" y="9" width="39" height="48" rx="5" fill="#fff4d3"/><path d="M22 9v48M27 20h17M27 30h17M27 40h13" stroke="#906b3d"/><rect x="7" y="16" width="10" height="35" rx="3" fill="#d4ae69"/><path d="M9 24h7M9 33h7M9 42h7" stroke="#fff1cb"/></svg></button><button disabled={!cartItems.length} onClick={shareDesktopCart} title="Lähetä ostoskori" className="grid h-[60px] w-[68px] place-items-center border-0 bg-transparent p-0 text-[#65431e] drop-shadow-[0_2px_2px_#6a4b2955] disabled:opacity-40"><svg aria-hidden="true" viewBox="0 0 64 64" className="h-[49px] w-[49px] drop-shadow-[1px_2px_1px_#5b411f66]" fill="none" stroke="#624522" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="16" width="50" height="34" rx="5" fill="#fff3d1"/><path d="m9 19 23 18 23-18" strokeWidth="3"/><path d="m10 47 17-15m27 15L37 32" stroke="#b18a4d"/><path d="M40 8h15m-5-5 5 5-5 5" stroke="#28644b" strokeWidth="3"/></svg></button><button disabled={!cartItems.length} onClick={()=>setDesktopCheckoutOpen(true)} title="Osta" className="grid h-[60px] w-[68px] place-items-center border-0 bg-transparent p-0 text-[#65431e] drop-shadow-[0_2px_2px_#6a4b2955] disabled:opacity-40"><svg aria-hidden="true" viewBox="0 0 64 64" className="h-[52px] w-[52px] drop-shadow-[1px_2px_1px_#5b411f66]" fill="none" stroke="#58381b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 26 Q9 13 22 12 H45 Q55 13 55 26 V49 H9Z" fill="#c99b51"/><path d="M11 27 Q12 17 23 16 H44 Q52 17 53 27" fill="#e6c17d"/><rect x="21" y="6" width="26" height="12" rx="3" fill="#a97735"/><rect x="25" y="8" width="18" height="7" rx="1" fill="#fff0b6"/><path d="M29 12h10" stroke="#68451f"/><path d="M12 28H52" strokeWidth="2.5"/><rect x="15" y="32" width="34" height="15" rx="3" fill="#e6bc72"/><g fill="#8b5d2a" stroke="#553617" strokeWidth="1"><circle cx="21" cy="36" r="2.2"/><circle cx="30" cy="36" r="2.2"/><circle cx="39" cy="36" r="2.2"/><circle cx="21" cy="43" r="2.2"/><circle cx="30" cy="43" r="2.2"/><circle cx="39" cy="43" r="2.2"/></g><path d="M8 49h48v9H8z" fill="#91632f"/><rect x="13" y="51" width="38" height="4" rx="1" fill="#dcb878"/><path d="M13 22h38" stroke="#fff0b5" strokeWidth="1.4"/><path d="M9 49h46" stroke="#5a391c" strokeWidth="2.5"/></svg></button></div>
 <div className="absolute left-[570px] top-[88px] z-10"><button disabled={!cartItems.length} onClick={()=>{void openDesktopComparison()}} className="rounded-[16px] border-[3px] border-[#548067] bg-gradient-to-b from-[#fff7df] to-[#dfc999] px-6 py-1 font-serif text-[clamp(18px,1.5vw,26px)] font-black italic text-[#24543c] shadow-md disabled:opacity-40">Halpuusvertailu</button></div>
 <div className="absolute right-[300px] top-[84px] z-10 flex w-[190px] items-center justify-center gap-[18px]"><button onClick={clearDesktopCart} disabled={!cartItems.length} title="Tyhjennä kori" aria-label="Tyhjennä kori" className="grid h-[60px] w-[68px] place-items-center border-0 bg-transparent p-0 text-[#65431e] drop-shadow-[0_2px_2px_#6a4b2955] disabled:opacity-40"><svg aria-hidden="true" viewBox="0 0 32 32" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 9h18M12 9V6h8v3M9 9l1.5 18h11L23 9M14 14v9M18 14v9"/></svg></button><button onClick={()=>setCartOpen(false)} title="Sulje ostoskori" aria-label="Sulje ostoskori" className="grid h-[60px] w-[68px] place-items-center border-0 bg-transparent p-0 text-[#65431e] drop-shadow-[0_2px_2px_#6a4b2955] disabled:opacity-40 text-[48px] font-bold leading-none">×</button></div>
 <div className="absolute right-[70px] top-[58px] z-10 flex w-[230px] flex-col items-center text-center font-serif font-black text-[#174c3a]" aria-label="Ostoskorin yhteishinta">{desktopCartPricesChecked&&!desktopCompareLoading&&cartItems.some((p:any)=>desktopCartPrice(p.price)==null)&&<span className="absolute bottom-full mb-2 w-[310px] whitespace-nowrap text-center text-[clamp(16px,1.2vw,21px)] font-bold leading-tight text-[#8b4e35]">Osa tuotteista ilman hintaa</span>}<span className="text-[clamp(17px,1.5vw,25px)]">Yhteensä</span><span className="whitespace-nowrap text-[clamp(23px,2.1vw,37px)]">{cartItems.reduce((sum:number,p:any)=>sum+(desktopCartPrice(p.price)||0)*Number(p.quantity||1),0).toFixed(2).replace(".",",")} €</span></div>

</div>
</div>}
{desktopCheckoutOpen&&<div className="fixed inset-0 z-[140] grid place-items-center bg-[#172e23]/65 p-5"><div className="w-full max-w-[530px] rounded-[25px] border-[3px] border-[#967344] bg-[#fff4d6] p-7 text-center shadow-2xl"><h2 className="font-serif text-[30px] font-black italic text-[#174c3a]">Osta</h2><p className="mt-4 text-[17px] text-[#59482f]">Ostotoiminto ei ole vielä käytettävissä desktop-esikatselussa. Ostoskori säilyy tallessa.</p><button onClick={()=>setDesktopCheckoutOpen(false)} className="mt-6 rounded-full bg-[#315d45] px-7 py-3 font-bold text-white">Takaisin ostoskoriin</button></div></div>}
{desktopCompareNotice&&<ZiiplyDesktopCompareCard
  open
  stores={Object.entries(desktopCompareResults).map(([id,result])=>({id,name:String(result.store?.name||"Kauppa"),chain:(["sHyper","sLocal"].includes(storeKind(result.store))?"S":storeKind(result.store)==="lidl"?"LIDL":storeKind(result.store)==="spar"?"SPAR":"K") as "S"|"K"|"LIDL"|"SPAR",totalPrice:result.missing===result.rows.length?undefined:Math.round(result.total*100),itemCount:result.rows.length-result.missing,missingItems:result.missing,matches:result.rows.map((row:any)=>{const original=cartItems.find((item:any)=>String(item.id||"")===row.cartItemId);return {...row,id:row.cartItemId,price:row.price==null?null:Math.round(row.price*100),isMissingComparisonItem:row.price==null,cartItem:original,sourceProductName:String(original?.name||original?.title||row.name),image:row.image||original?.image||original?.product?.image||original?.product?.imageUrl,product:{name:row.name,image:row.image||original?.product?.image||original?.product?.imageUrl},matchType:row.match==="name"?"name":row.match==="ean"?"ean":"manual"}})}))}
  items={cartItems}
  onChangeMatchMode={desktopChangeCompareMatchMode}
  onSelectMatchAlternative={desktopSelectCompareAlternative}
  loading={desktopCompareLoading}
  title="Halpuusvertailu"
  subtitle={desktopCompareError||"Kauppakohtaiset hinnat ja ostoskorit"}
  onBack={()=>{setDesktopCompareNotice(false);setJustiinaResultsOpen(false);setWorkspace(null)}}
  onBackToCart={()=>{setDesktopCompareNotice(false);setJustiinaResultsOpen(false);setWorkspace(null)}}
  onClose={()=>{setDesktopCompareNotice(false);setJustiinaResultsOpen(false);setWorkspace(null)}}
  onSelectStore={(id)=>{const chosen=desktopCompareResults[id];if(!chosen)return;if(!chosen.rows.some(row=>row.price!=null)){flashCartNotice("Valitun kaupan vertailukorissa ei ole yhtään vahvistettua hintaa.");return;}const byId=new Map(chosen.rows.map(row=>[row.cartItemId,row]));setCartItems(current=>current.map(item=>{const row=byId.get(String(item.id||""));return row?{...item,name:row.name,title:row.name,ean:(row as any).ean||undefined,image:(row as any).image||undefined,product:{name:row.name,ean:(row as any).ean||undefined,pictureUrl:(row as any).image||undefined},price:row.price??null,priceCheckedAt:Date.now(),storeName:String(chosen.store?.name||""),priceNeedsRefresh:row.price==null}:item}));setDesktopCompareNotice(false);setCartOpen(true);flashCartNotice(`Vertailukori valittu: ${String(chosen.store?.name||"kauppa")} (${chosen.rows.filter(row=>row.price!=null).length}/${chosen.rows.length} hintaa).`)}}
/>}


        {mapOpen && (
          <div className="absolute inset-0 z-[80] grid place-items-center bg-[#17352a]/35 p-10 backdrop-blur-[3px]">
            <div className="w-full max-w-[900px] rounded-[30px] border border-[#6e7d68]/25 bg-[#f8f3e7] p-6 shadow-[0_30px_90px_rgba(20,40,31,.35)]">
              <div className="flex items-center justify-between">
                <div><div className="text-[11px] font-black uppercase tracking-[.15em] text-[#7d745e]">Ziiply · kartta</div><div className="mt-1 text-[27px] font-black text-[#17352a]">{appliedLocation}</div></div>
                <button onClick={() => setMapOpen(false)} className="rounded-full border border-[#6f806a]/25 bg-white px-4 py-2 text-[13px] font-black">Sulje ×</button>
              </div>
              <div className="mt-5 flex h-[min(560px,65vh)] min-h-0 flex-col overflow-hidden rounded-[24px] border border-[#7b8b75]/25">
                <iframe title="Ziiply kauppakartta" src={desktopMapIframeSrc} className="min-h-[220px] w-full flex-[0_0_55%] border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#d6bd76] bg-[#fff8dc] p-3">
                  <div className="mb-3 rounded-xl bg-[#e7f6ee] px-3 py-2 text-sm font-bold text-[#244b38]">{gpsCoords?"Oma sijainti mukana reittilinkeissä.":"GPS ei ole päällä. Reitti avautuu ilman lähtöpistettä."}</div>
                  {desktopMapStores.length===0?<p className="px-3 py-2 font-bold text-[#687267]">Valitse kaupat, niin näet niiden reittilinkit täällä.</p>:<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{desktopMapStores.map(store=><a key={String(store.id)+"-"+store.name} href={desktopMapRouteUrl(store)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-[#ead99f] bg-[#fff8df] px-4 py-3 text-[#17352a]"><span><span className="block font-black">{store.name}</span><span className="block text-xs font-bold uppercase tracking-wide">Näytä reitti</span></span><span className="text-2xl">↗</span></a>)}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        <section data-desktop-card-row className="grid min-h-0 flex-1 items-stretch gap-4 overflow-hidden pb-3 pt-1 lg:grid-cols-[minmax(0,0.95fr)_136px_minmax(0,1.05fr)] xl:gap-5">
          <div className="relative max-w-none flex h-full flex-col justify-start self-stretch">
            {fuelSelected ? <div className="relative flex h-0 min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border-[3px] border-[#b38a4a] bg-[#fcf5de] p-4 shadow-[0_5px_0_rgba(105,72,28,.14),inset_0_0_0_2px_rgba(255,255,255,.48)]">
<div className="grid grid-cols-[1fr_46px_1fr] items-center gap-3"><button type="button" onClick={()=>{setFuelStationSide("traffic");setFuelCompared(false)}} className={`relative flex h-[64px] items-center justify-center overflow-hidden rounded-[17px] border-2 px-3 text-[clamp(15px,1.1vw,19px)] font-black ${(fuelStationSide==="traffic"||fuelStationSide==="both")?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df] text-[#5a4424]"}`}><span className="grid w-full min-w-0 grid-cols-[minmax(0,78px)_minmax(0,1fr)] items-center gap-[5px]"><FuelStationTypeIllustration kind="traffic" className="h-[58px] w-full min-w-0" /><span className="min-w-0 text-center text-[clamp(14px,1vw,18px)] leading-[1.05] tracking-[-0.035em]">Liikenneasemat</span></span></button><div className="flex h-[100px] flex-col items-center justify-between"><span title="Polttoainemittari" className="flex h-7 items-center justify-center"><FuelStationTypeIllustration kind="pump" className="h-8 w-9" /></span><button type="button" aria-label="Asematyypin valinta" aria-pressed={fuelStationSide==="cold"} onClick={()=>{setFuelStationSide(v=>v==="traffic"?"cold":v==="cold"?"both":"traffic");setFuelCompared(false)}} className="relative mx-auto h-[22px] w-[46px] shrink-0 rounded-full bg-[#d8c69d]"><span className={`absolute top-[3px] h-[16px] w-[16px] rounded-full bg-white transition-all ${fuelStationSide==="traffic"?"left-[3px]":fuelStationSide==="both"?"left-[15px]":"left-[27px]"}`}/></button><div className="flex h-7 items-center justify-center"><span className="text-[17px] font-black leading-none">{fuelStationSide==="traffic"?"←":fuelStationSide==="cold"?"→":"↔"}</span></div></div><button type="button" onClick={()=>{setFuelStationSide("cold");setFuelCompared(false)}} className={`relative flex h-[58px] items-center justify-center overflow-hidden rounded-[17px] border-2 px-3 text-[clamp(15px,1.1vw,19px)] font-black ${(fuelStationSide==="cold"||fuelStationSide==="both")?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df] text-[#5a4424]"}`}><span className="grid w-full min-w-0 grid-cols-[minmax(0,60px)_minmax(0,1fr)] items-center gap-0"><span className="relative block h-[54px] w-[45px] overflow-visible"><FuelStationTypeIllustration kind="cold" className="absolute left-[-14px] top-0 h-[54px] w-[70px] max-w-none" /></span><span className="min-w-0 whitespace-nowrap text-center text-[clamp(14px,1vw,18px)] leading-[1.05] tracking-[-0.035em]">Kylmäasemat / muut</span></span></button></div>
<div className="my-1 text-center text-[14px] font-black uppercase tracking-[.14em] text-[#66543a]">Hakutapa</div>
<div className="grid grid-cols-[1fr_46px_1fr] gap-3"><button type="button" onClick={()=>{setFuelScope("between");setFuelCompared(false)}} className={`h-[52px] rounded-[17px] border-2 px-3 text-[clamp(14px,1vw,18px)] font-black ${fuelScope==="between"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df]"}`}>Ketjujen väliltä</button><div aria-hidden /><button type="button" onClick={()=>{setFuelScope("within");setFuelCompared(false)}} className={`h-[52px] rounded-[17px] border-2 px-3 text-[clamp(14px,1vw,18px)] font-black ${fuelScope==="within"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df]"}`}>Ketjun sisältä</button></div>
<div className="mt-4 grid h-0 min-h-0 flex-1 grid-cols-2 grid-rows-[repeat(3,minmax(0,1fr))] gap-4 overflow-hidden">
{(["Neste","ABC"] as const).map(group=>{const station=fuelCandidates(group).slice().sort((a:any,b:any)=>Number(a.distanceKm)-Number(b.distanceKm))[0];const chosen=fuelGroups.includes(group);return <div key={group} className="relative flex h-full min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden rounded-[22px] border-[3px] border-[#d7c08e] bg-[#fffaf0] px-2 pb-2 pt-6 text-center shadow-[0_4px_8px_rgba(73,55,22,.08)]"><FuelStationBackdrop chain={group} /><div className="absolute left-2 top-2 z-20 flex h-12 w-14 items-center justify-center overflow-hidden rounded-lg border border-[#b89552] bg-[#fffef9]/90 px-1 text-[clamp(12px,.95vw,17px)] font-black shadow-sm" style={{color:group==="Neste"?"#d12b27":group==="ABC"?"#167347":group==="St1"?"#d62d2d":group==="SEO"?"#356f38":"#9a6d22"}}><FuelBrandLogo brand={group} /></div><button type="button" onClick={()=>{setFuelGroups(prev=>fuelScope==="within"?[group]:prev.includes(group)?prev.filter(g=>g!==group):[...prev,group]);setFuelCompared(false)}} aria-label={`Valitse ${group}`} className={`absolute right-2 top-2 z-20 grid h-9 w-9 place-items-center rounded-full border font-black ${chosen?"border-[#536d4f] bg-[#648060] text-white":"border-[#d0ad68] bg-[#fff8dc] text-transparent"}`}>✓</button><FuelStationCardDetails chain={group} station={station} /></div>})}
<div className="col-span-2 flex min-h-0 items-stretch justify-center"><div className="relative flex h-full min-h-0 w-[calc(50%-0.5rem)] min-w-0 flex-col items-center justify-center overflow-hidden rounded-[22px] border-[3px] border-[#d7c08e] bg-[#fffaf0] px-2 pb-2 pt-6 text-center shadow-[0_4px_8px_rgba(73,55,22,.08)]"><FuelStationBackdrop chain={"Muut"} /><div className="absolute left-2 top-2 z-20 flex h-12 w-14 items-center justify-center overflow-hidden rounded-lg border border-[#b89552] bg-[#fffef9]/90 px-1 text-[clamp(12px,.95vw,17px)] font-black text-[#9a6d22] shadow-sm"><div className="relative flex h-full w-full overflow-hidden" aria-label="Gulf / Ritoil"><div className="relative h-full w-1/2 overflow-hidden"><img src="https://commons.wikimedia.org/wiki/Special:FilePath/Gulf_Oil_logo.svg" alt="" className="absolute left-0 top-0 h-full w-[200%] max-w-none object-contain" /></div><div className="relative h-full w-1/2 overflow-hidden"><img src="https://commons.wikimedia.org/wiki/Special:FilePath/RITOIL_Logo.svg" alt="" className="absolute right-0 top-0 h-full w-[200%] max-w-none object-contain" /></div></div></div><button type="button" onClick={()=>{setFuelGroups(prev=>["Gulf","Ritoil","Muut"].some(g=>prev.includes(g))?prev.filter(g=>!["Gulf","Ritoil","Muut"].includes(g)):[...prev,"Gulf","Ritoil","Muut"]);setFuelCompared(false)}} aria-label="Valitse Gulf, Ritoil tai muu" className={`absolute right-2 top-2 z-20 grid h-9 w-9 place-items-center rounded-full border font-black ${["Gulf","Ritoil","Muut"].some(g=>fuelGroups.includes(g))?"border-[#536d4f] bg-[#648060] text-white":"border-[#d0ad68] bg-[#fff8dc] text-transparent"}`}>✓</button>{(()=>{const station=["Gulf","Ritoil","Muut"].flatMap(g=>fuelCandidates(g)).sort((a:any,b:any)=>Number(a.distanceKm)-Number(b.distanceKm))[0];return <FuelStationCardDetails chain="Gulf / Ritoil / Muu" station={station} />})()}</div></div>
{(["St1","SEO"] as const).map(group=>{const station=fuelCandidates(group).slice().sort((a:any,b:any)=>Number(a.distanceKm)-Number(b.distanceKm))[0];const chosen=fuelGroups.includes(group);return <div key={group} className="relative flex h-full min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden rounded-[22px] border-[3px] border-[#d7c08e] bg-[#fffaf0] px-2 pb-2 pt-6 text-center shadow-[0_4px_8px_rgba(73,55,22,.08)]"><FuelStationBackdrop chain={group} /><div className="absolute left-2 top-2 z-20 flex h-12 w-14 items-center justify-center overflow-hidden rounded-lg border border-[#b89552] bg-[#fffef9]/90 px-1 text-[clamp(12px,.95vw,17px)] font-black shadow-sm" style={{color:group==="St1"?"#d62d2d":"#356f38"}}><FuelBrandLogo brand={group} /></div><button type="button" onClick={()=>{setFuelGroups(prev=>fuelScope==="within"?[group]:prev.includes(group)?prev.filter(g=>g!==group):[...prev,group]);setFuelCompared(false)}} aria-label={`Valitse ${group}`} className={`absolute right-2 top-2 z-20 grid h-9 w-9 place-items-center rounded-full border font-black ${chosen?"border-[#536d4f] bg-[#648060] text-white":"border-[#d0ad68] bg-[#fff8dc] text-transparent"}`}>✓</button><FuelStationCardDetails chain={group} station={station} /></div>})}
</div>
{fuelLoading&&<p role="status" className="mt-2 text-xs">Haetaan asemia ja hintahavaintoja…</p>}{fuelError&&<p role="alert" className="mt-2 text-xs">{fuelError}</p>}
</div> : <div data-desktop-store-panel className="relative h-full min-h-0 overflow-visible rounded-[28px] border-[3px] border-[#b38a4a] bg-[#fcf5de] p-4 shadow-[0_5px_0_rgba(105,72,28,.14),inset_0_0_0_2px_rgba(255,255,255,.48)]">
<div className="grid grid-cols-[1fr_46px_1fr] items-center gap-3"><button disabled={storeCompareScope==="within_chain"} onClick={()=>{setStoreMode("hyper");setStoreModeChosen(true);applyModeDefaults("hyper")}} className={`h-[64px] rounded-[17px] border-2 px-3 text-[clamp(15px,1.1vw,19px)] font-black ${storeModeChosen&&storeMode==="hyper"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df] text-[#5a4424]"}`}><span className="inline-flex items-center justify-center gap-2"><img src="/ui/store-backgrounds/tavaratalotziiply.png" alt="" aria-hidden="true" className="h-[56px] w-[78px] shrink-0 object-contain" loading="eager" /><span>Tavaratalot</span></span></button><div className={storeCompareScope==="within_chain"?"invisible pointer-events-none flex flex-col items-center justify-center gap-1":"flex flex-col items-center justify-center gap-1"}><span title="Yksi kauppa" className="flex h-7 items-center justify-center"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v11h14V10M9 21v-7h6v7M3 10c0 2 3 3 4.5 0 1.5 3 4.5 3 4.5 0 1.5 3 4.5 3 4.5 0"/></svg></span><button type="button" aria-label="Vaihda yhden ja monen kaupan välillä" aria-pressed={betweenMode==="many"} onClick={()=>{if(betweenMode==="many"&&Object.keys(selectedStores).length>1){if(storeCompareScope==="within_chain"){setWithinStoreSlots({S:[null,null],K:[null,null]});setWithinChain(null)}else{setSelectedStores({});setSelectedChain(null)}}setBetweenMode(v=>v==="one"?"many":"one")}} className={`relative mx-auto h-[36px] w-[22px] shrink-0 rounded-full ${betweenMode==="many"?"bg-[#0a6d39]":"bg-[#d8c69d]"}`}><span className={`absolute left-[2px] h-[15px] w-[15px] rounded-full bg-white ${betweenMode==="many"?"top-[19px]":"top-[2px]"}`}/></button><span title="Monta kauppaa" className="flex h-7 items-center justify-center gap-[1px]"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v11h14V10M9 21v-7h6v7M3 10c0 2 3 3 4.5 0 1.5 3 4.5 3 4.5 0 1.5 3 4.5 3 4.5 0"/></svg><svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v11h14V10M9 21v-7h6v7M3 10c0 2 3 3 4.5 0 1.5 3 4.5 3 4.5 0 1.5 3 4.5 3 4.5 0"/></svg><svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v11h14V10M9 21v-7h6v7M3 10c0 2 3 3 4.5 0 1.5 3 4.5 3 4.5 0 1.5 3 4.5 3 4.5 0"/></svg></span></div><button disabled={storeCompareScope==="within_chain"} onClick={()=>{setStoreMode("local");setStoreModeChosen(true);applyModeDefaults("local")}} className={`h-[58px] rounded-[17px] border-2 px-3 text-[clamp(15px,1.1vw,19px)] font-black ${storeModeChosen&&storeMode==="local"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df] text-[#5a4424]"}`}><span className="inline-flex items-center justify-center gap-2"><img src="/ui/store-backgrounds/lahikaupatziiply.png" alt="" aria-hidden="true" className="h-[54px] w-[78px] shrink-0 object-contain" loading="eager" /><span>Lähikaupat</span></span></button></div>
<div className="my-1 text-center text-[14px] font-black uppercase tracking-[.14em] text-[#66543a]">Hakutapa</div><div data-desktop-store-scope className="grid grid-cols-[1fr_46px_1fr] gap-3"><button onClick={()=>{setStoreCompareScope("between_chains");setWithinChain(null)}} className={`h-[52px] rounded-[17px] border-2 px-3 text-[clamp(14px,1vw,18px)] font-black ${storeCompareScope==="between_chains"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df]"}`}>Ketjujen väliltä</button><div aria-hidden /><button onClick={()=>{const active=Object.values(allStoreSelections[storeMode]);const chains=Array.from(new Set(active.map((item:any)=>{const kind=storeKind(item);return kind==="sHyper"||kind==="sLocal"?"S":kind==="kHyper"||kind==="kLocal"?"K":"OTHER"})));const retained=chains.length===1&&(chains[0]==="S"||chains[0]==="K")?chains[0] as "S"|"K":null;setWithinChain(retained);setSelectedChain(retained);setWithinStoreSlots({S:retained==="S"?[active[0]||null,active[1]||null]:[null,null],K:retained==="K"?[active[0]||null,active[1]||null]:[null,null]});setAllStoreSelections({hyper:{},local:{}});setBetweenMode("many");setStoreCompareScope("within_chain");setStoreModeChosen(false)}} className={`h-[52px] rounded-[17px] border-2 px-3 text-[clamp(14px,1vw,18px)] font-black ${storeCompareScope==="within_chain"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df]"}`}>Ketjun sisältä</button></div>
{storeCompareScope==="within_chain" ? <div data-desktop-store-grid className="mt-4 grid grid-cols-2 gap-4">{([0,1] as const).flatMap(slot=>(["S","K"] as const).map(chain=>{const kind=slot===0?(chain==="S"?"sHyper":"kHyper"):(chain==="S"?"sLocal":"kLocal");const pool=byDistance(stores.filter((item:any)=>storeKind(item)===kind));const store=withinStoreSlots[chain][slot]||pool[0]||null;const selected=withinChain===chain;const bg=chain==="S"?(slot===0?"/ui/store-backgrounds/store-bg-prisma-v3.svg?v=20261009-no-building-signs":"/ui/store-backgrounds/store-bg-alepa-v3.svg?v=20261009-no-building-signs"):(slot===0?"/ui/store-backgrounds/store-bg-kcitymarket-v3.svg?v=20261009-no-building-signs":"/ui/store-backgrounds/store-bg-kmarket-v3.svg?v=20261009-no-building-signs");const logo=chain==="S"?"/storelogos/s-group.png":"/storelogos/k-group.png";return <div key={chain+slot} className="relative h-[155px]"><button onClick={()=>{if(slot!==0)return;const next=withinChain===chain?null:chain;setWithinChain(next);setSelectedChain(next);setBetweenMode("many");if(next){const first=withinStoreSlots[chain][0]||byDistance(stores.filter((item:any)=>storeKind(item)===(chain==="S"?"sHyper":"kHyper")))[0]||null;const second=withinStoreSlots[chain][1]||byDistance(stores.filter((item:any)=>storeKind(item)===(chain==="S"?"sLocal":"kLocal")))[0]||null;setWithinStoreSlots(prev=>({...prev,[chain]:[first,second]}))}}} className={`relative block h-full w-full overflow-hidden rounded-[20px] border-[2.5px] text-center shadow-[0_5px_10px_rgba(52,38,14,.08),inset_0_0_0_1px_rgba(255,255,255,.9)] ${selected?"border-[#5c7858] bg-[#edf0d2]":"border-[#d9c18e] bg-[#fffaf0]"}`}><img src={bg} alt="" className="pointer-events-none absolute bottom-0 left-0 h-[112px] w-full object-contain object-bottom opacity-50"/>{slot===0&&<span className="absolute left-2 top-2 z-20 block h-12 w-14 overflow-hidden rounded-lg border border-[#b89552] bg-[#fffef9]/90"><img src={logo} alt={chain} className="absolute left-1/2 top-1/2 block h-10 w-10 max-w-none object-contain" style={{transform:`translate(-50%, -50%) translateY(${chain==="K"?"-1px":"0px"}) scale(${chain==="S"?1.12:1.14})`,transformOrigin:"center center"}}/></span>}{slot===0&&<span className={`absolute right-2 top-2 z-20 grid h-9 w-9 place-items-center rounded-full border font-black ${selected?"border-[#536d4f] bg-[#648060] text-white":"border-[#d0ad68] bg-[#fff8dc] text-transparent"}`}>✓</span>}<span className="absolute left-3 right-3 top-[56px] z-20 block text-[clamp(16px,1.12vw,21px)] leading-tight font-black text-[#171713]">{store?.name||`${chain} ei löytynyt`}</span>{store&&Number.isFinite(distanceKm(store))?<span className="absolute left-3 right-3 bottom-[43px] z-20 block text-[14px] font-black text-[#667064]">{distanceKm(store).toFixed(1)} km</span>:null}<span onClick={(e)=>{e.stopPropagation();setWithinPicker({chain,slot})}} className="absolute bottom-2 left-1/2 z-30 -translate-x-1/2 rounded-full border border-[#d4c18e] bg-white/95 px-5 py-1 text-[15px] font-black">Vaihda</span></button></div>}))}{withinPicker&&<div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1b241b]/35 p-4" onClick={()=>setWithinPicker(null)}><div role="dialog" aria-modal="true" aria-label="Valitse kauppa" className="flex max-h-[75vh] w-[min(460px,95vw)] flex-col overflow-hidden rounded-[23px] border-2 border-[#d7bd78] bg-[#fff8df] p-3 shadow-[0_18px_55px_rgba(45,31,9,.30)]" onClick={e=>e.stopPropagation()}><div className="mb-3 flex items-center justify-between gap-2 px-1"><span className="text-[15px] font-black uppercase tracking-wide text-[#6e5a31]">Valitse kauppa {withinPicker.slot+1}</span><button type="button" onClick={()=>setWithinPicker(null)} aria-label="Sulje kauppavalinta" className="grid h-9 w-9 place-items-center rounded-full border border-[#d7bd78] bg-[#fffdf5] text-[22px] font-black text-[#34445c]">×</button></div><div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">{byDistance(stores.filter((item:any)=>{const k=storeKind(item);return withinPicker.chain==="S"?(k==="sHyper"||k==="sLocal"):(k==="kHyper"||k==="kLocal")})).map((store:any)=>{const isCurrent=String(withinStoreSlots[withinPicker.chain][withinPicker.slot]?.id)===String(store.id);return <button key={String(store.id)} type="button" className={`flex w-full items-center justify-between gap-3 rounded-[15px] border px-3 py-3 text-left shadow-sm ${isCurrent?"border-[#0b6f35] bg-[#0a6d39] text-white":"border-[#ead9aa] bg-[#fffdf6] text-[#24324a] hover:bg-[#f5edcf]"}`} onClick={()=>{const chain=withinPicker.chain;const slot=withinPicker.slot;setWithinStoreSlots(prev=>{const next=[...prev[chain]];next[slot]=store;if(String(next[1-slot]?.id)===String(store.id))next[1-slot]=null;return {...prev,[chain]:next}});setWithinPicker(null)}}><span className="min-w-0 flex-1 text-[15px] font-black leading-tight">{store.name}</span><span className={`shrink-0 rounded-full px-2 py-1 text-[12px] font-bold ${isCurrent?"bg-white/20 text-white":"bg-[#fff4cf] text-[#78684a]"}`}>{isCurrent?"Valittu":Number.isFinite(distanceKm(store))?`${distanceKm(store).toFixed(1)} km`:""}</span></button>})}</div></div></div>}</div> : <div data-desktop-store-grid className="mt-4 grid grid-cols-2 gap-4">{["S","K","LIDL","SPAR"].map(chain=>{const pool=chain==="LIDL"?lidlStores:chain==="SPAR"?sparStores:stores;const matches=byDistance(pool.filter((s:any)=>{const k=storeKind(s);return chain==="S"?(k==="sHyper"||k==="sLocal"):chain==="K"?(k==="kHyper"||k==="kLocal"):chain==="LIDL"?k==="lidl":k==="spar"}));const candidate=matches.find((s:any)=>{const k=storeKind(s);return chain==="S"?k===(storeMode==="hyper"?"sHyper":"sLocal"):chain==="K"?k===(storeMode==="hyper"?"kHyper":"kLocal"):chain==="LIDL"?k==="lidl":k==="spar"});const manuallySelected=Object.values(selectedStores).find((s:any)=>{const k=storeKind(s);return chain==="S"?k===(storeMode==="hyper"?"sHyper":"sLocal"):chain==="K"?k===(storeMode==="hyper"?"kHyper":"kLocal"):chain==="LIDL"?k==="lidl":k==="spar"});const store=manuallySelected||candidate||null;const selected=Boolean(store) && Object.values(selectedStores).some((entry:any)=>String(entry?.id)===String(store.id));const bg=chain==="S"?(storeMode==="hyper"?"/ui/store-backgrounds/store-bg-prisma-v3.svg?v=20261009-no-building-signs":"/ui/store-backgrounds/store-bg-alepa-v3.svg?v=20261009-no-building-signs"):chain==="K"?(storeMode==="hyper"?"/ui/store-backgrounds/store-bg-kcitymarket-v3.svg?v=20261009-no-building-signs":"/ui/store-backgrounds/store-bg-kmarket-v3.svg?v=20261009-no-building-signs"):chain==="LIDL"?"/ui/store-backgrounds/store-bg-lidl-v3.svg?v=20261009-no-building-signs":"/ui/store-backgrounds/store-bg-spar-v3.svg";const logo=chain==="S"?"/storelogos/s-group.png":chain==="K"?"/storelogos/k-group.png":chain==="LIDL"?"/storelogos/lidl.png":"/storelogos/spar.png";return <div key={chain} className="relative h-[155px]"><button onClick={()=>{if(!store)return;setSelectedChain(chain as "S"|"K"|"LIDL"|"SPAR");setSelectedStores(prev=>{const key=String(store.id);if(betweenMode==="one")return {[key]:store};const next={...prev};if(next[key])delete next[key];else next[key]=store;return next})}} className={`relative block h-full w-full overflow-hidden rounded-[20px] border-[2.5px] text-center shadow-[0_5px_10px_rgba(52,38,14,.08),inset_0_0_0_1px_rgba(255,255,255,.9)] ${selected?"border-[#5c7858] bg-[#edf0d2]":"border-[#d9c18e] bg-[#fffaf0]"}`}><img src={bg} alt="" className="pointer-events-none absolute bottom-0 left-0 h-[112px] w-full object-contain object-bottom opacity-50"/><span className="absolute left-2 top-2 z-20 block h-12 w-14 overflow-hidden rounded-lg border border-[#b89552] bg-[#fffef9]/90">{chain==="SPAR"?<img src={logo} alt={chain} className="absolute block h-[44px] w-[44px] max-w-none object-contain" style={{left:"2.25px",top:"-1px"}}/>:<img src={logo} alt={chain} className="absolute left-1/2 top-1/2 block h-10 w-10 max-w-none object-contain" style={{transform:`translate(-50%, -50%) translate(${chain==="LIDL"?"-1px":"0px"}, ${chain==="LIDL"?"-2px":chain==="K"?"-1px":"0px"}) scale(${chain==="S"?1.12:chain==="K"?1.14:1.1})`,transformOrigin:"center center"}}/>}</span><span className={`absolute right-2 top-2 z-20 grid h-9 w-9 place-items-center rounded-full border font-black ${selected?"border-[#536d4f] bg-[#648060] text-white":"border-[#d0ad68] bg-[#fff8dc] text-transparent"}`}>✓</span><span className="absolute left-3 right-3 top-[56px] z-20 block text-[clamp(16px,1.12vw,21px)] leading-tight font-black text-[#171713]">{store?.name||`${chain} ei löytynyt`}</span>{store&&Number.isFinite(distanceKm(store))?<span className="absolute left-3 right-3 bottom-[43px] z-20 block text-[14px] font-black text-[#667064]">{distanceKm(store).toFixed(1)} km</span>:null}<span onClick={(e)=>{e.stopPropagation();const grid=e.currentTarget.closest("[data-desktop-store-grid]");if(grid){const rect=grid.getBoundingClientRect();const panel=e.currentTarget.closest("[data-desktop-store-panel]");const panelBottom=panel?.getBoundingClientRect().bottom??rect.bottom;setPickerPlacement({left:rect.left+rect.width/2,top:(panel?.querySelector("[data-desktop-store-scope]")?.getBoundingClientRect().top??rect.top),bottom:Math.max(0,window.innerHeight-panelBottom),width:Math.min(360,rect.width-24)})}setPickerChain(pickerChain===chain?null:chain as any)}} className="absolute bottom-2 left-1/2 z-30 -translate-x-1/2 rounded-full border border-[#d4c18e] bg-white/95 px-5 py-1 text-[15px] font-black">{selected?"Valittu":"Vaihda"}</span></button>{pickerChain===chain&&<div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1b241b]/35 p-4" onClick={(e)=>{e.stopPropagation();setPickerChain(null)}}>
  <div role="dialog" aria-modal="true" aria-label="Valitse kauppa" onClick={(e)=>e.stopPropagation()} style={{position:"fixed",left:pickerPlacement.left,top:pickerPlacement.top,bottom:pickerPlacement.bottom,width:pickerPlacement.width,transform:"translateX(-50%)"}} className="flex flex-col overflow-hidden rounded-[23px] border-2 border-[#d7bd78] bg-[#fff8df] p-3 shadow-[0_18px_55px_rgba(45,31,9,.30)]">
    <div className="mb-3 flex items-center justify-between gap-2 px-1">
      <span className="text-[15px] font-black uppercase tracking-wide text-[#6e5a31]">Valitse kauppa</span>
      <button type="button" onClick={()=>setPickerChain(null)} aria-label="Sulje kauppavalinta" className="grid h-9 w-9 place-items-center rounded-full border border-[#d7bd78] bg-[#fffdf5] text-[22px] font-black text-[#34445c]">×</button>
    </div>
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
      {byDistance((chain==="LIDL"?lidlStores:chain==="SPAR"?sparStores:stores).filter((s:any)=>{const k=storeKind(s);return chain==="S"?k===(storeMode==="hyper"?"sHyper":"sLocal"):chain==="K"?k===(storeMode==="hyper"?"kHyper":"kLocal"):chain==="LIDL"?k==="lidl":k==="spar"})).map((s:any)=>{
        const isCurrent=String(store?.id)===String(s.id);
        const distance=distanceKm(s);
        return <button key={String(s.id)} type="button" onClick={()=>{setSelectedChain(chain as "S"|"K"|"LIDL"|"SPAR");setSelectedStores(prev=>{const next:any={};for(const [id,x] of Object.entries(prev)){const k=storeKind(x);if(chain==="S"?(k!=="sHyper"&&k!=="sLocal"):chain==="K"?(k!=="kHyper"&&k!=="kLocal"):chain==="LIDL"?k!=="lidl":k!=="spar")next[id]=x}next[String(s.id)]=s;return next});setPickerChain(null)}} className={`flex w-full items-center justify-between gap-3 rounded-[15px] border px-3 py-3 text-left shadow-sm ${isCurrent?"border-[#0b6f35] bg-[#0a6d39] text-white":"border-[#ead9aa] bg-[#fffdf6] text-[#24324a] hover:bg-[#f5edcf]"}`}>
          <span className="min-w-0 flex-1 text-[15px] font-black leading-tight">{s.name}</span>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[12px] font-bold ${isCurrent?"bg-white/20 text-white":"bg-[#fff4cf] text-[#78684a]"}`}>{isCurrent?"Valittu":Number.isFinite(distance)?`${distance.toFixed(1)} km`:""}</span>
        </button>
      })}
    </div>
  </div>
</div>}</div>})}</div>}
                      </div>}
          </div>

          <nav aria-label="Ostokset ja vertailu" className={fuelSelected ? "relative z-20 flex h-full min-h-0 flex-col items-stretch justify-center gap-4 pb-0 pt-1" : "relative z-20 flex h-full min-h-0 flex-col items-stretch justify-between gap-4 pb-0 pt-1"}>
            {!fuelSelected && <>
            <button type="button" onClick={()=>setNotebookOpen(true)} className="relative flex h-[clamp(112px,16vh,154px)] min-h-0 flex-col items-center justify-center gap-1 rounded-[25px] border-[3px] border-[#8d663f] bg-gradient-to-b from-[#fff2c8] to-[#d8b77b] p-2 text-[#51391f] shadow-[0_8px_0_#987c50,0_16px_26px_#5e4c2929] transition "><span className="shrink-0 text-[48px] leading-none drop-shadow-md">📜</span><span className="shrink-0 text-[14px] font-black leading-tight">Ostelusvihko</span>{savedLists.length>0&&<span className="absolute right-2 top-2 rounded-full bg-[#79552d] px-2 py-1 text-[11px] font-black text-white">{savedLists.length}</span>}</button>
            <button type="button" onClick={()=>setCartOpen(true)} className="group relative flex h-[clamp(90px,12dvh,125px)] min-h-0 flex-col items-center justify-center rounded-[25px] border-[3px] border-[#4b815e] bg-gradient-to-b from-[#f0ffe4] to-[#b9ddb2] p-2 text-[#174c35] shadow-[0_8px_0_#6d9270,0_16px_26px_#254d3529] transition "><svg aria-hidden="true" viewBox="0 0 96 80" className="h-[65px] w-[83px] drop-shadow-[1px_3px_2px_#36563b55]" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M24 31C27 9 69 9 72 31" stroke="#86532e" strokeWidth="6"/><path d="M24 31C27 9 69 9 72 31" stroke="#d6a66a" strokeWidth="2.5"/><path d="M12 33h72l-9 36c-1 4-5 6-10 6H31c-5 0-9-2-10-6L12 33Z" fill="#bb8650" stroke="#704829" strokeWidth="3"/><path d="M17 39h62M20 50h56M23 61h50" stroke="#e4bb7d" strokeWidth="4"/><path d="m22 34 10 38m1-38 7 39m8-39v40m8-40-7 39m18-39-10 38m17-38-10 36" stroke="#7b522e" strokeWidth="3"/><path d="M12 33h72" stroke="#684329" strokeWidth="6"/><path d="M16 34h64" stroke="#e4b77d" strokeWidth="2"/></svg><span className="text-[14px] font-black">Kori</span>{desktopCartCount>0&&<span className="absolute right-2 top-2 rounded-full bg-[#147a49] px-2 py-1 text-[11px] font-black text-white">{desktopCartCount}</span>}</button>
            <button type="button" onClick={()=>{const eligible=Object.values(selectedStores).filter(x=>["sHyper","sLocal","kHyper","kLocal","lidl","spar"].includes(storeKind(x)));if((storeCompareScope==="within_chain"&&(!withinChain||eligible.length!==2))||(storeCompareScope!=="within_chain"&&betweenMode==="one"&&eligible.length!==1)||(storeCompareScope!=="within_chain"&&betweenMode==="many"&&eligible.length<2)){setDesktopCompareStoreWarning(true);window.setTimeout(()=>setDesktopCompareStoreWarning(false),2800);return}setDesktopCompareStoreWarning(false);if(betweenMode!=="one")setWorkspace(null);void openDesktopComparison();}} title="Avaa hintavertailu" className="flex h-[clamp(90px,12dvh,125px)] min-h-0 flex-col items-center justify-center rounded-[25px] border-[3px] border-[#c39b50] bg-gradient-to-b from-[#fff8df] to-[#eed49c] p-2 text-[#59411f] shadow-[0_8px_0_#b49a68,0_16px_26px_#5e4c2929] transition "><svg aria-hidden="true" viewBox="0 0 104 88" className="h-[68px] w-[83px] drop-shadow-[1px_3px_2px_#70533b55]" fill="none" strokeLinejoin="round" strokeLinecap="round"><path d="M31 14Q52 3 73 14L81 49Q52 60 23 49Z" fill="#32617a" stroke="#233e4b" strokeWidth="4"/><path d="M31 16Q52 7 73 16L75 35Q52 41 29 35Z" fill="#eee0b8" stroke="#9c7d5b" strokeWidth="2"/><path d="M34 29Q52 19 70 29" stroke="#8b7355" strokeWidth="1.5"/><path d="M52 35 65 24" stroke="#b34836" strokeWidth="2.5"/><circle cx="52" cy="35" r="2.5" fill="#b34836"/><path d="M30 17h4m35 0h4M25 45l5 2m44 0 5-2" stroke="#b96e49" strokeWidth="3"/><path d="M12 60h80l-6 13H18Z" fill="#32536a" stroke="#253e4a" strokeWidth="3"/><path d="M4 51h31l-4 11H8Z" fill="#b7aaa0" stroke="#655c55" strokeWidth="2"/><path d="M69 51h31l-4 11H73Z" fill="#b7aaa0" stroke="#655c55" strokeWidth="2"/><path d="M12 49h16m48 0h16" stroke="#6d6056" strokeWidth="3"/><path d="M23 73v5m58-5v5" stroke="#3b3633" strokeWidth="5"/><path d="M33 13Q52 6 71 13" stroke="#c76f56" strokeWidth="2" strokeDasharray="4 5"/></svg><span className="text-[13px] font-black">Vertailu</span></button>
            </>}

          {desktopCompareStoreWarning&&!fuelSelected&&<div role="alert" className="absolute bottom-[clamp(90px,12dvh,125px)] left-1/2 z-[80] w-[min(360px,28vw)] -translate-x-1/2 rounded-[18px] border-[3px] border-[#b58a46] bg-[#fff4cf] px-4 py-3 text-center text-[clamp(13px,1.1vw,17px)] font-black leading-snug text-[#174c35] shadow-[0_12px_30px_#44321c55]">{storeCompareScope==="within_chain"?"Valitse S- tai K-ryhmä ja sen kaksi kauppaa ennen vertailua.":betweenMode==="one"?"Valitse yksi kauppa hintojen hakua varten.":"Valitse vähintään kaksi kauppaa ennen vertailua."}<button type="button" onClick={()=>setDesktopCompareStoreWarning(false)} aria-label="Sulje ilmoitus" className="absolute right-1 top-0 px-2 text-lg">×</button></div>}</nav>
          <div className="relative h-full min-h-0 overflow-hidden rounded-[42px] border border-[#756443]/15 bg-[#f8f5ed]/92 p-3 shadow-[0_34px_90px_rgba(34,54,43,0.22)] ring-1 ring-[#fffaf0]/95 xl:p-4">
            <DesktopAssistantCards
              active={active}
              onlyGosta={fuelSelected}
              fuelMode={fuelSelected}
              onReportFuel={()=>{setFuelCompared(false);setFuelReportOpen(true);}}
              hasSelectedStores={fuelSelected ? fuelGroups.length>0 : Object.values(selectedStores).some(Boolean)}
              chooseStoresNoticeFor={chooseStoresNoticeFor}
              onSelect={(key) => {
                if(fuelSelected){if(key==="gosta"){setFuelCompared(true);setActive("gosta");}return;}
                if((key==="gosta" || key==="justiina") && !Object.values(selectedStores).some(Boolean)){
                  setChooseStoresNoticeFor(key);
                  setGostaChainPicker(false);
                  setWorkspace(null);
                  return;
                }
                setChooseStoresNoticeFor(null);
                setActive(key);
                if(key==="gosta"){setWorkspace(null);setGostaChainPicker(true)}
                else{setGostaChainPicker(false);setWorkspace(key)}
              }}
            />

            {electricityOpen && <div role="dialog" aria-modal="true" aria-label="Göstan sähkövertailu" className={`${GOSTA_DESKTOP_OVERLAY_SHELL} z-[70]`}>
              <div className="relative flex min-h-[70px] shrink-0 items-center justify-center rounded-[20px] border-2 border-[#caa15d] bg-[#f7e7bd] px-[220px] py-3">                <div className="absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-2 rounded-xl border border-[#caa15d] bg-[#fff4cf] px-3 py-2"><span className="font-serif text-[16px] font-black italic text-[#174c35]">Hinta nyt</span><span className="text-[25px] font-black text-[#174c35]">{electricity.value}</span><span className="text-xs font-black text-[#174c35]">snt/kWh</span></div>
                <h2 className="font-serif text-[22px] font-black italic text-[#174c35]">Göstan sähkövertailu</h2>
                <button type="button" onClick={()=>setElectricityOpen(false)} aria-label="Sulje sähkövertailu" className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border-[3px] border-[#5a321b] bg-[#9a612d] text-[23px] font-black text-[#fff0c8]">×</button>
              </div>
              <div className="relative mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-[22px] border-2 border-[#b58a46] bg-[#fff4cf] p-4">
                <section className="min-h-0 shrink-0 rounded-[18px] border-2 border-[#caa15d] bg-[#fff9e7] px-4 py-3">
                  <h3 className="font-serif text-[22px] font-black italic text-[#174c35]">⚡ Pörssisähkön hinta seuraavan 24 h aikana</h3>                  {(()=> {
                    const now=Date.now();
                    const available=electricityPrices.filter(p=>p.end>now&&p.start<now+24*60*60*1000).slice(0,96);
                    if(!available.length)return <p className="mt-8 text-sm text-[#6d604c]">Ajantasaisia hintatietoja ei ole saatavilla. Esimerkkihintoja ei esitetä oikeina.</p>;
                    const min=Math.min(0,...available.map(p=>p.price));
                    const max=Math.max(10.5,...available.map(p=>p.price));
                    const range=Math.max(1,max-min);
                    const y=(value:number)=>(value-min)/range*100;
                    return <div className="mt-2">
                      <div className="relative h-[115px] border-b-2 border-[#b58a46]">
                        <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed border-[#98734c]/70" style={{bottom:y(10)+"%"}}><span className="absolute -top-5 left-1 bg-[#fff9e7] px-1 text-[11px] font-black text-[#875e37]">10 snt/kWh</span></div>
                        {min<0&&<div className="pointer-events-none absolute inset-x-0 z-10 border-t border-[#875e37]/70" style={{bottom:y(0)+"%"}}><span className="absolute -top-4 right-1 bg-[#fff9e7] px-1 text-[10px] text-[#875e37]">0</span></div>}
                        <div className="absolute inset-0 flex gap-[2px]" role="img" aria-label="Seuraavan 24 tunnin pörssisähkön hinnat. Pylväät skaalautuvat automaattisesti.">
                          {available.map((p,i)=>{
                            const top=Math.max(y(p.price),y(0));
                            const bottom=Math.min(y(p.price),y(0));
                            const height=Math.max(1,top-bottom);
                            return <div key={p.start+"-"+i} className="relative min-w-0 flex-1" title={new Date(p.start).toLocaleString("fi-FI",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})+" – "+p.price.toFixed(2).replace(".",",")+" snt/kWh"}>
                              <div className={`absolute inset-x-0 rounded-t-[3px] ${p.start<=now&&now<p.end?"bg-[#b4472c]":p.price<0?"bg-[#4a8eb4]":p.price<5?"bg-[#75a744]":p.price<10?"bg-[#d9a52c]":"bg-[#b85b35]"}`} style={{bottom:bottom+"%",height:height+"%"}} />
                            </div>;
                          })}
                        </div>
                      </div>
                      <div className="relative mt-2 h-5 text-[11px] font-bold text-[#6d604c]" aria-label="Kellonajat neljän tunnin välein">
                        {Array.from({length:7},(_,i)=>{
                          const start=available[0].start;
                          const end=available[available.length-1].end;
                          const time=start+i*4*60*60*1000;
                          if(time>end)return null;
                          const position=Math.max(0,Math.min(100,(time-start)/(end-start)*100));
                          return <span key={time} className="absolute top-0 -translate-x-1/2 whitespace-nowrap" style={{left:`calc(${position}% + ${(0.5-position/100)*100/available.length}%)`}}>{new Date(time).toLocaleTimeString("fi-FI",{hour:"2-digit",minute:"2-digit"})}</span>;
                        })}
                      </div>
                      <div className="mt-1 flex justify-between gap-2 text-[11px] font-bold text-[#6d604c]"><span>{new Date(available[0].start).toLocaleString("fi-FI",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})}</span><span>Ziiplyn sähkörajapinta · snt/kWh</span><span>{new Date(available[available.length-1].end).toLocaleString("fi-FI",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})}</span></div>
                    </div>;
                  })()}
                </section>
                <section className="group min-h-[130px] flex-1 rounded-[18px] border-2 border-[#caa15d] bg-[#fff9e7] p-5 transition-[box-shadow] duration-150 hover:absolute hover:inset-4 hover:z-30 hover:flex hover:flex-col hover:shadow-[0_16px_45px_rgba(40,47,32,.25)] focus-within:absolute focus-within:inset-4 focus-within:z-30 focus-within:flex focus-within:flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-serif text-xl font-black italic text-[#174c35]">Sähkötarjoukset</h3>
                    <span className="text-[11px] font-bold text-[#6d604c]">Hintapoiminta 11.10.2026 · tarkista myyjältä</span>
                  </div>
                  <p className="mt-1 text-xs text-[#6d604c]">Sähköenergian myyntisopimukset. Siirto ja sähkövero eivät sisälly. Tarjoukset voivat muuttua.</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Rajaa sähkösopimuksia">
                    {([{id:"all",label:"Kaikki"},{id:"Pörssi",label:"Spot – varttihinta"},{id:"Kuukausikeskiarvo",label:"Spot – kk-keskihinta"},{id:"Kiinteä",label:"Kiinteähintainen"},{id:"Kulutusvaikutus",label:"Kulutusvaikutus"},{id:"Kampanja",label:"Kampanjatarjoukset"}] as const).map(option=>{
                      const selected=option.id==="all"?electricityOfferTypes.length===0:electricityOfferTypes.includes(option.id);
                      return <button key={option.id} type="button" aria-pressed={selected} onClick={() => setElectricityOfferTypes(current=>option.id==="all"?[]:current.includes(option.id)?current.filter(v=>v!==option.id):[...current,option.id])} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black transition ${selected?"border-[#174c35] bg-[#174c35] text-[#fff9e7]":"border-[#caa15d] bg-[#fff9e7] text-[#174c35] hover:bg-[#f1eed4]"}`}><span aria-hidden="true" className={`grid h-3.5 w-3.5 place-items-center rounded-full border ${selected?"border-[#fff9e7]":"border-[#a68c5e]"}`}>{selected?"✓":""}</span>{option.label}</button>;
                    })}
                  </div>
                  <div className="mt-3 grid max-h-[245px] grid-cols-1 gap-2 overflow-y-auto overscroll-contain pr-1 group-hover:min-h-0 group-hover:flex-1 group-hover:max-h-none group-focus-within:min-h-0 group-focus-within:flex-1 group-focus-within:max-h-none xl:grid-cols-2">
                    {([
                      {seller:"Helen",name:"Perussähkö 24 kk",type:"Kiinteä",price:"10,45 snt/kWh",fee:"1,79 €/kk tarjous (norm. 5,99 €)",detail:"24 kk · tarjousperusmaksun kesto tarkistettava",url:"https://www.helen.fi/sahko/sahkosopimus/sahkotarjous"},
                      {seller:"Helen",name:"Välkkysähkö 24 kk",type:"Kulutusvaikutus",price:"9,98 snt/kWh ± vaikutus",fee:"1,79 €/kk tarjous (norm. 5,99 €)",detail:"24 kk · lopullinen hinta riippuu kulutuksesta",url:"https://www.helen.fi/sahko/sahkosopimus/sahkotarjous"},
                      {seller:"Helen",name:"Pörssisähkö",type:"Pörssi",price:"Spot + 0,49 snt/kWh",fee:"0 €/kk ensimmäiset 6 kk (norm. 4,96 €)",detail:"Toistaiseksi voimassa",url:"https://www.helen.fi/sahko/sahkosopimus/sahkotarjous"},
                      {seller:"Oomi",name:"Aktiivinen",type:"Pörssi",price:"Spot + 0,60 snt/kWh",fee:"0 €/kk ensimmäiset 5 kk, sitten 4,96 €",detail:"Toistaiseksi voimassa",url:"https://oomi.fi/sahko/sahkosopimukset/"},
                      {seller:"Oomi",name:"Jousto 24 kk",type:"Kulutusvaikutus",price:"9,09 snt/kWh ± vaikutus",fee:"0 €/kk ensimmäiset 5 kk, sitten 5,90 €",detail:"24 kk · kulutusvaikutus muuttaa hintaa",url:"https://oomi.fi/sahko/sahkosopimukset/"},
                      {seller:"Oomi",name:"Kiinteä 12 kk",type:"Kiinteä",price:"11,19 snt/kWh",fee:"5,90 €/kk",detail:"12 kk · lähdesivun poiminta",url:"https://oomi.fi/sahko/sahkosopimukset/"},
                      {seller:"Fortum",name:"Tarkka",type:"Pörssi",price:"Spot + 0,59 snt/kWh",fee:"5,99 €/kk",detail:"Toistaiseksi voimassa · myyjän verkkosivu",url:"https://www.fortum.com/fi/sahkoa/sahkoa-kotiin"},
                      {seller:"Fortum",name:"Duo 12 kk",type:"Kulutusvaikutus",price:"10,99 snt/kWh ± vaikutus",fee:"5,99 €/kk",detail:"12 kk · myyjän verkkosivu",url:"https://www.fortum.com/fi/sahkoa/sahkoa-kotiin/duo-sahkosopimus"},
                      {seller:"Fortum",name:"Duo 24 kk",type:"Kulutusvaikutus",price:"9,69 snt/kWh ± vaikutus",fee:"5,99 €/kk",detail:"24 kk · myyjän verkkosivu",url:"https://www.fortum.com/fi/sahkoa/sahkoa-kotiin/duo-sahkosopimus"},
                      {seller:"Vattenfall",name:"Optimi Pörssisähkö",type:"Pörssi",price:"Spot + 0,50 snt/kWh",fee:"5,95 €/kk",detail:"Toistaiseksi voimassa · myyjän verkkosivu",url:"https://www.vattenfall.fi/sahkosopimukset/porssisahko/"},
                      {seller:"Vattenfall",name:"Helppo Pörssisähkö",type:"Pörssi",price:"Spot + 0 snt/kWh (350 kWh/kk asti)",fee:"Tarkista myyjältä",detail:"Yli 350 kWh/kk: ylimenevältä osalta marginaali 0,50 snt/kWh",url:"https://www.vattenfall.fi/sahkosopimukset/porssisahko/"}
                    ] as const).filter(offer=>electricityOfferTypes.length===0||electricityOfferTypes.some(type=>type==="Kampanja"?offer.fee.includes("tarjous")||offer.fee.includes("ensimmäiset"):type==="Kuukausikeskiarvo"?false:offer.type===type)).map(offer=><a key={offer.seller+offer.name} href={offer.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-[#caa15d] bg-[#fffdf1] p-3 text-[#174c35] transition hover:border-[#17573c] hover:bg-[#f1eed4]">
                      <div className="flex items-center justify-between gap-2"><strong className="text-sm">{offer.seller} · {offer.name}</strong><span className="shrink-0 text-[10px] font-bold">{offer.type} ↗</span></div>
                      <div className="mt-1 text-lg font-black">{offer.price}</div>
                      <div className="text-xs font-bold">Perusmaksu: {offer.fee}</div>
                      <div className="mt-1 text-[11px] text-[#6d604c]">{offer.detail}</div>
                      <div className="mt-1 text-[11px] font-bold underline">Alkuperäinen tarjous ja ehdot ↗</div>
                    </a>)}
                  </div>
                </section>
              </div>
            </div>}
            {fuelSelected && fuelReportOpen && <DesktopFuelPhotoReport onClose={()=>setFuelReportOpen(false)}/>}
            {fuelSelected && fuelCompared && !fuelReportOpen && <div className={`${GOSTA_DESKTOP_OVERLAY_SHELL} z-[60]`}>
              <div className="relative grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[20px] border-2 border-[#caa15d] bg-[#f7e7bd] py-2 pl-2 pr-12">
                <button type="button" aria-pressed={fuelSort==="diesel"} onClick={()=>setFuelSort(current=>current==="diesel"?"distance":"diesel")} className={`flex min-w-0 items-center justify-center gap-2 rounded-[15px] border-2 px-2 py-2 text-[11px] font-black leading-tight shadow-[0_3px_0_rgba(34,54,43,.15)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#174c35] ${fuelSort==="diesel"?"border-[#174f78] bg-[#246b96] text-white":"border-[#83a8bb] bg-gradient-to-b from-[#f5fcff] to-[#dcecf3] text-[#174f78]"}`}><span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/25 text-[10px]">DI</span><span>Näytä halvin diesel</span></button>
                <span className="text-center font-serif text-[18px] font-black italic leading-tight text-[#174c35]">Göstan<br/>polttoainevertailu</span>
                <button type="button" aria-pressed={fuelSort==="price95"} onClick={()=>setFuelSort(current=>current==="price95"?"distance":"price95")} className={`flex min-w-0 items-center justify-center gap-2 rounded-[15px] border-2 px-2 py-2 text-[11px] font-black leading-tight shadow-[0_3px_0_rgba(34,54,43,.15)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#174c35] ${fuelSort==="price95"?"border-[#a34e17] bg-[#c66b25] text-white":"border-[#d5a066] bg-gradient-to-b from-[#fffaf0] to-[#f5dfba] text-[#8b461d]"}`}><span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/25 text-[10px]">95</span><span>Näytä halvin bensa</span></button>
                <button type="button" onClick={()=>setFuelCompared(false)} aria-label="Sulje polttoainevertailu" className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border-[3px] border-[#5a321b] bg-[#9a612d] text-[23px] font-black text-[#fff0c8]">×</button>
              </div>
              <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border-2 border-[#b58a46] bg-[#fff4cf] p-3">
                <div className="mb-3 shrink-0 text-center text-[13px] font-bold text-[#6d604c]">{fuelStationSide==="traffic"?"Liikenneasemat":fuelStationSide==="cold"?"Kylmäasemat / muut":"Kaikki asematyypit"} · {fuelScope==="within"?"Ketjun sisältä":"Ketjujen väliltä"} · Hinnat €/l · {fuelSort==="distance"?"Lähimmästä kaukaisimpaan":fuelSort==="diesel"?"Halvin diesel ensin · tasahinnalla lähin":"Halvin bensa 95 ensin · tasahinnalla lähin"}</div>
                {(()=>{
                  const groups=(["Neste","ABC","Muut","St1","SEO"] as const).filter(group=>group==="Muut"?["Gulf","Ritoil","Muut"].some(g=>fuelGroups.includes(g)):fuelGroups.includes(group));
                  const compareStations=(a:any,b:any)=>{
                    const distance=(station:any)=>Number.isFinite(Number(station.distanceKm))?Number(station.distanceKm):Infinity;
                    if(fuelSort!=="distance"){
                      const sortPrice=(station:any)=>station[fuelSort]!=null && Number.isFinite(Number(station[fuelSort])) && Number(station[fuelSort])>0?Number(station[fuelSort]):Infinity;
                      const aPrice=sortPrice(a),bPrice=sortPrice(b);
                      if(aPrice!==bPrice)return aPrice<bPrice?-1:1;
                    }
                    const aDistance=distance(a),bDistance=distance(b);
                    return aDistance===bDistance?0:aDistance<bDistance?-1:1;
                  };
                  const price=(value:unknown)=>value!=null && Number.isFinite(Number(value)) && Number(value)>0 ? Number(value).toFixed(3).replace(".",",") : "–";
                  const observed=(value:unknown)=>{
                    if(!value || !Number.isFinite(Date.parse(String(value))))return "–";
                    const date=new Date(String(value));
                    const time=date.toLocaleTimeString("fi-FI",{timeZone:"Europe/Helsinki",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
                    if(time==="00.00.00" || time==="00:00:00")return "Lähteen päiväys "+date.toLocaleDateString("fi-FI",{timeZone:"Europe/Helsinki",day:"numeric",month:"numeric"});
                    return date.toLocaleString("fi-FI",{timeZone:"Europe/Helsinki",day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"});
                  };
                  return groups.length===0?<p className="py-8 text-center font-bold">Valitse ensin vähintään yksi ketju.</p>:<div className="grid min-h-0 flex-1 gap-x-4 gap-y-5 pt-2" style={{gridTemplateColumns:groups.length===1?"minmax(0,1fr)":"repeat(4,minmax(0,1fr))",gridTemplateRows:groups.length===5?"repeat(3,minmax(0,1fr))":groups.length>=3?"repeat(2,minmax(0,1fr))":"minmax(0,1fr)"}}>
                    {groups.map((group,groupIndex)=>{
                      const candidates=fuelVisible.filter((station:any)=>group==="Muut"?["Gulf","Ritoil","Muut"].includes(fuelGroupOf(station)):fuelGroupOf(station)===group).filter((station:any)=>[station.diesel,station.price95,station.price98].some(value=>value!=null && Number.isFinite(Number(value)) && Number(value)>0)).sort(compareStations);
                      return <section key={group} aria-label={group==="Muut"?"Gulf / Ritoil / muut":group} className="relative flex min-h-0 min-w-0 flex-col rounded-[22px] border-[3px] border-[#17573c] bg-[#fff9dd] shadow-[0_4px_0_rgba(72,73,48,.12)]" style={groups.length===5?{gridColumn:groupIndex===2?"2 / span 2":groupIndex===1||groupIndex===4?"3 / span 2":"1 / span 2",gridRow:groupIndex<2?1:groupIndex===2?2:3}:groups.length===1?{width:"min(100%,380px)",justifySelf:"center"}:{gridColumn:groups.length===3&&groupIndex===2?"2 / span 2":"span 2"}}>
                        <div className="absolute -top-3 left-4 z-10 flex h-6 items-center gap-2 rounded-lg bg-[#fff9dd] px-2">
                          {group==="Muut"?<div className="flex h-6 shrink-0 items-center gap-1"><img src="https://commons.wikimedia.org/wiki/Special:FilePath/Gulf_Oil_logo.svg" alt="Gulf" className="h-full w-6 object-contain"/><img src="https://commons.wikimedia.org/wiki/Special:FilePath/RITOIL_Logo.svg" alt="Ritoil" className="h-full w-7 object-contain"/></div>:<div className="h-6 w-12 shrink-0"><FuelBrandLogo brand={group}/></div>}
                          <h2 className="min-w-0 text-center text-[12px] font-black text-[#174c35]">{group==="Muut"?"Gulf / Ritoil / muut":group}</h2>
                        </div>
                        <div key={`${group}-${fuelSort}`} className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[18px] px-2 pb-2 pt-4" tabIndex={0} aria-label={`Selaa ketjun ${group} asemia`}>
                          {candidates.length===0?<p className="py-5 text-center text-sm font-bold text-[#6d604c]">Ei hintahavaintoja valituista asemista.</p>:candidates.map((station:any)=><article key={station.id} className="mb-1 grid grid-cols-[minmax(0,.65fr)_minmax(0,1.35fr)] items-center gap-1 rounded-lg border border-[#dcc99a] bg-white/90 px-2 py-1.5 last:mb-0">
                            <div className="min-w-0">
                              <div className="break-words text-[12px] font-black leading-[1.1] text-[#174c35]">{station.name}</div>
                              <div className="mt-0.5 text-[9px] font-semibold leading-[1.1] text-[#6d604c]">{Number(station.distanceKm).toFixed(1).replace(".",",")} km · {fuelIsTraffic(station)?"Liikenneasema":"Kylmä / muu"}</div>
                            </div>
                            <div className="grid min-w-0 grid-cols-3 gap-0.5 text-center">
                              {([["DI","diesel","observedDiesel"],["95","price95","observed95"],["98","price98","observed98"]] as const).map(([label,key,dateKey])=><div key={key} className="min-w-0 rounded bg-[#fff4cf] px-0.5 py-1"><div className="text-left text-[8px] font-bold leading-none text-[#6d604c]">{label}</div><strong className="mt-0.5 block whitespace-nowrap text-[17px] font-black leading-none tabular-nums text-[#174c35]">{price(station[key])}</strong><div className="mt-1 whitespace-nowrap text-[8px] leading-none text-[#6d604c]">{price(station[key])==="–"?"–":observed(station[dateKey]).replace(/klo\s*/,"")}</div></div>)}
                            </div>
                          </article>)}
                        </div>
                      </section>;
                    })}
                  </div>;
                })()}
              </div>
            </div>}
            {gostaChainPicker && <div className="fixed bottom-[28px] left-0 right-0 top-[var(--desktop-overlay-top)] z-[49] bg-[#e8eadf]/65" onClick={e=>e.stopPropagation()} />}
            {gostaChainPicker && (()=>{const chainOf=(s:any)=>{const k=storeKind(s);const raw=String(s?.chain||s?.type||s?.brand||s?.name||"").toLowerCase();if(k==="spar"||raw.includes("tokmanni")||raw.includes("spar"))return "SPAR";if(k==="lidl"||raw.includes("lidl"))return "LIDL";if(k.startsWith("s"))return "S";if(k.startsWith("k"))return "K";return ""};const selectedByChain=new Map<string,any>();Object.values(selectedStores).forEach((s:any)=>selectedByChain.set(chainOf(s),s));const order=["S","K","SPAR","LIDL"];const visible=order.map(ch=>selectedByChain.get(ch)).filter(Boolean) as any[];const meta:any={S:["/storelogos/s-group.png","S-ryhmä"],K:["/storelogos/k-group.png","K-ryhmä"],SPAR:["/storelogos/spar.png","Tokmanni / Spar"],LIDL:["/storelogos/lidl.png","Lidl"]};return <div className={`${GOSTA_DESKTOP_OVERLAY_SHELL} z-50`}><div className="relative rounded-[20px] border-2 border-[#caa15d] bg-[#f7e7bd] px-14 py-2.5 text-center"><div className="truncate font-serif text-[22px] font-black italic text-[#174c35]">Tarjous- ja kampanjahaku</div><button type="button" onClick={()=>setGostaChainPicker(false)} aria-label="Sulje kauppaketjun valinta" title="Sulje" className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border-[3px] border-[#5a321b] bg-[#9a612d] text-[23px] font-black leading-none text-[#fff0c8]">×</button></div><div className="mx-auto mt-3 flex min-h-0 w-full flex-1 flex-col rounded-[22px] border-2 border-[#b58a46] bg-[#fff4cf] p-4"><div className="text-center font-serif text-[23px] font-black italic text-[#174c35]">Valitse kaupparyhmä</div><div className="mt-1 text-center text-[13px] font-black text-[#6d604c]">Mistä kaupparyhmästä haetaan tarjoukset?</div><div className="mx-auto mt-3 grid min-h-0 w-full max-w-[860px] flex-1 grid-cols-2 gap-3">{visible.map((store:any)=>{const ch=chainOf(store);const m=meta[ch];const offerChain:any=ch==="SPAR"?(String(store?.chain||"").toUpperCase()==="EUROSPAR"?"EUROSPAR":"TOKMANNI"):ch;return <button key={ch} onClick={()=>void openDesktopGostaChain(offerChain,store)} className="grid min-h-0 place-items-center rounded-[20px] border-[3px] border-[#17573c] bg-[#fff8d9] p-3 shadow-[0_7px_0_rgba(72,73,48,.18)]"><img src={m[0]} alt="" className="h-[116px] w-[164px] max-w-full object-contain"/><div className="mt-1 text-[16px] font-black text-[#17573c]">{m[1]}</div></button>})}</div>{visible.length===0&&<div className="m-auto rounded-[20px] border-2 border-[#b58a46] bg-[#fff9e7] p-6 text-center text-[15px] font-black">Valitse ensin kauppaketju pääruudulta.</div>}</div></div>})()}

            {gostaChain && <div className="fixed bottom-[28px] left-0 right-0 top-[var(--desktop-overlay-top)] z-[49] bg-[#e8eadf]/65" onClick={e=>e.stopPropagation()} />}
            {gostaChain && (()=>{const campaigns=gostaOffers.filter((x:any)=>x.campaignType==="campaign");const offers=gostaOffers.filter((x:any)=>x.campaignType!=="campaign");const showCampaigns=campaigns.length>0;const source=gostaTab==="campaigns"?campaigns:offers;const cats=sortDesktopCategories(Array.from(new Set(source.map((x:any)=>getResolvedGostaCategoryV166(x)).filter(Boolean)))).filter(cat=>filterZiiplyGostaOfferResultsV146(source,cat).length>0);const visible=gostaCategory?filterZiiplyGostaOfferResultsV146(source,gostaCategory):[];const diagnostic=offerDiagnostics.current.get(activeOfferKey.current);const visibleSet=new Set(gostaCategory?visible:source);const tabSet=new Set(source);const debugPayload={providerAudit:getLastZiiplyKruokaDebugV174(diagnostic?.context),version:"desktop-offer-categories-v1",query:diagnostic?.query??"",selectedStore:diagnostic?.store??null,context:diagnostic?.context??null,error:diagnostic?.error??null,inputBoundary:"Provider-normalized rows returned by shared search; provider internal raw HTTP response is not captured",diagnosticAvailability:diagnostic?"captured":"restored cache: raw input unavailable; reload after clearing offer cache",classificationRule:"Shared mobile getResolvedGostaCategoryV166; canonical category equality",stages:{providerInput:diagnostic?.input?.length??null,sharedCore:diagnostic?.coreResults?.length??null,desktopClean:gostaOffers.length,tab:source.length,visible:visibleSet.size},providerInput:diagnostic?.input??null,sharedCoreRemoved:diagnostic?.sharedCoreRemoved?.map((p:any)=>({item:p,reason:"shared core title validation, deduplication or Prisma campaign overlap policy"}))??null,desktopRemoved:diagnostic?.desktopRemoved?.map((p:any)=>({item:p,reason:"shared cleanZiiplyGostaOfferResultsV146: invalid offer or duplicate"}))??null,classification:gostaOffers.map((p:any)=>({id:p.id,ean:p.ean,title:p.title,originalCategory:p.__sourceOfferSearchResult?.category,originalTaxonomy:{categoryPath:p.__sourceOfferSearchResult?.categoryPath,mainCategory:p.__sourceOfferSearchResult?.mainCategory,productGroup:p.__sourceOfferSearchResult?.productGroup,subCategory:p.__sourceOfferSearchResult?.subCategory},mappedCategory:p.category,finalCategory:getResolvedGostaCategoryV166(p),provider:p.__sourceOfferSearchResult?.source,sourceUrl:p.__sourceOfferSearchResult?.sourceUrl,filterReason:!tabSet.has(p)?"other tab or campaign duplicate":!visibleSet.has(p)?"selected canonical category mismatch":"included",classificationBasis:{preciseProductCategory:getPreciseProductCategoryV170(p.__sourceOfferSearchResult||p)||null,preciseRuleApplied:!!getPreciseProductCategoryV170(p.__sourceOfferSearchResult||p)&&getPreciseProductCategoryV170(p.__sourceOfferSearchResult||p)===getResolvedGostaCategoryV166(p)},categoryChanged:(p.__sourceOfferSearchResult?.category||p.category)!==getResolvedGostaCategoryV166(p)})),view:"desktop-preview",chain:gostaChain,tab:gostaTab,category:gostaCategory||"kaikki",loading:gostaLoading,storeKey:activeOfferKey.current,totals:{loaded:gostaOffers.length,offers:offers.length,campaigns:campaigns.length,tabSource:source.length,visible:gostaCategory?visible.length:source.length},categoryCounts:cats.map(cat=>({category:cat,count:filterZiiplyGostaOfferResultsV146(source,cat).length})),items:source.map((p:any)=>({id:p.id,title:p.title||p.name,category:p.category,campaignType:p.campaignType,price:p.price,offerPrice:p.offerPrice,displayPrice:getOfferPrice(p),normalPrice:p.normalPrice,comparisonPrice:p.comparisonPrice,unitPrice:p.unitPrice,imageUrl:p.imageUrl,ean:p.ean,source:p.__sourceOfferSearchResult||null}))};const debugText=JSON.stringify(debugPayload,null,2);return <div className="fixed bottom-[24px] left-[24px] right-[24px] top-[var(--desktop-overlay-top)] z-50 flex flex-col overflow-hidden rounded-[28px] border-[3px] border-[#5a321b] bg-[#efe0bd] p-4 shadow-[0_28px_80px_rgba(34,54,43,.28)]"><div className="relative mx-auto flex h-[48px] w-[min(100%,410px)] shrink-0 items-center justify-center rounded-[20px] border-2 border-[#caa15d] bg-[#f7e7bd] px-[46px]"><button type="button" onClick={()=>{setGostaChain(null);setGostaCategory("")}} aria-label="Sulje Göstan tarjousnäkymä" title="Sulje" className="absolute left-1 top-1/2 z-30 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border-[3px] border-[#5a321b] bg-[#9a612d] text-[23px] font-black leading-none text-[#fff0c8]">×</button><button type="button" onClick={()=>{setGostaChain(null);setGostaCategory("")}} aria-label="Sulje Göstan tarjousnäkymä" title="Sulje" className="absolute right-1 top-1/2 z-30 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border-[3px] border-[#5a321b] bg-[#9a612d] text-[23px] font-black leading-none text-[#fff0c8]">×</button><button type="button" onClick={()=>{if(gostaCategory)setGostaCategory("");else {setGostaChain(null);setGostaCategory("")}}} aria-label="Palaa tarjoushaussa" title="Palaa" className="absolute left-12 top-1/2 z-30 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border-[3px] border-[#17573c] bg-[#fff9dd] text-[20px] font-black text-[#174c35] shadow-sm">←</button><div className="flex h-full min-w-0 max-w-full items-center justify-center overflow-hidden">{gostaCategory?<div className="flex min-w-0 items-center justify-center gap-12 border-0 bg-transparent shadow-none"><span role="img" title={gostaCategory} aria-label={gostaCategory} className="grid h-8 w-8 place-items-center rounded-[14px] border-2 border-[#c9aa6c] bg-gradient-to-br from-[#fffdf0] to-[#e5c78d] text-[20px] shadow-sm">{String(gostaCategory).toLowerCase().includes("kahvi")?"☕":String(gostaCategory).toLowerCase().includes("maito")?"🥛":String(gostaCategory).toLowerCase().includes("kala")?"🐟":String(gostaCategory).toLowerCase().includes("leip")?"🥐":String(gostaCategory).toLowerCase().includes("hevi")?"🍎":String(gostaCategory).toLowerCase().includes("juoma")?"🥤":String(gostaCategory).toLowerCase().includes("valmis")?"🍽️":String(gostaCategory).toLowerCase().includes("kuiva")?"🥣":String(gostaCategory).toLowerCase().includes("make")?"🍬":String(gostaCategory).toLowerCase().includes("lasten")?"🏷️":String(gostaCategory).toLowerCase().includes("lemm")?"🐾":String(gostaCategory).toLowerCase().includes("hyg")?"🧴":String(gostaCategory).toLowerCase().includes("koti")?"🏠":"🏷️"}</span><button type="button" onClick={()=>setCartOpen(true)} className="rounded-full border-2 border-[#17573c] bg-[#e2edcf] px-2 py-0.5 text-[11px] font-black text-[#174c35] shadow-sm">🛒 Ostoskori</button></div>:<div className="flex min-w-0 items-center justify-center gap-[8px]">{!gostaLoading&&<button onClick={()=>{setGostaTab("offers");setGostaCategory("")}} className={`shrink-0 rounded-full border-2 px-1.5 py-1 text-[11px] font-black ${gostaTab==="offers"?"border-[#17573c] bg-[#17573c] text-white":"border-[#b58a46] bg-[#fff4cf] text-[#174c35]"}`}>Tarjoukset</button>}{!gostaCategory&&<div className="shrink-0 whitespace-nowrap text-center font-serif text-[clamp(11px,0.75vw,13px)] font-black italic text-[#174c35]">Haku</div>}{!gostaLoading&&showCampaigns&&<button onClick={()=>{setGostaTab("campaigns");setGostaCategory("")}} className={`shrink-0 rounded-full border-2 px-1.5 py-1 text-[11px] font-black ${gostaTab==="campaigns"?"border-[#17573c] bg-[#17573c] text-white":"border-[#b58a46] bg-[#fff4cf] text-[#174c35]"}`}>Kampanjat</button>}</div>}</div></div><button type="button" onClick={()=>setGostaDebugOpen(true)} className="absolute right-5 top-5 z-[70] rounded border border-[#80623b] bg-[#fff5d7] px-2 py-1 font-mono text-[11px] font-black text-[#493821]" title="Avaa tarjousten tai kampanjoiden debug">DEBUG</button>{gostaDebugOpen&&<div className="absolute inset-3 z-[100] flex flex-col overflow-hidden rounded-2xl border-[3px] border-[#5a321b] bg-[#fff8dc] shadow-2xl"><div className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-[#b58a46] bg-[#f1d99a] p-3"><strong>GÖSTA DEBUG · {gostaChain} · {gostaTab==="offers"?"TARJOUKSET":"KAMPANJAT"}</strong><button type="button" onClick={()=>setGostaDebugOpen(false)} className="rounded border border-[#5a321b] bg-[#fff8dc] px-3 py-1 font-bold">SULJE</button></div><div className="flex shrink-0 items-center gap-3 border-b border-[#b58a46] p-3"><button type="button" onClick={()=>{setGostaDebugCopied(false);void navigator.clipboard.writeText(debugText).then(()=>setGostaDebugCopied(true)).catch(()=>{const blob=new Blob([debugText],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="ziiply-gosta-debug.json";a.click();URL.revokeObjectURL(url)})}} className="rounded-lg border-2 border-[#17573c] bg-[#e2edcf] px-3 py-2 font-black text-[#174c35]">{gostaDebugCopied?"KOPIOITU ✓":"Kopioi DEBUG"}</button><button type="button" onClick={()=>{const blob=new Blob([debugText],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="ziiply-"+gostaTab+"-debug.json";a.click();URL.revokeObjectURL(url)}} className="rounded-lg border border-[#17573c] px-3 py-2 font-bold">TALLENNA JSON</button><span className="text-sm">Rivejä {source.length} · Näkyviä {gostaCategory?visible.length:source.length}</span></div><pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-3 text-xs">{debugText}</pre></div>}<div className={`mt-3 min-h-0 flex-1 overflow-y-auto rounded-[22px] border-2 border-[#b58a46] bg-[#fff4cf] p-4 ${gostaCategory?"invisible pointer-events-none":""}`}><div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">{cats.map((cat:any)=>{const count=filterZiiplyGostaOfferResultsV146(source,cat).length;const icon=String(cat).toLowerCase().includes("kahvi")?"☕":String(cat).toLowerCase().includes("maito")?"🥛":String(cat).toLowerCase().includes("kala")?"🐟":String(cat).toLowerCase().includes("leip")?"🥐":String(cat).toLowerCase().includes("hevi")?"🍎":String(cat).toLowerCase().includes("juoma")?"🥤":String(cat).toLowerCase().includes("valmis")?"🍽️":String(cat).toLowerCase().includes("kuiva")?"🥣":String(cat).toLowerCase().includes("make")?"🍬":String(cat).toLowerCase().includes("lasten")?"🏷️":String(cat).toLowerCase().includes("lemm")?"🐾":String(cat).toLowerCase().includes("hyg")?"🧴":String(cat).toLowerCase().includes("koti")?"🏠":"🏷️";return <button key={cat} onClick={()=>setGostaCategory(cat)} className="group flex min-h-[94px] items-center gap-4 rounded-[20px] border-[3px] border-[#17573c] bg-[#fff9dd] px-5 py-3 text-left text-[#174c35] shadow-[0_4px_0_rgba(72,73,48,.12)] transition  hover:bg-[#f1f0c9]"><span aria-hidden="true" className="grid h-[64px] w-[64px] shrink-0 place-items-center rounded-[19px] border-2 border-[#c9aa6c] bg-gradient-to-br from-[#fffdf0] via-[#f7e6b8] to-[#e5c78d] text-[39px] leading-none shadow-[0_5px_0_#b8a074,0_9px_16px_rgba(72,55,27,.16),inset_0_2px_3px_rgba(255,255,255,.9)] transition-transform ">{icon}</span><span className="min-w-0 flex-1 text-[15px] font-black leading-tight">{cat} <span className="whitespace-nowrap">({count})</span></span></button>})}</div></div>{gostaLoading&&!gostaCategory&&showGostaMill&&<div className="pointer-events-none absolute inset-x-4 bottom-4 top-[76px] z-20 flex items-start justify-center rounded-[22px] border-2 border-[#b58a46] bg-[#fff4cf] pt-3 shadow-[0_12px_35px_rgba(34,54,43,.18)]"><ZiiplyVintageMillLoader /></div>}{gostaCategory&&<><div className="absolute inset-x-4 bottom-4 top-[76px] z-10 overflow-y-auto rounded-[22px] border-2 border-[#b58a46] bg-[#fff4cf] p-4 shadow-[0_12px_35px_rgba(34,54,43,.18)]">{gostaLoading?<div className="flex w-full justify-center pt-3">{showGostaMill?<ZiiplyVintageMillLoader />:<span className="sr-only">Haetaan tarjouksia…</span>}</div>:visible.length===0?<div className="grid h-full place-items-center text-[15px] font-black text-[#6d604c]">Ei tuloksia.</div>:<div className="grid grid-cols-2 gap-3 xl:grid-cols-3">{visible.map((p:any,i:number)=><div key={String(p.id||i)} className="grid min-h-[292px] grid-cols-[minmax(108px,35%)_minmax(0,1fr)] items-stretch gap-4 rounded-[24px] border-[3px] border-[#a99a75] bg-[#fff3d5] p-4 shadow-[0_5px_0_rgba(72,73,48,.12)]">
<div className="flex min-w-0 flex-col gap-3">
  <div className="grid h-[148px] min-h-0 shrink-0 place-items-center overflow-hidden rounded-[18px] border-2 border-[#9a713a] bg-[#fffdf5] p-2 shadow-[0_3px_5px_rgba(55,37,18,.15)]">{p.pictureUrl?<img src={p.pictureUrl} alt="" className="h-full max-h-[132px] w-full object-contain" width={132} height={132} loading="lazy"/>:<span className="text-[38px]">🛍️</span>}</div>
  <button type="button" onClick={()=>addDesktopCartItem(p)} aria-label="Lisää ostoskoriin" className="relative flex min-h-[88px] w-full cursor-pointer flex-col items-center justify-center rounded-[18px] border-[3px] border-[#477350] bg-[#e2edcf] px-2 py-2 text-center text-[#126a39] hover:bg-[#d3e9bc] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#17573c]">
    <span className="block max-w-full break-words px-1 text-center font-serif text-[clamp(17px,1.3vw,25px)] font-black leading-tight">{splitOfferDisplayPrice(getOfferPrice(p)).amount}</span>
    {splitOfferDisplayPrice(getOfferPrice(p)).basis && <span className="block text-center text-[13px] font-black leading-tight">{splitOfferDisplayPrice(getOfferPrice(p)).basis}</span>}
    <span className="mt-1 text-[12px] font-black text-[#264e32]">🛒 Lisää koriin</span>
    {cartIncrementKey===desktopCartKey(p)&&<span className="absolute -right-2 -top-2 grid h-8 min-w-8 place-items-center rounded-full bg-[#08a36d] px-2 text-[13px] font-black text-white shadow-lg">+1</span>}
  </button>
</div>
<div className="min-w-0 self-start py-1">
  <div className="text-[clamp(15px,1.2vw,21px)] font-black leading-snug text-[#26352b]">{p.title||p.name}</div>
  <div className="mt-3 text-[11px] font-black uppercase tracking-wide text-[#6f735b]">{p.storeName||""} <span className="ml-1 rounded-full bg-[#e3e5c9] px-2 py-1 text-[#27583d]">{getResolvedGostaCategoryV166(p)}</span></div>
  {p.ean&&<div className="mt-2 text-[11px] font-bold text-[#82745a]">EAN {p.ean}</div>}
  {p.unitPrice&&<div className="mt-2 text-[12px] font-bold text-[#82745a]">{p.unitPrice}</div>}
  {p.discountText&&<div className="mt-3 font-serif text-[13px] font-bold italic text-[#796b4d]">{p.discountText}</div>}
  {(p.validUntil||p.validityText)&&<div className="mt-2 text-[12px] font-bold text-[#796b4d]">{p.validityText||("Voimassa "+p.validUntil)}</div>}
</div>
</div>)}</div>}</div></>}</div>})()}

            {desktopListPrompt && <div className="fixed inset-0 z-[150] grid place-items-center bg-black/50 p-4"><div role="dialog" aria-modal="true" aria-label="Ohitetaanko tuote" className="w-full max-w-[440px] rounded-3xl border-2 border-[#477350] bg-[#fff3cf] p-6 text-center shadow-2xl"><h3 className="text-xl font-black text-[#174c3a]">Jätetäänkö tämä tuote pois hausta?</h3><p className="mt-2 font-semibold">{justiinaActiveTerm}</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button type="button" onClick={()=>setDesktopListPrompt(false)} className="rounded-xl border px-4 py-3 font-bold">Jatka valintaa</button><button type="button" onClick={confirmDesktopListSkip} className="rounded-xl border px-4 py-3 font-bold">Ohita tuote</button><button type="button" onClick={cancelDesktopListEntirely} className="rounded-xl border px-4 py-3 font-bold">Keskeytä koko lista</button></div></div></div>}
            {workspace==="justiina" && justiinaResultsOpen && <div className="fixed inset-x-6 bottom-6 top-[var(--desktop-overlay-top)] z-[65] flex flex-col overflow-hidden rounded-[28px] border-[3px] border-[#5a321b] bg-[#efe0bd] p-4 shadow-[0_28px_80px_rgba(34,54,43,.28)]"><div className="relative mx-auto flex h-[58px] w-[min(100%,620px)] shrink-0 items-center justify-center gap-3 rounded-[20px] border-2 border-[#caa15d] bg-[#f7e7bd] px-3">{cartNotice&&<div role="status" className="absolute left-1/2 top-1/2 z-40 flex h-[44px] w-[min(404px,calc(100%-186px))] min-w-0 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-[14px] bg-[#08a36d] px-3 text-center text-[14px] font-black text-white shadow-lg"><span className="block min-w-0 truncate whitespace-nowrap">{cartNotice}</span></div>}<button type="button" onClick={requestDesktopListExit} aria-label="Sulje tuotevalinta" className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border-[3px] border-[#5a321b] bg-[#9a612d] text-[23px] font-black leading-none text-[#fff0c8]">×</button><button type="button" onClick={requestDesktopListExit} aria-label="Takaisin hakuun" className="absolute left-[60px] top-1/2 z-30 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border-[3px] border-[#17573c] bg-[#fff9dd] text-[22px] font-black text-[#174c35]">←</button><div className="flex min-w-0 max-w-[calc(100%-160px)] items-center justify-center gap-3"><span className="min-w-0 truncate whitespace-nowrap font-serif text-[21px] font-black italic text-[#174c35]" title={`${justiinaLoading ? "haetaan" : "löydetty"} · ${justiinaActiveTerm || justiinaQuery}`}>{justiinaLoading ? "haetaan" : "löydetty"} · {justiinaActiveTerm || justiinaQuery}</span></div><button type="button" onClick={requestDesktopListExit} aria-label="Sulje tuotevalinta" className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border-[3px] border-[#5a321b] bg-[#9a612d] text-[23px] font-black leading-none text-[#fff0c8]">×</button></div><div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-[22px] border-2 border-[#b58a46] bg-[#fff4cf] p-4"><div className="grid grid-cols-2 gap-3 xl:grid-cols-3">{justiinaResults.map((p:any,i:number)=><div key={String(p.id||p.ean||i)} className="grid h-[258px] min-h-0 grid-cols-[minmax(108px,35%)_minmax(0,1fr)] items-stretch gap-4 overflow-hidden rounded-[24px] border-[3px] border-[#a99a75] bg-[#fff3d5] p-4"><div className="flex min-w-0 flex-col gap-3"><div className="grid h-[148px] min-h-0 shrink-0 place-items-center overflow-hidden rounded-[18px] border-2 border-[#9a713a] bg-[#fffdf5] p-2">{(p.pictureUrl||p.imageUrl||p.image)?<img src={p.pictureUrl||p.imageUrl||p.image} alt="" className="h-full max-h-[132px] w-full object-contain" width={132} height={132} loading="eager" decoding="async"/>:<span className="text-[38px]">🛍️</span>}</div><button type="button" onClick={()=>{addDesktopCartItem({...p,source:"justiina",title:p.name||p.title||p.productName,price:p.__price,priceCheckedAt:Date.now(),storeName:p.__store});justiinaAddedDuringSelectionRef.current=true;resumeDesktopVoiceList()}} className="flex min-h-[76px] w-full flex-col items-center justify-center rounded-[18px] border-[3px] border-[#477350] bg-[#e2edcf] px-2 py-2 text-[#126a39]"><span className="font-serif text-[25px] font-black">{p.__price!=null?Number(p.__price).toFixed(2).replace(".",",")+" €":"—"}</span><span className="text-[12px] font-black">🛒 Lisää koriin</span></button></div><div className="min-w-0 overflow-hidden py-1"><div className="line-clamp-3 text-[clamp(15px,1.2vw,21px)] font-black leading-snug text-[#26352b]">{p.name||p.title||p.productName}</div><div className="mt-3 text-[11px] font-black uppercase text-[#6f735b]">{p.__store||p.storeName||""}</div>{p.ean&&<div className="mt-2 text-[11px] font-bold text-[#82745a]">EAN {p.ean}</div>}{p.unitPrice&&<div className="mt-2 text-[12px] font-bold text-[#82745a]">{p.unitPrice}</div>}</div></div>)}</div></div></div>}
            {workspace==="justiina" && !justiinaResultsOpen && justiinaArvo && <details className="absolute right-8 top-3 z-[45] w-[min(430px,calc(100%-4rem))] rounded-xl border border-[#d4c8ad] bg-[#fffaf0] text-xs shadow-md">
              <summary className="cursor-pointer px-3 py-2 font-bold">Arvon asetukset · {justiinaPeopleOverride??justiinaArvo.householdSize} henkilöä {justiinaArvo.diets.length>0?"· ruokavaliot":""} {justiinaArvo.allergies.trim()?"· allergiat":""}</summary>
              <div className="max-h-[45vh] space-y-2 overflow-y-auto border-t p-3">
                <label className="block">Henkilöitä <input aria-label="Henkilömäärä vain tähän käyttökertaan" type="number" min="1" max="30" className="ml-1 w-16 rounded border px-1" value={justiinaPeopleOverride??justiinaArvo.householdSize} onChange={e=>setJustiinaPeopleOverride(Math.max(1,Math.min(30,Number(e.target.value)||1)))} /></label>
                {justiinaPeopleOverride!==null&&<button type="button" className="underline" onClick={()=>setJustiinaPeopleOverride(null)}>Palauta Arvon oletus</button>}
                {effectiveArvoDiets(justiinaArvo.diets).length>0&&<p>Ruokavaliot: {effectiveArvoDiets(justiinaArvo.diets).map(key=>ARVO_DIETS.find(d=>d[0]===key)?.[1]||key).join(", ")}</p>}
                {justiinaArvo.allergies.trim()&&<p className="font-bold text-red-800">Allergiat: {justiinaArvo.allergies}</p>}
                {justiinaArvo.avoidedIngredients.trim()&&<p>Vältettävät: {justiinaArvo.avoidedIngredients}</p>}
                <p className="text-[#775b31]">Nämä asetukset ovat nähtävillä, mutta eivät vielä suodata tuotteita tai varmista allergeeniturvallisuutta.</p>
              </div>
            </details>}
            {workspace==="justiina" && !justiinaResultsOpen && <DesktopJustiinaSearchCard onVoiceTranscript={(text)=>{void runDesktopVoiceList(text)}} onOpenScanner={()=>{setDesktopScannerEan("");setDesktopScannerMessage("");setDesktopScannerCameraOn(false);desktopInStoreConfirmedRef.current=null;setDesktopScannerOpen(true)}} onClose={()=>setWorkspace(null)} onOpenCart={()=>setCartOpen(true)} query={justiinaQuery} onQueryChange={(value)=>{cancelDesktopVoiceList();justiinaUserEditedRef.current=true;justiinaSuppressedTermsRef.current.delete(value.trim().toLowerCase());setJustiinaQuery(value);if(!value.trim()){justiinaLastSearchedRef.current="";setJustiinaMessage("")}}} loading={justiinaLoading} onSearch={()=>{void runDesktopVoiceList(justiinaQuery)}} message={justiinaMessage} results={justiinaResults} delay={justiinaDelay} onDelayChange={()=>setJustiinaDelay(v=>v===2?1:v===1?0:2)} onAddToCart={(p)=>addDesktopCartItem({...p,source:"justiina",title:p.name||p.title||p.productName,price:p.__price})} onReopenResults={()=>{if(justiinaResults.length>0){justiinaUserEditedRef.current=false;setJustiinaResultsOpen(true)}}} onAddInputToCart={(text)=>{justiinaUserEditedRef.current=false;justiinaSuppressedTermsRef.current.add(text.trim().toLowerCase());text.split(/[,\.\n]+/).map(x=>x.trim()).filter(Boolean).forEach(title=>addDesktopCartItem({title,name:title,source:"justiina",price:0,quantity:1}));}} />}
            {workspace && workspace!=="justiina" && (
              <div className="absolute inset-5 z-40 flex flex-col rounded-[32px] border border-[#756443]/20 bg-[#f8f5ed]/[0.99] p-6 shadow-[0_28px_80px_rgba(34,54,43,.28)] xl:inset-8">
                <div className="flex items-center justify-between"><div className="text-[26px] font-black text-[#14291f]">{({ gosta: "Gösta", justiina: "Justiina", arvo: "Arvo" } as const)[workspace]}</div><button onClick={()=>setWorkspace(null)} className="rounded-full bg-white px-4 py-2 font-black">← Takaisin</button></div>
                {workspace==="arvo"&&<div className="mt-4 min-h-0 flex-1"><ArvoSettingsPanel /></div>}
              </div>
            )}

          </div>
        </section>

        <footer className="relative z-10 flex shrink-0 items-center justify-between border-t border-[#64745f]/15 bg-[#e4e9df] px-2 py-1 text-[12px] font-bold text-[#747d6e]">
          <span>Ziiply Oy</span>
          <span>One search. All prices.</span>
        </footer>
      </div>
    </main>
  );
}

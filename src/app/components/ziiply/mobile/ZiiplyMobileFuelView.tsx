"use client";

import {useEffect,useMemo,useState} from "react";
import ZiiplyMobileStoreModeSelector from "./ZiiplyMobileStoreModeSelector";

type Station = {id:string;name:string;chain:string;address:string;isTrafficStation:boolean;distanceKm:number;diesel:number|null;price95:number|null;price98:number|null;observedDiesel:string|null;observed95:string|null;observed98:string|null};
const groups = [{key:"Neste",logo:"Neste.png"},{key:"ABC",logo:"ABC.png"},{key:"Gulf / Ritoil / Muu",logo:null},{key:"St1",logo:"St1.png"},{key:"SEO",logo:"SEO.jpeg"}];
function group(s:Station){const text=`${s.chain} ${s.name}`;return /neste/i.test(text)?"Neste":/\babc\b/i.test(text)?"ABC":/st1|shell/i.test(text)?"St1":/\bseo\b/i.test(text)?"SEO":"Gulf / Ritoil / Muu";}
const price=(n:number|null)=>n==null?"–":n.toLocaleString("fi-FI",{minimumFractionDigits:3,maximumFractionDigits:3});
export default function ZiiplyMobileFuelView({coords,onBack}:{coords:{lat:number;lon:number}|null;onBack:()=>void}){
  const [stations,setStations]=useState<Station[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const [mode,setMode]=useState<"hyper"|"local">("hyper"),[scope,setScope]=useState<"between_chains"|"within_chain">("between_chains"),[many,setMany]=useState<"one"|"many">("one");
  const [selected,setSelected]=useState<string[]>([]),[overrides,setOverrides]=useState<Record<string,string>>({}),[picker,setPicker]=useState<string|null>(null);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setError("");fetch(`/api/fuel/stations?lat=${coords?.lat??64}&lon=${coords?.lon??26}`,{signal:controller.signal,cache:"no-store"}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{if(!data.ok||!Array.isArray(data.stations))throw Error();setStations(data.stations);}).catch(()=>{if(!controller.signal.aborted)setError("Asemien haku epäonnistui. Avaa hintanäkymä uudelleen.");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[coords?.lat,coords?.lon]);
  const filtered=useMemo(()=>stations.filter(s=>s.isTrafficStation===(mode==="hyper")),[stations,mode]);
  function select(id:string){setSelected(old=>{
    if(scope === "within_chain") {
      const previous = stations.find(s=>s.id===old[0]);
      const next = stations.find(s=>s.id===id);
      if(previous && next && group(previous)!==group(next)) return [id];
      return old.includes(id)?old.filter(x=>x!==id):[...old,id];
    }
    return many==="one"?[id]:old.includes(id)?old.filter(x=>x!==id):[...old,id];
  });}
  const activeGroup=selected.length?group(stations.find(s=>s.id===selected[0])??filtered[0]??{chain:"",name:""} as Station):null;
  useEffect(()=>{if(!picker)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();setPicker(null);}};window.addEventListener("keydown",close,true);return()=>window.removeEventListener("keydown",close,true);},[picker]);
  const cards = scope === "within_chain" && activeGroup
    ? filtered.filter(s=>group(s)===activeGroup).slice(0,6).map((s,index)=>({...groups.find(g=>g.key===activeGroup)!,slot:`${activeGroup}:${index}`,fallback:s}))
    : groups.map(g=>({...g,slot:g.key,fallback:undefined as Station|undefined}));
  const pickerGroup = cards.find(g=>g.slot===picker)?.key;
  const candidates=pickerGroup?filtered.filter(s=>group(s)===pickerGroup):[];
  return <>
    <ZiiplyMobileStoreModeSelector fuelMode storeMode={mode} storeModeChosen storeCompareScope={scope} withinChain={null} selectedRealChainCount={selected.length} betweenChainSelectionMode={many} onStoreModeChange={m=>{setMode(m);setSelected([]);setPicker(null);}} onStoreCompareScopeChange={s=>{if(s!=="none"){setScope(s);setSelected([]);}}} onBetweenChainSelectionModeChange={m=>{setMany(m);if(m==="one")setSelected(old=>old.slice(0,1));}} />
    <div className="mt-[-6px] pt-2 grid grid-cols-2 gap-x-3 gap-y-1.5" aria-label="Polttoaineasemat">
      {cards.map(g=>{
        const list=filtered.filter(s=>group(s)===g.key);
        const station=list.find(s=>s.id===overrides[g.slot])??g.fallback??list[0];
        const chosen=!!station&&selected.includes(station.id);
        const muted=scope==="within_chain"&&activeGroup!==null&&activeGroup!==g.key;
        return <article key={g.slot} className={`relative h-[104px] min-w-0 overflow-hidden rounded-[1.18rem] border-[2.5px] px-2 pt-1 text-center shadow-[0_1px_0_rgba(77,50,18,0.12),0_5px_10px_rgba(52,38,14,0.05),inset_0_0_0_1px_rgba(255,255,255,0.90)] ${scope==="between_chains"&&g.key==="Gulf / Ritoil / Muu"?"col-span-2 w-[calc(50%-6px)] justify-self-center":""} ${chosen?"border-[#5c7858] bg-gradient-to-b from-[#fffbe7] to-[#d8dfb5]":"border-[#d9c18e] bg-gradient-to-b from-[#fffaf0] to-[#f4e9c7]"} ${muted?"opacity-60":""}`}>
          <svg aria-hidden="true" viewBox="0 0 220 100" className="pointer-events-none absolute inset-x-0 bottom-0 w-full opacity-25"><path d="M0 47L33 17H177L220 47Z" fill="#508d72"/><path d="M15 47H210V98H15Z" fill="#d0d6c9"/><path d="M29 56H66V90H29ZM84 56H125V90H84ZM142 56H184V90H142Z" fill="#4c7b70"/><path d="M3 44H219V52H3Z" fill="#518e79"/></svg>
          <button disabled={!station} onClick={()=>station&&select(station.id)} aria-pressed={chosen} aria-label={`${g.key}: ${station?.name??"Ei asemaa"}`} className="relative block w-full text-center">
            <span className="absolute left-0 top-0 flex h-[22px] w-[30px] items-center justify-center overflow-hidden rounded-[0.45rem] border border-[#b89552] bg-[#fffef9] p-px">{g.logo?<img src={`/storelogos/${g.logo}`} alt={g.key} className="h-full w-full object-contain"/>:<span className="text-[8px] font-black">Gulf / Ritoil</span>}</span>
            <span className={`absolute right-0 top-0 flex h-[18px] w-[18px] items-center justify-center rounded-full border text-[11px] ${chosen?"border-[#536d4f] bg-[#648060] text-white":"border-[#d0ad68] bg-[#fff8dc] text-transparent"}`}>✓</span>
            <span className="block h-7"/>
            <span className="block h-[25px] overflow-hidden text-[11px] font-black leading-tight text-[#050505]">{station?.name??(loading?"Haetaan…":"Ei asemaa")}</span>
            <span className="block text-[10px] font-black text-black">{station?(coords?`${station.distanceKm.toLocaleString("fi-FI",{maximumFractionDigits:1})} km`:"Sijainti puuttuu"):"–"}</span>
          </button>
          <p className="relative z-10 whitespace-nowrap text-[8px] font-black leading-tight text-[#213224]">D {price(station?.diesel??null)} · 95 {price(station?.price95??null)} · 98 {price(station?.price98??null)}</p>
          <button disabled={!station} aria-label={`Vaihda ${g.key} asemaa`} onClick={()=>setPicker(g.slot)} className="absolute bottom-[4px] left-1/2 z-10 -translate-x-1/2 rounded-full border border-[#c7a763] bg-[#fff8df] px-3 py-px text-[9px] font-black text-[#213224]">Vaihda</button>
        </article>;
      })}
    </div>
    {loading&&<p role="status" className="mt-2 text-center text-xs">Haetaan asemia…</p>}
    {error&&<p role="alert" className="mt-2 text-xs text-red-800">{error}</p>}
    {scope==="within_chain"&&activeGroup&&<button onClick={()=>{setSelected([]);setPicker(null);}} className="mr-2 mt-2 rounded-full border border-[#c7a763] bg-[#fff8df] px-3 py-1 text-xs font-bold text-[#17573c]">Vaihda ketjua</button>}
    <button onClick={onBack} className="mt-2 rounded-full border border-[#c7a763] bg-[#fff8df] px-3 py-1 text-xs font-bold text-[#17573c]">← Kaupat</button>
    {picker&&<div className="fixed inset-0 z-[260] flex items-center justify-center bg-[#092e25]/60 p-4" onClick={()=>setPicker(null)}><section role="dialog" aria-modal="true" aria-label={`${pickerGroup} asemat`} className="max-h-[75dvh] w-full max-w-[420px] overflow-y-auto rounded-3xl border-[3px] border-[#17573c] bg-[#fff4cf] p-3" onClick={e=>e.stopPropagation()}><header className="sticky top-0 flex items-center justify-between bg-[#fff4cf] pb-2"><h2 className="font-black">{pickerGroup} — vaihda asemaa</h2><button aria-label="Sulje asemavalinta" onClick={()=>setPicker(null)} className="h-10 w-10 text-xl">×</button></header>{candidates.map(s=><button key={s.id} className="mb-2 block w-full rounded-xl border border-[#c7a763] bg-[#fff8df] p-3 text-left text-sm" onClick={()=>{setOverrides(old=>({...old,[picker]:s.id}));select(s.id);setPicker(null);}}><strong>{s.name}</strong><span className="block text-xs">{s.address}{coords?` · ${s.distanceKm.toLocaleString("fi-FI",{maximumFractionDigits:1})} km`:""}</span><span className="block text-xs">Diesel {price(s.diesel)} · 95 {price(s.price95)} · 98 {price(s.price98)} €/l</span><span className="block text-[10px]">{[s.observedDiesel,s.observed95,s.observed98].filter(Boolean).sort().at(-1)?`Havainto ${new Date([s.observedDiesel,s.observed95,s.observed98].filter(Boolean).sort().at(-1)!).toLocaleString("fi-FI")}`:"Havaintoaikaa ei saatavilla"}</span></button>)}</section></div>}
  </>;
}

"use client";
import {useEffect,useRef,useState} from "react";
import {readFuelPhoto} from "../../../../lib/fuelPhotoOcr";
import {comparePhotoEvidence,identifyFuelPhotoStation,fuelDistanceKm,validateFuelPrices,type FuelPrices,type PhotoEvidence} from "../../../../lib/fuelPhoto";

type Station={id:string;name:string;chain?:string;address?:string;latitude:number;longitude:number};
type Worker={setParameters:(parameters:Record<string,string>)=>Promise<unknown>;recognize:(image:string)=>Promise<{data:{text:string}}>;terminate:()=>Promise<unknown>};
type Ocr={createWorker:(lang:string,oem:number,options:Record<string,unknown>)=>Promise<Worker>};
let ocrPromise:Promise<Ocr>|null=null;
function loadOcr():Promise<Ocr>{
  if(ocrPromise)return ocrPromise;
  ocrPromise=new Promise<Ocr>((resolve,reject)=>{
    const script=document.createElement("script");
    script.src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
    script.async=true;
    const timeout=setTimeout(()=>{script.remove();reject(new Error("Lukijan lataus kesti liian kauan. Yritä uudelleen."));},30000);
    script.onload=()=>{clearTimeout(timeout);const ocr=(window as unknown as {Tesseract?:Ocr}).Tesseract;ocr?resolve(ocr):reject(new Error("Kuvalukija ei latautunut."));};
    script.onerror=()=>{clearTimeout(timeout);script.remove();reject(new Error("Kuvalukijan lataus epäonnistui. Tarkista verkkoyhteys."));};
    document.head.appendChild(script);
  }).catch(error=>{ocrPromise=null;throw error;});
  return ocrPromise;
}
type PhotoMeta={latitude?:number;longitude?:number;DateTimeOriginal?:string;OffsetTimeOriginal?:string};
let metaPromise:Promise<{parse:(file:File,options:Record<string,unknown>)=>Promise<PhotoMeta|undefined>}>|null=null;
function loadMetadata(){
  if(metaPromise)return metaPromise;
  metaPromise=new Promise<{parse:(file:File,options:Record<string,unknown>)=>Promise<PhotoMeta|undefined>}>((resolve,reject)=>{
    const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/lite.umd.js";script.async=true;
    const timer=setTimeout(()=>{script.remove();reject(new Error("Kuvan metatietolukija ei latautunut."));},30000);
    script.onload=()=>{clearTimeout(timer);const reader=(window as unknown as {exifr?:{parse:(file:File,options:Record<string,unknown>)=>Promise<PhotoMeta|undefined>}}).exifr;reader?resolve(reader):reject(new Error("Kuvan metatietolukija ei latautunut."));};
    script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error("Kuvan metatietolukija ei latautunut."));};document.head.appendChild(script);
  }).catch(error=>{metaPromise=null;throw error;});return metaPromise;
}
function localDateTime(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
async function preparePhoto(file:File):Promise<string>{
  if(!file.type.startsWith("image/"))throw new Error("Valitse kuva hintataulusta.");
  if(file.size>20*1024*1024)throw new Error("Kuva on liian suuri (enintään 20 Mt).");
  const url=URL.createObjectURL(file);
  try {
    const img=new Image();img.src=url;await img.decode();
    const scale=Math.min(1,1600/Math.max(img.width,img.height));
    const canvas=document.createElement("canvas");canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
    const context=canvas.getContext("2d");if(!context)throw new Error("Kuvan käsittely ei onnistu tässä selaimessa.");
    context.drawImage(img,0,0,canvas.width,canvas.height);
    const data=canvas.toDataURL("image/jpeg",0.85);
    if(data.length>1500000)throw new Error("Rajaa kuva pelkkään hintatauluun ja kokeile uudelleen.");
    return data;
  } finally {URL.revokeObjectURL(url);}
}
export default function DesktopFuelPhotoReport({onClose}:{onClose:()=>void}){
  const [priceReview,setPriceReview]=useState(false);
  const [evidence,setEvidence]=useState<PhotoEvidence>({photoGps:null,deviceGps:null,photoTime:null,captureTime:null});const [conflictConfirmed,setConflictConfirmed]=useState(false);const [photo,setPhoto]=useState("");const [prices,setPrices]=useState<FuelPrices>({diesel:"",price95:"",price98:""});
  const [rawText,setRawText]=useState("");const [busy,setBusy]=useState(false);const [status,setStatus]=useState("");const [error,setError]=useState("");
  const [gps,setGps]=useState<{lat:number;lon:number;accuracy:number}|null>(null);const [stations,setStations]=useState<Station[]>([]);const [stationId,setStationId]=useState("");
  const autoTime=useRef(false);const [observed,setObserved]=useState("");const [mode,setMode]=useState<"online"|"offline"|"manual">("offline");const [timeSource,setTimeSource]=useState("manual");const [locationSource,setLocationSource]=useState("manual");const [metadataInfo,setMetadataInfo]=useState("");const onlineInput=useRef<HTMLInputElement>(null);const offlineInput=useRef<HTMLInputElement>(null);const onlineCapture=useRef<{time:string;gps:Promise<{lat:number;lon:number;accuracy:number}|null>}|null>(null);const [editing,setEditing]=useState(false);const [sent,setSent]=useState(false);const [locating,setLocating]=useState(false);
  const conflict=comparePhotoEvidence(mode,evidence);
  const exifInstant=useRef<string|null>(null);const workerRef=useRef<Worker|null>(null);const alive=useRef(true);const gpsRequest=useRef(0);const requestId=useRef("");const closeRef=useRef<HTMLButtonElement>(null);const dialogRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{alive.current=true;const previous=document.activeElement as HTMLElement|null;closeRef.current?.focus();return()=>{alive.current=false;gpsRequest.current++;void workerRef.current?.terminate();previous?.focus();};},[]);
  useEffect(()=>{const timer=setInterval(()=>{if(autoTime.current)setObserved(localDateTime());},1000);return()=>clearInterval(timer);},[]);
  async function findStations(location:{lat:number;lon:number;accuracy:number}|null){
    const id=++gpsRequest.current;setLocating(true);setStations([]);setStationId("");
    try{
      const response=await fetch(`/api/fuel/stations?lat=${location?.lat??64}&lon=${location?.lon??26}`,{cache:"no-store"});const data=await response.json();
      if(!response.ok || !data.ok)throw new Error("Asemien haku epäonnistui.");
      if(!alive.current || id!==gpsRequest.current)return [];
      const list=(data.stations as Station[]).filter(s=>!/teboil/i.test(`${s.chain} ${s.name}`)).sort((a,b)=>location?fuelDistanceKm(location.lat,location.lon,a.latitude,a.longitude)-fuelDistanceKm(location.lat,location.lon,b.latitude,b.longitude):`${a.chain} ${a.name}`.localeCompare(`${b.chain} ${b.name}`,"fi"));
      setStations(list);setStationId("");return list;
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:"Asemien haku epäonnistui.");}finally{if(alive.current&&id===gpsRequest.current)setLocating(false);}
  }
  function startManual(){
    autoTime.current=true;setMode("manual");setPhoto("");setPrices({diesel:"",price95:"",price98:""});setObserved(localDateTime());setGps(null);setEvidence({photoGps:null,deviceGps:null,photoTime:null,captureTime:null});setConflictConfirmed(false);setTimeSource("manual");setLocationSource("manual");setPriceReview(false);setEditing(true);setSent(false);setError("");setStatus("");setRawText("");exifInstant.current=null;onlineCapture.current=null;requestId.current=crypto.randomUUID();void findStations(null);
  }
  function startOnline(){
    autoTime.current=false;setError("");setMode("online");setEditing(false);
    const location=new Promise<{lat:number;lon:number;accuracy:number}|null>(resolve=>{
      if(!navigator.geolocation){resolve(null);return;}
      navigator.geolocation.getCurrentPosition(position=>resolve({lat:position.coords.latitude,lon:position.coords.longitude,accuracy:position.coords.accuracy}),()=>resolve(null),{enableHighAccuracy:true,timeout:15000,maximumAge:0});
    });
    onlineCapture.current={time:localDateTime(),gps:location};onlineInput.current?.click();
  }
  async function readPhoto(file:File,source:"online"|"offline"){
    autoTime.current=false;setBusy(true);setPriceReview(false);setPhoto("");setError("");setStatus("Luetaan hintoja…");setConflictConfirmed(false);setEvidence({photoGps:null,deviceGps:null,photoTime:null,captureTime:null});setEditing(false);setSent(false);setPrices({diesel:"",price95:"",price98:""});setRawText("");requestId.current=crypto.randomUUID();
    try{
      setMode(source);setGps(null);setObserved("");setTimeSource("manual");setLocationSource("manual");setMetadataInfo("");
      let meta:PhotoMeta|undefined;
      try{const reader=await loadMetadata();meta=await reader.parse(file,{reviveValues:false});}catch{setMetadataInfo("Kuvan metatietoja ei saatu luettua. Täydennä kuvausaika ja asema itse.");}
      if(!alive.current)return;
      const exifDate=typeof meta?.DateTimeOriginal==="string"?meta.DateTimeOriginal.replace(/^(\d{4}):(\d{2}):(\d{2})[ T]/,"$1-$2-$3T").slice(0,16):"";
      exifInstant.current=null;
      const validDate=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(exifDate)&&Number.isFinite(new Date(exifDate).getTime());
      if(validDate && /^[+-]\d{2}:\d{2}$/.test(meta?.OffsetTimeOriginal||"")){const instant=new Date(exifDate+meta!.OffsetTimeOriginal);if(Number.isFinite(instant.getTime()))exifInstant.current=instant.toISOString();}
      setObserved(validDate?exifDate:source==="online"?onlineCapture.current?.time||"":"");setTimeSource(validDate?"photo_exif":source==="online"?"capture_session":"manual");
      let photoGps:{lat:number;lon:number;accuracy:number}|null=null;
      if(typeof meta?.latitude==="number"&&typeof meta.longitude==="number"&&Number.isFinite(meta.latitude)&&Number.isFinite(meta.longitude)&&Math.abs(meta.latitude)<=90&&Math.abs(meta.longitude)<=180)photoGps={lat:meta.latitude,lon:meta.longitude,accuracy:0};
      const deviceGps=source==="online"&&onlineCapture.current?await onlineCapture.current.gps:null;
      if(!alive.current)return;
      const photoTime=validDate?(exifInstant.current||new Date(exifDate).toISOString()):null;
      const captureTime=source==="online"&&onlineCapture.current?new Date(onlineCapture.current.time).toISOString():null;
      const checkedEvidence={photoGps,deviceGps,photoTime,captureTime};setEvidence(checkedEvidence);
      const checked=comparePhotoEvidence(source,checkedEvidence);
      const location=photoGps||deviceGps;
      setLocationSource(photoGps?"photo_exif":deviceGps?"capture_session":"manual");
      setGps(location);const stationSearch=findStations(location);
      setMetadataInfo(source==="offline"?`${validDate?"Kuvausaika luettu kuvasta.":"Kuvasta puuttuu kuvausaika: täydennä se."} ${location?"Sijainti luettu kuvasta.":"Kuvasta puuttuu sijainti: valitse asema itse."}`:"Tarkista kuvausaika ja asema. Selaimen kameravalinta voi sallia myös vanhan kuvan valinnan.");
      const data=await preparePhoto(file);if(!alive.current)return;setPhoto(data);
      const ocr=await loadOcr();if(!alive.current)return;
      const worker=await ocr.createWorker("eng",1,{});
      workerRef.current=worker;if(!alive.current){await worker.terminate();return;}
      const result=await readFuelPhoto(worker,data);if(!alive.current)return;
      const parsed=result.prices;setPrices(parsed);setRawText(result.text);setPriceReview(result.review);
      const candidates=await stationSearch;if(!alive.current)return;setStationId(identifyFuelPhotoStation(candidates||[],location,result.text,checked.reasons.length>0));
      setStatus(Object.values(parsed).some(Boolean)?"Hinnat luettu. Tarkista numerot, asema ja havaintoaika.":"Hintoja ei tunnistettu varmasti. Voit korjata hinnat kuvasta tai ottaa uuden kuvan.");
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:"Kuvan lukeminen epäonnistui.");}
    finally{const worker=workerRef.current;workerRef.current=null;if(worker)await worker.terminate().catch(()=>{});if(alive.current)setBusy(false);}
  }
  async function submit(){
    if((conflict.reasons.length>0&&!conflictConfirmed) || (mode!=="manual"&&!photo) || !stationId || !validateFuelPrices(prices)){setError("Tarkista kuva, asema, havaintoaika ja vähintään yksi hinta.");return;}
    const date=new Date(exifInstant.current||observed);if(!observed || !Number.isFinite(date.getTime()) || date.getTime()>Date.now()+60000){setError("Havaintoaika ei saa olla tulevaisuudessa.");return;}
    setBusy(true);setError("");setStatus("Lähetetään hintailmoitusta…");
    try{
      const response=await fetch("/api/fuel/reports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:requestId.current,stationId,prices,photo,observedAt:date.toISOString(),gps,mode,timeSource,locationSource,evidence,conflictConfirmed,confirmed:true})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Ilmoituksen lähettäminen epäonnistui.");
      if(alive.current){setSent(true);setStatus("Kiitos! Hintailmoitus tallennettiin esikatselun testikantaan tarkistettavaksi.");}
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:"Lähetys epäonnistui.");}finally{if(alive.current)setBusy(false);}
  }
  const input="w-full rounded-xl border border-[#baa46a] bg-[#fffaf0] px-3 py-2 text-[#174c35]";
  const selectedStation=stations.find(s=>s.id===stationId);
  const observedInstant=Date.parse(exifInstant.current||observed);
  const validObserved=Boolean(observed)&&Number.isFinite(observedInstant)&&observedInstant<=Date.now()+60000;
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#173b2e]/65 p-5" onKeyDown={e=>{if(e.key==="Escape")onClose();if(e.key==="Tab"){const items=dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary');if(!items?.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="fuel-report-title" className="flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[28px] border-[3px] border-[#17573c] bg-[#fff4cf] p-5 shadow-2xl">
      <header className="mb-4 flex items-center justify-between gap-3"><div><h2 id="fuel-report-title" className="text-2xl font-black text-[#174c35]">Ilmoita polttoainehintoja</h2><p className="text-sm text-[#6d604c]">Lisää hintataulun kuva tai syötä hinnat käsin.</p></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Sulje hintailmoitus" className="h-10 w-10 shrink-0 rounded-full border-2 border-[#17573c] text-xl">×</button></header>
      <div className="min-h-0 overflow-y-auto">
        <div className="mb-3 grid grid-cols-3 gap-3">
          <button type="button" disabled={busy||sent||locating} onClick={startOnline} className="min-h-[58px] rounded-2xl border-2 border-[#17573c] bg-[#e3edc9] px-3 py-2 font-black text-[#174c35] disabled:opacity-40">Ota kuva online<span className="mt-1 block text-xs font-medium">Uusi kuva</span></button>
          <button type="button" disabled={busy||sent||locating} onClick={()=>offlineInput.current?.click()} className="min-h-[58px] rounded-2xl border-2 border-[#9a7a47] bg-[#f7e7bd] px-3 py-2 font-black text-[#59411f] disabled:opacity-40">Lisää kuva offline<span className="mt-1 block text-xs font-medium">Aiempi kuva</span></button>
          <button type="button" disabled={busy||sent||locating} onClick={startManual} className="min-h-[58px] rounded-2xl border-2 border-[#9a7a47] bg-[#fff4cf] px-3 py-2 font-black text-[#59411f] disabled:opacity-40">Syötä käsin<span className="mt-1 block text-xs font-medium">Ilman kuvaa</span></button>
          <input ref={onlineInput} aria-label="Ota uusi hintataulun kuva" type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>{const file=e.target.files?.[0];e.target.value="";if(file)void readPhoto(file,"online");}}/>
          <input ref={offlineInput} aria-label="Valitse aiempi hintataulun kuva" type="file" accept="image/*" className="hidden" onChange={e=>{const file=e.target.files?.[0];e.target.value="";if(file)void readPhoto(file,"offline");}}/>
        </div>
        <div className="overflow-hidden rounded-[22px] border-[3px] border-[#8d6e3d] bg-[#17241e] p-3 shadow-[0_4px_0_#b49a68]">
          <div className="mb-3 text-center text-xs font-black uppercase tracking-[.12em] text-[#f5e5c1]">{mode==="manual"?"Hintojen käsinsyöttö":"Hintataulun kuvalukija"}</div>
          <div className="relative flex min-h-[300px] w-full items-center justify-center overflow-hidden rounded-xl bg-[#080e0b]">
            {!photo&&mode!=="manual"?<div className="max-w-[320px] px-6 py-12 text-center text-[#f5e5c1]"><img src="/fuel/nozzle-photo.png" alt="" className="mx-auto mb-4 h-16 w-16 object-contain"/><p className="text-lg font-black">Lisää hintataulun kuva</p><p className="mt-2 text-sm leading-relaxed text-[#e5ddc6]">Ota uusi kuva tai valitse aiempi kuva yllä olevista napeista.</p></div>:busy&&photo?<img src={photo} alt="Ilmoituksen hintataulu" className="max-h-[360px] w-full object-contain"/>:<div className="w-full space-y-4 p-4 text-[#f5e5c1]">
              {photo&&<img src={photo} alt="Ilmoituksen hintataulu" className="mx-auto max-h-[150px] w-full rounded-lg object-contain"/>}
              {sent?<div role="status" className="py-6 text-center"><p className="text-xl font-black">Kiitos! Ilmoitus vastaanotettu.</p><button type="button" onClick={onClose} className="mt-4 rounded-xl bg-[#e3edc9] px-8 py-2 font-black text-[#174c35]">OK</button></div>:<>
                {selectedStation&&<p className="text-center text-sm font-bold">{selectedStation.chain} · {selectedStation.name}</p>}
                {validateFuelPrices(prices)&&<div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-center">{([['diesel','Diesel'],['price95','95 E10'],['price98','98 E5']] as const).filter(([key])=>prices[key]).map(([key,label])=><p key={key} className="text-sm">{label} <strong className="text-lg">{prices[key]} €/l</strong></p>)}</div>}
                {observed&&<p className="text-center text-xs text-[#e5ddc6]">{new Date(exifInstant.current||observed).toLocaleString("fi-FI",{dateStyle:"short",timeStyle:"short"})}</p>}
                {(editing||!stationId)&&<label className="block text-sm font-bold">{mode==="manual"?"Valitse asema":conflict.reasons.length?"Vahvista kuvattu asema":"Kuvattua asemaa ei tunnistettu. Valitse asema."}<select value={stationId} disabled={!stations.length||locating} onChange={e=>{setStationId(e.target.value);setConflictConfirmed(false);}} className={input}><option value="">{mode==="manual"?"Valitse asema":"Valitse kuvassa oleva asema"}</option>{stations.map(s=><option key={s.id} value={s.id}>{s.chain} · {s.name} · {s.address}</option>)}</select></label>}
                {(editing||priceReview||!validateFuelPrices(prices))&&<div><p className="mb-2 text-sm">{mode==="manual"?"Syötä vähintään yksi hinta (€/l)":editing?"Korjaa hinnat tarvittaessa":priceReview?"Tarkista LED-näytöstä luetut hinnat ja täydennä tyhjät kohdat kuvasta.":"Hintoja ei saatu luettua. Lisää kuvassa näkyvät hinnat."}</p><div className="grid grid-cols-3 gap-2">{([['diesel','Diesel'],['price95','95 E10'],['price98','98 E5']] as const).map(([key,label])=><label key={key} className="text-xs font-bold">{label}<input aria-label={`${label} hinta euroa litralta`} inputMode="decimal" placeholder="–" value={prices[key]} onChange={e=>setPrices(p=>({...p,[key]:e.target.value}))} className={input}/></label>)}</div></div>}
                {(editing||!validObserved)&&<label className="block text-sm font-bold">{mode==="manual"?"Milloin näit hinnat?":"Milloin kuva otettiin?"}<input type="datetime-local" value={observed} onChange={e=>{autoTime.current=false;exifInstant.current=null;setObserved(e.target.value);setTimeSource("manual");setConflictConfirmed(false);}} className={input}/></label>}
                {conflict.reasons.length>0&&<div role="alert" className="rounded-xl border border-[#bd6b2a] bg-[#ffe6c8] p-3 text-sm text-[#713d1c]"><p className="font-bold">Kuvan ja kuvaushetken tiedot poikkeavat toisistaan.</p>{conflict.reasons.includes("location")&&<p>Sijaintien ero noin {Math.round(conflict.distanceM||0)} m.</p>}{conflict.reasons.includes("time")&&<p>Kuvausaikojen ero noin {Math.round(conflict.timeDifferenceMinutes||0)} min. Käytä aiemmalle kuvalle offline-valintaa.</p>}<label className="mt-2 flex gap-2"><input type="checkbox" checked={conflictConfirmed} disabled={!stationId} onChange={e=>setConflictConfirmed(e.target.checked)}/><span>Vahvistan kuvatun aseman ja kuvausajan.</span></label></div>}
                <div className="flex items-center justify-center gap-3"><button type="button" onClick={()=>void submit()} disabled={busy||locating||(conflict.reasons.length>0&&!conflictConfirmed)||!validObserved||!stationId||!validateFuelPrices(prices)} className="min-w-[120px] rounded-xl border-2 border-[#8bb56d] bg-[#e3edc9] px-8 py-2 text-lg font-black text-[#174c35] disabled:opacity-40">OK</button><button type="button" hidden={mode==="manual"} onClick={()=>setEditing(v=>!v)} className="rounded-xl border border-[#baa46a] px-4 py-2 text-sm font-bold">{editing?"Valmis":"Korjaa tietoja"}</button></div>
                <p className="text-center text-[11px] text-[#e5ddc6]">OK lähettää hintailmoituksen tarkistettavaksi.</p>
              </>}
            </div>}
          </div>
          {busy&&<p role="status" aria-live="polite" className="mt-3 text-center text-sm font-bold text-[#e3edc9]">{status||"Luetaan kuvaa…"}</p>}
          {error&&<p role="alert" className="mt-3 rounded-xl bg-[#ffe1cf] p-3 text-sm font-bold text-[#8b331d]">{error}</p>}
        </div>
      </div>
    </div>
  </div>;
}

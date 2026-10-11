"use client";
import {useEffect,useRef,useState} from "react";
import {fuelDistanceKm,parseFuelPhotoText,validateFuelPrices,type FuelPrices} from "../../../../lib/fuelPhoto";

type Station={id:string;name:string;chain?:string;address?:string;latitude:number;longitude:number};
type Worker={recognize:(image:string)=>Promise<{data:{text:string}}>;terminate:()=>Promise<unknown>};
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
  const [photo,setPhoto]=useState("");const [prices,setPrices]=useState<FuelPrices>({diesel:"",price95:"",price98:""});
  const [rawText,setRawText]=useState("");const [busy,setBusy]=useState(false);const [status,setStatus]=useState("");const [error,setError]=useState("");
  const [gps,setGps]=useState<{lat:number;lon:number;accuracy:number}|null>(null);const [stations,setStations]=useState<Station[]>([]);const [stationId,setStationId]=useState("");
  const [observed,setObserved]=useState("");const [mode,setMode]=useState<"online"|"offline">("offline");const [timeSource,setTimeSource]=useState("manual");const [locationSource,setLocationSource]=useState("manual");const [metadataInfo,setMetadataInfo]=useState("");const onlineInput=useRef<HTMLInputElement>(null);const onlineCapture=useRef<{time:string;gps:Promise<{lat:number;lon:number;accuracy:number}|null>}|null>(null);const [confirmed,setConfirmed]=useState(false);const [sent,setSent]=useState(false);const [locating,setLocating]=useState(false);
  const exifInstant=useRef<string|null>(null);const workerRef=useRef<Worker|null>(null);const alive=useRef(true);const gpsRequest=useRef(0);const requestId=useRef("");const closeRef=useRef<HTMLButtonElement>(null);const dialogRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{alive.current=true;const previous=document.activeElement as HTMLElement|null;closeRef.current?.focus();return()=>{alive.current=false;gpsRequest.current++;void workerRef.current?.terminate();previous?.focus();};},[]);
  async function findStations(location:{lat:number;lon:number;accuracy:number}|null){
    const id=++gpsRequest.current;setLocating(true);setStations([]);setStationId("");
    try{
      const response=await fetch(`/api/fuel/stations?lat=${location?.lat??64}&lon=${location?.lon??26}`,{cache:"no-store"});const data=await response.json();
      if(!response.ok || !data.ok)throw new Error("Asemien haku epäonnistui.");
      if(!alive.current || id!==gpsRequest.current)return;
      const list=(data.stations as Station[]).filter(s=>!/teboil/i.test(`${s.chain} ${s.name}`)).sort((a,b)=>location?fuelDistanceKm(location.lat,location.lon,a.latitude,a.longitude)-fuelDistanceKm(location.lat,location.lon,b.latitude,b.longitude):`${a.chain} ${a.name}`.localeCompare(`${b.chain} ${b.name}`,"fi"));
      setStations(list);setStationId(location?list[0]?.id||"":"");
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:"Asemien haku epäonnistui.");}finally{if(alive.current&&id===gpsRequest.current)setLocating(false);}
  }
  function startOnline(){
    setError("");setMode("online");setConfirmed(false);
    const location=new Promise<{lat:number;lon:number;accuracy:number}|null>(resolve=>{
      if(!navigator.geolocation){resolve(null);return;}
      navigator.geolocation.getCurrentPosition(position=>resolve({lat:position.coords.latitude,lon:position.coords.longitude,accuracy:position.coords.accuracy}),()=>resolve(null),{enableHighAccuracy:true,timeout:15000,maximumAge:0});
    });
    onlineCapture.current={time:localDateTime(),gps:location};onlineInput.current?.click();
  }
  async function readPhoto(file:File,source:"online"|"offline"){
    setBusy(true);setError("");setStatus("Valmistellaan kuvaa…");setConfirmed(false);setSent(false);setPrices({diesel:"",price95:"",price98:""});setRawText("");requestId.current=crypto.randomUUID();
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
      let location:{lat:number;lon:number;accuracy:number}|null=null;
      if(typeof meta?.latitude==="number"&&typeof meta.longitude==="number"&&Number.isFinite(meta.latitude)&&Number.isFinite(meta.longitude)&&Math.abs(meta.latitude)<=90&&Math.abs(meta.longitude)<=180){location={lat:meta.latitude,lon:meta.longitude,accuracy:0};setLocationSource("photo_exif");}
      else if(source==="online"&&onlineCapture.current){location=await onlineCapture.current.gps;if(location)setLocationSource("capture_session");}
      setGps(location);void findStations(location);
      setMetadataInfo(source==="offline"?`${validDate?"Kuvausaika luettu kuvasta.":"Kuvasta puuttuu kuvausaika: täydennä se."} ${location?"Sijainti luettu kuvasta.":"Kuvasta puuttuu sijainti: valitse asema itse."}`:"Tarkista kuvausaika ja asema. Selaimen kameravalinta voi sallia myös vanhan kuvan valinnan.");
      const data=await preparePhoto(file);if(!alive.current)return;setPhoto(data);
      const ocr=await loadOcr();if(!alive.current)return;
      const worker=await ocr.createWorker("eng",1,{logger:(message:{status?:string;progress?:number})=>{if(alive.current)setStatus(message.status==="recognizing text"?`Luetaan hintoja… ${Math.round((message.progress||0)*100)} %`:"Ladataan kuvalukijaa…");}});
      workerRef.current=worker;if(!alive.current){await worker.terminate();return;}
      const result=await worker.recognize(data);if(!alive.current)return;
      const parsed=parseFuelPhotoText(result.data.text);setPrices(parsed);setRawText(result.data.text);
      setStatus(Object.values(parsed).some(Boolean)?"Hinnat luettu. Tarkista numerot, asema ja havaintoaika.":"Hintoja ei tunnistettu varmasti. Voit korjata hinnat kuvasta tai ottaa uuden kuvan.");
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:"Kuvan lukeminen epäonnistui.");}
    finally{const worker=workerRef.current;workerRef.current=null;if(worker)await worker.terminate().catch(()=>{});if(alive.current)setBusy(false);}
  }
  async function submit(){
    if(!confirmed || !photo || !stationId || !validateFuelPrices(prices)){setError("Tarkista kuva, asema, havaintoaika ja vähintään yksi hinta.");return;}
    const date=new Date(exifInstant.current||observed);if(!observed || !Number.isFinite(date.getTime()) || date.getTime()>Date.now()+60000){setError("Havaintoaika ei saa olla tulevaisuudessa.");return;}
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/fuel/reports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:requestId.current,stationId,prices,photo,observedAt:date.toISOString(),gps,mode,timeSource,locationSource,confirmed:true})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Ilmoituksen lähettäminen epäonnistui.");
      if(alive.current){setSent(true);setStatus("Kiitos! Hintailmoitus tallennettiin esikatselun testikantaan tarkistettavaksi.");}
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:"Lähetys epäonnistui.");}finally{if(alive.current)setBusy(false);}
  }
  const input="w-full rounded-xl border-2 border-[#baa46a] bg-white px-3 py-2 text-[#174c35]";
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#173b2e]/65 p-5" onKeyDown={e=>{if(e.key==="Escape")onClose();if(e.key==="Tab"){const items=dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary');if(!items?.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="fuel-report-title" className="flex max-h-[90vh] w-full max-w-[850px] flex-col overflow-hidden rounded-[28px] border-[3px] border-[#17573c] bg-[#fff4cf] p-5 shadow-2xl">
      <header className="mb-4 flex items-center justify-between gap-3"><div><h2 id="fuel-report-title" className="text-2xl font-black text-[#174c35]">Ilmoita polttoainehintoja</h2><p className="text-sm text-[#6d604c]">Kuvaa hintataulu ja tarkista hinnat ennen lähettämistä.</p></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Sulje hintailmoitus" className="h-10 w-10 shrink-0 rounded-full border-2 border-[#17573c] text-xl">×</button></header>
      <div className="min-h-0 overflow-y-auto"><div className="grid gap-5 md:grid-cols-2"><div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button type="button" disabled={busy||sent||locating} onClick={startOnline} className="rounded-2xl border-2 border-[#17573c] bg-[#e3edc9] p-3 font-black text-[#174c35]">📷 Lisää kuva online<span className="block text-xs font-normal">Ota uusi kuva</span></button>
          <label className="cursor-pointer rounded-2xl border-2 border-[#baa46a] bg-[#f7e7bd] p-3 text-center font-black">▣ Lisää kuva offline<span className="block text-xs font-normal">Valitse aiempi kuva</span><input aria-label="Valitse aiempi hintataulun kuva" type="file" accept="image/*" disabled={busy||sent||locating} className="mt-2 block w-full text-xs font-normal" onChange={e=>{const file=e.target.files?.[0];e.target.value="";if(file)void readPhoto(file,"offline");}}/></label>
          <input ref={onlineInput} aria-label="Ota uusi hintataulun kuva" type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>{const file=e.target.files?.[0];e.target.value="";if(file)void readPhoto(file,"online");}}/>
        </div>
        {photo?<img src={photo} alt="Ilmoituksen hintataulu" className="max-h-[310px] w-full rounded-xl object-contain"/>:<div className="grid h-44 place-items-center rounded-xl border-2 border-dashed border-[#baa46a] text-sm text-[#6d604c]">Hintataulun kuva näkyy tässä</div>}
        {rawText&&<details className="mt-3 text-xs"><summary className="cursor-pointer font-bold">Näytä kuvasta luettu teksti</summary><pre className="mt-2 whitespace-pre-wrap">{rawText}</pre></details>}
      </div><div className="space-y-3">
        <p className="rounded-xl bg-[#e3edc9] p-3 text-xs text-[#174c35]">{metadataInfo||"Kuvan kuvausaika ja sijainti luetaan automaattisesti, jos ne ovat mukana."}</p>
        {locating&&<p role="status" className="text-xs">Haetaan asemia…</p>}
        {gps&&<p className="text-xs text-[#6d604c]">{locationSource==="photo_exif"?"Asemat kuvan sijainnin mukaan.":`Kuvaamisen yhteydessä saatu GPS, tarkkuus noin ${Math.round(gps.accuracy)} m.`}</p>}
        <label className="block text-sm font-bold">Asema<select value={stationId} disabled={!stations.length||busy||sent} onChange={e=>{setStationId(e.target.value);setConfirmed(false);}} className={input}><option value="">Valitse kuvassa oleva asema</option>{stations.map(s=><option key={s.id} value={s.id}>{s.chain} · {s.name} · {s.address}{gps?` · ${fuelDistanceKm(gps.lat,gps.lon,s.latitude,s.longitude).toFixed(1)} km`:""}</option>)}</select></label>
        <div className="grid grid-cols-3 gap-2">{([['diesel','Diesel'],['price95','95 E10'],['price98','98 E5']] as const).map(([key,label])=><label key={key} className="text-sm font-bold">{label}<input aria-label={`${label} hinta euroa litralta`} inputMode="decimal" placeholder="–" value={prices[key]} disabled={busy||sent} onChange={e=>{setPrices(p=>({...p,[key]:e.target.value}));setConfirmed(false);}} className={input+" text-lg font-black"}/></label>)}</div>
        <p className="text-xs text-[#6d604c]">€/l. Jätä puuttuva hinta tyhjäksi.</p>
        <label className="block text-sm font-bold">Milloin kuva otettiin?<input type="datetime-local" value={observed} disabled={busy||sent} onChange={e=>{exifInstant.current=null;setObserved(e.target.value);setTimeSource("manual");setConfirmed(false);}} className={input}/></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy||sent} onChange={e=>setConfirmed(e.target.checked)} className="mt-1"/><span>Tarkistin kuvasta hinnat, aseman ja kuvausajan.</span></label>
        <button type="button" onClick={()=>void submit()} disabled={busy||sent||!confirmed||!photo||!observed||!stationId||!validateFuelPrices(prices)} className="w-full rounded-xl border-2 border-[#123d2b] bg-[#17573c] px-4 py-3 font-black text-white disabled:opacity-40">{sent?"Ilmoitus tallennettu":busy?"Odota…":"Lähetä hintailmoitus"}</button>
        <p className="text-xs text-[#6d604c]">Esikatselun ilmoitukset ja kuvat tallennetaan testikantaan tarkistettavaksi. Ne eivät vielä muuta julkaistuja hintoja.</p>
      </div></div><p role="status" aria-live="polite" className="mt-4 text-sm font-bold text-[#17573c]">{status}</p>{error&&<p role="alert" className="mt-2 rounded-xl bg-[#ffe1cf] p-3 text-sm font-bold text-[#8b331d]">{error}</p>}</div>
    </div>
  </div>;
}

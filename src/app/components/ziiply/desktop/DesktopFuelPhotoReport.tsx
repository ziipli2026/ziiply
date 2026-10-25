"use client";
import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {readFuelPhoto} from "../../../../lib/fuelPhotoOcr";
import {findFuelLedRows,selectFuelBurstRows} from "../../../../lib/fuelPhotoLed";
import {comparePhotoEvidence,validateFuelStationLocation,identifyFuelPhotoStation,fuelDistanceKm,validateFuelPrices,type FuelPrices,type PhotoEvidence} from "../../../../lib/fuelPhoto";

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
    const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.js";script.async=true;
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
async function prepareLearningPhoto(file:File,fallback:string){
  // Detect the LED rows in the same orientation as the local OCR image, then
  // crop from the original full-resolution photo to preserve individual segments.
  const reference=new Image();reference.src=fallback;await reference.decode();
  const sample=document.createElement("canvas");sample.width=reference.width;sample.height=reference.height;
  const sampleContext=sample.getContext("2d");if(!sampleContext)return fallback;
  sampleContext.drawImage(reference,0,0);
  const pixels=sampleContext.getImageData(0,0,sample.width,sample.height);
  const rows=findFuelLedRows(pixels.data,sample.width,sample.height);
  if(!rows.length)return fallback;
  const url=URL.createObjectURL(file);
  try{
    const original=new Image();original.src=url;await original.decode();
    // Canvas rendering follows the EXIF orientation in both decode paths.
    const sx=original.width/sample.width,sy=original.height/sample.height;
    const bands=rows.slice(0,6).map(row=>{
      const h=row.bottom-row.top,w=row.right-row.left;
      return {left:Math.max(0,Math.floor((row.left-w*1.55)*sx)),right:Math.min(original.width,Math.ceil((row.right+w*.2)*sx)),top:Math.max(0,Math.floor((row.top-h*.3)*sy)),bottom:Math.min(original.height,Math.ceil((row.bottom+h*.3)*sy))};
    }).filter(b=>b.right>b.left&&b.bottom>b.top);
    if(!bands.length)return fallback;
    const maxWidth=1600,margin=18,bandHeight=240,overviewHeight=440;
    const output=document.createElement("canvas");output.width=maxWidth;output.height=bands.length*(bandHeight+margin)+margin+overviewHeight;
    const ctx=output.getContext("2d");if(!ctx)return fallback;
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,output.width,output.height);
    // Keep the full board logo: price-only strips cannot identify a station chain.
    const overviewScale=Math.min((maxWidth-margin*2)/original.width,(overviewHeight-margin*2)/original.height);
    ctx.drawImage(original,(maxWidth-original.width*overviewScale)/2,margin,original.width*overviewScale,original.height*overviewScale);
    bands.forEach((b,i)=>{
      const w=b.right-b.left,h=b.bottom-b.top,scale=Math.min((maxWidth-margin*2)/w,bandHeight/h);
      const dw=Math.round(w*scale),dh=Math.round(h*scale);
      ctx.drawImage(original,b.left,b.top,w,h,margin,overviewHeight+margin+i*(bandHeight+margin)+(bandHeight-dh)/2,dw,dh);
    });
    const compact=output.toDataURL("image/jpeg",.88);
    return compact.length<=3800000?compact:fallback;
  }catch{return fallback;}finally{URL.revokeObjectURL(url);}
}
export default function DesktopFuelPhotoReport({onClose,embedded=false}:{onClose:()=>void;embedded?:boolean}){
  const [learningInfo,setLearningInfo]=useState("");
  const [recognitionActive,setRecognitionActive]=useState(false);
  const learningToken=useRef("");const learningTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const confirmedPrices=useRef<Partial<Record<keyof FuelPrices,boolean>>>({});
  const [photoBrand,setPhotoBrand]=useState("");const stationChoiceEdited=useRef(false);const capturingBurst=useRef(false);
  const priceEdits=useRef<Partial<Record<keyof FuelPrices,boolean>>>({});
  // Warm up the OCR runtime while the user is choosing a photo, not after selection.
  const warmWorker=useRef<Promise<Worker>|null>(null);
  const debugStarted=useRef(0);
  useEffect(()=>{
    let cancelled=false;
    const pending=loadOcr().then(ocr=>ocr.createWorker("eng",1,{}));
    warmWorker.current=pending;
    void pending.then(()=>logDebug("ocr-prewarm-ready",{})).catch(e=>logDebug("ocr-prewarm-error",{message:String(e)}));
    void pending.then(worker=>{if(cancelled)void worker.terminate().catch(()=>{});}).catch(()=>{if(warmWorker.current===pending)warmWorker.current=null;});
    return ()=>{cancelled=true;};
  },[]);

  useEffect(()=>()=>{if(learningTimer.current)clearTimeout(learningTimer.current);},[]);
  async function pollLearning(id:string,token:string,round=0){
    if(!alive.current||requestId.current!==id)return;
    if(round>=20){setRecognitionActive(false);logDebug("recovery-timeout",{round});setLearningInfo("60 sekunnin aikaraja täyttyi. Puuttuvia hintoja ei tunnistettu; voit syöttää ne käsin.");return;}
    try{const pollStarted=performance.now();const response=await fetch(`/api/fuel/photo-learning?id=${id}`,{headers:{"x-fuel-photo-token":token},cache:"no-store"});const result=await response.json();logDebug("recovery-poll",{round,httpStatus:response.status,durationMs:Math.round(performance.now()-pollStarted),status:result.status,attempts:result.attempts,prices:result.prices,error:result.error});
      if(!alive.current||requestId.current!==id)return;
      if(typeof result.brand==="string")setPhotoBrand(result.brand);
      if((result.prices && Object.keys(result.prices).length)||(result.provisionalPrices&&Object.keys(result.provisionalPrices).length)){
        setPrices(previous=>{const next={...previous};for(const key of ["diesel","price95","price98"] as const)if(!priceEdits.current[key]){const confirmed=typeof result.prices?.[key]==="number";const value=confirmed?result.prices[key]:result.provisionalPrices?.[key];if(typeof value==="number"&&(confirmed||!confirmedPrices.current[key])){next[key]=value.toFixed(3).replace(".",",");if(confirmed)confirmedPrices.current[key]=true;}}return next;});
        setPriceReview(true);setLearningInfo("");if(result.status==="recovered"){setRecognitionActive(false);return;}
      }
      if(result.status==="discarded"){setRecognitionActive(false);setLearningInfo("Taustaluku päättyi. Kuvasta ei saatu riittävän varmaa tulosta. Tarkista hinnat kuvasta tai syötä ne käsin.");return;}
      if(result.status==="corrected"){setRecognitionActive(false);return;}
    }catch(e){logDebug("recovery-poll-error",{round,message:String(e)});}
    learningTimer.current=setTimeout(()=>void pollLearning(id,token,round+1),3000);
  }
  async function saveLearningPhoto(file:File,data:string,initial:FuelPrices,text:string){
    const id=requestId.current,token=crypto.randomUUID();learningToken.current=token;
    setLearningInfo("");
    setRecognitionActive(true);
    try{const prepareStarted=performance.now();logDebug("recovery-prepare-start",{});const photo=await prepareLearningPhoto(file,data);logDebug("recovery-prepare-complete",{durationMs:Math.round(performance.now()-prepareStarted),photoBytes:photo.length});const postStarted=performance.now();logDebug("recovery-post-start",{});const response=await fetch("/api/fuel/photo-learning",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,token,photo,prices:initial,ocrText:text,mode})});
      logDebug("recovery-post-response",{httpStatus:response.status,durationMs:Math.round(performance.now()-postStarted)});if(!response.ok)throw Error("Photo recovery save failed");logDebug("photo-recovery-saved",{id});
      if(alive.current&&requestId.current===id){setLearningInfo("");void pollLearning(id,token);}
    }catch(e){logDebug("recovery-save-error",{message:String(e)});if(alive.current&&requestId.current===id)setLearningInfo("Kuvan tallennus taustalukua varten epäonnistui. Yritä lisätä kuva uudelleen.");}
  }
  const [debugOpen,setDebugOpen]=useState(false);
  const [debugNotice,setDebugNotice]=useState("");
  const debugEvents=useRef<{time:string;elapsedMs?:number|null;event:string;details:unknown}[]>([]);
  function logDebug(event:string,details:unknown){
    debugEvents.current=[...debugEvents.current.slice(-499),{time:new Date().toISOString(),elapsedMs:debugStarted.current?Math.round(performance.now()-debugStarted.current):null,event,details}];
  }
  function debugText(){return JSON.stringify({version:"fuel-photo-debug-2",exportedAt:new Date().toISOString(),browser:navigator.userAgent,mode,fileEvents:debugEvents.current,gps,evidence,locationSource,timeSource,metadataInfo,stationId,stationCount:stations.length,prices,ocrText:rawText,status,error},null,2);}
  function downloadDebug(){
    const url=URL.createObjectURL(new Blob([debugText()],{type:"application/json"}));
    const link=document.createElement("a");link.href=url;link.download=`ziiply-fuel-debug-${Date.now()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function copyDebug(){
    try{await navigator.clipboard.writeText(debugText());setDebugNotice("Kopioitu.");}
    catch{setDebugNotice("Kopiointi ei onnistunut. Valitse teksti alta tai lataa tiedosto.");}
  }
  const [priceReview,setPriceReview]=useState(false);
  const [evidence,setEvidence]=useState<PhotoEvidence>({photoGps:null,deviceGps:null,photoTime:null,captureTime:null});const [conflictConfirmed,setConflictConfirmed]=useState(false);const [photo,setPhoto]=useState("");const [prices,setPrices]=useState<FuelPrices>({diesel:"",price95:"",price98:""});
  const [rawText,setRawText]=useState("");const [busy,setBusy]=useState(false);const [status,setStatus]=useState("");const [error,setError]=useState("");
  const [gps,setGps]=useState<{lat:number;lon:number;accuracy:number}|null>(null);const [stations,setStations]=useState<Station[]>([]);const [stationId,setStationId]=useState("");
  const autoTime=useRef(false);const [observed,setObserved]=useState("");const [mode,setMode]=useState<"online"|"offline"|"manual">("offline");const [timeSource,setTimeSource]=useState("manual");const [locationSource,setLocationSource]=useState("manual");const [metadataInfo,setMetadataInfo]=useState("");const [cameraOpen,setCameraOpen]=useState(false);const [cameraReady,setCameraReady]=useState(false);const [captureCountdown,setCaptureCountdown]=useState<number|null>(null);const countdownTimer=useRef<ReturnType<typeof setInterval>|null>(null);const [guideOrientation,setGuideOrientation]=useState<"portrait"|"landscape">("portrait");const videoRef=useRef<HTMLVideoElement>(null);const fuelGuideRef=useRef<HTMLDivElement>(null);const streamRef=useRef<MediaStream|null>(null);const offlineInput=useRef<HTMLInputElement>(null);const onlineCapture=useRef<{time:string;gps:Promise<{lat:number;lon:number;accuracy:number}|null>}|null>(null);const [editing,setEditing]=useState(false);const [sent,setSent]=useState(false);const [locating,setLocating]=useState(false);
  const conflict=comparePhotoEvidence(mode,evidence);
  const exifInstant=useRef<string|null>(null);const workerRef=useRef<Worker|null>(null);const alive=useRef(true);const gpsRequest=useRef(0);const requestId=useRef("");const closeRef=useRef<HTMLButtonElement>(null);const dialogRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!photoBrand||!gps||!stations.length||mode==='manual'||stationChoiceEdited.current)return;
    const identified=identifyFuelPhotoStation(stations,gps,photoBrand,comparePhotoEvidence(mode,evidence).reasons.length>0);
    if(identified)setStationId(identified);
  },[photoBrand,gps?.lat,gps?.lon,gps?.accuracy,stations,mode,evidence]);
  useEffect(()=>{alive.current=true;const previous=document.activeElement as HTMLElement|null;/* Do not autofocus the close button; Safari otherwise draws a permanent blue focus ring. */return()=>{alive.current=false;gpsRequest.current++;void workerRef.current?.terminate();previous?.focus();};},[]);
  useEffect(()=>{const timer=setInterval(()=>{if(autoTime.current)setObserved(localDateTime());},1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{let cancelled=false;void requestCaptureLocation().then(location=>{if(cancelled||!alive.current)return;setGps(location);logDebug("report-open-location",{location});});return()=>{cancelled=true;};},[]);
  function stopCamera(){if(countdownTimer.current){clearInterval(countdownTimer.current);countdownTimer.current=null;}setCaptureCountdown(null);streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;setCameraOpen(false);setCameraReady(false);}
  useEffect(()=>{
    if(!cameraOpen)return;
    let cancelled=false;let stream:MediaStream|null=null;
    async function open(){
      try{
        if(!navigator.mediaDevices?.getUserMedia)throw new Error("Kamera ei ole käytettävissä tässä selaimessa. Lisää kuva offline-valinnalla.");
        stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080}},audio:false});
        if(cancelled){stream.getTracks().forEach(track=>track.stop());return;}
        logDebug("camera-ready",stream.getVideoTracks()[0]?.getSettings());
        streamRef.current=stream;
        if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play();}
      }catch(e){
        if(cancelled)return;
        stream?.getTracks().forEach(track=>track.stop());streamRef.current=null;setCameraOpen(false);
        setError(e instanceof DOMException&&e.name==="NotAllowedError"?"Salli kameran käyttö selaimen asetuksista ja kokeile uudelleen.":e instanceof DOMException&&e.name==="NotFoundError"?"Laitteesta ei löytynyt kameraa. Voit lisätä kuvan offline-valinnalla.":e instanceof Error?e.message:"Kameran avaaminen epäonnistui.");
      }
    }
    void open();
    return()=>{cancelled=true;stream?.getTracks().forEach(track=>track.stop());if(streamRef.current===stream)streamRef.current=null;};
  },[cameraOpen]);
  async function findStations(location:{lat:number;lon:number;accuracy:number}|null){
    const id=++gpsRequest.current;setLocating(true);setStations([]);setStationId("");
    try{
      const response=await fetch(`/api/fuel/stations?lat=${location?.lat??64}&lon=${location?.lon??26}${location?"&maxDistanceKm=10&limit=30":""}`,{cache:"no-store"});const data=await response.json();
      logDebug("stations-response",{httpStatus:response.status,ok:data.ok,error:data.error,total:data.total,count:data.stations?.length,location});
      if(!response.ok || !data.ok)throw new Error("Asemien haku epäonnistui.");
      if(!alive.current || id!==gpsRequest.current)return [];
      const list=(data.stations as Station[]).filter(s=>!/teboil/i.test(`${s.chain} ${s.name}`) && (!location || fuelDistanceKm(location.lat,location.lon,s.latitude,s.longitude)<=10)).sort((a,b)=>location?fuelDistanceKm(location.lat,location.lon,a.latitude,a.longitude)-fuelDistanceKm(location.lat,location.lon,b.latitude,b.longitude):`${a.chain} ${a.name}`.localeCompare(`${b.chain} ${b.name}`,"fi"));
      setStations(list);setStationId("");return list;
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:"Asemien haku epäonnistui.");}finally{if(alive.current&&id===gpsRequest.current)setLocating(false);}
  }
  function startManual(){
    if(learningTimer.current)clearTimeout(learningTimer.current);learningToken.current="";setLearningInfo("");stopCamera();autoTime.current=true;setMode("manual");setPhoto("");setPrices({diesel:"",price95:"",price98:""});setObserved(localDateTime());setGps(null);setEvidence({photoGps:null,deviceGps:null,photoTime:null,captureTime:null});setConflictConfirmed(false);setTimeSource("manual");setLocationSource("manual");setPriceReview(false);setEditing(true);setSent(false);setError("");setStatus("");setRawText("");exifInstant.current=null;onlineCapture.current=null;requestId.current=crypto.randomUUID();void (async()=>{const location=await requestCaptureLocation();if(!alive.current)return;setGps(location);setLocationSource(location?"current_device":"manual");setEvidence({photoGps:null,deviceGps:location,photoTime:null,captureTime:null});setMetadataInfo(location?"Sijainti haettu uudelleen hintailmoituksen alussa. Tarkista asema.":"Nykyistä GPS-sijaintia ei saatu. Valitse asema itse.");const candidates=await findStations(location);if(!alive.current)return;if(location){const identified=identifyFuelPhotoStation(candidates||[],location,"",false);logDebug("manual-station-identification",{identified,location,nearestStationId:candidates?.[0]?.id??null});}})();
  }
  function startOnline(){
    logDebug("camera-open",{time:new Date().toISOString()});
    onlineCapture.current={time:"",gps:requestCaptureLocation()};
    autoTime.current=false;setError("");setMode("online");setEditing(false);setSent(false);setStatus("");setCameraReady(false);setCameraOpen(true);
  }
  function startTimedCapture(){
    if(!cameraReady||captureCountdown!==null)return;
    let remaining=3;
    setCaptureCountdown(remaining);
    countdownTimer.current=setInterval(()=>{
      remaining-=1;
      if(remaining<=0){if(countdownTimer.current)clearInterval(countdownTimer.current);countdownTimer.current=null;setCaptureCountdown(null);void capturePhoto();}
      else setCaptureCountdown(remaining);
    },1000);
  }
  function requestCaptureLocation(){
    return new Promise<{lat:number;lon:number;accuracy:number}|null>(resolve=>{
      if(!navigator.geolocation){logDebug("gps-unavailable",{});resolve(null);return;}
      logDebug("gps-request",{enableHighAccuracy:true,timeout:20000,maximumAge:0});
      navigator.geolocation.getCurrentPosition(position=>{
        logDebug("gps-result",{timestamp:position.timestamp,ageMs:Date.now()-position.timestamp,latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy});
        // Reject stale fixes even if the browser ignores maximumAge.
        resolve(Date.now()-position.timestamp<=15000?{lat:position.coords.latitude,lon:position.coords.longitude,accuracy:position.coords.accuracy}:null);
      },failure=>{logDebug("gps-error",{code:failure.code,message:failure.message});resolve(null);},{enableHighAccuracy:true,timeout:20000,maximumAge:0});
    });
  }
  async function capturePhoto(){
    const video=videoRef.current;
    if(capturingBurst.current||!cameraReady||!video?.videoWidth||!video.videoHeight)return;
    const canvas=document.createElement("canvas");
    const guide=fuelGuideRef.current;
    const videoRect=video.getBoundingClientRect();
    const guideRect=guide?.getBoundingClientRect();
    // Match the landscape object-cover preview to the actual captured pixels.
    // Portrait mode retains the original full-frame capture.
    let sx=0,sy=0,sw=video.videoWidth,sh=video.videoHeight;
    if(guideOrientation==="landscape"&&guideRect&&videoRect.width>0&&videoRect.height>0){
      const scale=Math.max(videoRect.width/video.videoWidth,videoRect.height/video.videoHeight);
      const renderedWidth=video.videoWidth*scale,renderedHeight=video.videoHeight*scale;
      const left=videoRect.left+(videoRect.width-renderedWidth)/2;
      const top=videoRect.top+(videoRect.height-renderedHeight)/2;
      const x1=Math.max(0,Math.min(video.videoWidth,(guideRect.left-left)/scale));
      const y1=Math.max(0,Math.min(video.videoHeight,(guideRect.top-top)/scale));
      const x2=Math.max(0,Math.min(video.videoWidth,(guideRect.right-left)/scale));
      const y2=Math.max(0,Math.min(video.videoHeight,(guideRect.bottom-top)/scale));
      if(x2-x1>=32&&y2-y1>=32){sx=x1;sy=y1;sw=x2-x1;sh=y2-y1;}
    }
    const captureScale=Math.min(1,1600/Math.max(sw,sh));
    canvas.width=Math.round(sw*captureScale);canvas.height=Math.round(sh*captureScale);
    const context=canvas.getContext("2d");if(!context){setError("Kuvan ottaminen epäonnistui.");return;}
    capturingBurst.current=true;setCameraReady(false);setBusy(true);
    const location=requestCaptureLocation();
    onlineCapture.current={time:localDateTime(),gps:location};
    try{
      const frames:ImageData[]=[];
      for(let frame=0;frame<6;frame++){
        if(!alive.current||streamRef.current?.active!==true)return;
        // Unequal delays sample different phases of a pulsing LED display.
        if(frame)await new Promise(resolve=>setTimeout(resolve,113+frame*7));
        if(!alive.current||streamRef.current?.active!==true)return;
        context.drawImage(video,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
        frames.push(context.getImageData(0,0,canvas.width,canvas.height));
      }
      // Analyze a small copy; keep full resolution only for the selected output rows.
      const sample=document.createElement('canvas');const scale=Math.min(1,480/canvas.width);
      sample.width=Math.round(canvas.width*scale);sample.height=Math.round(canvas.height*scale);
      const sampleContext=sample.getContext('2d')!;
      const analysis=frames.map(frame=>{context.putImageData(frame,0,0);sampleContext.drawImage(canvas,0,0,sample.width,sample.height);return sampleContext.getImageData(0,0,sample.width,sample.height).data;});
      const bands=selectFuelBurstRows(analysis,sample.width,sample.height).map(b=>({...b,top:Math.max(0,Math.floor(b.top/scale)),bottom:Math.min(canvas.height,Math.ceil(b.bottom/scale))}));
      context.putImageData(frames[0],0,0);
      // Each band, including its fuel label, comes from one actual frame.
      // Do not synthesize digits or combine different prices within a row.
      for(const band of bands)context.putImageData(frames[band.frame],0,0,0,band.top,canvas.width,band.bottom-band.top);
      logDebug('live-burst-selected',{frames:frames.length,bands:bands.map(({top,bottom,frame})=>({top,bottom,frame}))});
    }catch(error){setError(error instanceof Error?error.message:'Videoruutujen lukeminen epäonnistui.');setBusy(false);return;}
    finally{capturingBurst.current=false;stopCamera();if(alive.current)setBusy(false);}
    canvas.toBlob(blob=>{
      if(!alive.current)return;
      if(!blob){setBusy(false);setError("Kuvan ottaminen epäonnistui. Kokeile uudelleen.");return;}
      void readPhoto(new File([blob],"hintataulu.jpg",{type:"image/jpeg"}),"online");
    },"image/jpeg",0.95);
  }
  async function readPhoto(file:File,source:"online"|"offline"){
    if(learningTimer.current)clearTimeout(learningTimer.current);learningToken.current="";priceEdits.current={};confirmedPrices.current={};setLearningInfo("");
    let recoveryData="",recoverySaved=false;
    debugStarted.current=performance.now();debugEvents.current=[];
    logDebug("photo-file",{source,name:file.name,type:file.type,size:file.size,lastModified:file.lastModified});
    autoTime.current=false;setBusy(true);setPriceReview(false);setPhoto("");setError("");setStatus("Luetaan hintoja…");setRecognitionActive(true);setConflictConfirmed(false);setEvidence({photoGps:null,deviceGps:null,photoTime:null,captureTime:null});setEditing(true);setSent(false);setPrices({diesel:"",price95:"",price98:""});setRawText("");setPhotoBrand("");stationChoiceEdited.current=false;requestId.current=crypto.randomUUID();
    try{
      setMode(source);setGps(null);setObserved("");setTimeSource("manual");setLocationSource("manual");setMetadataInfo("");
      let meta:PhotoMeta|undefined;
      let metadataFailed=false;
      if(source==="offline")try{const reader=await loadMetadata();meta=await reader.parse(file,{reviveValues:false});}catch(failure){metadataFailed=true;logDebug("metadata-error",{message:failure instanceof Error?failure.message:String(failure)});}
      logDebug("metadata-result",{source,metadataFailed,metadata:meta??null});
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
      const checkedEvidence={photoGps,deviceGps,photoTime,captureTime};logDebug("photo-evidence",checkedEvidence);setEvidence(checkedEvidence);
      const checked=comparePhotoEvidence(source,checkedEvidence);
      const location=photoGps||deviceGps;
      setLocationSource(photoGps?"photo_exif":deviceGps?"capture_session":"manual");
      setGps(location);const stationSearch=findStations(location);
      // Identify the station as soon as the GPS lookup finishes, independently of OCR.
      void stationSearch.then(candidates=>{
        if(!alive.current)return;
        const identified=identifyFuelPhotoStation(candidates||[],location,"",checked.reasons.length>0);
        if(!stationChoiceEdited.current)setStationId(identified);
        logDebug("station-identification-early",{identified,location});
      });
      setMetadataInfo(source==="offline"?`${validDate?"Kuvausaika luettu kuvasta.":"Kuvasta puuttuu kuvausaika: täydennä se."} ${location?"Sijainti luettu kuvasta.":metadataFailed?"Kuvan sijaintitietojen lukeminen epäonnistui: valitse asema itse.":"Kuvasta ei löytynyt sijaintitietoja: valitse asema itse."}`:deviceGps?"Kuvaushetken sijainti haettu. Tarkista asema ja kuvausaika.":"Kuvaushetken sijaintia ei saatu. Tarkista selaimen sijaintilupa ja valitse asema itse.");
      logDebug("photo-prepare-start",{});const data=await preparePhoto(file);logDebug("photo-prepare-complete",{dataLength:data.length});recoveryData=data;if(!alive.current)return;setPhoto(data);
      // Start independent server-side vision immediately, in parallel with local OCR.
      // Do not wait for the 15–20-second Tesseract pass before queuing recovery.
      recoverySaved=true;
      void saveLearningPhoto(file,data,{diesel:"",price95:"",price98:""},"");
      logDebug("ocr-worker-await-start",{prewarmed:!!warmWorker.current});const worker=await (warmWorker.current??loadOcr().then(ocr=>ocr.createWorker("eng",1,{})));logDebug("ocr-worker-ready",{});
      warmWorker.current=null;
      workerRef.current=worker;if(!alive.current){await worker.terminate();return;}
      logDebug("local-ocr-start",{});const result=await readFuelPhoto(worker,data,partial=>{logDebug("local-price-progress",{partial});if(alive.current){setPrices(previous=>({...previous,...Object.fromEntries(Object.entries(partial).filter(([key,value])=>Boolean(value)&&!priceEdits.current[key as keyof FuelPrices]&&!confirmedPrices.current[key as keyof FuelPrices]))}));setPriceReview(true);}},(stage,details)=>logDebug("ocr-"+stage,details));logDebug("local-ocr-complete",{prices:result.prices,review:result.review});if(!alive.current)return;
      const parsed=result.prices;setPrices(previous=>({...previous,...Object.fromEntries(Object.entries(parsed).filter(([key,value])=>Boolean(value)&&!priceEdits.current[key as keyof FuelPrices]&&!confirmedPrices.current[key as keyof FuelPrices]))}));setRawText(result.text);setPriceReview(result.review||!validateFuelPrices(parsed));
      const candidates=await stationSearch;if(!alive.current)return;const identified=identifyFuelPhotoStation(candidates||[],location,result.text,checked.reasons.length>0);const gpsIdentified=identifyFuelPhotoStation(candidates||[],location,"",checked.reasons.length>0);const finalIdentified=identified||gpsIdentified;setStationId(previous=>stationChoiceEdited.current?previous:finalIdentified||previous);logDebug("station-identification",{identified,location,conflict:checked,candidates:(candidates||[]).slice(0,10).map(s=>({id:s.id,name:s.name,chain:s.chain,distanceM:location?Math.round(fuelDistanceKm(location.lat,location.lon,s.latitude,s.longitude)*1000):null}))});
      setStatus(Object.values(parsed).some(Boolean)?"Hinnat luettu. Tarkista numerot, asema ja havaintoaika.":"Hintoja ei tunnistettu varmasti. Voit korjata hinnat kuvasta tai ottaa uuden kuvan.");
    }catch(e){logDebug("read-photo-error",{message:String(e)});if(recoveryData&&!recoverySaved)await saveLearningPhoto(file,recoveryData,{diesel:"",price95:"",price98:""},"");if(alive.current)setError(e instanceof Error?e.message:"Kuvan lukeminen epäonnistui.");}
    finally{const worker=workerRef.current;workerRef.current=null;if(worker)await worker.terminate().catch(()=>{});if(alive.current)setBusy(false);logDebug("read-photo-finished",{});}
  }
  async function submit(){
    if((conflict.reasons.length>0&&!conflictConfirmed) || (mode!=="manual"&&!photo) || !stationId || !validateFuelPrices(prices)){setError("Tarkista kuva, asema, havaintoaika ja vähintään yksi hinta.");return;}
    const date=new Date(exifInstant.current||observed);if(!observed || !Number.isFinite(date.getTime()) || date.getTime()>Date.now()+60000){setError("Havaintoaika ei saa olla tulevaisuudessa.");return;}
    setBusy(true);setError("");setStatus("Lähetetään hintailmoitusta…");
    try{
      const response=await fetch("/api/fuel/reports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:requestId.current,stationId,prices,photo,observedAt:date.toISOString(),gps,mode,timeSource,locationSource,evidence,conflictConfirmed,confirmed:true,learningToken:learningToken.current||undefined})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Ilmoituksen lähettäminen epäonnistui.");
      if(alive.current){setSent(true);setStatus(data.environment==="production"?"Kiitos! Hintailmoitus tallennettiin tarkistettavaksi.":"Kiitos! Hintailmoitus tallennettiin testikantaan tarkistettavaksi.");}
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:"Lähetys epäonnistui.");}finally{if(alive.current)setBusy(false);}
  }
  const input="w-full rounded-xl border border-[#baa46a] bg-[#fffaf0] px-3 py-1.5 text-[#174c35]";
  const selectedStation=stations.find(s=>s.id===stationId);
  const stationLocation=selectedStation?validateFuelStationLocation(mode,evidence,selectedStation):null;
  const stationLocationError=stationLocation&&!stationLocation.ok?stationLocation.error:'';
  const observedInstant=Date.parse(exifInstant.current||observed);
  const validObserved=Boolean(observed)&&Number.isFinite(observedInstant)&&observedInstant<=Date.now()+60000;
  const priceLabels={diesel:"Diesel",price95:"95 E10",price98:"98 E5"} as const;
  const invalidPrices=(Object.keys(priceLabels) as (keyof typeof priceLabels)[]).filter(key=>{
    const raw=prices[key];if(!String(raw??"").trim())return false;
    const value=Number(String(raw).replace(",","."));
    return !Number.isFinite(value)||value<0.5||value>5;
  });
  const missingReasons=[
    ...(!stationId?["Valitse kuvassa oleva asema."]:[]),
    ...(stationLocationError?[stationLocationError]:[]),
    ...(!validObserved?["Tarkista kuvausaika."]:[]),
    ...(invalidPrices.length?["Korjaa virheelliset hinnat: "+invalidPrices.map(key=>priceLabels[key]).join(", ")+" (sallittu 0,50–5,00 €/l)."]:[]),
    ...(!invalidPrices.length&&!validateFuelPrices(prices)?["Anna vähintään yksi polttoainehinta."]:[]),
    ...(conflict.reasons.length>0&&!conflictConfirmed?["Vahvista kuvan sijainti- tai aikapoikkeama."]:[])
  ];
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#173b2e]/65 p-2" onKeyDown={e=>{if(e.key==="Escape")onClose();if(e.key==="Tab"){const items=dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary');if(!items?.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="fuel-report-title" className="flex h-[min(680px,calc(100dvh-16px))] w-full max-w-[720px] flex-col rounded-[28px] border-[3px] border-[#17573c] bg-[#fff4cf] p-3 shadow-2xl">
      <header className="mb-2 flex shrink-0 items-center justify-between gap-3"><div><h2 id="fuel-report-title" className="text-xl font-black text-[#174c35]">Ilmoita polttoainehintoja</h2><p className="text-sm text-[#6d604c]">Lisää hintataulun kuva tai syötä hinnat käsin.</p></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Sulje hintailmoitus" className="h-10 w-10 shrink-0 rounded-full border-2 border-[#17573c] text-xl">×</button></header>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 grid shrink-0 grid-cols-3 gap-2">
          <button type="button" disabled={busy||sent||locating||cameraOpen} onClick={startOnline} className="min-h-[48px] rounded-2xl border-2 border-[#17573c] bg-[#e3edc9] px-3 py-2 font-black text-[#174c35] disabled:opacity-40">Ota kuva online<span className="mt-1 block text-xs font-medium">Uusi kuva</span></button>
          <button type="button" disabled={busy||sent||locating} onClick={()=>{stopCamera();offlineInput.current?.click();}} className="min-h-[48px] rounded-2xl border-2 border-[#9a7a47] bg-[#f7e7bd] px-3 py-2 font-black text-[#59411f] disabled:opacity-40">Lisää kuva offline<span className="mt-1 block text-xs font-medium">Aiempi kuva</span></button>
          <button type="button" disabled={busy||sent||locating} onClick={startManual} className="min-h-[48px] rounded-2xl border-2 border-[#9a7a47] bg-[#fff4cf] px-3 py-2 font-black text-[#59411f] disabled:opacity-40">Syötä käsin<span className="mt-1 block text-xs font-medium">Ilman kuvaa</span></button>
          <input ref={offlineInput} aria-label="Valitse aiempi hintataulun kuva" type="file" accept="image/*" className="hidden" onChange={e=>{const file=e.target.files?.[0];e.target.value="";if(file)void readPhoto(file,"offline");}}/>
        </div>
        <div className="flex min-h-0 flex-1 flex-col rounded-[22px] border-[3px] border-[#8d6e3d] bg-[#17241e] p-3 shadow-[0_4px_0_#b49a68]">
          <div className="mb-2 text-center text-xs font-black uppercase tracking-[.12em] text-[#f5e5c1]">{mode==="manual"?"Hintojen käsinsyöttö":"Hintataulun kuvalukija"}</div>
          {cameraOpen&&<div className="relative mb-2 flex min-h-[44px] items-center justify-center gap-2 text-[#f5e5c1]">
            <span className="text-center text-xs font-semibold">Sovita polttoaineiden nimet ja hinnat kehykseen.</span>
            <div className="absolute right-0 top-1/2 flex -translate-y-1/2 shrink-0 gap-1 rounded-lg bg-[#0b1711] p-1" aria-label="Kohdistuskehyksen muoto">
              <button type="button" aria-pressed={guideOrientation==="portrait"} onClick={()=>setGuideOrientation("portrait")} className={`rounded-md px-3 py-1 text-xs font-bold ${guideOrientation==="portrait"?"bg-[#e3edc9] text-[#174c35]":"text-[#f5e5c1]"}`}>Pysty</button>
              <button type="button" aria-pressed={guideOrientation==="landscape"} onClick={()=>setGuideOrientation("landscape")} className={`rounded-md px-3 py-1 text-xs font-bold ${guideOrientation==="landscape"?"bg-[#e3edc9] text-[#174c35]":"text-[#f5e5c1]"}`}>Vaaka</button>
            </div>
          </div>}
          <div className="relative flex min-h-0 flex-1 w-full items-center justify-center overflow-hidden rounded-xl bg-[#080e0b]">
            {cameraOpen?<div className="relative h-full min-h-[140px] w-full overflow-hidden text-[#f5e5c1]">
              <video ref={videoRef} autoPlay muted playsInline onLoadedData={()=>setCameraReady(true)} className="absolute inset-0 h-full w-full object-cover" aria-label="Kameran esikatselu"/>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
                <div className={`relative max-h-[88%] border-[3px] border-[#f8e5ad] rounded-xl shadow-[0_0_0_999px_rgba(0,0,0,1)] ${guideOrientation==="portrait"?"h-[84%] aspect-[3/4] max-w-[78%]":"w-[83%] aspect-[4/3] max-h-[83%]"}`}>
                  <span className="absolute -left-[3px] -top-[3px] h-6 w-6 rounded-tl-xl border-l-[5px] border-t-[5px] border-white"/>
                  <span className="absolute -right-[3px] -top-[3px] h-6 w-6 rounded-tr-xl border-r-[5px] border-t-[5px] border-white"/>
                  <span className="absolute -bottom-[3px] -left-[3px] h-6 w-6 rounded-bl-xl border-b-[5px] border-l-[5px] border-white"/>
                  <span className="absolute -bottom-[3px] -right-[3px] h-6 w-6 rounded-br-xl border-b-[5px] border-r-[5px] border-white"/>
                </div>
              </div>
            </div>:!photo&&mode!=="manual"?<div className="max-w-[320px] px-4 py-5 text-center text-[#f5e5c1]"><img src="/fuel/nozzle-photo.png" alt="" className="mx-auto mb-2 h-10 w-10 object-contain"/><p className="text-lg font-black">Lisää hintataulun kuva</p><p className="mt-2 text-sm leading-relaxed text-[#e5ddc6]">Ota uusi kuva tai valitse aiempi kuva yllä olevista napeista.</p></div>:busy&&photo?<img src={photo} alt="Ilmoituksen hintataulu" className="h-[clamp(100px,24dvh,220px)] w-full object-contain"/>:<div className="w-full space-y-2 p-2 text-[#f5e5c1]">
              <div role="status" aria-live="polite" className="flex min-h-[36px] items-center justify-center px-2 text-center text-xs font-bold text-[#ff9b83]">{!sent&&missingReasons.join(" ")}</div>
              {photo&&<img src={photo} alt="Ilmoituksen hintataulu" className="mx-auto h-[clamp(40px,9dvh,72px)] w-full rounded-lg object-contain"/>}
              {sent?<div role="status" className="py-6 text-center"><p className="text-xl font-black">Kiitos! Ilmoitus vastaanotettu.</p><button type="button" onClick={onClose} className="mt-4 rounded-xl bg-[#e3edc9] px-8 py-2 font-black text-[#174c35]">OK</button></div>:<>
                {selectedStation&&!editing&&<p className="text-center text-sm font-bold">{selectedStation.chain} · {selectedStation.name}</p>}
                {!editing&&!priceReview&&validateFuelPrices(prices)&&<div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-center">{([['diesel','Diesel'],['price95','95 E10'],['price98','98 E5']] as const).filter(([key])=>prices[key]).map(([key,label])=><p key={key} className="text-sm">{label} <strong className="text-lg">{prices[key]} €/l</strong></p>)}</div>}
                {observed&&!editing&&<p className="text-center text-xs text-[#e5ddc6]">{new Date(exifInstant.current||observed).toLocaleString("fi-FI",{dateStyle:"short",timeStyle:"short"})}</p>}
                {(editing||!stationId)&&<label className="block text-sm font-bold">{mode==="manual"?"Valitse asema":conflict.reasons.length?"Vahvista kuvattu asema":"Kuvattua asemaa ei tunnistettu. Valitse asema."}<select value={stationId} disabled={!stations.length||locating} onChange={e=>{stationChoiceEdited.current=true;setStationId(e.target.value);setConflictConfirmed(false);}} className={input}><option value="">{mode==="manual"?"Valitse asema":"Valitse kuvassa oleva asema"}</option>{stations.map(s=><option key={s.id} value={s.id}>{s.chain} · {s.name} · {s.address}</option>)}</select></label>}
                {(editing||priceReview||!validateFuelPrices(prices))&&<div><p className="mb-1 text-xs">{mode==="manual"?"Syötä vähintään yksi hinta (€/l)":editing?"Korjaa hinnat tarvittaessa":priceReview?"Tarkista LED-näytöstä luetut hinnat ja täydennä tyhjät kohdat kuvasta.":"Hintoja ei saatu luettua. Lisää kuvassa näkyvät hinnat."}</p><div className="grid grid-cols-3 gap-2">{([['diesel','Diesel'],['price95','95 E10'],['price98','98 E5']] as const).map(([key,label])=><label key={key} className="text-xs font-bold">{label}<input aria-label={`${label} hinta euroa litralta`} inputMode="decimal" placeholder="–" value={prices[key]} onChange={e=>{priceEdits.current[key]=true;setPrices(p=>({...p,[key]:e.target.value}));}} className={`${input} ${invalidPrices.includes(key)?"border-2 border-red-600":""}`}/><span className="mt-1 block min-h-[14px] text-[11px] text-[#ffb8a4]">{invalidPrices.includes(key)?"Virheellinen hinta (0,50–5,00 €/l)":""}</span></label>)}</div></div>}
                {(editing||!validObserved)&&<label className="block text-sm font-bold">{mode==="manual"?"Milloin näit hinnat?":"Milloin kuva otettiin?"}<input type="datetime-local" value={observed} onChange={e=>{autoTime.current=false;exifInstant.current=null;setObserved(e.target.value);setTimeSource("manual");setConflictConfirmed(false);}} className={input}/></label>}
                {stationLocationError&&<p role="alert" className="rounded-xl border border-red-600 bg-red-50 p-3 text-sm text-red-900">{stationLocationError}</p>}
                {conflict.reasons.length>0&&<div role="alert" className="rounded-xl border border-[#bd6b2a] bg-[#ffe6c8] p-3 text-sm text-[#713d1c]"><p className="font-bold">Kuvan ja kuvaushetken tiedot poikkeavat toisistaan.</p>{conflict.reasons.includes("location")&&<p>Sijaintien ero noin {Math.round(conflict.distanceM||0)} m.</p>}{conflict.reasons.includes("time")&&<p>Kuvausaikojen ero noin {Math.round(conflict.timeDifferenceMinutes||0)} min. Käytä aiemmalle kuvalle offline-valintaa.</p>}<label className="mt-2 flex gap-2"><input type="checkbox" checked={conflictConfirmed} disabled={!stationId} onChange={e=>setConflictConfirmed(e.target.checked)}/><span>Vahvistan kuvatun aseman ja kuvausajan.</span></label></div>}

              </>}
            </div>}
          </div>
          <div className="flex h-[64px] shrink-0 items-center justify-center">{busy&&<p role="status" aria-live="polite" className="text-center text-sm font-bold text-[#e3edc9]">{status||"Luetaan kuvaa…"}</p>}
          {!busy&&error&&<p role="alert" className="mt-2 rounded-xl bg-[#ffe1cf] p-3 text-sm font-bold text-[#8b331d]">{error}</p>}</div>
        </div>
      </div>
      <footer className={`flex h-[76px] shrink-0 flex-col justify-center border-t border-[#baa46a]/50 text-[#174c35] ${cameraOpen||(!sent&&(Boolean(photo)||mode==="manual"))?"":"invisible"}`}>
        {cameraOpen?<><div className="flex justify-center gap-3"><button type="button" disabled={!cameraReady} onClick={()=>void capturePhoto()} className="rounded-xl bg-[#e3edc9] px-8 py-2 font-black text-[#174c35] disabled:opacity-40">Ota kuva</button><button type="button" onClick={stopCamera} className="rounded-xl border border-[#baa46a] px-4 py-2 font-bold">Peruuta</button></div><p className="text-center text-[11px] text-[#6d604c]">{cameraReady?"Kohdista kamera hintatauluun ja ota kuva.":"Avataan kameraa…"}</p></>:<>
                <div className="flex items-center justify-center gap-3"><button type="button" onClick={()=>void submit()} disabled={busy||locating||Boolean(stationLocationError)||(conflict.reasons.length>0&&!conflictConfirmed)||!validObserved||!stationId||!validateFuelPrices(prices)} className="min-w-[120px] rounded-xl border-2 border-[#8bb56d] bg-[#e3edc9] px-8 py-2 text-lg font-black text-[#174c35] disabled:opacity-40">OK</button>{mode==="online"&&<button type="button" disabled={busy||locating} onClick={startOnline} className="rounded-xl border border-[#17573c] px-4 py-2 text-sm font-bold disabled:opacity-40">Ota uusi kuva</button>}</div>
                <p className="text-center text-[11px] text-[#6d604c]">OK lähettää hintailmoituksen tarkistettavaksi.</p>
        </>}
      </footer>
    </div>
  </div>;
}


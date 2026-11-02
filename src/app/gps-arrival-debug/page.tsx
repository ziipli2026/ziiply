"use client";
import {useEffect,useRef,useState} from "react";
import {evaluateZiiplyArrival,initialZiiplyArrivalState,ziiplyDistanceMeters,type ZiiplyArrivalState,type ZiiplyArrivalStore} from "../components/ziiply/location/ziiplyArrivalSequence";

type LogEntry={time:string;event:string;data:Record<string,unknown>};
export default function GpsArrivalDebugPage(){
 const [running,setRunning]=useState(false),[logs,setLogs]=useState<LogEntry[]>([]),[status,setStatus]=useState("Ei käynnistetty");
 const [storeName,setStoreName]=useState("Testikauppa"),[lat,setLat]=useState(""),[lon,setLon]=useState("");
 const watch=useRef<number|null>(null),state=useRef<ZiiplyArrivalState>(initialZiiplyArrivalState()),last=useRef<{latitude:number;longitude:number;at:number}|null>(null),logsRef=useRef<LogEntry[]>([]);
 const log=(event:string,data:Record<string,unknown>={})=>{const item={time:new Date().toISOString(),event,data};logsRef.current.push(item);setLogs([...logsRef.current]);};
 const stop=()=>{if(watch.current!==null){navigator.geolocation.clearWatch(watch.current);watch.current=null;}setRunning(false);log("tracking-stopped",{samples:logsRef.current.length});};
 useEffect(()=>()=>{if(watch.current!==null)navigator.geolocation.clearWatch(watch.current);},[]);
 const start=()=>{
  if(!navigator.geolocation){setStatus("GPS ei käytettävissä");log("geolocation-unavailable");return;}
  if(watch.current!==null)return;
  state.current=initialZiiplyArrivalState();last.current=null;logsRef.current=[];setLogs([]);
  const store:ZiiplyArrivalStore|null=Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&lat.trim()!==""&&lon.trim()!==""&&Math.abs(Number(lat))<=90&&Math.abs(Number(lon))<=180?{id:"debug-store",name:storeName,latitude:Number(lat),longitude:Number(lon)}:null;
  log("tracking-started",{userAgent:navigator.userAgent,store,visibility:document.visibilityState});
  setRunning(true);setStatus("GPS-paikannus käynnistyy");
  watch.current=navigator.geolocation.watchPosition(position=>{
   const p=position.coords,now=Date.now(),previous=last.current;
   const displacement=previous?ziiplyDistanceMeters(previous,{latitude:p.latitude,longitude:p.longitude}):null;
   const deltaMs=previous?now-previous.at:null;
   const speedKmh=p.speed!==null&&Number.isFinite(p.speed)?p.speed*3.6:null;
   const inferredSpeed=displacement!==null&&deltaMs&&deltaMs>0?displacement/deltaMs*3600:null;
   const sample={at:now,latitude:p.latitude,longitude:p.longitude,accuracyMeters:p.accuracy,speedKmh};
   const decision=evaluateZiiplyArrival(state.current,sample,store?[store]:[],[]);
   state.current=decision.state;
   const distanceToStore=store?ziiplyDistanceMeters(sample,store):null;
   log("gps-sample",{...sample,altitude:p.altitude,altitudeAccuracy:p.altitudeAccuracy,heading:p.heading,positionTimestamp:position.timestamp,displacementMeters:displacement,deltaMs,inferredSpeedKmh:inferredSpeed,distanceToStore,decisionStatus:decision.status,decisionStore:decision.store?.name??null,askStoreChange:decision.askStoreChange,showArrivalMessage:decision.showArrivalMessage,radar:decision.radar,visibility:document.visibilityState});
   setStatus(decision.status+(distanceToStore!==null?" · "+Math.round(distanceToStore)+" m kauppaan":" · kaupan koordinaatit puuttuvat"));
   last.current={latitude:p.latitude,longitude:p.longitude,at:now};
  },error=>{log("gps-error",{code:error.code,message:error.message,visibility:document.visibilityState});setStatus("GPS-virhe: "+error.message);},{enableHighAccuracy:true,maximumAge:0,timeout:20000});
 };
 const download=()=>{const blob=new Blob([JSON.stringify({version:"arrival-debug-20261102",exportedAt:new Date().toISOString(),logs:logsRef.current},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="ziiply-gps-arrival-"+new Date().toISOString().replace(/[:.]/g,"-")+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return <main style={{maxWidth:760,margin:"auto",padding:20,fontFamily:"system-ui",lineHeight:1.5}}>
  <h1>Ziiply – kauppaan saapumisen GPS-debug</h1>
  <p>Erillinen mobiilitestisivu. Ei muuta skanneria, ostoskoria eikä kauppavalintaa. GPS-tiedot pysyvät tässä selaimessa, kunnes viet lokin tiedostoksi.</p>
  <p><strong>Huom:</strong> pidä sivu auki ja puhelin aktiivisena testin aikana. Selain voi pysäyttää GPS-seurannan taustalla.</p>
  <label>Kaupan nimi <input value={storeName} onChange={e=>setStoreName(e.target.value)} style={{display:"block",width:"100%",padding:10}}/></label>
  <div style={{display:"flex",gap:10,marginTop:12}}>
   <label style={{flex:1}}>Kaupan leveysaste <input placeholder="60.12345" value={lat} onChange={e=>setLat(e.target.value)} style={{width:"100%",padding:10}}/></label>
   <label style={{flex:1}}>Kaupan pituusaste <input placeholder="24.12345" value={lon} onChange={e=>setLon(e.target.value)} style={{width:"100%",padding:10}}/></label>
  </div>
  <p>Ilman kaupan koordinaatteja lokitetaan GPS-matka, mutta kauppaan saapumisen päätöstä ei voida testata.</p>
  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
   <button onClick={start} disabled={running} style={{padding:14}}>Aloita GPS-lokitus</button>
   <button onClick={stop} disabled={!running} style={{padding:14}}>Pysäytä</button>
   <button onClick={download} disabled={!logs.length} style={{padding:14}}>Lataa JSON-loki</button>
  </div>
  <p role="status"><strong>{status}</strong></p>
  <p>Tapahtumia: {logs.length}. Viimeisin: {logs.at(-1)?.event??"–"}</p>
  <details><summary>Näytä viimeiset 30 tapahtumaa</summary><pre style={{overflowX:"auto",whiteSpace:"pre-wrap",fontSize:11}}>{JSON.stringify(logs.slice(-30),null,2)}</pre></details>
 </main>;
}

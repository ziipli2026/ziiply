"use client";
import {useEffect,useState} from "react";
import dynamic from "next/dynamic";
import {ziiplyDistanceMeters} from "../components/ziiply/location/ziiplyArrivalSequence";
const MainZiiply=dynamic(()=>import("../page"),{ssr:false});
const SHOP={latitude:60.49385,longitude:25.54130};
type Watch={success:PositionCallback,error?:PositionErrorCallback|null};
export default function GpsMainTest(){
 const [phoneFrame,setPhoneFrame]=useState<boolean|null>(null);
 useEffect(()=>{setPhoneFrame(window.innerWidth>=640&&!new URLSearchParams(window.location.search).has("mobile"));},[]);
 if(phoneFrame===null)return <main>Avataan GPS-testiä...</main>;
 if(phoneFrame)return <main style={{minHeight:"100dvh",background:"#dce9df",display:"flex",justifyContent:"center"}}><iframe title="Ziiplyn alkuperäinen mobiilipääsivu ja GPS-testi" src="/gps-main-test?mobile=1" style={{width:390,maxWidth:"100%",height:"100dvh",border:0}} /></main>;
 return <GpsSimulator/>;
}
function GpsSimulator(){
 const [ready,setReady]=useState(false);
 const [debugOpen,setDebugOpen]=useState(false);
 const [near,setNear]=useState(false);
 const [approaching,setApproaching]=useState(false);
 const [updates,setUpdates]=useState(0);
 const [status,setStatus]=useState("Valmistelee GPS-simulaatiota");
 const [debug,setDebug]=useState<string[]>([]);
 const [watchCount,setWatchCount]=useState(0);
 const [exportedAt,setExportedAt]=useState<string|null>(null);
 const [decision,setDecision]=useState("ei GPS-näytettä");
 const downloadDebug=()=>{const payload={type:"ziiply-gps-main-test-debug",exportedAt:new Date().toISOString(),branch:"test/gps-arrival-screen-20261026",simulatedStore:"Sale Monninkylä",simulatedNear:near,gpsUpdates:updates,gpsWatchers:watchCount,lastArrivalDecision:decision,events:[...debug].reverse()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="ziiply-gps-debug-"+new Date().toISOString().replace(/[:.]/g,"-")+".json";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setExportedAt(new Date().toLocaleTimeString("fi-FI"));};
 const log=(message:string)=>setDebug(previous=>[new Date().toLocaleTimeString("fi-FI")+" "+message,...previous].slice(0,100));
 useEffect(()=>{
  const geo=navigator.geolocation;
  if(!geo){setStatus("Selaimessa ei ole geolocation-rajapintaa");return;}
  const oldGet=geo.getCurrentPosition.bind(geo),oldWatch=geo.watchPosition.bind(geo),oldClear=geo.clearWatch.bind(geo);
  const watches=new Map<number,Watch>();let nextId=900000;
  let simulatedNear=false;
  let simulatedApproach=false;

  function position():GeolocationPosition{
   const p=simulatedNear?SHOP:simulatedApproach?{latitude:60.49515,longitude:25.54130}:{latitude:60.491,longitude:25.538};
   return {coords:{latitude:p.latitude,longitude:p.longitude,accuracy:5,altitude:null,altitudeAccuracy:null,heading:null,speed:0},timestamp:Date.now(),toJSON(){return {coords:this.coords,timestamp:this.timestamp}}} as GeolocationPosition;
  }
  function broadcast(){const p=position();const distance=Math.round(ziiplyDistanceMeters(p.coords,SHOP));log("GPS-syöte "+distance+" m | pääsivun kuuntelijat: "+watches.size);watches.forEach(w=>{try{w.success(p)}catch(e){log("GPS callback ERROR: "+String(e));console.error("GPS test callback failed",e)}});setUpdates(n=>n+1);}
  const mainDebug=(event:Event)=>{const detail=(event as CustomEvent).detail;const summary=JSON.stringify(detail);setDecision(summary);log("PÄÄSIVU "+summary);};
  window.addEventListener("ziiply-arrival-debug",mainDebug);
  const mockGet:typeof geo.getCurrentPosition=(success)=>{log("getCurrentPosition called");queueMicrotask(()=>success(position()));};
  const mockWatch:typeof geo.watchPosition=(success,error)=>{const id=nextId++;watches.set(id,{success,error});setWatchCount(watches.size);log("watchPosition registered id="+id);queueMicrotask(()=>success(position()));return id;};
  const mockClear:typeof geo.clearWatch=(id)=>{watches.delete(id);setWatchCount(watches.size);log("clearWatch id="+id);};
  try{
   Object.defineProperty(geo,"getCurrentPosition",{configurable:true,value:mockGet});
   Object.defineProperty(geo,"watchPosition",{configurable:true,value:mockWatch});
   Object.defineProperty(geo,"clearWatch",{configurable:true,value:mockClear});
  }catch(e){setStatus("GPS-rajapinnan korvaaminen epäonnistui: "+String(e));return;}
  const interval=setInterval(broadcast,5000);
  const approachHandler=()=>{simulatedNear=false;simulatedApproach=true;log("BUTTON: Kaupan läheisyydessä");broadcast();setStatus("SIMULOITU: lähestytään Sale Monninkylää, noin 145 m");};
  const nearHandler=()=>{simulatedApproach=false;simulatedNear=true;log("BUTTON: Siirry kauppaan");broadcast();setStatus("SIMULOITU: Sale Monninkylä, noin 0 m, GPS-tarkkuus 5 m");};
  const farHandler=()=>{simulatedNear=false;simulatedApproach=false;log("BUTTON: Poistu kaupasta");broadcast();setStatus("SIMULOITU: kaupan ulkopuolella");};
  window.addEventListener("ziiply-test-approach",approachHandler);
  window.addEventListener("ziiply-test-near",nearHandler);window.addEventListener("ziiply-test-far",farHandler);
  setReady(true);log("Mock GPS installed");setStatus("GPS korvattu. Paina Siirry kauppaan.");
  return ()=>{window.removeEventListener("ziiply-arrival-debug",mainDebug);clearInterval(interval);window.removeEventListener("ziiply-test-approach",approachHandler);window.removeEventListener("ziiply-test-near",nearHandler);window.removeEventListener("ziiply-test-far",farHandler);
   Object.defineProperty(geo,"getCurrentPosition",{configurable:true,value:oldGet});
   Object.defineProperty(geo,"watchPosition",{configurable:true,value:oldWatch});
   Object.defineProperty(geo,"clearWatch",{configurable:true,value:oldClear});};
 },[]);
 return <><div style={{position:"fixed",zIndex:2147483647,bottom:10,left:10,right:10,background:"#102e25",color:"white",padding:debugOpen?12:6,borderRadius:12,boxShadow:"0 3px 20px #0008",font:"14px system-ui",maxHeight:debugOpen?"32dvh":"auto",overflowY:"auto"}}><button onClick={()=>setDebugOpen(v=>!v)} style={{padding:8,background:"#60d394",color:"#061811",border:0,borderRadius:8,fontWeight:700,width:"100%"}}>{debugOpen?"Sulje debug ▲":"Avaa GPS-debug ▼"}</button>{debugOpen?<div>
 <strong>GPS MASTER / PÄÄKOODIN INTEGRAATIOTESTI</strong><div>{status}</div><div>GPS-päivitykset: {updates} | oikea pääsivu: {ready?"ladattu":"ei ladattu"}</div>
 <button style={{padding:10,margin:5,background:"#c4e7ff",color:"#102e25",border:0,borderRadius:7}} onClick={()=>{setNear(false);setApproaching(true);window.dispatchEvent(new Event("ziiply-test-approach"))}}>Kaupan läheisyydessä</button>
 <button style={{padding:10,margin:5,background:"#60d394",border:0,borderRadius:7}} onClick={()=>{setNear(true);setApproaching(false);window.dispatchEvent(new Event("ziiply-test-near"))}}>Siirry kauppaan</button>
 <button style={{padding:10,margin:5,background:"#f6d77a",border:0,borderRadius:7}} onClick={()=>{setNear(false);setApproaching(false);window.dispatchEvent(new Event("ziiply-test-far"))}}>Poistu kaupasta</button>
 <button style={{padding:10,margin:5,background:"#b9dcff",color:"#071b14",border:0,borderRadius:7,fontWeight:700}} onClick={downloadDebug}>Tallenna debug JSON</button>{exportedAt?<span> Tallennettu {exportedAt}</span>:null}
 <div style={{fontWeight:700,marginTop:6}}>{decision}</div><div>Tulos tulee oikeasta pääsivusta. Testi syöttää vain GPS-paikkaa eikä laske omaa saapumispäätöstä.</div><div>GPS-kuuntelijoita: {watchCount}. Jos 0, pääkoodi ei ole rekisteröinyt watchPosition-kuuntelijaa.</div><div>Simuloitu paikka: {near?"Sale Monninkylä":approaching?"kaupan läheisyydessä":"kaupan ulkopuolella"}. Nopeutta tai ajohistoriaa ei simuloida.</div><div style={{marginTop:8,maxHeight:180,overflow:"auto",background:"#071b14",padding:8,font:"11px monospace",whiteSpace:"pre-wrap"}}>{debug.join("\n")||"Ei tapahtumia"}</div></div>:null}</div>
 {ready?<MainZiiply/>:<main style={{padding:20}}>GPS-simulaation käynnistys...</main>}</>;
}

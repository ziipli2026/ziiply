"use client";
import {useEffect,useState} from "react";
import dynamic from "next/dynamic";
const MainZiiply=dynamic(()=>import("../page"),{ssr:false});
const SHOP={latitude:60.49385,longitude:25.54130};
type Watch={success:PositionCallback,error?:PositionErrorCallback|null};
export default function GpsMainTest(){
 const [ready,setReady]=useState(false);
 const [near,setNear]=useState(false);
 const [updates,setUpdates]=useState(0);
 const [status,setStatus]=useState("Valmistelee GPS-simulaatiota");
 useEffect(()=>{
  const geo=navigator.geolocation;
  if(!geo){setStatus("Selaimessa ei ole geolocation-rajapintaa");return;}
  const oldGet=geo.getCurrentPosition.bind(geo),oldWatch=geo.watchPosition.bind(geo),oldClear=geo.clearWatch.bind(geo);
  const watches=new Map<number,Watch>();let nextId=900000;
  let simulatedNear=false;
  function position():GeolocationPosition{
   const p=simulatedNear?SHOP:{latitude:60.491,longitude:25.538};
   return {coords:{latitude:p.latitude,longitude:p.longitude,accuracy:5,altitude:null,altitudeAccuracy:null,heading:null,speed:0},timestamp:Date.now(),toJSON(){return {coords:this.coords,timestamp:this.timestamp}}} as GeolocationPosition;
  }
  function broadcast(){const p=position();watches.forEach(w=>{try{w.success(p)}catch(e){console.error("GPS test callback failed",e)}});setUpdates(n=>n+1);}
  const mockGet:typeof geo.getCurrentPosition=(success)=>{queueMicrotask(()=>success(position()));};
  const mockWatch:typeof geo.watchPosition=(success,error)=>{const id=nextId++;watches.set(id,{success,error});queueMicrotask(()=>success(position()));return id;};
  const mockClear:typeof geo.clearWatch=(id)=>{watches.delete(id);};
  try{
   Object.defineProperty(geo,"getCurrentPosition",{configurable:true,value:mockGet});
   Object.defineProperty(geo,"watchPosition",{configurable:true,value:mockWatch});
   Object.defineProperty(geo,"clearWatch",{configurable:true,value:mockClear});
  }catch(e){setStatus("GPS-rajapinnan korvaaminen epäonnistui: "+String(e));return;}
  const interval=setInterval(broadcast,5000);
  const nearHandler=()=>{simulatedNear=true;broadcast();setStatus("SIMULOITU: Sale Monninkylä, noin 0 m, GPS-tarkkuus 5 m");};
  const farHandler=()=>{simulatedNear=false;broadcast();setStatus("SIMULOITU: kaupan ulkopuolella");};
  window.addEventListener("ziiply-test-near",nearHandler);window.addEventListener("ziiply-test-far",farHandler);
  setReady(true);setStatus("GPS korvattu. Paina Siirry kauppaan.");
  return ()=>{clearInterval(interval);window.removeEventListener("ziiply-test-near",nearHandler);window.removeEventListener("ziiply-test-far",farHandler);
   Object.defineProperty(geo,"getCurrentPosition",{configurable:true,value:oldGet});
   Object.defineProperty(geo,"watchPosition",{configurable:true,value:oldWatch});
   Object.defineProperty(geo,"clearWatch",{configurable:true,value:oldClear});};
 },[]);
 return <><div style={{position:"fixed",zIndex:2147483647,bottom:10,left:10,right:10,background:"#102e25",color:"white",padding:12,borderRadius:12,boxShadow:"0 3px 20px #0008",font:"14px system-ui"}}>
 <strong>GPS MASTER / PÄÄKOODIN INTEGRAATIOTESTI</strong><div>{status}</div><div>GPS-päivitykset: {updates} | oikea pääsivu: {ready?"ladattu":"ei ladattu"}</div>
 <button style={{padding:10,margin:5,background:"#60d394",border:0,borderRadius:7}} onClick={()=>{setNear(true);window.dispatchEvent(new Event("ziiply-test-near"))}}>Siirry kauppaan</button>
 <button style={{padding:10,margin:5,background:"#f6d77a",border:0,borderRadius:7}} onClick={()=>{setNear(false);window.dispatchEvent(new Event("ziiply-test-far"))}}>Poistu kaupasta</button>
 <div>Simuloitu paikka: {near?"Sale Monninkylä":"kaupan ulkopuolella"}. Jos ilmoitusta ei näy, tuotannon pääkoodin kytkentä epäonnistuu tällä syötteellä.</div></div>
 {ready?<MainZiiply/>:<main style={{padding:20}}>GPS-simulaation käynnistys...</main>}</>;
}

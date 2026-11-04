"use client";
import {useEffect,useRef,useState} from "react";
export default function Page(){
const [active,setActive]=useState(false),[status,setStatus]=useState("Valmis"),[limit,setLimit]=useState(null),[road,setRoad]=useState(""),[calls,setCalls]=useState(0);
const gps=useRef(null),points=useRef([]),last=useRef(0),busy=useRef(false),running=useRef(false),count=useRef(0);
useEffect(()=>()=>{running.current=false;if(gps.current!==null)navigator.geolocation.clearWatch(gps.current)},[]);
function stop(){running.current=false;if(gps.current!==null)navigator.geolocation.clearWatch(gps.current);gps.current=null;setActive(false);setStatus("Pysäytetty")}
async function lookup(){
if(!running.current||busy.current||points.current.length<2||Date.now()-last.current<20000||count.current>=50)return;
const sample=points.current.slice(-6);if(sample[sample.length-1].timestamp-sample[0].timestamp<3000)return;
busy.current=true;last.current=Date.now();count.current++;setCalls(count.current);
try{const response=await fetch("/api/gps/tomtom-live",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({points:sample})});const data=await response.json();
if(!running.current)return;
setLimit(typeof data.limitKmh==="number"?data.limitKmh:null);setRoad(data.roadName||"");setStatus(data.ok?(data.limitKmh==null?"Rajoitusta ei löytynyt":"Tie tunnistettu"):(data.error||"Virhe"));
}catch{if(running.current)setStatus("Yhteysvirhe")}finally{busy.current=false}
}
function start(){
if(!navigator.geolocation){setStatus("GPS ei käytettävissä");return}
points.current=[];count.current=0;last.current=0;setCalls(0);setLimit(null);running.current=true;setActive(true);setStatus("Odotetaan GPS-pisteitä");
gps.current=navigator.geolocation.watchPosition(position=>{
if(!running.current)return;
const c=position.coords;if(c.accuracy>100){setStatus("GPS epätarkka");return}
const point={latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy,heading:c.heading,timestamp:position.timestamp};
const previous=points.current[points.current.length-1];if(previous&&point.timestamp-previous.timestamp<2000)return;
points.current=[...points.current.slice(-7),point];void lookup();
},error=>setStatus("GPS: "+error.message),{enableHighAccuracy:true,maximumAge:0,timeout:20000});
}
return <main style={{maxWidth:500,margin:"auto",padding:22,fontFamily:"system-ui",background:"#101827",color:"white",minHeight:"100dvh"}}>
<h1>Ziiply TomTom-ajotesti</h1><p>Erillinen testiversio</p>
<section style={{textAlign:"center",border:"2px solid #64748b",borderRadius:20,padding:24}}>
<div>Nopeusrajoitus</div><div style={{fontSize:88,fontWeight:800}}>{limit??"—"}</div><div>km/h</div><p>{road||"Tietä ei tunnistettu"}</p></section>
<p aria-live="polite">{status}</p><p>TomTom-hakuja: {calls}/50</p>
<button onClick={active?stop:start} style={{width:"100%",padding:20,fontSize:20,fontWeight:700,border:0,borderRadius:12,background:active?"#ef4444":"#22c55e"}}>{active?"Lopeta testi":"Aloita GPS-testi"}</button>
<p style={{color:"#fbbf24",fontWeight:700}}>Käynnistä ennen ajoa. Älä käytä puhelinta ajaessasi. Tarkista tulokset pysähdyttyäsi.</p>
<p>GPS toimii vain selaimen ollessa aktiivinen. Enintään yksi kysely 20 sekunnissa ja 50 kyselyä testin aikana.</p>
</main>;
}
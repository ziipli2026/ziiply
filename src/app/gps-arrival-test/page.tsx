"use client";
import {useEffect,useRef,useState} from "react";
import {evaluateZiiplyArrival,initialZiiplyArrivalState,type ZiiplyArrivalState} from "@/app/components/ziiply/location/ziiplyArrivalSequence";
const store={id:"sale-monninkyla-test",name:"Sale Monninkylä (SIMULAATIO)",latitude:60.49385,longitude:25.54130};
export default function ArrivalScreenTest(){
 const state=useRef<ZiiplyArrivalState>(initialZiiplyArrivalState());
 const [tick,setTick]=useState(0);
 const [messages,setMessages]=useState<string[]>([]);
 const [decision,setDecision]=useState("Odottaa testiä");
 const [answer,setAnswer]=useState("");
 const [show,setShow]=useState(false);
 const [running,setRunning]=useState(false);
 useEffect(()=>{if(!running)return; if(tick>4){setRunning(false);return;}
 const timer=setTimeout(()=>{
 const result=evaluateZiiplyArrival(state.current,{at:Date.now()+tick*5000,latitude:store.latitude+0.00001,longitude:store.longitude,accuracyMeters:5,speedKmh:0},[store],[store.id]);
 state.current=result.state;
 setDecision(result.status+" | showArrivalMessage="+result.showArrivalMessage+" | radar="+result.radar);
 if(result.showArrivalMessage){setMessages(m=>[...m,"Olet saapumassa kauppaan "+store.name]);setShow(true);}
 setTick(v=>v+1);
 },tick===0?100:1000);return()=>clearTimeout(timer);
 },[running,tick]);
 function start(){state.current=initialZiiplyArrivalState();setTick(0);setMessages([]);setShow(false);setAnswer("");setDecision("Simuloidaan sijaintia kaupan lähellä");setRunning(true);}
 return <main style={{fontFamily:"system-ui",padding:20,maxWidth:550,margin:"auto",minHeight:"100vh",background:"#f7f3e8",color:"#153b30"}}>
 <h1>Ziiply GPS - saapumistesti</h1><p><strong>ERILLINEN TESTIHAARA.</strong> Tämä sivu käyttää simuloitua sijaintia, ei puhelimen GPS:ää. Pääkoodin tuotantotilaa ei muuteta.</p>
 <p>Kauppa: {store.name}<br/>Kaupan GPS: {store.latitude}, {store.longitude}<br/>Simuloitu käyttäjä: {store.latitude+0.00001}, {store.longitude} (noin 1 m)</p>
 <button onClick={start} style={{padding:16,background:"#176b48",color:"white",border:0,borderRadius:10,fontSize:18}}>Käynnistä saapumissimulaatio</button>
 <p>GPS-näytteet: {tick}/5</p><p>Tila: {decision}</p>
 {show&&<section role="alertdialog" aria-label="Saapumisilmoitus" style={{position:"fixed",zIndex:99999,top:"25%",left:"5%",width:"90%",maxWidth:500,background:"white",border:"4px solid #1b8e5c",borderRadius:16,padding:24,boxShadow:"0 12px 40px #0005",color:"#123"}}>
 <h2>Olet saapumassa kauppaan!</h2><p>{store.name}</p><p>Lisätäänkö ostoslista tai resepti ostoskoriin?</p>
 <button onClick={()=>{setAnswer("Kyllä");setShow(false)}} style={{padding:12,marginRight:12}}>Kyllä</button><button onClick={()=>{setAnswer("Ei");setShow(false)}} style={{padding:12}}>Ei</button>
 </section>}
 <h2>Renderöintitesti</h2><p>Ilmoitus DOMissa: {show?"KYLLÄ":"EI"} | Vastaus: {answer||"—"}</p>
 <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{messages.join("\n")||"Ei tapahtumia"}</pre>
 </main>;
}

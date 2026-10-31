"use client";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
export default function AdminVerify() {
 const [message,setMessage]=useState("Vahvistetaan kirjautumista…");
 const started=useRef(false);
 const router=useRouter();
 useEffect(()=>{
   // React Strict Mode may re-run effects. Never consume a one-time token twice.
   if(started.current)return;
   started.current=true;
   const token=new URLSearchParams(window.location.search).get("token");
   if(!token){setMessage("Linkki puuttuu. Pyydä uusi kirjautumislinkki hallintasivulta.");return;}
   fetch("/api/beta/admin/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token}),cache:"no-store"})
    .then(r=>{if(!r.ok)throw new Error();window.history.replaceState(null,"","/beta/hallinta/vahvista");router.replace("/beta/hallinta");})
    .catch(()=>{window.history.replaceState(null,"","/beta/hallinta/vahvista");setMessage("Linkki on virheellinen tai vanhentunut. Pyydä uusi kirjautumislinkki.");});
 },[router]);
 return <main style={{padding:32,fontFamily:"system-ui"}}><h1>Ziiply – ylläpitäjän kirjautuminen</h1><p role="status">{message}</p></main>;
}

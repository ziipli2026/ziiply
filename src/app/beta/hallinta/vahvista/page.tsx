"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
export default function AdminVerify() {
 const [message,setMessage]=useState("Vahvistetaan kirjautumista…");
 const router=useRouter();
 useEffect(()=>{
   const token=new URLSearchParams(window.location.search).get("token");
   if(!token){setMessage("Linkki puuttuu.");return;}
   history.replaceState(null,"","/beta/hallinta/vahvista");
   fetch("/api/beta/admin/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})})
    .then(r=>{if(!r.ok)throw new Error();router.replace("/beta/hallinta");})
    .catch(()=>setMessage("Linkki on virheellinen tai vanhentunut."));
 },[router]);
 return <main style={{padding:32,fontFamily:"system-ui"}}><h1>Ziiply – ylläpitäjän kirjautuminen</h1><p>{message}</p></main>;
}

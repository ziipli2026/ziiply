"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
export default function ConfirmBetaLogin() {
  const router=useRouter();
  const verificationStarted=useRef(false);
  const [status,setStatus]=useState("Vahvistetaan kirjautumista…");
  useEffect(()=>{
    if(verificationStarted.current)return;
    verificationStarted.current=true;
    const token=new URLSearchParams(window.location.search).get("token");
    // Remove the one-time secret from browser history as soon as it is read.
    window.history.replaceState(null,"","/beta/kirjaudu/vahvista");
    if(!token){setStatus("Kirjautumislinkki puuttuu.");return;}
    fetch("/api/beta/login/verify",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({token}),cache:"no-store"
    }).then(async response=>{
      if(!response.ok){setStatus("Linkki on vanhentunut tai kirjautuminen ei ole vielä käytettävissä.");return;}
      setStatus("Kirjautuminen onnistui.");
      router.replace("/arvo-tilastot");
    }).catch(()=>{setStatus("Kirjautumisen vahvistaminen epäonnistui.");});
  },[router]);
  return <main style={{maxWidth:460,margin:"4rem auto",padding:24,fontFamily:"system-ui"}}>
    <h1>Ziiply – kirjautumisen vahvistus</h1>
    <p role="status">{status}</p>
    <a href="/beta/kirjaudu">Takaisin kirjautumiseen</a>
  </main>;
}

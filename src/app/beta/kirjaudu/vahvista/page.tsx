"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export default function ConfirmBetaLogin() {
  const router=useRouter();
  const [status,setStatus]=useState("Vahvistetaan kirjautumista…");
  useEffect(()=>{
    const token=new URLSearchParams(window.location.search).get("token");
    // Remove the one-time secret from browser history as soon as it is read.
    window.history.replaceState(null,"","/beta/kirjaudu/vahvista");
    if(!token){setStatus("Kirjautumislinkki puuttuu.");return;}
    let cancelled=false;
    fetch("/api/beta/login/verify",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({token}),cache:"no-store"
    }).then(async response=>{
      if(cancelled)return;
      if(!response.ok){setStatus("Linkki on vanhentunut tai kirjautuminen ei ole vielä käytettävissä.");return;}
      setStatus("Kirjautuminen onnistui.");
      router.replace("/arvo-tilastot");
    }).catch(()=>{if(!cancelled)setStatus("Kirjautumisen vahvistaminen epäonnistui.");});
    return()=>{cancelled=true;};
  },[router]);
  return <main style={{maxWidth:460,margin:"4rem auto",padding:24,fontFamily:"system-ui"}}>
    <h1>Ziiply – kirjautumisen vahvistus</h1>
    <p role="status">{status}</p>
    <a href="/beta/kirjaudu">Takaisin kirjautumiseen</a>
  </main>;
}

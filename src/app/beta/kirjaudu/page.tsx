"use client";
import { useEffect, useState } from "react";
export default function BetaLoginPage() {
  const [email,setEmail] = useState("");
  const [status,setStatus] = useState("");
  const [busy,setBusy] = useState(false);
  const [ready,setReady] = useState(false);
  useEffect(() => {
    fetch("/api/beta/login/status",{cache:"no-store"})
      .then(r=>r.json()).then(data=>setReady(Boolean(data.emailTestReady && data.loginFlowComplete)))
      .catch(()=>setReady(false));
  },[]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!ready || busy) return;
    setBusy(true);setStatus("");
    try {
      const response=await fetch("/api/beta/login/request",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email})
      });
      const data=await response.json();
      setStatus(response.ok ? data.message : "Kirjautuminen ei ole vielä käytettävissä. Yritä myöhemmin.");
    } catch { setStatus("Yhteysvirhe. Yritä myöhemmin."); }
    finally { setBusy(false); }
  }
  return <main style={{maxWidth:460,margin:"4rem auto",padding:"1.5rem",fontFamily:"system-ui"}}>
    <h1>Ziiply – beetakirjautuminen</h1>
    <p>Kirjaudu beetarekisteriin ilmoittamallasi sähköpostiosoitteella. Et tarvitse salasanaa.</p>
    {!ready && <p role="status">Sähköpostikirjautumisen testiä valmistellaan. Lomake avautuu, kun palvelu on valmis.</p>}
    <form onSubmit={submit}>
      <label htmlFor="beta-email">Sähköpostiosoite</label>
      <input id="beta-email" type="email" autoComplete="email" required value={email}
        onChange={e=>setEmail(e.target.value)} disabled={busy}
        style={{display:"block",width:"100%",padding:12,margin:"8px 0 16px",border:"1px solid #888",borderRadius:8}}/>
      <button type="submit" disabled={!ready || busy} style={{padding:"12px 20px",borderRadius:8}}>
        {busy?"Lähetetään…":"Lähetä kirjautumislinkki"}
      </button>
    </form>
    {status && <p role="status">{status}</p>}
    <p style={{fontSize:13,marginTop:24}}>Terveystietoja ei lueta eikä tallenneta kirjautumisen yhteydessä.</p>
  </main>;
}

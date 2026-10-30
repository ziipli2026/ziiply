"use client";
import { useEffect, useState } from "react";
export default function BetaLoginPage() {
  const [email,setEmail] = useState("");
  const [status,setStatus] = useState("");
  const [busy,setBusy] = useState(false);
  const [ready,setReady] = useState(false);
  const [authenticated,setAuthenticated] = useState(false);
  useEffect(() => {
    fetch("/api/beta/login/status",{cache:"no-store"})
      .then(r=>r.json()).then(data=>setReady(Boolean(data.emailTestReady && data.loginFlowComplete)))
      .catch(()=>setReady(false));
    fetch("/api/beta/login/session",{cache:"no-store"})
      .then(r=>r.json()).then(data=>setAuthenticated(Boolean(data.authenticated)))
      .catch(()=>setAuthenticated(false));
  },[]);
  async function logout() {
    setBusy(true);setStatus("");
    try {
      const response=await fetch("/api/beta/login/logout",{method:"POST",cache:"no-store"});
      if(!response.ok) throw new Error("logout failed");
      setAuthenticated(false);
      setStatus("Olet kirjautunut ulos.");
    } catch { setStatus("Uloskirjautuminen epäonnistui. Yritä uudelleen."); }
    finally { setBusy(false); }
  }
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
      setStatus(response.ok ? data.message : (data.code === "BETA_LOGIN_RATE_LIMITED" ? data.message : data.code === "EMAIL_DELIVERY_FAILED" ? "Sähköpostin lähettäminen epäonnistui. Yritä myöhemmin." : "Kirjautuminen ei ole vielä käytettävissä. Yritä myöhemmin."));
    } catch { setStatus("Yhteysvirhe. Yritä myöhemmin."); }
    finally { setBusy(false); }
  }
  return <main style={{maxWidth:460,margin:"4rem auto",padding:"1.5rem",fontFamily:"system-ui"}}>
    <h1>Ziiply – beetakirjautuminen</h1>
    <p>Kirjaudu beetarekisteriin ilmoittamallasi sähköpostiosoitteella. Et tarvitse salasanaa.</p>
    {!ready && <p role="status">Sähköpostikirjautumisen testiä valmistellaan. Lomake avautuu, kun palvelu on valmis.</p>}
    {authenticated && <section aria-label="Beetaistunto"><p>Olet kirjautunut beetatestaajana.</p><a href="/arvo-tilastot">Avaa Arvon tilastot</a><p><button type="button" onClick={logout} disabled={busy}>Kirjaudu ulos</button></p></section>}
    {!authenticated && <form onSubmit={submit}>
      <label htmlFor="beta-email">Sähköpostiosoite</label>
      <input id="beta-email" type="email" autoComplete="email" required value={email}
        onChange={e=>setEmail(e.target.value)} disabled={busy}
        style={{display:"block",width:"100%",padding:12,margin:"8px 0 16px",border:"1px solid #888",borderRadius:8}}/>
      <button type="submit" disabled={!ready || busy} style={{padding:"12px 20px",borderRadius:8}}>
        {busy?"Lähetetään…":"Lähetä kirjautumislinkki"}
      </button>
    </form>}
    {status && <p role="status">{status}</p>}
    <p style={{fontSize:13,marginTop:24}}>Terveystietoja ei lueta eikä tallenneta kirjautumisen yhteydessä.</p>
  </main>;
}

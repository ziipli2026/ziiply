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
  return <main className="beta-login-root">
    <style>{`
      .beta-login-root{min-height:100vh;box-sizing:border-box;background:radial-gradient(circle at 85% 0%,#d6f7e7 0,transparent 36%),linear-gradient(145deg,#f7faf9,#edf3f1);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#173b31;padding:clamp(24px,5vw,72px) 20px}
      .beta-login-wrap{max-width:1050px;margin:auto}.beta-login-head{display:flex;justify-content:space-between;align-items:center;gap:12px}.beta-login-brand{font-size:32px;font-weight:850;letter-spacing:-1.5px;color:#136b4e;text-decoration:none}.beta-login-pill{font-size:12px;font-weight:750;letter-spacing:.3px;border-radius:100px;padding:9px 15px;background:#e0f3e9;color:#176847;border:1px solid #c4e7d5}
      .beta-login-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,460px);align-items:center;gap:clamp(28px,6vw,80px);margin-top:clamp(64px,12vh,140px)}.beta-login-eyebrow{font-size:12px;letter-spacing:2px;font-weight:800;color:#22825e;margin-bottom:16px}.beta-login-title{font-size:clamp(38px,5vw,62px);letter-spacing:-2px;line-height:1.08;margin:0 0 22px;font-weight:850}.beta-login-description{color:#557268;line-height:1.75;font-size:18px;max-width:460px}
      .beta-login-panel{background:white;border:1px solid #dbe8e1;border-radius:24px;padding:clamp(24px,4vw,40px);box-shadow:0 20px 60px #0b4e2915}.beta-login-panel h2{font-size:25px;letter-spacing:-.7px;margin:0 0 12px}.beta-login-muted{color:#667a70;font-size:14px;line-height:1.6;margin:0 0 28px}.beta-login-label{display:block;font-size:14px;font-weight:700;margin-bottom:9px}.beta-login-input{box-sizing:border-box;width:100%;border:1px solid #c7d9ce;border-radius:12px;padding:15px;font-size:16px;outline-offset:3px;background:white;color:#173b31}.beta-login-input:focus{border-color:#13845a;outline:2px solid #a8e4c6}.beta-login-button{display:block;width:100%;border:0;border-radius:12px;padding:15px 16px;background:#116c4c;color:white;font-size:15px;font-weight:750;cursor:pointer;margin-top:18px}.beta-login-button:disabled{opacity:.55;cursor:not-allowed}.beta-login-secondary{display:inline-block;margin-top:18px;color:#116c4c;font-weight:700;text-decoration:none}.beta-login-note{margin-top:25px;color:#71867b;font-size:13px;line-height:1.6}.beta-login-status{padding:12px 14px;background:#eaf6ef;border-radius:12px;color:#195b43;font-size:14px;line-height:1.5;margin-top:18px}.beta-login-footer{margin-top:80px;color:#70867b;font-size:13px}
      @media(max-width:760px){.beta-login-layout{grid-template-columns:1fr;margin-top:56px}.beta-login-title{font-size:40px}.beta-login-description{font-size:16px}.beta-login-footer{margin-top:48px}}
    `}</style>
    <div className="beta-login-wrap">
      <header className="beta-login-head"><a className="beta-login-brand" href="/beta/aloitus">ziiply<span style={{color:"#51b986"}}>.</span></a><span className="beta-login-pill">● BETA TESTAUS</span></header>
      <div className="beta-login-layout">
        <section><div className="beta-login-eyebrow">TERVETULOA MUKAAN</div><h1 className="beta-login-title">Ziiplyn betatestaus alkaa tästä.</h1><p className="beta-login-description">Kirjaudu mukaan omalla sähköpostiosoitteellasi. Saat turvallisen kirjautumislinkin sähköpostiisi – salasanaa ei tarvita.</p></section>
        <section className="beta-login-panel" aria-label="Betakirjautuminen">
          {authenticated ? <><h2>Olet kirjautunut sisään</h2><p className="beta-login-muted">Tervetuloa testaamaan Ziiplyä! Voit siirtyä suoraan betatestaajan aloitussivulle.</p><a className="beta-login-button" style={{textAlign:"center",textDecoration:"none",boxSizing:"border-box"}} href="/beta/aloitus">Avaa betatestaajan aloitussivu</a><button className="beta-login-button" style={{background:"#e7f4eb",color:"#116c4c"}} type="button" onClick={logout} disabled={busy}>Kirjaudu ulos</button></> :
          <><h2>Kirjaudu sisään</h2><p className="beta-login-muted">Käytä betarekisteriin ilmoittamaasi sähköpostiosoitetta.</p><form onSubmit={submit}><label className="beta-login-label" htmlFor="beta-email">Sähköpostiosoite</label><input className="beta-login-input" id="beta-email" type="email" autoComplete="email" placeholder="nimi@esimerkki.fi" required value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/><button className="beta-login-button" type="submit" disabled={!ready || busy}>{busy?"Lähetetään…":"Lähetä kirjautumislinkki"}</button></form>{!ready && <p className="beta-login-status" role="status">Sähköpostikirjautumista valmistellaan. Yritä hetken kuluttua uudelleen.</p>}</>}
          {status && <p className="beta-login-status" role="status">{status}</p>}
          <p className="beta-login-note">Kirjautuminen ei käsittele terveystietoja.</p>
        </section>
      </div><footer className="beta-login-footer">Ziiply beta · One search. All offers.</footer>
    </div>
  </main>;
}

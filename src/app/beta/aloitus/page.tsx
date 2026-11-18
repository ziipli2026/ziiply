"use client";
import { useEffect, useState } from "react";
export default function BetaStart() {
 const [authenticated,setAuthenticated]=useState<boolean|null>(null);
 const [loggingOut,setLoggingOut]=useState(false);
 useEffect(()=>{fetch("/api/beta/login/session",{cache:"no-store"}).then(r=>r.json()).then(d=>setAuthenticated(Boolean(d.authenticated))).catch(()=>setAuthenticated(false));},[]);
 async function logout(){setLoggingOut(true);try{const r=await fetch("/api/beta/login/logout",{method:"POST",cache:"no-store"});if(!r.ok)throw new Error("logout");window.location.assign("/beta/kirjaudu");}catch{setLoggingOut(false);alert("Uloskirjautuminen epäonnistui. Yritä uudelleen.");}}
 const base={minHeight:"100vh",fontFamily:"system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:"#eaf3f7",background:"radial-gradient(ellipse at 90% 0%,#15434c 0%,transparent 43%),linear-gradient(145deg,#07191f,#0d2429 62%,#0a1c22)",padding:"clamp(22px,5vw,64px) 20px",boxSizing:"border-box" as const};
 const button={display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,textDecoration:"none",fontWeight:700,borderRadius:12,padding:"13px 18px",background:"#b9f16d",color:"#102018",width:"fit-content",maxWidth:"100%"};
 const card={background:"rgba(255,255,255,.065)",border:"1px solid rgba(255,255,255,.14)",borderRadius:22,padding:"clamp(20px,3vw,30px)",display:"flex",flexDirection:"column" as const,alignItems:"flex-start",gap:12,boxShadow:"0 14px 36px rgba(0,0,0,.12)"};
 if(authenticated===null) return <main style={base}><p role="status">Tarkistetaan kirjautumista…</p></main>;
 if(!authenticated) return <main style={base}><div style={{maxWidth:700,margin:"10vh auto"}}><div style={{fontWeight:900,fontSize:27,letterSpacing:"-.05em"}}>ziiply<span style={{color:"#b9f16d"}}>.</span></div><h1 style={{fontSize:"clamp(32px,5vw,48px)",letterSpacing:"-.04em"}}>Betatestaajien alue</h1><p style={{color:"#b8cbd0",marginBottom:30}}>Kirjaudu sähköpostiin lähetettävällä linkillä päästäksesi aloitussivulle.</p><a href="/beta/kirjaudu" style={button}>Siirry kirjautumiseen <span aria-hidden="true">→</span></a></div></main>;
 return <main style={base}>
  <div style={{maxWidth:1080,margin:"0 auto"}}>
   <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",marginBottom:68}}>
    <div style={{fontWeight:900,fontSize:30,letterSpacing:"-.055em"}}>ziiply<span style={{color:"#b9f16d"}}>.</span></div>
    <div style={{display:"flex",alignItems:"center",gap:18,flexWrap:"wrap"}}><span style={{fontSize:13,color:"#b9f16d",background:"rgba(185,241,109,.1)",padding:"8px 12px",borderRadius:30,border:"1px solid rgba(185,241,109,.2)"}}>● Betatestaaja</span><button type="button" onClick={logout} disabled={loggingOut} style={{background:"transparent",border:"1px solid #52666b",color:"#eaf3f7",borderRadius:10,padding:"9px 13px",cursor:"pointer"}}>{loggingOut?"Kirjaudutaan ulos…":"Kirjaudu ulos"}</button></div>
   </header>
   <section style={{marginBottom:38}}>
    <p style={{color:"#b9f16d",textTransform:"uppercase",fontSize:12,fontWeight:800,letterSpacing:".17em",marginBottom:14}}>Ziiply Beta · Tervetuloa mukaan</p>
    <h1 style={{fontSize:"clamp(36px,6vw,64px)",lineHeight:1.07,letterSpacing:"-.055em",fontWeight:800,maxWidth:800,margin:"0 0 18px"}}>Yksi haku.<br/><span style={{color:"#b9f16d"}}>Kaikki tarjoukset.</span></h1>
    <p style={{fontSize:"clamp(16px,2.3vw,20px)",lineHeight:1.6,color:"#b8cbd0",maxWidth:700}}>Olet kirjautunut Ziiplyn betatestaajaksi. Tutustu käyttöohjeisiin tai aloita sovelluksen testaaminen.</p>
   </section>
   <section aria-label="Betatestaajan valinnat" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,285px),1fr))",gap:18}}>
    <article style={{...card,background:"linear-gradient(145deg,rgba(185,241,109,.13),rgba(255,255,255,.055))",border:"1px solid rgba(185,241,109,.27)"}}>
     <span aria-hidden="true" style={{fontSize:34}}>📱</span><h2 style={{fontSize:25,letterSpacing:"-.035em",margin:0}}>Mobiiliohjeet</h2><p style={{color:"#b8cbd0",lineHeight:1.6,flex:1,margin:"0 0 8px"}}>Opi käyttämään Ziiplyä puhelimella. Ohjepalvelu käyttää toistaiseksi erillistä kirjautumista.</p><a style={button} href="https://ziiply-protected-guide.vercel.app/ohje">Avaa mobiiliohjeet <span aria-hidden="true">→</span></a>
    </article>
    <article style={card}><span aria-hidden="true" style={{fontSize:34}}>💻</span><h2 style={{fontSize:25,letterSpacing:"-.035em",margin:0}}>Desktop-ohjeet</h2><p style={{color:"#b8cbd0",lineHeight:1.6,flex:1,margin:"0 0 8px"}}>Tietokoneversion ohjeistus on valmisteilla. Voit jo kokeilla sovellusta tietokoneella.</p><span style={{fontSize:13,color:"#c5d0d2",background:"rgba(255,255,255,.09)",padding:"10px 14px",borderRadius:10}}>Tulossa myöhemmin</span></article>
    <article style={card}><span aria-hidden="true" style={{fontSize:34}}>🛒</span><h2 style={{fontSize:25,letterSpacing:"-.035em",margin:0}}>Testaa Ziiplyä</h2><p style={{color:"#b8cbd0",lineHeight:1.6,flex:1,margin:"0 0 8px"}}>Siirry sovellukseen ja kokeile hakuja sekä ostoskorivertailua. Sovelluksen erillinen beta-käyttörajoitus on vielä työn alla.</p><a style={{...button,background:"#eaf3f7"}} href="https://ziiply.vercel.app">Avaa sovellus <span aria-hidden="true">→</span></a></article>
   </section>
   <footer style={{marginTop:42,paddingTop:22,borderTop:"1px solid rgba(255,255,255,.12)",fontSize:13,color:"#93aab0"}}>Ziiply Beta · Testiversio · Kiitos, että autat kehittämään palvelua.</footer>
  </div>
 </main>;
}

"use client";
import { useEffect, useState } from "react";
export default function BetaStart() {
 const [authenticated,setAuthenticated]=useState<boolean|null>(null);
 useEffect(()=>{fetch("/api/beta/login/session",{cache:"no-store"}).then(r=>r.json()).then(d=>setAuthenticated(Boolean(d.authenticated))).catch(()=>setAuthenticated(false));},[]);
 if(authenticated===null) return <main style={{padding:32,fontFamily:"system-ui"}}><p>Tarkistetaan kirjautumista…</p></main>;
 if(!authenticated) return <main style={{maxWidth:700,margin:"3rem auto",padding:24,fontFamily:"system-ui"}}><h1>Ziiplyn betatestaus</h1><p>Kirjaudu ensin betatestaajan tunnuksella.</p><a href="/beta/kirjaudu">Siirry kirjautumiseen</a></main>;
 return <main style={{maxWidth:760,margin:"3rem auto",padding:24,fontFamily:"system-ui",lineHeight:1.6}}>
 <h1>Tervetuloa Ziiplyn betatestaukseen!</h1><p>Olet kirjautunut betatestaajana. Tutustu ensin ohjeisiin tai avaa sovellus.</p>
 <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
 <article style={{border:"1px solid #ccc",borderRadius:12,padding:18}}><h2>Mobiiliohjeet</h2><p>Puhelimella käytettävän Ziiplyn ohjeet. Ohjepalvelu saattaa pyytää erillisen salasanan.</p><a href="https://ziiply-protected-guide.vercel.app/ohje">Avaa käyttöohjeet</a></article>
 <article style={{border:"1px solid #ccc",borderRadius:12,padding:18}}><h2>Desktop-ohjeet</h2><p>Tietokoneversion ohjeistus on vielä valmisteltavana.</p><span>Ei vielä julkaistu</span></article>
 <article style={{border:"1px solid #ccc",borderRadius:12,padding:18}}><h2>Testaa Ziiplyä</h2><p>Varsinainen sovellus. Sen pääsyn rajoittaminen betatestaajille on vielä erillinen työ.</p><a href="https://ziiply.vercel.app">Avaa Ziiply</a></article>
 </section><p style={{marginTop:28}}><a href="/beta/kirjaudu">Kirjautuminen ja uloskirjautuminen</a></p></main>;
}

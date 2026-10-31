"use client";
import {useEffect,useState} from "react";
type Count={status:string;count:number};
export default function AdminPage() {
 const [counts,setCounts]=useState<Count[]|null>(null);
 const [unauthorized,setUnauthorized]=useState(false);
 const [email,setEmail]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 useEffect(()=>{fetch("/api/beta/admin/summary",{cache:"no-store"}).then(async r=>{if(r.status===403){setUnauthorized(true);return;}if(!r.ok)throw Error();const data=await r.json();setCounts(data.counts);}).catch(()=>setNotice("Tietojen lataaminen epäonnistui."));},[]);
 async function send(e:React.FormEvent){e.preventDefault();setBusy(true);setNotice("");try{const r=await fetch("/api/beta/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});const data=await r.json();setNotice(r.ok?data.message:"Linkin lähettäminen epäonnistui. Yritä myöhemmin.");}catch{setNotice("Yhteysvirhe.");}finally{setBusy(false);}}
 return <main style={{maxWidth:600,margin:"3rem auto",padding:24,fontFamily:"system-ui"}}>
 <h1>Ziiply – beetatestaajien hallinta</h1>
 {counts && <><p>Beetatestaajien määrät</p><table><thead><tr><th>Tila</th><th>Määrä</th></tr></thead><tbody>{counts.map(x=><tr key={x.status}><td style={{padding:8}}>{x.status}</td><td style={{padding:8}}>{x.count}</td></tr>)}</tbody></table></>}
 {unauthorized && <><p>Kirjaudu ylläpitäjän sähköpostiin lähetettävällä kertakäyttölinkillä.</p><form onSubmit={send}><label htmlFor="admin-email">Ylläpitäjän sähköposti</label><input id="admin-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={{display:"block",padding:10,margin:"12px 0",width:"100%",boxSizing:"border-box"}}/><button disabled={busy} type="submit">{busy?"Lähetetään…":"Lähetä kirjautumislinkki"}</button></form></>}
 {!unauthorized && !counts && !notice && <p>Tarkistetaan kirjautuminen…</p>}
 {notice && <p role="status">{notice}</p>}
 </main>;
}

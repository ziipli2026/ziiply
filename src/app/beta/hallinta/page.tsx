"use client";
import {useEffect,useState} from "react";
type Count={status:string;count:number};
type Applicant={id:string;email:string;whatsapp_phone?:string|null;municipality:string;profile_key:string;status:string;created_at:string};
export default function AdminPage() {
 const [counts,setCounts]=useState<Count[]|null>(null);
 const [applications,setApplications]=useState<Applicant[]>([]);
 const [unauthorized,setUnauthorized]=useState(false);
 const [email,setEmail]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 const [changing,setChanging]=useState("");
 async function refresh(){
  const r=await fetch("/api/beta/admin/summary",{cache:"no-store"});
  if(r.status===403){setUnauthorized(true);return;}
  if(!r.ok)throw Error("summary");
  const data=await r.json();setCounts(data.counts);
  const a=await fetch("/api/beta/admin/applications",{cache:"no-store"});
  if(!a.ok)throw Error("applications");
  setApplications((await a.json()).applications);
 }
 useEffect(()=>{refresh().catch(()=>setNotice("Tietojen lataaminen epäonnistui."));},[]);
 async function send(e:React.FormEvent){e.preventDefault();setBusy(true);setNotice("");try{const r=await fetch("/api/beta/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});const data=await r.json();setNotice(r.ok?data.message:"Linkin lähettäminen epäonnistui. Yritä myöhemmin.");}catch{setNotice("Yhteysvirhe.");}finally{setBusy(false);}}
 async function invite(a:Applicant){
  if(!window.confirm("Lähetetäänkö kirjautumiskutsu osoitteeseen "+a.email+"?"))return;
  setChanging(a.id);setNotice("");
  try {const r=await fetch("/api/beta/admin/invite",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:a.id})});if(!r.ok)throw Error();await refresh();setNotice("Kutsu lähetetty sähköpostiin.");}
  catch{setNotice("Kutsun lähetys epäonnistui. Tarkista tilanne ennen uutta yritystä.");}finally{setChanging("");}
 }
 function shareWhatsApp(a:Applicant){
  const link=new URL("/beta/kirjaudu",window.location.origin).toString();
  const message="Hei! Sinut on kutsuttu Ziiplyn beetatestaukseen. Avaa "+link+" ja pyydä kirjautumislinkki ilmoittautumisesi sähköpostiosoitteeseen ("+a.email+").";
  window.open("https://wa.me/"+(a.whatsapp_phone?a.whatsapp_phone.replace(/\D/g,""):"")+"?text="+encodeURIComponent(message),"_blank","noopener,noreferrer");
 }
 async function change(a:Applicant,status:string){
  const label=status==="invited"?"kutsutuksi":status==="active"?"aktiiviseksi":"poistetuksi käytöstä";
  if(!window.confirm("Muutetaanko "+a.email+" tilaan "+label+"?"))return;
  setChanging(a.id);setNotice("");
  try{const r=await fetch("/api/beta/admin/applications",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:a.id,status})});
   if(!r.ok)throw Error();await refresh();setNotice("Tila päivitetty.");
  }catch{setNotice("Tilan muuttaminen epäonnistui.");}finally{setChanging("");}
 }
 return <main style={{maxWidth:1050,margin:"3rem auto",padding:24,fontFamily:"system-ui"}}>
 <h1>Ziiply – beetatestaajien hallinta</h1>
 {counts && <><h2>Beetatestaajien määrät</h2><table><thead><tr><th>Tila</th><th>Määrä</th></tr></thead><tbody>{counts.map(x=><tr key={x.status}><td style={{padding:8}}>{x.status}</td><td style={{padding:8}}>{x.count}</td></tr>)}</tbody></table>
 <h2>Hakemukset (enintään 400 uusinta)</h2>
 <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th>Sähköposti</th><th>WhatsApp</th><th>Kunta</th><th>Profiili</th><th>Tila</th><th>Toiminnot</th></tr></thead><tbody>{applications.map(a=><tr key={a.id} style={{borderTop:"1px solid #888"}}>
 <td style={{padding:8}}>{a.email}</td><td style={{padding:8}}>{a.whatsapp_phone||"—"}</td><td style={{padding:8}}>{a.municipality}</td><td style={{padding:8}}>{a.profile_key}</td><td style={{padding:8}}>{a.status}</td>
 <td style={{padding:8,whiteSpace:"nowrap"}}>
 {["registered","waitlist"].includes(a.status)&&<button disabled={!!changing} onClick={()=>invite(a)}>Lähetä kutsu</button>}
 {["invited","active"].includes(a.status)&&<button disabled={!!changing} onClick={()=>shareWhatsApp(a)} style={{marginLeft:8}}>Jaa WhatsAppissa</button>}
 {a.status==="invited"&&<button disabled={!!changing} onClick={()=>change(a,"active")}>Aktivoi</button>}
 {["invited","active"].includes(a.status)&&<button disabled={!!changing} onClick={()=>change(a,"withdrawn")} style={{marginLeft:8}}>Poista käyttöoikeus</button>}
 </td></tr>)}</tbody></table></div></>}
 {unauthorized && <><p>Kirjaudu ylläpitäjän sähköpostiin lähetettävällä kertakäyttölinkillä.</p><form onSubmit={send}><label htmlFor="admin-email">Ylläpitäjän sähköposti</label><input id="admin-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={{display:"block",padding:10,margin:"12px 0",width:"100%",boxSizing:"border-box"}}/><button disabled={busy} type="submit">{busy?"Lähetetään…":"Lähetä kirjautumislinkki"}</button></form></>}
 {!unauthorized&&!counts&&!notice&&<p>Tarkistetaan kirjautuminen…</p>}
 {notice&&<p role="status">{notice}</p>}
 </main>;
}

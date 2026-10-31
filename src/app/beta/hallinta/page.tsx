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
 return <main className="beta-admin" style={{maxWidth:1050,margin:"0 auto",minHeight:"100dvh",boxSizing:"border-box",padding:"clamp(12px,3vw,32px)",fontFamily:"system-ui",color:"#17212f"}}>
 <h1 style={{fontSize:"clamp(22px,3vw,30px)",margin:"0 0 16px"}}>Ziiply – beetatestaajien hallinta</h1>
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
 {unauthorized && <section style={{maxWidth:480,margin:"clamp(18px,8vh,80px) auto 0",padding:"clamp(18px,4vw,30px)",background:"#fff",border:"1px solid #dbe5f0",borderRadius:16,boxShadow:"0 8px 30px #1a365015"}}><h2 style={{fontSize:21,margin:"0 0 8px"}}>Ylläpitäjän kirjautuminen</h2><p style={{fontSize:14,lineHeight:1.5,margin:"0 0 20px",color:"#526274"}}>Saat kertakäyttöisen kirjautumislinkin ylläpitäjän sähköpostiin.</p><form onSubmit={send} style={{display:"grid",gap:12}}><label htmlFor="admin-email" style={{fontWeight:600,fontSize:14}}>Ylläpitäjän sähköpostiosoite</label><input id="admin-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="contact@ziiply.fi" style={{width:"100%",boxSizing:"border-box",minHeight:46,padding:"10px 12px",fontSize:16,color:"#17212f",background:"#fff",border:"1.5px solid #7c9cc8",borderRadius:9}}/><button disabled={busy} type="submit" style={{minHeight:46,padding:"10px 14px",fontSize:16,fontWeight:700,color:"#fff",background:busy?"#64748b":"#1769c2",border:0,borderRadius:9,cursor:busy?"wait":"pointer"}}>{busy?"Lähetetään…":"Lähetä kirjautumislinkki"}</button></form></section>}
 {!unauthorized&&!counts&&!notice&&<p>Tarkistetaan kirjautuminen…</p>}
 {notice&&<p role="status">{notice}</p>}
 </main>;
}

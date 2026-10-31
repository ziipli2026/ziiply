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
 async function shareWhatsApp(a:Applicant){
  if(["registered","waitlist"].includes(a.status)){
   if(!window.confirm("Hyväksytäänkö "+a.email+" kutsutuksi ja avataan WhatsApp-kutsu?"))return;
   setChanging(a.id);
   try{const r=await fetch("/api/beta/admin/applications",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:a.id,status:"invited"})});if(!r.ok)throw Error();await refresh();}catch{setNotice("Kutsun hyväksyminen epäonnistui.");return;}finally{setChanging("");}
  }

  const link="https://ziiply-git-feature-arvo-health-sync-a639d7-ziipli2026s-projects.vercel.app/beta/kirjaudu";
  const message="Hei! Sinut on kutsuttu Ziiplyn beetatestaukseen. Avaa "+link+" ja pyydä kirjautumislinkki ilmoittautumisesi sähköpostiosoitteeseen ("+a.email+").";
  window.location.assign("https://wa.me/"+(a.whatsapp_phone?a.whatsapp_phone.replace(/\D/g,""):"")+"?text="+encodeURIComponent(message));
 }
 async function change(a:Applicant,status:string){
  const label=status==="invited"?"kutsutuksi":status==="active"?"aktiiviseksi":"poistetuksi käytöstä";
  if(!window.confirm("Muutetaanko "+a.email+" tilaan "+label+"?"))return;
  setChanging(a.id);setNotice("");
  try{const r=await fetch("/api/beta/admin/applications",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:a.id,status})});
   if(!r.ok)throw Error();await refresh();setNotice("Tila päivitetty.");
  }catch{setNotice("Tilan muuttaminen epäonnistui.");}finally{setChanging("");}
 }
 return <main className="beta-admin" style={{maxWidth:1280,margin:"0 auto",minHeight:"100dvh",boxSizing:"border-box",padding:"clamp(12px,3vw,32px)",fontFamily:"system-ui",color:"#17212f"}}>
 <h1 style={{fontSize:"clamp(22px,3vw,30px)",margin:"0 0 16px"}}>Ziiply – beetatestaajien hallinta</h1>
 {counts && <div className="beta-dashboard">
 <section className="beta-panel"><div className="beta-section-head"><div><h2>Beetatestaajien tilanne</h2><p>Ilmoittautumiset ja käyttöoikeudet</p></div><strong className="beta-total">{counts.reduce((n,x)=>n+Number(x.count),0)} / 400</strong></div>
 <div className="beta-stats">{counts.map(x=><div className="beta-stat" key={x.status}><span>{({registered:"Ilmoittautunut",waitlist:"Jonossa",invited:"Kutsuttu",active:"Aktiivinen",withdrawn:"Poistettu"} as Record<string,string>)[x.status]||x.status}</span><strong>{x.count}</strong></div>)}</div></section>
 <section className="beta-panel"><div className="beta-section-head"><div><h2>Hakemukset</h2><p>Enintään 400 uusinta ilmoittautumista</p></div><span className="beta-count">{applications.length} hakemusta</span></div>
 <div className="beta-table-scroll"><table className="beta-table"><thead><tr><th>Sähköposti</th><th>WhatsApp</th><th>Kunta</th><th>Profiili</th><th>Tila</th><th>Toiminnot</th></tr></thead><tbody>{applications.map(a=><tr key={a.id}>
 <td data-label="Sähköposti" className="beta-email">{a.email}</td><td data-label="WhatsApp">{a.whatsapp_phone||"—"}</td><td data-label="Kunta">{a.municipality||"—"}</td><td data-label="Profiili">{({household:"Kotitalous",family:"Lapsiperhe",budget:"Hintatietoinen",recipes:"Reseptit",fuel:"Polttoaine",technical:"Tekninen",nutrition:"Ravitsemus"} as Record<string,string>)[a.profile_key]||a.profile_key}</td><td data-label="Tila"><span className={"beta-status beta-status-"+a.status}>{({registered:"Ilmoittautunut",waitlist:"Jonossa",invited:"Kutsuttu",active:"Aktiivinen",withdrawn:"Poistettu"} as Record<string,string>)[a.status]||a.status}</span></td>
 <td data-label="Toiminnot"><div className="beta-actions">
 {["registered","waitlist"].includes(a.status)&&<button className="beta-btn beta-btn-primary" disabled={!!changing} onClick={()=>invite(a)}>Lähetä kutsu</button>}
 {["registered","waitlist","invited","active"].includes(a.status)&&<button className="beta-btn" disabled={!!changing} onClick={()=>shareWhatsApp(a)}>{["registered","waitlist"].includes(a.status)?"Kutsu WhatsAppissa":"Jaa WhatsAppissa"}</button>}
 {a.status==="invited"&&<button className="beta-btn beta-btn-primary" disabled={!!changing} onClick={()=>change(a,"active")}>Aktivoi</button>}
 {["invited","active"].includes(a.status)&&<button className="beta-btn beta-btn-danger" disabled={!!changing} onClick={()=>change(a,"withdrawn")}>Poista käyttöoikeus</button>}
 </div></td></tr>)}</tbody></table></div>
 </section></div>}
 {unauthorized && <section style={{maxWidth:480,margin:"clamp(18px,8vh,80px) auto 0",padding:"clamp(18px,4vw,30px)",background:"#fff",border:"1px solid #dbe5f0",borderRadius:16,boxShadow:"0 8px 30px #1a365015"}}><h2 style={{fontSize:21,margin:"0 0 8px"}}>Ylläpitäjän kirjautuminen</h2><p style={{fontSize:14,lineHeight:1.5,margin:"0 0 20px",color:"#526274"}}>Saat kertakäyttöisen kirjautumislinkin ylläpitäjän sähköpostiin.</p><form onSubmit={send} style={{display:"grid",gap:12}}><label htmlFor="admin-email" style={{fontWeight:600,fontSize:14}}>Ylläpitäjän sähköpostiosoite</label><input id="admin-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="contact@ziiply.fi" style={{width:"100%",boxSizing:"border-box",minHeight:46,padding:"10px 12px",fontSize:16,color:"#17212f",background:"#fff",border:"1.5px solid #7c9cc8",borderRadius:9}}/><button disabled={busy} type="submit" style={{minHeight:46,padding:"10px 14px",fontSize:16,fontWeight:700,color:"#fff",background:busy?"#64748b":"#1769c2",border:0,borderRadius:9,cursor:busy?"wait":"pointer"}}>{busy?"Lähetetään…":"Lähetä kirjautumislinkki"}</button></form></section>}
 {!unauthorized&&!counts&&!notice&&<p>Tarkistetaan kirjautuminen…</p>}
 {notice&&<p role="status">{notice}</p>}
 <style jsx global>{`
.beta-dashboard{display:grid;gap:22px}.beta-panel{background:#fff;border:1px solid #dce5f0;border-radius:16px;padding:clamp(14px,2vw,24px);box-shadow:0 5px 24px #1a36500a}.beta-section-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:20px}.beta-section-head h2{font-size:20px;margin:0 0 4px}.beta-section-head p{margin:0;color:#617083;font-size:13px}.beta-total{font-size:23px;color:#1769c2}.beta-count{font-size:13px;color:#526274;white-space:nowrap}.beta-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px}.beta-stat{background:#f4f7fc;border:1px solid #e5ebf4;border-radius:12px;padding:16px;display:grid;gap:8px}.beta-stat span{color:#526274;font-size:13px}.beta-stat strong{font-size:28px}.beta-table-scroll{overflow-x:auto}.beta-table{width:100%;border-collapse:collapse;text-align:left;font-size:14px}.beta-table th{font-size:12px;color:#526274;background:#f4f7fc;font-weight:700;padding:12px 10px;white-space:nowrap}.beta-table td{padding:14px 10px;border-bottom:1px solid #e7edf5;vertical-align:middle}.beta-email{font-weight:600;overflow-wrap:anywhere}.beta-status{display:inline-flex;padding:5px 10px;border-radius:999px;background:#edf2f7;color:#415066;font-size:12px;font-weight:700;white-space:nowrap}.beta-status-active{background:#e4f6e9;color:#16703a}.beta-status-registered{background:#e8f1ff;color:#1d5da8}.beta-status-invited{background:#fff3dc;color:#906000}.beta-actions{display:flex;flex-wrap:wrap;gap:7px}.beta-btn{border:1px solid #b6c7db;background:#fff;color:#1c4169;border-radius:8px;padding:9px 12px;font-size:13px;font-weight:650;cursor:pointer;white-space:nowrap}.beta-btn-primary{background:#1769c2;border-color:#1769c2;color:white}.beta-btn-danger{color:#a23535;border-color:#e4b7b7}.beta-btn:disabled{opacity:.5;cursor:wait}
@media(max-width:740px){.beta-dashboard{gap:12px}.beta-panel{padding:13px;border-radius:12px}.beta-section-head h2{font-size:17px}.beta-table thead{display:none}.beta-table,.beta-table tbody,.beta-table tr,.beta-table td{display:block;width:100%;box-sizing:border-box}.beta-table tr{border:1px solid #e2eaf3;border-radius:12px;margin:0 0 12px;padding:9px}.beta-table td{border:0;padding:5px 6px;display:flex;justify-content:space-between;gap:10px;align-items:flex-start;text-align:right;overflow-wrap:anywhere}.beta-table td:before{content:attr(data-label);font-weight:650;color:#617083;font-size:12px;flex-shrink:0}.beta-table td:last-child{display:block;text-align:left;padding-top:12px}.beta-table td:last-child:before{display:block;margin-bottom:8px}.beta-actions{justify-content:flex-start}.beta-stat{padding:11px}.beta-stat strong{font-size:24px}}
`}</style>
 </main>;
}

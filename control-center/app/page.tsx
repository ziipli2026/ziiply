import {neon} from "@neondatabase/serverless";

const CHAINS=[
  {key:"S",name:"S-ryhmä / Prisma / S-market",match:(v:string)=>/^(s(?::|$)|prisma|s-?market|sale|alepa)/i.test(v)},
  {key:"K",name:"K-ryhmä / Citymarket / K-Supermarket / K-Market",match:(v:string)=>/^(k(?::|$)|k-?citymarket|citymarket|k-?supermarket|k-?market)/i.test(v)},
  {key:"Lidl",name:"Lidl",match:(v:string)=>/^lidl(?::|$)/i.test(v)},
  {key:"Tokmanni",name:"Tokmanni / SPAR",match:(v:string)=>/^(tokmanni|spar|eurospar)(?::|$)/i.test(v)}
];

type Row={chain:string;source:string;ok:boolean;offer_count:number;outcome:string;checked_at:string};
type Pub={chain:string;publication_id:string;valid_from:string;valid_until:string;parsed_at:string;approval_state:string;offer_count:number;missing_price:number;missing_image:number;missing_category:number};
type EanStats={total:number;with_image:number;classified:number;seen_24h:number;missing_image:number;missing_category:number;stale_30d:number};

async function load(){
  const url=process.env.DATABASE_URL;
  if(!url)return {error:"DATABASE_URL puuttuu",runs:[] as Row[],pubs:[] as Pub[],ean:null};
  try{
    const sql=neon(url);
    const runs=await sql`SELECT checked_at::text AS checked_at,chain,source,ok,offer_count,outcome
      FROM ziiply_publication_run_log WHERE checked_at>NOW()-INTERVAL '14 days'
      ORDER BY checked_at DESC,id DESC LIMIT 300`;
    const pubs=await sql`SELECT chain,publication_id,valid_from::text,valid_until::text,parsed_at::text,approval_state,
      jsonb_array_length(offers)::int AS offer_count,
      (SELECT COUNT(*)::int FROM jsonb_array_elements(offers) o WHERE COALESCE(NULLIF(o->>'offerPrice',''),NULLIF(o->>'price',''),NULLIF(o->>'priceText','')) IS NULL) AS missing_price,
      (SELECT COUNT(*)::int FROM jsonb_array_elements(offers) o WHERE COALESCE(NULLIF(o->>'imageUrl',''),NULLIF(o->>'image',''),NULLIF(o->>'image_url','')) IS NULL) AS missing_image,
      (SELECT COUNT(*)::int FROM jsonb_array_elements(offers) o WHERE COALESCE(NULLIF(o->>'category',''),NULLIF(o->>'categoryName','')) IS NULL) AS missing_category
      FROM ziiply_offer_publications
      WHERE valid_until >= (NOW() AT TIME ZONE 'Europe/Helsinki')::date - 1
      ORDER BY parsed_at DESC`;
    const ean=await sql`SELECT COUNT(*)::int total,
      COUNT(*) FILTER(WHERE image_url IS NOT NULL AND image_url<>'')::int with_image,
      COUNT(*) FILTER(WHERE category IS NOT NULL AND TRIM(category)<>'')::int classified,
      COUNT(*) FILTER(WHERE last_seen_at>NOW()-INTERVAL '24 hours')::int seen_24h,
      COUNT(*) FILTER(WHERE image_url IS NULL OR image_url='')::int missing_image,
      COUNT(*) FILTER(WHERE category IS NULL OR TRIM(category)='')::int missing_category,
      COUNT(*) FILTER(WHERE last_seen_at<NOW()-INTERVAL '30 days')::int stale_30d
      FROM ziiply_ean_products`;
    return {error:null,runs:runs as Row[],pubs:pubs as Pub[],ean:ean[0] as EanStats};
  }catch(e){return {error:e instanceof Error?e.message:"Tietokantavirhe",runs:[] as Row[],pubs:[] as Pub[],ean:null}}
}

function state(rows:Row[]){
  if(!rows.length)return ["gray","EI DATAA"];
  const a=rows[0];
  if(!a.ok)return ["red","VIRHE"];
  if(a.offer_count===0)return ["red","0 TARJOUSTA"];
  const b=rows[1];
  if(b&&a.offer_count<Math.max(1,Math.floor(b.offer_count*.5)))return ["yellow","MÄÄRÄ ROMAHTANUT"];
  return ["green","OK"];
}
function dot(s:string){return s==="green"?"🟢":s==="yellow"?"🟡":s==="red"?"🔴":"⚪"}

export default async function Page(){
  const d=await load();
  const cards=CHAINS.map(c=>({...c,runs:d.runs.filter(r=>c.match(r.chain.trim()))}));
  const todayFi=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const activePubs=d.pubs.filter(p=>p.approval_state==="approved"&&p.valid_from<=todayFi&&p.valid_until>=todayFi);
  const candidatePubs=d.pubs.filter(p=>p.approval_state==="candidate");
  const activeOfferTotal=activePubs.reduce((n,p)=>n+p.offer_count,0);
  const quality={missingPrice:activePubs.reduce((n,p)=>n+p.missing_price,0),missingImage:activePubs.reduce((n,p)=>n+p.missing_image,0),missingCategory:activePubs.reduce((n,p)=>n+p.missing_category,0)};
  const activeCandidates=candidatePubs.filter(p=>p.valid_from<=todayFi&&p.valid_until>=todayFi);
  const expiringToday=activePubs.filter(p=>p.valid_until===todayFi);
  const latestBySource=[...new Map(d.runs.map(r=>[`${r.chain}::${r.source}`,r])).values()];
  const staleRuns=latestBySource.filter(r=>Date.now()-new Date(r.checked_at).getTime()>36*60*60*1000);
  const latestRun=d.runs[0];
  const nextApproved=d.pubs.filter(p=>p.approval_state==="approved"&&p.valid_from>todayFi).sort((a,b)=>a.valid_from.localeCompare(b.valid_from))[0];
  const overlappingApproved=activePubs.filter((p,i,a)=>a.some((q,j)=>j!==i&&q.chain===p.chain&&q.publication_id!==p.publication_id));
  const publicationGroups=[...new Map(activePubs.map(p=>[p.chain,activePubs.filter(q=>q.chain===p.chain)])).entries()];
  const chainQuality=publicationGroups.map(([chain,pubs])=>({chain,offers:pubs.reduce((n,p)=>n+p.offer_count,0),missingPrice:pubs.reduce((n,p)=>n+p.missing_price,0),missingImage:pubs.reduce((n,p)=>n+p.missing_image,0),missingCategory:pubs.reduce((n,p)=>n+p.missing_category,0),publications:pubs.length}));
  const failedRuns24h=d.runs.filter(r=>!r.ok&&Date.now()-new Date(r.checked_at).getTime()<=24*60*60*1000);
  const recoveredFailures=d.runs.filter((r,i)=>!r.ok&&d.runs.slice(0,i).some(n=>n.chain===r.chain&&n.source===r.source&&n.ok));
  const currentFailures=latestBySource.filter(r=>!r.ok);
  const attention=[
    ...activeCandidates.map(p=>({level:"red",title:p.chain+": aktiivinen candidate",detail:p.publication_id+" · "+p.offer_count+" tarjousta · "+p.valid_from+"–"+p.valid_until})),
    ...currentFailures.map(r=>({level:"red",title:r.chain+": viimeisin ajo epäonnistui",detail:r.source+" · "+r.offer_count+" · "+r.outcome})),
    ...staleRuns.map(r=>({level:"yellow",title:r.chain+": health-ajo vanhentunut",detail:r.source+" · "+new Date(r.checked_at).toLocaleString("fi-FI")})),
    ...expiringToday.map(p=>({level:"yellow",title:p.chain+": julkaisu päättyy tänään",detail:p.publication_id+" · "+p.offer_count+" tarjousta"})),
    ...overlappingApproved.map(p=>({level:"yellow",title:p.chain+": useita aktiivisia approved-julkaisuja",detail:p.publication_id+" · "+p.offer_count+" tarjousta"})),
    ...(quality.missingPrice?[{level:"red",title:"Aktiivisista julkaisuista puuttuu hintoja",detail:quality.missingPrice+" riviä"}]:[]),
    ...(quality.missingImage?[{level:"yellow",title:"Aktiivisista julkaisuista puuttuu kuvia",detail:quality.missingImage+" riviä"}]:[]),
    ...(quality.missingCategory?[{level:"yellow",title:"Aktiivisista julkaisuista puuttuu kategorioita",detail:quality.missingCategory+" riviä"}]:[])
  ];
  const states=cards.map(c=>state(c.runs));
  const overall=activeCandidates.length||states.some(x=>x[0]==="red")?["red","TOIMINTA VAATII TOIMIA"]:states.some(x=>x[0]==="yellow"||x[0]==="gray")||staleRuns.length?["yellow","VAROITUKSIA / SEURANTA PUUTTUU"]:["green","KAIKKI SEURANNAT OK"];

  return <main style={{maxWidth:1500,margin:"0 auto",padding:28}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"end",marginBottom:22}}>
      <div><div style={{fontSize:12,letterSpacing:2,fontWeight:800,color:"#64748b"}}>ZIIPLY / INTERNAL</div>
      <h1 style={{margin:"5px 0",fontSize:36}}>Control Center</h1>
      <div style={{color:"#64748b"}}>Tarjousjulkaisut · automaatiot · EAN-pankki</div></div>
      <div style={{fontSize:19,fontWeight:850}}>{dot(overall[0])} {overall[1]}</div>
    </header>

    {d.error&&<div style={{background:"#fee4e2",border:"1px solid #fecdca",padding:16,borderRadius:12,marginBottom:16}}>🔴 {d.error}</div>}

    <section style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {cards.map((c,i)=>{const [s,label]=states[i];const r=c.runs[0];return <article key={c.key} style={{background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:18}}>
        <div style={{fontWeight:800,fontSize:16}}>{dot(s)} {c.name}</div>
        <div style={{marginTop:7,fontWeight:800,color:s==="red"?"#b42318":s==="yellow"?"#a15c00":s==="green"?"#087443":"#667085"}}>{label}</div>
        <div style={{fontSize:31,fontWeight:900,marginTop:14}}>{r?r.offer_count:"—"}</div>
        <div style={{fontSize:12,color:"#667085"}}>viimeisin tarjousmäärä</div>
        <div style={{fontSize:12,color:"#667085",marginTop:9}}>{r?new Date(r.checked_at).toLocaleString("fi-FI"):"Ei ajoa 14 vrk"}</div>
        {r&&<div style={{fontSize:13,marginTop:7}}>{r.outcome}</div>}
      </article>})}
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {metricCard("Aktiiviset hyväksytyt julkaisut",activePubs.length,activePubs.length?"green":"yellow")}
      {metricCard("Aktiivisten julkaisujen tarjoukset",activeOfferTotal,activeOfferTotal?"green":"yellow")}
      {metricCard("Candidate / odottaa",candidatePubs.length,activeCandidates.length?"red":candidatePubs.length?"yellow":"green")}
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {statusCard("Aktiivinen candidate",activeCandidates.length,activeCandidates.length?"red":"green",activeCandidates.length?"Voimassa oleva julkaisu odottaa hyväksyntää":"Ei jumissa olevia aktiivisia candidateja")}
      {statusCard("Päättyy tänään",expiringToday.length,expiringToday.length?"yellow":"green",expiringToday.length?"Tarkista seuraavan julkaisun valmius":"Ei tänään päättyviä hyväksyttyjä julkaisuja")}
      {statusCard("Vanhentuneet ajot",staleRuns.length,staleRuns.length?"yellow":"green","Raja 36 h / vain lähteen viimeisin ajo")}
      {statusCard("Viimeisin health-ajo",latestRun?new Date(latestRun.checked_at).toLocaleString("fi-FI"):"—",latestRun?.ok?"green":"yellow",latestRun?.source||"Ei ajohistoriaa")}
      {statusCard("Seuraava approved",nextApproved?nextApproved.valid_from:"—",nextApproved?"green":"gray",nextApproved?nextApproved.chain+" · "+nextApproved.publication_id:"Ei tulevaa approved-julkaisua varastossa")}
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {statusCard("Hinta puuttuu",quality.missingPrice,quality.missingPrice?"red":"green","Aktiiviset approved-julkaisut")}
      {statusCard("Kuva puuttuu",quality.missingImage,quality.missingImage?"yellow":"green","Aktiiviset approved-julkaisut")}
      {statusCard("Kategoria puuttuu",quality.missingCategory,quality.missingCategory?"yellow":"green","Aktiiviset approved-julkaisut")}
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Aktiivisen datan laatu ketjuittain</h2>
      {chainQuality.length===0?<div style={{color:"#667085"}}>Ei aktiivisia julkaisuja julkaisuvarastossa.</div>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{["Ketju","Julkaisuja","Tarjouksia","Hinta puuttuu","Kuva puuttuu","Kategoria puuttuu","Tila"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead><tbody>{chainQuality.map(q=>{const level=q.missingPrice?"red":q.missingImage||q.missingCategory?"yellow":"green";return <tr key={q.chain}><td style={{padding:8,fontWeight:800}}>{q.chain}</td><td style={{padding:8}}>{q.publications}</td><td style={{padding:8,fontWeight:800}}>{q.offers}</td><td style={{padding:8}}>{q.missingPrice}</td><td style={{padding:8}}>{q.missingImage}</td><td style={{padding:8}}>{q.missingCategory}</td><td style={{padding:8}}>{dot(level)} {level==="green"?"OK":level==="red"?"HINTAVIRHE":"PUUTTEITA"}</td></tr>})}</tbody></table></div>}
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {statusCard("Virheitä 24 h",failedRuns24h.length,failedRuns24h.length?"red":"green",failedRuns24h.length?"Tuore automaatiovirhe vaatii tarkistuksen":"Ei tuoreita kirjattuja virheitä")}
      {statusCard("Palautuneet virheet",recoveredFailures.length,recoveredFailures.length?"yellow":"green",recoveredFailures.length?"Uudempi onnistunut ajo löytyy samalle lähteelle":"Ei palautumishistoriaa 14 vrk ikkunassa")}
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Huomiota vaativat</h2>
      {attention.length===0?<div style={{padding:12,background:"#ecfdf3",borderRadius:10}}>🟢 Ei tällä hetkellä kirjattuja kriittisiä huomioita.</div>:attention.slice(0,20).map((a,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"28px 1fr",padding:"10px 0",borderBottom:"1px solid #edf0f2"}}><div>{dot(a.level)}</div><div><b>{a.title}</b><div style={{fontSize:12,color:"#667085",marginTop:3}}>{a.detail}</div></div></div>)}
    </section>

    <section style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:18}}>
      <article style={{background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
        <h2 style={{marginTop:0}}>Julkaisujen ajohistoria</h2>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr>{["Aika","Ketju","Lähde","Tulos","Määrä","Outcome"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead>
          <tbody>{d.runs.slice(0,80).map((r,i)=><tr key={i}>
            <td style={{padding:8}}>{new Date(r.checked_at).toLocaleString("fi-FI")}</td><td style={{padding:8,fontWeight:700}}>{r.chain}</td><td style={{padding:8}}>{r.source}</td>
            <td style={{padding:8}}>{r.ok?"🟢":"🔴"}</td><td style={{padding:8,fontWeight:800}}>{r.offer_count}</td><td style={{padding:8}}>{r.outcome}</td>
          </tr>)}</tbody>
        </table></div>
      </article>

      <article style={{background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
        <h2 style={{marginTop:0}}>EAN / skanneri</h2>
        {d.ean?<>{metric("EAN-pankki",d.ean.total)}{metric("Kuvalliset",d.ean.with_image)}{metric("Luokitellut",d.ean.classified)}{metric("Nähty 24 h",d.ean.seen_24h)}<div style={{marginTop:14,fontSize:12,color:"#667085"}}>Kattavuus</div>{coverage("Kuvat",d.ean.with_image,d.ean.total)}{coverage("Luokittelu",d.ean.classified,d.ean.total)}<div style={{marginTop:14}}>{metric("Kuva puuttuu",d.ean.missing_image)}{metric("Luokka puuttuu",d.ean.missing_category)}{metric("Ei nähty 30 vrk",d.ean.stale_30d)}</div></>:<div>Ei EAN-dataa.</div>}
        <div style={{marginTop:18,padding:12,background:"#fff8e6",borderRadius:10,fontSize:13}}>🟡 Käyttäjien ratkaisemattomien skannausten tapahtumaloki ei ole vielä mukana V1:ssä.</div>
      </article>
    </section>

    <section style={{marginTop:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Julkaisuvarasto / voimassaolo</h2>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr>{["Ketju","Julkaisu","Tila","Voimassa","Määrä","Laatu","Parsittu"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead>
        <tbody>{d.pubs.slice(0,60).map((p,i)=><tr key={i}>
          <td style={{padding:8,fontWeight:700}}>{p.chain}</td><td style={{padding:8}}>{p.publication_id}</td>
          <td style={{padding:8}}>{p.approval_state==="approved"?"🟢":p.approval_state==="candidate"?"🟡":"⚪"} {p.approval_state}</td>
          <td style={{padding:8}}>{p.valid_from} – {p.valid_until}</td><td style={{padding:8,fontWeight:800}}>{p.offer_count}</td>
          <td style={{padding:8}}>{p.missing_price?"🔴 "+p.missing_price+" hinta":p.missing_image||p.missing_category?"🟡 "+p.missing_image+" kuva / "+p.missing_category+" kat.":"🟢 OK"}</td>
          <td style={{padding:8}}>{new Date(p.parsed_at).toLocaleString("fi-FI")}</td>
        </tr>)}</tbody>
      </table></div>
    </section>

    <section style={{marginTop:18,padding:16,background:"#eef6ff",borderRadius:12,fontSize:13,color:"#334155"}}>
      <b>Erillinen sovellus.</b> Control Center lukee Neonista health-lokia, julkaisuvarastoa ja EAN-pankkia. Se ei muuta Ziiplyn asiakassovelluksen käyttöliittymää eikä hyväksy julkaisuja automaattisesti.
    </section>
  </main>
}
function statusCard(label:string,value:number|string,state:string,note:string){return <article style={{background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:18}}><div style={{fontSize:13,color:"#667085"}}>{dot(state)} {label}</div><div style={{fontSize:24,fontWeight:900,marginTop:8}}>{typeof value==="number"?value.toLocaleString("fi-FI"):value}</div><div style={{fontSize:11,color:"#667085",marginTop:6}}>{note}</div></article>}
function coverage(label:string,value:number,total:number){const pct=total?Math.round(value/total*1000)/10:0;return <div style={{marginTop:8}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span>{label}</span><b>{pct.toLocaleString("fi-FI")} %</b></div><div style={{height:7,background:"#edf0f2",borderRadius:99,overflow:"hidden",marginTop:5}}><div style={{height:"100%",width:`${Math.min(100,pct)}%`,background:pct>=95?"#12b76a":pct>=75?"#f79009":"#f04438"}}/></div></div>}
function metricCard(label:string,value:number,state:string){return <article style={{background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:18}}><div style={{fontSize:13,color:"#667085"}}>{dot(state)} {label}</div><div style={{fontSize:30,fontWeight:900,marginTop:8}}>{value.toLocaleString("fi-FI")}</div></article>}
function metric(label:string,value:number){return <div style={{display:"flex",justifyContent:"space-between",padding:"11px 0",borderBottom:"1px solid #edf0f2"}}><span>{label}</span><b>{value.toLocaleString("fi-FI")}</b></div>}

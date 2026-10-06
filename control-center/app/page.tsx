import {neon} from "@neondatabase/serverless";

const CHAINS=[
  {key:"S",name:"S-ryhmä / Prisma / S-market"},
  {key:"K",name:"K-ryhmä / Citymarket / K-Supermarket / K-Market"},
  {key:"Lidl",name:"Lidl"},
  {key:"Tokmanni",name:"Tokmanni / SPAR"}
];

type Row={chain:string;source:string;ok:boolean;offer_count:number;outcome:string;checked_at:string};
type Pub={chain:string;publication_id:string;valid_from:string;valid_until:string;parsed_at:string;approval_state:string;offer_count:number};

async function load(){
  const url=process.env.DATABASE_URL;
  if(!url)return {error:"DATABASE_URL puuttuu",runs:[] as Row[],pubs:[] as Pub[],ean:null};
  try{
    const sql=neon(url);
    await sql`CREATE TABLE IF NOT EXISTS ziiply_publication_run_log(
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      chain TEXT NOT NULL,source TEXT NOT NULL,ok BOOLEAN NOT NULL,offer_count INTEGER NOT NULL,
      outcome TEXT NOT NULL,details JSONB NOT NULL DEFAULT '{}'::jsonb)`;
    await sql`CREATE TABLE IF NOT EXISTS ziiply_ean_products(
      ean TEXT PRIMARY KEY,name TEXT NOT NULL DEFAULT '',brand TEXT,quantity TEXT,image_url TEXT,
      category TEXT,source TEXT,aliases TEXT[] NOT NULL DEFAULT '{}',
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    const runs=await sql`SELECT checked_at::text AS checked_at,chain,source,ok,offer_count,outcome
      FROM ziiply_publication_run_log WHERE checked_at>NOW()-INTERVAL '14 days'
      ORDER BY checked_at DESC,id DESC LIMIT 300`;
    const pubs=await sql`SELECT chain,publication_id,valid_from::text,valid_until::text,parsed_at::text,approval_state,
      jsonb_array_length(offers)::int AS offer_count
      FROM ziiply_offer_publications
      WHERE valid_until >= (NOW() AT TIME ZONE 'Europe/Helsinki')::date - 1
      ORDER BY parsed_at DESC`;
    const ean=await sql`SELECT COUNT(*)::int total,
      COUNT(*) FILTER(WHERE image_url IS NOT NULL AND image_url<>'')::int with_image,
      COUNT(*) FILTER(WHERE category IS NOT NULL AND TRIM(category)<>'')::int classified,
      COUNT(*) FILTER(WHERE last_seen_at>NOW()-INTERVAL '24 hours')::int seen_24h
      FROM ziiply_ean_products`;
    return {error:null,runs:runs as Row[],pubs:pubs as Pub[],ean:ean[0] as any};
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
  const cards=CHAINS.map(c=>({...c,runs:d.runs.filter(r=>r.chain.toLowerCase().includes(c.key.toLowerCase()))}));
  const activePubs=d.pubs.filter(p=>p.approval_state==="approved"&&new Date(p.valid_from+"T00:00:00")<=new Date()&&new Date(p.valid_until+"T23:59:59")>=new Date());
  const candidatePubs=d.pubs.filter(p=>p.approval_state==="candidate");
  const activeOfferTotal=activePubs.reduce((n,p)=>n+p.offer_count,0);
  const states=cards.map(c=>state(c.runs));
  const overall=states.some(x=>x[0]==="red")?["red","TOIMINTA VAATII TOIMIA"]:states.some(x=>x[0]==="yellow"||x[0]==="gray")?["yellow","VAROITUKSIA / SEURANTA PUUTTUU"]:["green","KAIKKI SEURANNAT OK"];

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
      {metricCard("Candidate / odottaa",candidatePubs.length,candidatePubs.length?"yellow":"green")}
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
        {d.ean?<>{metric("EAN-pankki",d.ean.total)}{metric("Kuvalliset",d.ean.with_image)}{metric("Luokitellut",d.ean.classified)}{metric("Nähty 24 h",d.ean.seen_24h)}</>:<div>Ei EAN-dataa.</div>}
        <div style={{marginTop:18,padding:12,background:"#fff8e6",borderRadius:10,fontSize:13}}>🟡 Käyttäjien ratkaisemattomien skannausten tapahtumaloki ei ole vielä mukana V1:ssä.</div>
      </article>
    </section>

    <section style={{marginTop:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Julkaisuvarasto / voimassaolo</h2>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr>{["Ketju","Julkaisu","Tila","Voimassa","Määrä","Parsittu"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead>
        <tbody>{d.pubs.slice(0,60).map((p,i)=><tr key={i}>
          <td style={{padding:8,fontWeight:700}}>{p.chain}</td><td style={{padding:8}}>{p.publication_id}</td>
          <td style={{padding:8}}>{p.approval_state==="approved"?"🟢":p.approval_state==="candidate"?"🟡":"⚪"} {p.approval_state}</td>
          <td style={{padding:8}}>{p.valid_from} – {p.valid_until}</td><td style={{padding:8,fontWeight:800}}>{p.offer_count}</td>
          <td style={{padding:8}}>{new Date(p.parsed_at).toLocaleString("fi-FI")}</td>
        </tr>)}</tbody>
      </table></div>
    </section>

    <section style={{marginTop:18,padding:16,background:"#eef6ff",borderRadius:12,fontSize:13,color:"#334155"}}>
      <b>Erillinen sovellus.</b> Tämä hakemisto ei lisää mitään nykyiseen Ziiply-käyttöliittymään. V1 lukee Neonista jo olemassa olevaa julkaisujen ajolokia ja EAN-pankkia. Seuraavassa vaiheessa tähän lisätään ketjukohtaiset odotettu/aktiivinen tarjousmäärä-, hinta-, kuva-, voimassaolo- ja näkyvyysvalidaattorit sekä käyttäjien selvitykseen lähettämät EANit.
    </section>
  </main>
}
function metricCard(label:string,value:number,state:string){return <article style={{background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:18}}><div style={{fontSize:13,color:"#667085"}}>{dot(state)} {label}</div><div style={{fontSize:30,fontWeight:900,marginTop:8}}>{value.toLocaleString("fi-FI")}</div></article>}
function metric(label:string,value:number){return <div style={{display:"flex",justifyContent:"space-between",padding:"11px 0",borderBottom:"1px solid #edf0f2"}}><span>{label}</span><b>{value.toLocaleString("fi-FI")}</b></div>}

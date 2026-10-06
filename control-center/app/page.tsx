import {neon} from "@neondatabase/serverless";

const CHAINS=[
  {key:"S",name:"S-ryhmä / Prisma / S-market",match:(v:string)=>/^(s(?::|$)|prisma|s-?market|sale|alepa)/i.test(v)},
  {key:"K",name:"K-ryhmä / Citymarket / K-Supermarket / K-Market",match:(v:string)=>/^(k(?::|$)|k-?citymarket|citymarket|k-?supermarket|k-?market)/i.test(v)},
  {key:"Lidl",name:"Lidl",match:(v:string)=>/^lidl(?::|$)/i.test(v)},
  {key:"Tokmanni",name:"Tokmanni / SPAR",match:(v:string)=>/^(tokmanni|spar|eurospar)(?::|$)/i.test(v)}
];

type Row={chain:string;source:string;ok:boolean;offer_count:number;outcome:string;checked_at:string};
type Pub={chain:string;publication_id:string;valid_from:string;valid_until:string;parsed_at:string;approval_state:string;offer_count:number;missing_price:number;missing_image:number;missing_category:number};
type EanStats={total:number;with_image:number;classified:number;seen_24h:number;missing_image:number;missing_category:number;stale_30d:number;lidl_price_rows:number;lidl_price_eans:number;lidl_fresh_prices:number;lidl_verified_prices:number;lidl_stale_prices:number};

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
    const eanPrice=await sql`SELECT COUNT(*)::int price_rows,COUNT(DISTINCT ean)::int price_eans,COUNT(*) FILTER(WHERE fresh_until>NOW())::int fresh_prices,COUNT(*) FILTER(WHERE checkout_price_verified IS TRUE)::int verified_prices,COUNT(*) FILTER(WHERE fresh_until<=NOW())::int stale_prices FROM ziiply_lidl_ean_prices`;
    const eanStats={...(ean[0] as EanStats),lidl_price_rows:Number(eanPrice[0]?.price_rows??0),lidl_price_eans:Number(eanPrice[0]?.price_eans??0),lidl_fresh_prices:Number(eanPrice[0]?.fresh_prices??0),lidl_verified_prices:Number(eanPrice[0]?.verified_prices??0),lidl_stale_prices:Number(eanPrice[0]?.stale_prices??0)};
    return {error:null,runs:runs as Row[],pubs:pubs as Pub[],ean:eanStats};
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
  const sourceHealth=latestBySource.map(r=>{const ageH=Math.round((Date.now()-new Date(r.checked_at).getTime())/360000)/10;const history=d.runs.filter(x=>x.chain===r.chain&&x.source===r.source);const previous=history[1];const delta=previous&&previous.offer_count>0?Math.round((r.offer_count-previous.offer_count)/previous.offer_count*1000)/10:null;const recent=history.slice(0,5);const firstOkIndex=recent.findIndex(x=>x.ok);const streak=firstOkIndex>=0?firstOkIndex:recent.length;const isProbe=r.source==="s-kaupat-protocol";const level=!r.ok||(!isProbe&&r.offer_count===0)?"red":ageH>36||(!isProbe&&delta!==null&&delta<=-50)?"yellow":"green";return {...r,ageH,delta,level,streak,history:recent};});
  const latestSuccessBySource=sourceHealth.map(s=>{const okRun=d.runs.find(r=>r.chain===s.chain&&r.source===s.source&&r.ok);const successAgeH=okRun?(Date.now()-new Date(okRun.checked_at).getTime())/3600000:null;return {...s,lastSuccess:okRun?.checked_at??null,successAgeH};});
  const successStale=latestSuccessBySource.filter(s=>s.successAgeH!==null&&s.successAgeH>48);
  const neverSuccessful=latestSuccessBySource.filter(s=>s.lastSuccess===null);
  const staleRuns=latestBySource.filter(r=>Date.now()-new Date(r.checked_at).getTime()>36*60*60*1000);
  const latestRun=d.runs[0];
  const nextApproved=d.pubs.filter(p=>p.approval_state==="approved"&&p.valid_from>todayFi).sort((a,b)=>a.valid_from.localeCompare(b.valid_from))[0];
  const overlappingApproved=activePubs.filter((p,i,a)=>a.some((q,j)=>j!==i&&q.chain===p.chain&&q.publication_id!==p.publication_id));
  const rolloverChains=[...new Set(d.pubs.map(p=>p.chain))].map(chain=>{const pubs=d.pubs.filter(p=>p.chain===chain);const current=pubs.filter(p=>p.approval_state==="approved"&&p.valid_from<=todayFi&&p.valid_until>=todayFi).sort((a,b)=>b.valid_until.localeCompare(a.valid_until))[0];const future=pubs.filter(p=>p.valid_from>todayFi).sort((a,b)=>a.valid_from.localeCompare(b.valid_from))[0];const nextDay=current?new Date(current.valid_until+"T12:00:00Z"):null;if(nextDay)nextDay.setUTCDate(nextDay.getUTCDate()+1);const expected=nextDay?nextDay.toISOString().slice(0,10):null;const gap=Boolean(current&&future&&expected&&future.valid_from>expected);const level=!current?"red":gap?"red":!future&&current.valid_until<=todayFi?"yellow":future?.approval_state==="candidate"?"yellow":"green";return {chain,current,future,gap,level};});
  const publicationGroups=[...new Map(activePubs.map(p=>[p.chain,activePubs.filter(q=>q.chain===p.chain)])).entries()];
  const chainQuality=publicationGroups.map(([chain,pubs])=>({chain,offers:pubs.reduce((n,p)=>n+p.offer_count,0),missingPrice:pubs.reduce((n,p)=>n+p.missing_price,0),missingImage:pubs.reduce((n,p)=>n+p.missing_image,0),missingCategory:pubs.reduce((n,p)=>n+p.missing_category,0),publications:pubs.length}));
  const rolloverGaps=rolloverChains.filter(r=>r.gap);
  const rolloverWithoutNext=rolloverChains.filter(r=>r.current&&r.current.valid_until<=todayFi&&!r.future);
  const thinNext=rolloverChains.filter(r=>r.current&&r.future&&r.future.offer_count<Math.max(3,Math.floor(r.current.offer_count*.5)));
  const nextCandidates=rolloverChains.filter(r=>r.future?.approval_state==="candidate");
  const expiringSoon=activePubs.filter(p=>{const ms=new Date(p.valid_until+"T21:00:00Z").getTime()-Date.now();return ms>=0&&ms<=36*60*60*1000;});
  const unreadyExpiring=expiringSoon.filter(p=>!d.pubs.some(n=>n.chain===p.chain&&n.valid_from>todayFi&&n.approval_state==="approved"));
  const approvedNext=rolloverChains.filter(r=>r.future?.approval_state==="approved"&&r.current);
  const severeNextDrop=approvedNext.filter(r=>r.future!.offer_count<Math.max(1,Math.floor(r.current!.offer_count*.25)));
  const healthyNext=approvedNext.filter(r=>!r.gap&&!severeNextDrop.includes(r));
  const failedRuns24h=d.runs.filter(r=>!r.ok&&Date.now()-new Date(r.checked_at).getTime()<=24*60*60*1000);
  const latestRunKeys=new Set(latestBySource.map(r=>r.chain+"::"+r.source+"::"+r.checked_at));
  const unresolvedFailures24h=failedRuns24h.filter(r=>latestRunKeys.has(r.chain+"::"+r.source+"::"+r.checked_at));
  const recoveredFailures24h=failedRuns24h.filter(r=>!latestRunKeys.has(r.chain+"::"+r.source+"::"+r.checked_at));
  const recoveredFailures=d.runs.filter((r,i)=>!r.ok&&d.runs.slice(0,i).some(n=>n.chain===r.chain&&n.source===r.source&&n.ok));
  const monitoredChains=cards.filter(c=>c.runs.length>0).length;
  const failureStreaks=sourceHealth.filter(s=>s.streak>=2);
  const severeFailureStreaks=sourceHealth.filter(s=>s.streak>=3);
  const sourceCountAnomalies=sourceHealth.filter(s=>s.source!=="s-kaupat-protocol"&&s.delta!==null&&Math.abs(s.delta)>=50);
  const sourceCountCrashes=sourceHealth.filter(s=>s.source!=="s-kaupat-protocol"&&s.delta!==null&&s.delta<=-75);
  const silentSources=sourceHealth.filter(s=>s.ageH>48);
  const criticallySilentSources=sourceHealth.filter(s=>s.ageH>72);
  const chainRunSummary=cards.map(card=>{const latest=card.runs[0]??null;const lastOk=card.runs.find(r=>r.ok)??null;const ageH=latest?(Date.now()-new Date(latest.checked_at).getTime())/3600000:null;const okAgeH=lastOk?(Date.now()-new Date(lastOk.checked_at).getTime())/3600000:null;const level=!latest?"gray":!latest.ok||ageH!==null&&ageH>72?"red":okAgeH===null||okAgeH>48||ageH!==null&&ageH>48?"yellow":"green";return {chain:card.key,latest,lastOk,ageH,okAgeH,level};});
  const missingMonitoring=cards.filter(c=>c.runs.length===0);
  const currentFailures=latestBySource.filter(r=>!r.ok);
  const attention=[
    ...activeCandidates.map(p=>({level:"red",title:p.chain+": aktiivinen candidate",detail:p.publication_id+" · "+p.offer_count+" tarjousta · "+p.valid_from+"–"+p.valid_until})),
    ...currentFailures.map(r=>({level:"red",title:r.chain+": viimeisin ajo epäonnistui",detail:r.source+" · "+r.offer_count+" · "+r.outcome})),
    ...staleRuns.map(r=>({level:"yellow",title:r.chain+": health-ajo vanhentunut",detail:r.source+" · "+new Date(r.checked_at).toLocaleString("fi-FI")})),
    ...expiringToday.map(p=>({level:"yellow",title:p.chain+": julkaisu päättyy tänään",detail:p.publication_id+" · "+p.offer_count+" tarjousta"})),
    ...overlappingApproved.map(p=>({level:"yellow",title:p.chain+": useita aktiivisia approved-julkaisuja",detail:p.publication_id+" · "+p.offer_count+" tarjousta"})),
    ...rolloverGaps.map(r=>({level:"red",title:r.chain+": julkaisuvaihtoon jää katkos",detail:(r.current?.valid_until||"—")+" → "+(r.future?.valid_from||"—")})),
    ...rolloverWithoutNext.map(r=>({level:"yellow",title:r.chain+": päättyvälle julkaisulle ei ole seuraajaa",detail:"Nykyinen päättyy "+r.current?.valid_until})),
    ...thinNext.map(r=>({level:"yellow",title:r.chain+": seuraavan julkaisun määrä epäilyttävän pieni",detail:(r.current?.offer_count||0)+" → "+(r.future?.offer_count||0)+" tarjousta"})),
    ...nextCandidates.map(r=>({level:"yellow",title:r.chain+": seuraava julkaisu odottaa hyväksyntää",detail:(r.future?.valid_from||"—")+" · "+(r.future?.offer_count||0)+" tarjousta"})),
    ...unreadyExpiring.map(p=>({level:"red",title:p.chain+": julkaisu päättyy pian ilman approved-seuraajaa",detail:p.valid_until+" · "+p.offer_count+" tarjousta"})),
    ...severeNextDrop.map(r=>({level:"red",title:r.chain+": approved-seuraajan tarjousmäärä romahtanut",detail:(r.current?.offer_count||0)+" → "+(r.future?.offer_count||0)+" tarjousta"})),
    ...(quality.missingPrice?[{level:"red",title:"Aktiivisista julkaisuista puuttuu hintoja",detail:quality.missingPrice+" riviä"}]:[]),
    ...(quality.missingImage?[{level:"yellow",title:"Aktiivisista julkaisuista puuttuu kuvia",detail:quality.missingImage+" riviä"}]:[]),
    ...(quality.missingCategory?[{level:"yellow",title:"Aktiivisista julkaisuista puuttuu kategorioita",detail:quality.missingCategory+" riviä"}]:[]),
    ...missingMonitoring.map(c=>({level:"gray",title:c.name+": health-seuranta puuttuu",detail:"Ei kirjattua ajoa 14 vuorokauden ikkunassa"}))
  ];
  const states=cards.map(c=>state(c.runs));
  const hasCriticalQuality=quality.missingPrice>0;
  const hasQualityWarning=quality.missingImage>0||quality.missingCategory>0||overlappingApproved.length>0||rolloverWithoutNext.length>0||thinNext.length>0||nextCandidates.length>0;
  const overall=activeCandidates.length||currentFailures.length||hasCriticalQuality||rolloverGaps.length||unreadyExpiring.length||severeNextDrop.length||neverSuccessful.length||severeFailureStreaks.length||sourceCountCrashes.length||criticallySilentSources.length||states.some(x=>x[0]==="red")?["red","TOIMINTA VAATII TOIMIA"]:states.some(x=>x[0]==="yellow"||x[0]==="gray")||staleRuns.length||hasQualityWarning?["yellow","VAROITUKSIA / SEURANTA PUUTTUU"]:["green","KAIKKI SEURANNAT OK"];

  return <main style={{maxWidth:1500,margin:"0 auto",padding:28}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"end",marginBottom:22}}>
      <div><div style={{fontSize:12,letterSpacing:2,fontWeight:800,color:"#64748b"}}>ZIIPLY / INTERNAL</div>
      <h1 style={{margin:"5px 0",fontSize:36}}>Control Center</h1>
      <div style={{color:"#64748b"}}>Tarjousjulkaisut · automaatiot · EAN-pankki</div></div>
      <div style={{textAlign:"right"}}><div style={{fontSize:19,fontWeight:850}}>{dot(overall[0])} {overall[1]}</div><div style={{fontSize:11,color:"#667085",marginTop:5}}>Päivitetty {new Date().toLocaleString("fi-FI",{timeZone:"Europe/Helsinki"})}</div></div>
    </header>

    {d.error&&<div style={{background:"#fee4e2",border:"1px solid #fecdca",padding:16,borderRadius:12,marginBottom:16}}>🔴 {d.error}</div>}

    <section style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {cards.map((c,i)=>{const [s,label]=states[i];const r=c.runs[0];return <article key={c.key} style={{background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:18}}>
        <div style={{fontWeight:800,fontSize:16}}>{dot(s)} {c.name}</div>
        <div style={{marginTop:7,fontWeight:800,color:s==="red"?"#b42318":s==="yellow"?"#a15c00":s==="green"?"#087443":"#667085"}}>{label}</div>
        <div style={{fontSize:31,fontWeight:900,marginTop:14}}>{r?(r.source==="s-kaupat-protocol"?(r.ok?"OK":"VIRHE"):r.offer_count):"—"}</div>
        <div style={{fontSize:12,color:"#667085"}}>{r?.source==="s-kaupat-protocol"?"protokollan health-probe":"viimeisin tarjousmäärä"}</div>
        <div style={{fontSize:12,color:"#667085",marginTop:9}}>{r?new Date(r.checked_at).toLocaleString("fi-FI"):"Ei ajoa 14 vrk"}</div>
        {r&&<div style={{fontSize:13,marginTop:7}}>{r.outcome}</div>}
      </article>})}
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {statusCard("Ketjuvalvonnan kattavuus",monitoredChains+" / "+CHAINS.length,monitoredChains===CHAINS.length?"green":"yellow",missingMonitoring.length?"Puuttuu: "+missingMonitoring.map(c=>c.name).join(", "):"Kaikilla ketjuilla health-dataa")}
      {statusCard("Instrumentoidut lähteet",latestBySource.length,latestBySource.length?"green":"yellow","Uniikit chain + source -valvonnat 14 vrk")}
      {statusCard("Avoimet lähdevirheet",currentFailures.length,currentFailures.length?"red":"green",currentFailures.length?"Lähteen viimeisin ajo epäonnistunut":"Kaikkien kirjattujen lähteiden viimeisin ajo OK")}
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {metricCard("Aktiiviset hyväksytyt julkaisut",activePubs.length,activePubs.length?"green":"yellow")}
      {metricCard("Aktiivisten julkaisujen tarjoukset",activeOfferTotal,activeOfferTotal?"green":"yellow")}
      {metricCard("Candidate / odottaa",candidatePubs.length,activeCandidates.length?"red":candidatePubs.length?"yellow":"green")}
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {statusCard("Aktiivinen candidate",activeCandidates.length,activeCandidates.length?"red":"green",activeCandidates.length?"Voimassa oleva julkaisu odottaa hyväksyntää":"Ei jumissa olevia aktiivisia candidateja")}
      {statusCard("Päättyy tänään",expiringToday.length,expiringToday.length?"yellow":"green",expiringToday.length?"Tarkista seuraavan julkaisun valmius":"Ei tänään päättyviä hyväksyttyjä julkaisuja")}
      {statusCard("Vanhentuneet ajot",staleRuns.length,staleRuns.length?"yellow":"green","Raja 36 h / vain lähteen viimeisin ajo")}
      {statusCard("Viimeisin health-ajo",latestRun?new Date(latestRun.checked_at).toLocaleString("fi-FI"):"—",latestRun?.ok?"green":"yellow",latestRun?.source||"Ei ajohistoriaa")}
      {statusCard("Seuraava approved",nextApproved?nextApproved.valid_from:"—",nextApproved?"green":"gray",nextApproved?nextApproved.chain+" · "+nextApproved.publication_id:"Ei tulevaa approved-julkaisua varastossa")}
      {statusCard("Päättyy ≤36 h ilman seuraajaa",unreadyExpiring.length,unreadyExpiring.length?"red":"green",unreadyExpiring.length?"Julkaisuvaihto ei ole valmis":"Ei välitöntä vaihtoriskiä")}
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {statusCard("Hinta puuttuu",quality.missingPrice,quality.missingPrice?"red":"green","Aktiiviset approved-julkaisut")}
      {statusCard("Kuva puuttuu",quality.missingImage,quality.missingImage?"yellow":"green","Aktiiviset approved-julkaisut")}
      {statusCard("Kategoria puuttuu",quality.missingCategory,quality.missingCategory?"yellow":"green","Aktiiviset approved-julkaisut")}
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {statusCard("Valmiit vaihdot",healthyNext.length,healthyNext.length?"green":"gray","Approved-seuraaja ilman katkosta tai vakavaa määräpudotusta")}
      {statusCard("Vakava määräpudotus",severeNextDrop.length,severeNextDrop.length?"red":"green","Approved-seuraaja alle 25 % nykyisen tarjousmäärästä")}
      {statusCard("Vaihtoriski ≤36 h",unreadyExpiring.length,unreadyExpiring.length?"red":"green","Päättyvä julkaisu ilman approved-seuraajaa")}
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Julkaisuvaihdon valmius</h2>
      {rolloverChains.length===0?<div style={{color:"#667085"}}>Ei julkaisuvaraston ketjuja.</div>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{["Tila","Ketju","Nykyinen päättyy","Seuraava alkaa","Seuraavan tila","Seuraavan määrä"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead><tbody>{rolloverChains.map(r=><tr key={r.chain}><td style={{padding:8}}>{dot(r.level)}</td><td style={{padding:8,fontWeight:800}}>{r.chain}</td><td style={{padding:8}}>{r.current?.valid_until||"Ei aktiivista approved-julkaisua"}</td><td style={{padding:8}}>{r.future?.valid_from||"—"}</td><td style={{padding:8}}>{r.future?.approval_state||"—"}{r.gap?" · KATKOS":""}</td><td style={{padding:8,fontWeight:800}}>{r.future?.offer_count??"—"}{r.current&&r.future&&r.future.offer_count<Math.max(3,Math.floor(r.current.offer_count*.5))?" ⚠️":""}</td></tr>)}</tbody></table></div>}
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Aktiivisen datan laatu ketjuittain</h2>
      {chainQuality.length===0?<div style={{color:"#667085"}}>Ei aktiivisia julkaisuja julkaisuvarastossa.</div>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{["Ketju","Julkaisuja","Tarjouksia","Hinta puuttuu","Kuva puuttuu","Kategoria puuttuu","Tila"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead><tbody>{chainQuality.map(q=>{const level=q.missingPrice?"red":q.missingImage||q.missingCategory?"yellow":"green";return <tr key={q.chain}><td style={{padding:8,fontWeight:800}}>{q.chain}</td><td style={{padding:8}}>{q.publications}</td><td style={{padding:8,fontWeight:800}}>{q.offers}</td><td style={{padding:8}}>{q.missingPrice}</td><td style={{padding:8}}>{q.missingImage}</td><td style={{padding:8}}>{q.missingCategory}</td><td style={{padding:8}}>{dot(level)} {level==="green"?"OK":level==="red"?"HINTAVIRHE":"PUUTTEITA"}</td></tr>})}</tbody></table></div>}
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {statusCard("Avoimia virheitä 24 h",unresolvedFailures24h.length,unresolvedFailures24h.length?"red":"green",unresolvedFailures24h.length?"Viimeisin ajo on yhä virheellinen":"Ei avoimia tuoreita automaatiovirheitä")}
      {statusCard("Palautuneet virheet 24 h",recoveredFailures24h.length,recoveredFailures24h.length?"yellow":"green",recoveredFailures24h.length?"Virhe on jo korjaantunut uudemmassa ajossa":"Ei palautuneita virheitä 24 h")}
      {statusCard("Palautumishistoria 14 vrk",recoveredFailures.length,recoveredFailures.length?"yellow":"green",recoveredFailures.length?"Uudempi onnistunut ajo löytyy samalle lähteelle":"Ei palautumishistoriaa")}
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Ketjujen automaatiopulssi</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>{chainRunSummary.map(x=><div key={x.chain} style={{border:"1px solid #e5e7eb",borderRadius:12,padding:14}}><div style={{fontWeight:900,fontSize:18}}>{dot(x.level)} {x.chain}</div><div style={{fontSize:13,marginTop:8}}>Viimeisin ajo: <b>{x.ageH===null?"—":x.ageH.toFixed(1)+" h sitten"}</b></div><div style={{fontSize:13,marginTop:4}}>Viimeisin OK: <b>{x.okAgeH===null?"Ei koskaan":x.okAgeH.toFixed(1)+" h sitten"}</b></div><div style={{fontSize:12,color:"#667085",marginTop:6}}>{x.latest?.source||"Ei run-log-dataa"}</div></div>)}</div>
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Automaatiot / lähteet</h2>
      {sourceHealth.length===0?<div style={{color:"#667085"}}>Ei health-lähteitä 14 vrk ajalta.</div>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{["Tila","Ketju","Lähde","Viimeisin ajo","Ikä","Tarjouksia","Muutos","5 viimeistä","Virheputki","Outcome"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead><tbody>{sourceHealth.map(r=><tr key={r.chain+"::"+r.source}><td style={{padding:8}}>{dot(r.level)}</td><td style={{padding:8,fontWeight:800}}>{r.chain}</td><td style={{padding:8}}>{r.source}</td><td style={{padding:8}}>{new Date(r.checked_at).toLocaleString("fi-FI")}</td><td style={{padding:8}}>{r.ageH.toLocaleString("fi-FI")} h</td><td style={{padding:8,fontWeight:800}}>{r.source==="s-kaupat-protocol"?"probe":r.offer_count}</td><td style={{padding:8}}>{r.source==="s-kaupat-protocol"?"—":r.delta===null?"—":(r.delta>0?"+":"")+r.delta.toLocaleString("fi-FI")+" %"}</td><td style={{padding:8,whiteSpace:"nowrap"}}>{r.history.map((h,i)=><span key={i} title={new Date(h.checked_at).toLocaleString("fi-FI")+" · "+h.outcome}>{h.ok?"🟢":"🔴"}</span>)}</td><td style={{padding:8,fontWeight:r.streak?800:400}}>{r.streak||"—"}</td><td style={{padding:8}}>{r.outcome}</td></tr>)}</tbody></table></div>}
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
        {d.ean?<>{metric("EAN-pankki",d.ean.total)}{metric("Kuvalliset",d.ean.with_image)}{metric("Luokitellut",d.ean.classified)}{metric("Nähty 24 h",d.ean.seen_24h)}<div style={{marginTop:14,fontSize:12,color:"#667085"}}>Lidl-hinnat</div>{metric("Lidl EAN-hintarivejä",d.ean.lidl_price_rows)}{metric("EANeja hinnoilla",d.ean.lidl_price_eans)}{metric("Tuoreita hintoja",d.ean.lidl_fresh_prices)}{metric("Varmistettu kassalla",d.ean.lidl_verified_prices)}{metric("Vanhentuneita hintoja",d.ean.lidl_stale_prices)}<div style={{marginTop:14,fontSize:12,color:"#667085"}}>Kattavuus</div>{coverage("Kuvat",d.ean.with_image,d.ean.total)}{coverage("Luokittelu",d.ean.classified,d.ean.total)}<div style={{marginTop:14}}>{metric("Kuva puuttuu",d.ean.missing_image)}{metric("Luokka puuttuu",d.ean.missing_category)}{metric("Ei nähty 30 vrk",d.ean.stale_30d)}</div></>:<div>Ei EAN-dataa.</div>}
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

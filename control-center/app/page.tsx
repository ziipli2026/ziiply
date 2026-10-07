import {neon} from "@neondatabase/serverless";

export const dynamic="force-dynamic";

const CHAINS=[
  {key:"S",name:"S-ryhmä / Prisma / S-market",match:(v:string)=>/^(s(?::|$)|prisma|s-?market|sale|alepa)/i.test(v)},
  {key:"K",name:"K-ryhmä / Citymarket / K-Supermarket / K-Market",match:(v:string)=>/^(k(?::|$)|k-?citymarket|citymarket|k-?supermarket|k-?market)/i.test(v)},
  {key:"Lidl",name:"Lidl",match:(v:string)=>/^lidl(?::|$)/i.test(v)},
  {key:"Tokmanni",name:"Tokmanni / SPAR",match:(v:string)=>/^(tokmanni(?:-spar)?|spar|eurospar)(?::|$)/i.test(v)}
];

type Row={chain:string;source:string;ok:boolean;offer_count:number;outcome:string;checked_at:string};
type Pub={chain:string;publication_id:string;valid_from:string;valid_until:string;parsed_at:string;approval_state:string;offer_count:number;missing_price:number;missing_image:number;missing_category:number};
type EanStats={total:number;with_image:number;classified:number;seen_24h:number;missing_image:number;missing_category:number;stale_30d:number;lidl_price_rows:number;lidl_price_eans:number;lidl_fresh_prices:number;lidl_verified_prices:number;lidl_stale_prices:number};
type ScanStats={events_24h:number;unresolved_24h:number;unknown_24h:number;no_price_24h:number;chain_mismatch_24h:number};

async function load(){
  const url=process.env.DATABASE_URL;
  if(!url)return {error:"DATABASE_URL puuttuu",runs:[] as Row[],pubs:[] as Pub[],ean:null,scan:{events_24h:0,unresolved_24h:0,unknown_24h:0,no_price_24h:0,chain_mismatch_24h:0} as ScanStats};
  try{
    const sql=neon(url);
    const runs=await sql`SELECT checked_at::text AS checked_at,chain,source,ok,offer_count,outcome
      FROM ziiply_publication_run_log WHERE checked_at>NOW()-INTERVAL '14 days'
      ORDER BY checked_at DESC,id DESC LIMIT 300`;
    const pubs=await sql`SELECT chain,publication_id,valid_from::text,valid_until::text,parsed_at::text,approval_state,
      jsonb_array_length(offers)::int AS offer_count,
      (SELECT COUNT(*)::int FROM jsonb_array_elements(offers) o WHERE COALESCE(NULLIF(o->>'offerPrice',''),NULLIF(o->>'price',''),NULLIF(o->>'priceText','')) IS NULL AND COALESCE(o->>'hasConcretePrice','true')<>'false') AS missing_price,
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
    let scan:ScanStats={events_24h:0,unresolved_24h:0,unknown_24h:0,no_price_24h:0,chain_mismatch_24h:0};
    try { const rows=await sql`SELECT COUNT(*)::int events_24h,COUNT(*) FILTER(WHERE outcome IN ('unresolved','not_found','no_match'))::int unresolved_24h,COUNT(*) FILTER(WHERE outcome IN ('unknown','ean_unknown'))::int unknown_24h,COUNT(*) FILTER(WHERE outcome IN ('no_price','added_without_price'))::int no_price_24h,COUNT(*) FILTER(WHERE outcome IN ('chain_mismatch','wrong_chain'))::int chain_mismatch_24h FROM ziiply_ean_scan_event_log WHERE created_at>NOW()-INTERVAL '24 hours'`; if(rows[0]) scan=rows[0] as ScanStats; } catch { /* scanner event table is created lazily */ }
    const eanStats={...(ean[0] as EanStats),lidl_price_rows:Number(eanPrice[0]?.price_rows??0),lidl_price_eans:Number(eanPrice[0]?.price_eans??0),lidl_fresh_prices:Number(eanPrice[0]?.fresh_prices??0),lidl_verified_prices:Number(eanPrice[0]?.verified_prices??0),lidl_stale_prices:Number(eanPrice[0]?.stale_prices??0)};
    return {error:null,runs:runs as Row[],pubs:pubs as Pub[],ean:eanStats,scan};
  }catch(e){return {error:e instanceof Error?e.message:"Tietokantavirhe",runs:[] as Row[],pubs:[] as Pub[],ean:null,scan:{events_24h:0,unresolved_24h:0,unknown_24h:0,no_price_24h:0,chain_mismatch_24h:0} as ScanStats}}
}

function state(rows:Row[]){
  if(!rows.length)return ["gray","EI DATAA"];
  const a=rows[0];
  if(!a.ok)return ["red","VIRHE"];
  const ageH=(Date.now()-new Date(a.checked_at).getTime())/3600000;
  const isLidl=/^lidl(?::|$)/i.test(a.chain.trim());
  const warnAfterH=isLidl?30:8;
  const failAfterH=isLidl?48:24;
  if(ageH>failAfterH)return ["red","DATA VANHENTUNUT"];
  if(ageH>warnAfterH)return ["yellow","DATA VANHENEE"];
  if(a.source==="future-publication-discovery")return ["green",a.outcome==="future-publication-found"?"TULEVA LÖYDETTY":"TARKISTETTU"];
  if(a.offer_count===0)return ["red","0 TARJOUSTA"];
  const b=rows[1];
  if(b&&a.offer_count<Math.max(1,Math.floor(b.offer_count*.5)))return ["yellow","MÄÄRÄ ROMAHTANUT"];
  return ["green","OK"];
}
function dot(s:string){return s==="green"?"🟢":s==="yellow"?"🟡":s==="red"?"🔴":"⚪"}

export default async function Page(){
  const d=await load();
  const cards=CHAINS.map(c=>({...c,runs:d.runs.filter(r=>c.match(r.chain.trim())&&!["future-publication-discovery","s-kaupat-protocol"].includes(r.source))}));
  const todayFi=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const currentPubs=[...d.pubs.reduce((m,p)=>{const k=`${p.chain}::${p.valid_from}::${p.valid_until}`;const prev=m.get(k);if(!prev||p.parsed_at>prev.parsed_at)m.set(k,p);return m},new Map<string,Pub>()).values()];
  const activePubs=currentPubs.filter(p=>p.approval_state==="approved"&&p.valid_from<=todayFi&&p.valid_until>=todayFi);
  const candidatePubs=currentPubs.filter(p=>p.approval_state==="candidate");
  const activeOfferTotal=activePubs.reduce((n,p)=>n+p.offer_count,0);
  const quality={missingPrice:activePubs.reduce((n,p)=>n+p.missing_price,0),missingImage:activePubs.reduce((n,p)=>n+p.missing_image,0),missingCategory:activePubs.reduce((n,p)=>n+p.missing_category,0)};
  const publicationQuality=CHAINS.filter(ch=>ch.key==="Lidl").map(ch=>{
    const current=activePubs.filter(p=>ch.match(p.chain.trim())).sort((a,b)=>b.valid_until.localeCompare(a.valid_until))[0]??null;
    const next=current?currentPubs.filter(p=>ch.match(p.chain.trim())&&p.valid_from>current.valid_until).sort((a,b)=>a.valid_from.localeCompare(b.valid_from))[0]??null:null;
    const pct=(p:Pub|null,k:"missing_price"|"missing_image"|"missing_category")=>p&&p.offer_count?Math.round(p[k]/p.offer_count*1000)/10:null;
    const currentBad=current?current.missing_price+current.missing_image+current.missing_category:0;
    const nextBad=next?next.missing_price+next.missing_image+next.missing_category:0;
    const currentRate=current&&current.offer_count?currentBad/(current.offer_count*3):null;
    const nextRate=next&&next.offer_count?nextBad/(next.offer_count*3):null;
    const level=!current||!next?"gray":nextRate!==null&&currentRate!==null&&nextRate>currentRate+.15?"red":nextRate!==null&&currentRate!==null&&nextRate>currentRate+.05?"yellow":"green";
    return {key:ch.key,name:ch.name,current,next,level,priceNow:pct(current,"missing_price"),priceNext:pct(next,"missing_price"),imageNow:pct(current,"missing_image"),imageNext:pct(next,"missing_image"),categoryNow:pct(current,"missing_category"),categoryNext:pct(next,"missing_category")};
  });
  const parserRegressions=publicationQuality.map(x=>{
    if(!x.current||!x.next)return {...x,level:"gray",signals:[] as string[]};
    const signals:string[]=[];
    const countDelta=x.current.offer_count>0?Math.round((x.next.offer_count-x.current.offer_count)/x.current.offer_count*100):0;
    if(countDelta<=-25)signals.push("tarjouksia "+countDelta+" %");
    const add=(label:string,a:number|null,b:number|null)=>{if(a!==null&&b!==null&&b-a>=5)signals.push(label+" +"+Math.round((b-a)*10)/10+" %-yks.");};
    add("hinnattomia",x.priceNow,x.priceNext); add("kuvattomia",x.imageNow,x.imageNext); add("kategoriattomia",x.categoryNow,x.categoryNext);
    const severe=countDelta<=-40||[["hinnattomia",x.priceNow,x.priceNext],["kuvattomia",x.imageNow,x.imageNext],["kategoriattomia",x.categoryNow,x.categoryNext]].some(([,a,b])=>typeof a==="number"&&typeof b==="number"&&b-a>=15);
    return {...x,countDelta,signals,level:severe?"red":signals.length?"yellow":"green"};
  });
  const parserRegressionRed=parserRegressions.filter(x=>x.level==="red").length;
  const parserRegressionYellow=parserRegressions.filter(x=>x.level==="yellow").length;
  const activeCandidates=candidatePubs.filter(p=>p.valid_from<=todayFi&&p.valid_until>=todayFi);
  const expiringToday=activePubs.filter(p=>p.valid_until===todayFi);
  const latestBySource=[...d.runs.reduce((m,r)=>{const k=`${r.chain}::${r.source}`;if(!m.has(k))m.set(k,r);return m},new Map<string,Row>()).values()];
  const sourceHealth=latestBySource.map(r=>{const ageH=Math.round((Date.now()-new Date(r.checked_at).getTime())/360000)/10;const history=d.runs.filter(x=>x.chain===r.chain&&x.source===r.source);const previous=history[1];const delta=previous&&previous.offer_count>0?Math.round((r.offer_count-previous.offer_count)/previous.offer_count*1000)/10:null;const recent=history.slice(0,5);const firstOkIndex=recent.findIndex(x=>x.ok);const streak=firstOkIndex>=0?firstOkIndex:recent.length;const isProbe=r.source==="s-kaupat-protocol"||r.source==="future-publication-discovery";const level=!r.ok?(r.source==="future-publication-discovery"?"yellow":"red"):(!isProbe&&r.offer_count===0)?"red":ageH>36||(!isProbe&&delta!==null&&delta<=-50)?"yellow":"green";return {...r,ageH,delta,level,streak,history:recent};});
  const latestSuccessBySource=sourceHealth.map(s=>{const okRun=d.runs.find(r=>r.chain===s.chain&&r.source===s.source&&r.ok);const successAgeH=okRun?(Date.now()-new Date(okRun.checked_at).getTime())/3600000:null;return {...s,lastSuccess:okRun?.checked_at??null,successAgeH};});
  const successStale=latestSuccessBySource.filter(s=>s.successAgeH!==null&&s.successAgeH>48);
  const neverSuccessful=latestSuccessBySource.filter(s=>s.source!=="future-publication-discovery"&&s.lastSuccess===null);
  const staleRuns=latestBySource.filter(r=>r.source!=="future-publication-discovery"&&Date.now()-new Date(r.checked_at).getTime()>36*60*60*1000);
  const futureDiscoveryChains=["K-SUPERMARKET","K-MARKET","TOKMANNI-SPAR"];
  const futureDiscovery=futureDiscoveryChains.map(chain=>({chain,run:d.runs.find(r=>r.chain===chain&&r.source==="future-publication-discovery")??null}));
  const futureFound=futureDiscovery.filter(x=>x.run?.outcome==="future-publication-found").length;
  const futureDiscoveryErrors=futureDiscovery.filter(x=>x.run&&!x.run.ok).length;
  const futureDiscoveryMissing=futureDiscovery.filter(x=>!x.run).length;
  const futureDiscoveryStale=futureDiscovery.filter(x=>x.run&&Date.now()-new Date(x.run.checked_at).getTime()>12*60*60*1000).length;
  const futureDiscoveryHealthy=futureDiscovery.filter(x=>x.run?.ok&&Date.now()-new Date(x.run.checked_at).getTime()<=12*60*60*1000).length;
  const latestRun=d.runs[0];
  const activeCoverageEnd=activePubs.reduce((max,p)=>p.valid_until>max?p.valid_until:max,todayFi); const nextApproved=currentPubs.filter(p=>p.approval_state==="approved"&&p.valid_from>activeCoverageEnd).sort((a,b)=>a.valid_from.localeCompare(b.valid_from))[0];
  const overlappingApproved=activePubs.filter((p,i,a)=>!CHAINS.find(ch=>ch.key==="Lidl")!.match(p.chain.trim())&&a.some((q,j)=>j!==i&&q.chain===p.chain&&q.publication_id!==p.publication_id));
  const rolloverChains=[...new Set(currentPubs.map(p=>p.chain).filter(chain=>!CHAINS[0].match(chain.trim())))].map(chain=>{const pubs=currentPubs.filter(p=>p.chain===chain);const current=pubs.filter(p=>p.approval_state==="approved"&&p.valid_from<=todayFi&&p.valid_until>=todayFi).sort((a,b)=>b.valid_until.localeCompare(a.valid_until))[0];const future=current?pubs.filter(p=>p.valid_from>current.valid_until).sort((a,b)=>a.valid_from.localeCompare(b.valid_from))[0]:pubs.filter(p=>p.valid_from>todayFi).sort((a,b)=>a.valid_from.localeCompare(b.valid_from))[0];const nextDay=current?new Date(current.valid_until+"T12:00:00Z"):null;if(nextDay)nextDay.setUTCDate(nextDay.getUTCDate()+1);const expected=nextDay?nextDay.toISOString().slice(0,10):null;const gap=Boolean(current&&future&&expected&&future.valid_from>expected);const level=!current?"red":gap?"red":!future&&current.valid_until<=todayFi?"yellow":future?.approval_state==="candidate"?"yellow":"green";return {chain,current,future,gap,level};});
  const publicationPipeline=CHAINS.filter(ch=>ch.key==="Lidl").map(ch=>{
    const current=currentPubs.filter(p=>ch.match(p.chain.trim())&&p.approval_state==="approved"&&p.valid_from<=todayFi&&p.valid_until>=todayFi).sort((a,b)=>b.valid_until.localeCompare(a.valid_until))[0]??null;
    const future=current?currentPubs.filter(p=>ch.match(p.chain.trim())&&p.valid_from>current.valid_until).sort((a,b)=>a.valid_from.localeCompare(b.valid_from))[0]??null:null;
    const discovery=d.runs.find(r=>ch.match(r.chain.trim())&&r.source==="future-publication-discovery")??null;
    const discoveryApplicable=["K","Tokmanni"].includes(ch.key);
    const discoveryFound=discovery?.outcome==="future-publication-found";
    const level=!current?"red":future?.approval_state==="approved"?"green":future?.approval_state==="candidate"?"yellow":discoveryApplicable&&discovery&&!discovery.ok?"red":discoveryApplicable&&discoveryFound?"yellow":current.valid_until<=todayFi?"yellow":"green";
    return {key:ch.key,name:ch.name,current,future,discovery,discoveryApplicable,discoveryFound,level};
  });
  const rolloverRisk=publicationPipeline.map(x=>{
    if(!x.current)return {...x,hoursLeft:null,risk:"red",reason:"Nykyinen approved-julkaisu puuttuu"};
    const end=new Date(x.current.valid_until+"T23:59:59+03:00").getTime();
    const hoursLeft=Math.max(0,Math.round((end-Date.now())/3600000));
    const nextApproved=x.future?.approval_state==="approved";
    const candidate=x.future?.approval_state==="candidate";
    const discovered=x.discoveryApplicable&&x.discoveryFound;
    const risk=nextApproved?"green":hoursLeft<=24?"red":hoursLeft<=48?"yellow":"green";
    const reason=nextApproved?"Seuraava approved valmiina":candidate?"Candidate odottaa hyväksyntää":discovered?"Tuleva julkaisu löydetty, candidate puuttuu":x.discoveryApplicable?"Tulevaa digijulkaisua ei vielä löydetty":"Seuraava approved ei vielä näkyvissä";
    return {...x,hoursLeft,risk,reason};
  });
  const urgentRollover=rolloverRisk.filter(x=>x.risk==="red").length;
  const warningRollover=rolloverRisk.filter(x=>x.risk==="yellow").length;
  const actionQueue=[
    ...rolloverRisk.filter(x=>x.risk==="red").map(x=>({level:"red",priority:x.hoursLeft??0,title:x.name,detail:x.reason+(x.hoursLeft===null?"":" · "+x.hoursLeft+" h jäljellä")})),
    ...rolloverRisk.filter(x=>x.risk==="yellow").map(x=>({level:"yellow",priority:100+(x.hoursLeft??99),title:x.name,detail:x.reason+(x.hoursLeft===null?"":" · "+x.hoursLeft+" h jäljellä")})),
    ...futureDiscovery.filter(x=>x.run&&!x.run.ok).map(x=>({level:"yellow",priority:160,title:x.chain,detail:"Tulevan tarjouslehden tarkistus ei onnistunut"+(x.run!.outcome==="future-discovery-http-error"?" (HTTP-virhe)":"")})),
    ...parserRegressions.filter(x=>x.level==="red").map(x=>({level:"red",priority:20,title:x.name,detail:"Vakava parseriregressio · "+x.signals.join(" · ")})),
    ...parserRegressions.filter(x=>x.level==="yellow").map(x=>({level:"yellow",priority:140,title:x.name,detail:"Parseriregressiovaroitus · "+x.signals.join(" · ")})),
    ...futureDiscovery.filter(x=>!x.run).map(x=>({level:"yellow",priority:180,title:x.chain,detail:"Future discoveryn ensimmäinen ajo puuttuu"})),
  ].sort((a,b)=>(a.level==="red"?0:1)-(b.level==="red"?0:1)||a.priority-b.priority);
  const chainHistory=CHAINS.map(ch=>{
    const rows=d.runs.filter(r=>ch.match(r.chain.trim())&&r.source!=="future-publication-discovery"&&r.source!=="s-kaupat-protocol").slice(0,6);
    const successful=rows.filter(r=>r.ok);
    const newest=successful[0]??null, previous=successful[1]??null;
    const delta=newest&&previous&&previous.offer_count>0?Math.round((newest.offer_count-previous.offer_count)/previous.offer_count*100):null;
    const failures=rows.filter(r=>!r.ok).length;
    const level=!rows.length?"gray":!newest?"red":failures>=2?"red":failures===1||delta!==null&&delta<=-40?"yellow":"green";
    return {key:ch.key,name:ch.name,rows,newest,previous,delta,failures,level};
  });
  const publicationGroups=[...new Map(activePubs.map(p=>[p.chain,activePubs.filter(q=>q.chain===p.chain)])).entries()];
  const chainQuality=publicationGroups.map(([chain,pubs])=>({chain,offers:pubs.reduce((n,p)=>n+p.offer_count,0),missingPrice:pubs.reduce((n,p)=>n+p.missing_price,0),missingImage:pubs.reduce((n,p)=>n+p.missing_image,0),missingCategory:pubs.reduce((n,p)=>n+p.missing_category,0),publications:pubs.length}));
  const chainHealth=CHAINS.map(ch=>{const pubs=activePubs.filter(p=>ch.match(p.chain.trim()));const runs=sourceHealth.filter(r=>ch.match(r.chain.trim())&&r.source!=="future-publication-discovery"&&r.source!=="s-kaupat-protocol");const offers=pubs.reduce((n,p)=>n+p.offer_count,0);const missingPrice=pubs.reduce((n,p)=>n+p.missing_price,0);const missingImage=pubs.reduce((n,p)=>n+p.missing_image,0);const missingCategory=pubs.reduce((n,p)=>n+p.missing_category,0);const badRun=runs.some(r=>r.level==="red");const stale=!runs.length||runs.every(r=>r.ageH>36);const level=badRun||missingPrice>0?"red":stale||missingImage>0||missingCategory>0?"yellow":"green";return {chain:ch.key,name:ch.name,offers,missingPrice,missingImage,missingCategory,runs:runs.length,badRun,stale,level};});
  const rolloverGaps=rolloverChains.filter(r=>r.gap);
  const rolloverWithoutNext=rolloverChains.filter(r=>r.current&&r.current.valid_until<=todayFi&&!r.future);
  const thinNext=rolloverChains.filter(r=>r.current&&r.future&&r.future.offer_count<Math.max(3,Math.floor(r.current.offer_count*.5)));
  const nextCandidates=rolloverChains.filter(r=>r.future?.approval_state==="candidate");
  const expiringSoon=activePubs.filter(p=>{const ms=new Date(p.valid_until+"T21:00:00Z").getTime()-Date.now();return ms>=0&&ms<=36*60*60*1000;});
  const unreadyExpiring=expiringSoon.filter(p=>!d.pubs.some(n=>n.chain===p.chain&&n.valid_from>todayFi&&n.approval_state==="approved"));
  const approvedNext=rolloverChains.filter(r=>r.future?.approval_state==="approved"&&r.current);
  const severeNextDrop=approvedNext.filter(r=>r.future!.offer_count<Math.max(1,Math.floor(r.current!.offer_count*.25)));
  const healthyNext=approvedNext.filter(r=>!r.gap&&!severeNextDrop.includes(r));
  const failedRuns24h=d.runs.filter(r=>!r.ok&&r.source!=="future-publication-discovery"&&Date.now()-new Date(r.checked_at).getTime()<=24*60*60*1000);
  const latestRunKeys=new Set(latestBySource.map(r=>r.chain+"::"+r.source+"::"+r.checked_at));
  const unresolvedFailures24h=failedRuns24h.filter(r=>latestRunKeys.has(r.chain+"::"+r.source+"::"+r.checked_at));
  const recoveredFailures24h=failedRuns24h.filter(r=>!latestRunKeys.has(r.chain+"::"+r.source+"::"+r.checked_at));
  const recoveredFailures=d.runs.filter((r,i)=>!r.ok&&d.runs.slice(0,i).some(n=>n.chain===r.chain&&n.source===r.source&&n.ok));
  const monitoredChains=cards.filter(c=>c.runs.length>0).length;
  const eanPriceCoverage=d.ean&&d.ean.total?Math.round(d.ean.lidl_price_eans/d.ean.total*1000)/10:0;
  const eanFreshCoverage=d.ean&&d.ean.total?Math.round(d.ean.lidl_fresh_prices/d.ean.total*1000)/10:0;
  const eanPriceRisk=d.ean&&(eanPriceCoverage<50||d.ean.lidl_stale_prices>d.ean.lidl_fresh_prices);
  const eanVerifiedCoverage=d.ean&&d.ean.lidl_price_eans?Math.round(d.ean.lidl_verified_prices/d.ean.lidl_price_eans*1000)/10:0;
  const eanStaleRatio=d.ean&&d.ean.lidl_price_rows?Math.round(d.ean.lidl_stale_prices/d.ean.lidl_price_rows*1000)/10:0;
  const eanUnpriced=d.ean?Math.max(0,d.ean.total-d.ean.lidl_price_eans):0;
  const eanUnpricedRatio=d.ean&&d.ean.total?Math.round(eanUnpriced/d.ean.total*1000)/10:0;
  const scanRisk=Boolean(d.scan&&(d.scan.unresolved_24h+d.scan.unknown_24h+d.scan.chain_mismatch_24h>0));
  const scanNoPriceRisk=Boolean(d.scan&&d.scan.no_price_24h>0);
  const scannerState=scanRisk?"red":scanNoPriceRisk?"yellow":"green";
  const scannerTotal24h=d.scan?.events_24h??0;
  const scannerProblem24h=(d.scan?.unresolved_24h??0)+(d.scan?.unknown_24h??0)+(d.scan?.chain_mismatch_24h??0)+(d.scan?.no_price_24h??0);
  const scannerProblemRate24h=scannerTotal24h>0?Math.round(scannerProblem24h/scannerTotal24h*1000)/10:0;
  const scannerVolumeState=scannerTotal24h===0?"yellow":scannerProblemRate24h>=20?"red":scannerProblemRate24h>0?"yellow":"green";
  const scannerSuccess24h=Math.max(0,scannerTotal24h-scannerProblem24h);
  const scannerSuccessRate24h=scannerTotal24h>0?Math.round(scannerSuccess24h/scannerTotal24h*1000)/10:0;
  const scannerSummary=scannerTotal24h===0?"Ei skannauksia 24 h":scannerProblem24h===0?"Kaikki kirjautuneet skannaukset ongelmattomia":`${scannerProblem24h}/${scannerTotal24h} ongelmatapausta (${scannerProblemRate24h.toLocaleString("fi-FI")} %)`;
  const eanImageCoverage=d.ean&&d.ean.total?Math.round(d.ean.with_image/d.ean.total*1000)/10:0;
  const eanCategoryCoverage=d.ean&&d.ean.total?Math.round(d.ean.classified/d.ean.total*1000)/10:0;
  const eanDataHealth=(d.ean?[(eanPriceCoverage>=75),(eanFreshCoverage>=75),(eanImageCoverage>=75),(eanCategoryCoverage>=75)]:[]).filter(Boolean).length;
  const eanHealthState=eanDataHealth===4?"green":eanDataHealth>=2?"yellow":"red";
  const currentFailures=latestBySource.filter(r=>!r.ok&&r.source!=="future-publication-discovery");
  const overallDataHealth=(d.ean?eanDataHealth:0)+(quality.missingPrice===0?1:0)+(currentFailures.length===0?1:0)+(rolloverGaps.length===0?1:0);
  const overallDataHealthState=overallDataHealth>=7?"green":overallDataHealth>=5?"yellow":"red";
  const failureStreaks=sourceHealth.filter(s=>s.source!=="future-publication-discovery"&&s.streak>=2);
  const severeFailureStreaks=sourceHealth.filter(s=>s.source!=="future-publication-discovery"&&s.streak>=3);
  const sourceCountAnomalies=sourceHealth.filter(s=>!["s-kaupat-protocol","future-publication-discovery"].includes(s.source)&&s.delta!==null&&Math.abs(s.delta)>=50);
  const sourceCountCrashes=sourceHealth.filter(s=>!["s-kaupat-protocol","future-publication-discovery"].includes(s.source)&&s.delta!==null&&s.delta<=-75);
  const silentSources=sourceHealth.filter(s=>s.ageH>48);
  const criticallySilentSources=sourceHealth.filter(s=>s.ageH>72);
  const chainRunSummary=cards.map(card=>{const latest=card.runs[0]??null;const lastOk=card.runs.find(r=>r.ok)??null;const ageH=latest?(Date.now()-new Date(latest.checked_at).getTime())/3600000:null;const okAgeH=lastOk?(Date.now()-new Date(lastOk.checked_at).getTime())/3600000:null;const level=!latest?"gray":!latest.ok||ageH!==null&&ageH>72?"red":okAgeH===null||okAgeH>48||ageH!==null&&ageH>48?"yellow":"green";return {chain:card.key,latest,lastOk,ageH,okAgeH,level};});
  const missingMonitoring=cards.filter(c=>c.runs.length===0);
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
  const hasQualityWarning=quality.missingImage>0||quality.missingCategory>0||overlappingApproved.length>0||rolloverWithoutNext.length>0||thinNext.length>0||nextCandidates.length>0||Boolean(eanPriceRisk);
  const overall=activeCandidates.length||currentFailures.length||hasCriticalQuality||rolloverGaps.length||unreadyExpiring.length||severeNextDrop.length||neverSuccessful.length||severeFailureStreaks.length||sourceCountCrashes.length||criticallySilentSources.length||states.some(x=>x[0]==="red")?["red","VAATII TOIMENPITEITÄ"]:states.some(x=>x[0]==="yellow"||x[0]==="gray")||futureDiscoveryErrors||futureDiscoveryMissing||futureDiscoveryStale||staleRuns.length||hasQualityWarning?["yellow","VAROITUKSIA / SEURANTA PUUTTUU"]:["green","KAIKKI SEURANNAT OK"];

  return <main style={{maxWidth:1500,margin:"0 auto",padding:28}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"end",marginBottom:22}}>
      <div><div style={{fontSize:12,letterSpacing:2,fontWeight:800,color:"#64748b"}}>ZIIPLY / INTERNAL</div>
      <h1 style={{margin:"5px 0",fontSize:36}}>Control Center</h1>
      <div style={{color:"#64748b"}}>Tarjousjulkaisut · automaatiot · EAN-pankki</div></div>
      <div style={{textAlign:"right"}}><div style={{fontSize:19,fontWeight:850}}>{dot(overall[0])} {overall[1]}</div><div style={{fontSize:11,color:"#667085",marginTop:5}}>Päivitetty {new Date().toLocaleString("fi-FI",{timeZone:"Europe/Helsinki"})}</div></div>
    </header>

    {d.error&&<div style={{background:"#fee4e2",border:"1px solid #fecdca",padding:16,borderRadius:12,marginBottom:16}}>🔴 {d.error}</div>}

    <section style={{display:"grid",gridTemplateColumns:"minmax(0,1.45fr) minmax(320px,.55fr)",gap:14,marginBottom:18}}>
      <article style={{background:overall[0]==="red"?"#fff1f0":overall[0]==="yellow"?"#fff8e6":"#ecfdf3",border:overall[0]==="red"?"1px solid #fecdca":overall[0]==="yellow"?"1px solid #fedf89":"1px solid #abefc6",borderRadius:20,padding:22}}>
        <div style={{fontSize:12,fontWeight:900,letterSpacing:1.4,color:"#667085"}}>SYSTEM STATUS</div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginTop:8,flexWrap:"wrap"}}>
          <div style={{fontSize:30,fontWeight:950}}>{dot(overall[0])} {overall[1]}</div>
          <div style={{fontSize:12,color:"#667085"}}>{monitoredChains}/{CHAINS.length} ketjua valvonnassa · {latestBySource.length} lähdettä</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginTop:18}}>
          <div><div style={{fontSize:11,color:"#667085"}}>Julkaisuvaraston aktiiviset tarjoukset</div><b style={{fontSize:22}}>{activeOfferTotal.toLocaleString("fi-FI")}</b></div>
          <div><div style={{fontSize:11,color:"#667085"}}>Avoimet lähdevirheet</div><b style={{fontSize:22}}>{currentFailures.length}</b></div>
          <div><div style={{fontSize:11,color:"#667085"}}>Toimintajono</div><b style={{fontSize:22}}>{actionQueue.length}</b></div>
          <div><div style={{fontSize:11,color:"#667085"}}>EAN-pankki</div><b style={{fontSize:22}}>{d.ean?d.ean.total.toLocaleString("fi-FI"):"—"}</b></div>
        </div>
      </article>
      <article style={{background:"#0f172a",color:"#f8fafc",borderRadius:20,padding:22}}>
        <div style={{fontSize:12,fontWeight:900,letterSpacing:1.4,color:"#94a3b8"}}>NEXT ACTION</div>
        {actionQueue.length===0?<><div style={{fontSize:24,fontWeight:900,marginTop:10}}>Ei avoimia toimia</div><div style={{fontSize:13,color:"#cbd5e1",marginTop:8}}>Valvonta ei tällä hetkellä nosta julkaisuvaihdon tai parserin toimenpiteitä.</div></>:<><div style={{fontSize:24,fontWeight:900,marginTop:10}}>{dot(actionQueue[0].level)} {actionQueue[0].title}</div><div style={{fontSize:13,color:"#cbd5e1",marginTop:8,lineHeight:1.5}}>{actionQueue[0].detail}</div><div style={{fontSize:12,color:"#94a3b8",marginTop:14}}>{actionQueue.length>1?"+ "+(actionQueue.length-1)+" muuta jonossa":"Ainoa avoin toimenpide"}</div></>}
      </article>
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {cards.map((c,i)=>{const [s,label]=states[i];const r=c.runs[0];return <article key={c.key} style={{background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:18}}>
        <div style={{fontWeight:800,fontSize:16}}>{dot(s)} {c.name}</div>
        <div style={{marginTop:7,fontWeight:800,color:s==="red"?"#b42318":s==="yellow"?"#a15c00":s==="green"?"#087443":"#667085"}}>{label}</div>
        <div style={{fontSize:31,fontWeight:900,marginTop:14}}>{r?(r.source==="s-kaupat-protocol"?(r.ok?"OK":"VIRHE"):r.offer_count):"—"}</div>
        <div style={{fontSize:12,color:"#667085"}}>{r?.source==="s-kaupat-protocol"?"protokollan health-probe":"viimeisin parseritulos"}</div>
        <div style={{fontSize:12,color:"#667085",marginTop:9}}>{r?new Date(r.checked_at).toLocaleString("fi-FI"):"Ei ajoa 14 vrk"}</div>
        {r&&<div style={{fontSize:13,marginTop:7}}>{r.outcome}</div>}
      </article>})}
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {statusCard("Future discovery kunnossa",futureDiscoveryHealthy+" / "+futureDiscovery.length,futureDiscoveryErrors||futureDiscoveryMissing||futureDiscoveryStale?"yellow":"green","Tuore onnistunut tarkistus ≤12 h")}
      {statusCard("Tulevia lehtiä löydetty",futureFound,futureFound?"green":"gray","Digitaalisesta lähteestä löytyneet tulevat jaksot")}
      {statusCard("Future discovery puuttuu",futureDiscoveryMissing,futureDiscoveryMissing?"yellow":"green","Ketjut, joilta ensimmäinen tarkistus ei ole vielä kirjautunut")}
      {statusCard("Future discovery varoitukset",futureDiscoveryErrors,futureDiscoveryErrors?"yellow":"green","Ennakkotarkistus epäonnistui; ei tarkoita parseri- tai tarjousdatavirhettä")}
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Tulevien tarjouslehtien valvonta</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12}}>
        {futureDiscovery.map(x=>{const r=x.run;const level=!r?"gray":!r.ok?"red":r.outcome==="future-publication-found"?"green":"yellow";const label=!r?"Ei vielä ajoa":!r.ok?"Tarkistus epäonnistui":r.outcome==="future-publication-found"?"Tuleva lehti löydetty":"Ei vielä julkaistu digitaalisena";return <div key={x.chain} style={{border:"1px solid #e5e7eb",borderRadius:12,padding:14}}><div style={{fontWeight:900}}>{dot(level)} {x.chain}</div><div style={{fontSize:16,fontWeight:850,marginTop:8}}>{label}</div><div style={{fontSize:12,color:"#667085",marginTop:7}}>{r?"Viimeksi tarkistettu "+new Date(r.checked_at).toLocaleString("fi-FI"):"Ensimmäinen cron-ajo ei ole vielä kirjautunut"}</div><div style={{fontSize:12,color:"#667085",marginTop:4}}>{r?.outcome||"future-publication-discovery"}</div></div>})}
      </div>
      <div style={{fontSize:12,color:"#667085",marginTop:12}}>Digitaalisen lähteen puuttuminen ei ole virhe. Punainen tila tarkoittaa, että itse tarkistus epäonnistui. Löydetty tuleva julkaisu siirtyy erikseen parseroinnin ja julkaisuvaraston tarkastukseen.</div>
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:14,marginBottom:18}}>
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
      <h2 style={{marginTop:0}}>Parserin regressiohälytys</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12,marginBottom:12}}>
        {statusCard("Vakava regressio",parserRegressionRed,parserRegressionRed?"red":"green","Määrä tai datan laatu heikkeni voimakkaasti")}
        {statusCard("Regressiovaroitus",parserRegressionYellow,parserRegressionYellow?"yellow":"green","Seuraava julkaisu on nykyistä heikompi")}
      </div>
      <div style={{display:"grid",gap:8}}>{parserRegressions.map(x=><div key={x.key} style={{display:"grid",gridTemplateColumns:"24px minmax(180px,280px) 1fr",gap:10,padding:"10px 12px",border:"1px solid #e5e7eb",borderRadius:10}}>
        <div>{dot(x.level)}</div><div style={{fontWeight:900}}>{x.name}</div><div>{!x.current||!x.next?"Ei vielä vertailukelpoista seuraavaa julkaisua":x.signals.length?x.signals.join(" · "):"Ei havaittua regressiota"}</div>
      </div>)}</div>
      <div style={{fontSize:12,color:"#667085",marginTop:10}}>Varoitus syntyy, kun tarjousmäärä putoaa vähintään 25 % tai jokin puute kasvaa vähintään 5 %-yks. Vakava hälytys syntyy ≥40 % määräromahduksesta tai ≥15 %-yks. laatupuutteen kasvusta.</div>
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Julkaisun laatutrendi / nykyinen → seuraava</h2>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr>{["Tila","Ketju","Nykyinen / seuraava","Hinta puuttuu","Kuva puuttuu","Kategoria puuttuu"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead>
        <tbody>{publicationQuality.map(x=>{const pair=(a:number|null,b:number|null)=>a===null?"—":a+" % → "+(b===null?"—":b+" %");return <tr key={x.key}>
          <td style={{padding:8}}>{dot(x.level)}</td><td style={{padding:8,fontWeight:900}}>{x.name}</td>
          <td style={{padding:8}}>{x.current?x.current.offer_count:"—"} → {x.next?x.next.offer_count:"—"}{x.next&&<div style={{fontSize:11,color:"#667085"}}>{x.next.approval_state} · {x.next.valid_from}–{x.next.valid_until}</div>}</td>
          <td style={{padding:8}}>{pair(x.priceNow,x.priceNext)}</td><td style={{padding:8}}>{pair(x.imageNow,x.imageNext)}</td><td style={{padding:8}}>{pair(x.categoryNow,x.categoryNext)}</td>
        </tr>})}</tbody>
      </table></div>
      <div style={{fontSize:12,color:"#667085",marginTop:10}}>Prosentit suhteutetaan julkaisun tarjousmäärään. Punainen, jos seuraavan julkaisun yhdistetty puutedata heikkenee yli 15 prosenttiyksikköä; keltainen yli 5 prosenttiyksikköä. Harmaa tarkoittaa, ettei seuraavaa julkaisua vielä ole vertailtavana.</div>
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Ketjujen ajohistoria / trendi</h2>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr>{["Tila","Ketju","Viimeisin onnistunut","Muutos","Virheitä / 6 ajoa","Viimeiset ajot"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead>
        <tbody>{chainHistory.map(x=><tr key={x.key}>
          <td style={{padding:8}}>{dot(x.level)}</td><td style={{padding:8,fontWeight:900}}>{x.name}</td>
          <td style={{padding:8}}>{x.newest?x.newest.offer_count+" · "+new Date(x.newest.checked_at).toLocaleString("fi-FI"):"—"}</td>
          <td style={{padding:8,fontWeight:800}}>{x.delta===null?"—":(x.delta>0?"+":"")+x.delta+" %"}</td>
          <td style={{padding:8}}>{x.failures} / {x.rows.length}</td>
          <td style={{padding:8}}><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{x.rows.length?x.rows.map((r,i)=><span key={i} title={r.source+" · "+r.outcome+" · "+new Date(r.checked_at).toLocaleString("fi-FI")} style={{padding:"3px 6px",borderRadius:7,background:r.ok?"#ecfdf3":"#fef2f2",fontWeight:800}}>{r.ok?"✓":"✕"} {r.offer_count}</span>):"Ei ajoja"}</div></td>
        </tr>)}</tbody>
      </table></div>
      <div style={{fontSize:12,color:"#667085",marginTop:10}}>Tarjousmäärän trendistä on rajattu pois future-discovery ja protokollaprobet, jotta nollatulokset eivät vääristä varsinaisen parserin kehitystä. Muutos vertaa kahta viimeisintä onnistunutta ajoa.</div>
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Toimintajono</h2>
      {actionQueue.length===0?<div style={{padding:14,borderRadius:12,background:"#ecfdf3",fontWeight:800}}>🟢 Ei avoimia julkaisuvaihdon toimenpiteitä.</div>:
      <div style={{display:"grid",gap:8}}>{actionQueue.slice(0,12).map((a,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"34px minmax(160px,240px) 1fr",gap:10,alignItems:"center",padding:"10px 12px",border:"1px solid #e5e7eb",borderRadius:10}}>
        <div style={{fontWeight:900,fontSize:16}}>{i+1}</div><div style={{fontWeight:900}}>{dot(a.level)} {a.title}</div><div>{a.detail}</div>
      </div>)}</div>}
      <div style={{fontSize:12,color:"#667085",marginTop:10}}>Punaiset vaihtoriskit ja discovery-virheet nousevat ensin; niiden jälkeen tulevat 48 h varoitukset ja vielä käynnistymättömät future-discoveryt.</div>
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Ennakoiva julkaisuvaihdon riski</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12,marginBottom:12}}>
        {statusCard("Kriittinen ≤24 h",urgentRollover,urgentRollover?"red":"green","Seuraava approved puuttuu tai nykyinen julkaisu puuttuu")}
        {statusCard("Varoitus ≤48 h",warningRollover,warningRollover?"yellow":"green","Seuraava approved ei vielä ole valmiina")}
      </div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr>{["Tila","Ketju","Aikaa jäljellä","Seuraajan vaihe / syy"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead>
        <tbody>{rolloverRisk.map(x=><tr key={x.key}><td style={{padding:8}}>{dot(x.risk)}</td><td style={{padding:8,fontWeight:800}}>{x.name}</td><td style={{padding:8}}>{x.hoursLeft===null?"—":x.hoursLeft+" h"}</td><td style={{padding:8}}>{x.reason}</td></tr>)}</tbody>
      </table></div>
      <div style={{fontSize:12,color:"#667085",marginTop:10}}>Punainen: enintään 24 h jäljellä ilman valmista seuraajaa. Keltainen: enintään 48 h. Vihreä: seuraava approved on valmiina tai vaihtoon on enemmän aikaa.</div>
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Julkaisuketju / nykyinen → seuraava</h2>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr>{["Tila","Ketju","Nykyinen approved","Future discovery","Candidate","Seuraava approved"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead>
        <tbody>{publicationPipeline.map(x=>{const candidate=x.future?.approval_state==="candidate"?x.future:null;const approved=x.future?.approval_state==="approved"?x.future:null;return <tr key={x.key}>
          <td style={{padding:8}}>{dot(x.level)}</td>
          <td style={{padding:8,fontWeight:800}}>{x.name}</td>
          <td style={{padding:8}}>{x.current?x.current.valid_from+"–"+x.current.valid_until+" · "+x.current.offer_count:"—"}</td>
          <td style={{padding:8}}>{!x.discoveryApplicable?"Ei erillistä future-probea":!x.discovery?"Ei vielä ajoa":!x.discovery.ok?"🔴 Virhe":x.discoveryFound?"🟢 Löydetty":"🟡 Ei vielä digijulkaisua"}{x.discovery&&<div style={{fontSize:11,color:"#667085"}}>{new Date(x.discovery.checked_at).toLocaleString("fi-FI")}</div>}</td>
          <td style={{padding:8}}>{candidate?"🟡 "+candidate.valid_from+"–"+candidate.valid_until+" · "+candidate.offer_count:"—"}</td>
          <td style={{padding:8}}>{approved?"🟢 "+approved.valid_from+"–"+approved.valid_until+" · "+approved.offer_count:"—"}</td>
        </tr>})}</tbody>
      </table></div>
      <div style={{fontSize:12,color:"#667085",marginTop:10}}>Putki näyttää yhdellä rivillä, onko nykyinen julkaisu kunnossa ja kuinka pitkälle seuraava julkaisu on edennyt. Future discovery on tällä hetkellä erillisenä K-ryhmälle ja Tokmanni/SPARille.</div>
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Julkaisuvaihdon valmius</h2>
      {rolloverChains.length===0?<div style={{color:"#667085"}}>Ei julkaisuvaraston ketjuja.</div>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{["Tila","Ketju","Nykyinen päättyy","Seuraava alkaa","Seuraavan tila","Seuraavan määrä"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead><tbody>{rolloverChains.map(r=><tr key={r.chain}><td style={{padding:8}}>{dot(r.level)}</td><td style={{padding:8,fontWeight:800}}>{r.chain}</td><td style={{padding:8}}>{r.current?.valid_until||"Ei aktiivista approved-julkaisua"}</td><td style={{padding:8}}>{r.future?.valid_from||"—"}</td><td style={{padding:8}}>{r.future?.approval_state||"—"}{r.gap?" · KATKOS":""}</td><td style={{padding:8,fontWeight:800}}>{r.future?.offer_count??"—"}{r.current&&r.future&&r.future.offer_count<Math.max(3,Math.floor(r.current.offer_count*.5))?" ⚠️":""}</td></tr>)}</tbody></table></div>}
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Aktiivisen datan laatu ketjuittain</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12,marginBottom:16}}>{chainHealth.map(x=><div key={x.chain} style={{border:"1px solid #e5e7eb",borderRadius:12,padding:14}}><div style={{fontWeight:900}}>{dot(x.level)} {x.chain}</div><div style={{fontSize:25,fontWeight:900,marginTop:7}}>{x.offers.toLocaleString("fi-FI")}</div><div style={{fontSize:11,color:"#667085"}}>aktiivista tarjousta</div><div style={{fontSize:12,marginTop:8}}>Hinta {x.missingPrice?"🔴 "+x.missingPrice:"🟢"} · Kuva {x.missingImage?"🟡 "+x.missingImage:"🟢"} · Kat. {x.missingCategory?"🟡 "+x.missingCategory:"🟢"}</div><div style={{fontSize:11,color:"#667085",marginTop:6}}>Health-lähteitä {x.runs} · {x.stale?"vanhentunut / puuttuu":"tuore"}</div></div>)}</div>
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
      {sourceHealth.length===0?<div style={{color:"#667085"}}>Ei health-lähteitä 14 vrk ajalta.</div>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{["Tila","Ketju","Lähde","Viimeisin ajo","Ikä","Tarjouksia","Muutos","5 viimeistä","Virheputki","Outcome"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead><tbody>{sourceHealth.map(r=><tr key={r.chain+"::"+r.source}><td style={{padding:8}}>{dot(r.level)}</td><td style={{padding:8,fontWeight:800}}>{r.chain}</td><td style={{padding:8}}>{r.source}</td><td style={{padding:8}}>{new Date(r.checked_at).toLocaleString("fi-FI")}</td><td style={{padding:8}}>{r.ageH.toLocaleString("fi-FI")} h</td><td style={{padding:8,fontWeight:800}}>{["s-kaupat-protocol","future-publication-discovery"].includes(r.source)?"probe":r.offer_count}</td><td style={{padding:8}}>{["s-kaupat-protocol","future-publication-discovery"].includes(r.source)?"—":r.delta===null?"—":(r.delta>0?"+":"")+r.delta.toLocaleString("fi-FI")+" %"}</td><td style={{padding:8,whiteSpace:"nowrap"}}>{r.history.map((h,i)=><span key={i} title={new Date(h.checked_at).toLocaleString("fi-FI")+" · "+h.outcome}>{h.ok?"🟢":"🔴"}</span>)}</td><td style={{padding:8,fontWeight:r.streak?800:400}}>{r.streak||"—"}</td><td style={{padding:8}}>{r.outcome}</td></tr>)}</tbody></table></div>}
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Huomiota vaativat</h2>
      {attention.length===0?<div style={{padding:12,background:"#ecfdf3",borderRadius:10}}>🟢 Ei tällä hetkellä kirjattuja kriittisiä huomioita.</div>:attention.slice(0,20).map((a,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"28px 1fr",padding:"10px 0",borderBottom:"1px solid #edf0f2"}}><div>{dot(a.level)}</div><div><b>{a.title}</b><div style={{fontSize:12,color:"#667085",marginTop:3}}>{a.detail}</div></div></div>)}
    </section>

    <section style={{marginTop:18,marginBottom:12}}><div style={{fontSize:12,fontWeight:900,letterSpacing:1.4,color:"#667085"}}>YKSITYISKOHTAISET KPI-MITTARIT</div></section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {statusCard("Ketjuvalvonnan kattavuus",monitoredChains+" / "+CHAINS.length,monitoredChains===CHAINS.length?"green":"yellow",missingMonitoring.length?"Puuttuu: "+missingMonitoring.map(c=>c.name).join(", "):"Kaikilla ketjuilla health-dataa")}
      {statusCard("Instrumentoidut lähteet",latestBySource.length,latestBySource.length?"green":"yellow","Uniikit chain + source -valvonnat 14 vrk")}
      {statusCard("Avoimet lähdevirheet",currentFailures.length,currentFailures.length?"red":"green",currentFailures.length?"Lähteen viimeisin ajo epäonnistunut":"Kaikkien kirjattujen lähteiden viimeisin ajo OK")}
      {statusCard("Lidl EAN-hintakattavuus",eanPriceCoverage+" %",eanPriceCoverage<50?"yellow":"green",eanFreshCoverage+" % EAN-pankista tuoreella hinnalla")}
      {statusCard("Lidl EAN-hintojen tuoreus",d.ean?d.ean.lidl_fresh_prices:0,eanPriceRisk?"yellow":"green",d.ean?d.ean.lidl_stale_prices+" vanhentunutta hintariviä":"Ei EAN-dataa")}
      {statusCard("Lidl hintojen varmennus",eanVerifiedCoverage+" %",eanVerifiedCoverage<10?"yellow":"green",d.ean?d.ean.lidl_verified_prices+" hintariviä kassavarmennettu":"Ei varmennettuja hintoja")}
      {statusCard("Vanhentuneiden osuus",eanStaleRatio+" %",eanStaleRatio>50?"red":eanStaleRatio>25?"yellow":"green","Lidl EAN-hintariveistä")}
      {statusCard("EAN-pankin nähty 24 h",d.ean?d.ean.seen_24h:0,d.ean&&d.ean.seen_24h>0?"green":"yellow","Käyttäjien viimeisen 24 h aikana skannaamat/esiin tuomat EANit")}
      {statusCard("Lidl EAN ilman hintaa",eanUnpricedRatio+" %",eanUnpricedRatio>50?"yellow":"green",eanUnpriced+" EANia ilman Lidl-hintariviä")}
      {statusCard("EAN-kuvakattavuus",eanImageCoverage+" %",eanImageCoverage<75?"yellow":"green",d.ean?d.ean.missing_image+" EANia ilman kuvaa":"Ei EAN-dataa")}
      {statusCard("EAN-kategoriakattavuus",eanCategoryCoverage+" %",eanCategoryCoverage<75?"yellow":"green",d.ean?d.ean.missing_category+" EANia ilman kategoriaa":"Ei EAN-dataa")}
      {statusCard("EAN-datan kokonaisterveys",eanDataHealth+"/4",eanHealthState,"Hinta · tuoreus · kuva · kategoria, tavoite ≥75 %")}
      {statusCard("Datan kokonaisterveys",overallDataHealth+"/7",overallDataHealthState,"EAN 4/4 + aktiiviset hinnat + automaatiot + julkaisuvaihdot")}
      {statusCard("Skannerin onnistumisaste 24 h",scannerTotal24h?scannerSuccessRate24h+" %":"—",scannerVolumeState,scannerTotal24h?scannerSuccess24h+" / "+scannerTotal24h+" kirjattua skannausta onnistui":"Ei kirjattuja skannauksia 24 h")}
    </section>


    <section style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:18}}>
      <article style={{background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
        <h2 style={{marginTop:0}}>Julkaisujen ajohistoria</h2>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr>{["Aika","Ketju","Lähde","Tulos","Määrä","Outcome"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead>
          <tbody>{d.runs.slice(0,80).map((r,i)=><tr key={i}>
            <td style={{padding:8}}>{new Date(r.checked_at).toLocaleString("fi-FI")}</td><td style={{padding:8,fontWeight:700}}>{r.chain}</td><td style={{padding:8}}>{r.source}</td>
            <td style={{padding:8}}>{r.ok?"🟢":"🔴"}</td><td style={{padding:8,fontWeight:800}}>{["s-kaupat-protocol","future-publication-discovery"].includes(r.source)?"probe":r.offer_count}</td><td style={{padding:8}}>{r.outcome}</td>
          </tr>)}</tbody>
        </table></div>
      </article>

      <article style={{background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
        <h2 style={{marginTop:0}}>EAN / skanneri</h2>
        {d.ean?<>{metric("EAN-pankki",d.ean.total)}{metric("Kuvalliset",d.ean.with_image)}{metric("Luokitellut",d.ean.classified)}{metric("Nähty 24 h",d.ean.seen_24h)}<div style={{marginTop:14,fontSize:12,color:"#667085"}}>Lidl-hinnat</div>{metric("Lidl EAN-hintarivejä",d.ean.lidl_price_rows)}{metric("EANeja hinnoilla",d.ean.lidl_price_eans)}{metric("Tuoreita hintoja",d.ean.lidl_fresh_prices)}{metric("Varmistettu kassalla",d.ean.lidl_verified_prices)}{metric("Vanhentuneita hintoja",d.ean.lidl_stale_prices)}<div style={{marginTop:14,fontSize:12,color:"#667085"}}>Kattavuus</div>{coverage("Kuvat",d.ean.with_image,d.ean.total)}{coverage("Luokittelu",d.ean.classified,d.ean.total)}<div style={{marginTop:14}}>{metric("Kuva puuttuu",d.ean.missing_image)}{metric("Luokka puuttuu",d.ean.missing_category)}{metric("Ei nähty 30 vrk",d.ean.stale_30d)}<div style={{marginTop:14,fontSize:12,color:"#667085"}}>Skanneri 24 h</div>{metric("Skannauksia",d.scan.events_24h)}{metric("Selvitettäviä",d.scan.unresolved_24h)}{metric("Tuntemattomia",d.scan.unknown_24h)}{metric("Ilman hintaa",d.scan.no_price_24h)}{metric("Väärä ketju",d.scan.chain_mismatch_24h)}{metric("Ongelmat yhteensä",scannerProblem24h)}{metric("Ongelmaosuus %",scannerProblemRate24h)}{metric("Onnistuneet",scannerSuccess24h)}{metric("Onnistumisaste %",scannerSuccessRate24h)}</div></>:<div>Ei EAN-dataa.</div>}
        <div style={{marginTop:18,padding:12,background:scannerVolumeState==="red"?"#fee4e2":scannerVolumeState==="yellow"?"#fff8e6":"#ecfdf3",borderRadius:10,fontSize:13}}><b>{dot(scannerVolumeState)} {scannerSummary}</b><div style={{marginTop:4,color:"#667085"}}>{scanRisk?"Selvitettäviä, tuntemattomia tai väärän ketjun tapauksia havaittu.":scanNoPriceRisk?"Tuotteita lisätty ilman hintaa.":scannerTotal24h===0?"Skanneriloki ei ole saanut tapahtumia viimeisen 24 tunnin aikana.":"Ei kirjattuja skanneriongelmia."}</div></div>
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
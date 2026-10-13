import {neon} from "@neondatabase/serverless";

export const dynamic="force-dynamic";

const CHAINS=[
  {key:"S",name:"S-ryhmä / Prisma / S-market",match:(v:string)=>/^(s(?::|$)|prisma|s-?market|sale|alepa)/i.test(v)},
  {key:"K",name:"K-ryhmä / Citymarket / K-Supermarket / K-Market",match:(v:string)=>/^(k(?::|$)|k-?citymarket|citymarket|k-?supermarket|k-?market)/i.test(v)},
  {key:"Lidl",name:"Lidl",match:(v:string)=>/^lidl(?::|$)/i.test(v)},
  {key:"Tokmanni",name:"Tokmanni / SPAR",match:(v:string)=>/^(tokmanni(?:-spar)?|spar|eurospar)(?::|$)/i.test(v)}
];

type HistoryRow={chain:string;source:string;total:number;succeeded:number;days:number;previous_total:number;previous_succeeded:number;previous_days:number};
type Row={chain:string;source:string;ok:boolean;offer_count:number;outcome:string;checked_at:string};
type Pub={chain:string;publication_id:string;valid_from:string;valid_until:string;parsed_at:string;approval_state:string;offer_count:number;missing_price:number;missing_image:number;missing_category:number};
type EanStats={total:number;with_image:number;classified:number;seen_24h:number;missing_image:number;missing_category:number;stale_30d:number;lidl_price_rows:number;lidl_price_eans:number;lidl_fresh_prices:number;lidl_verified_prices:number;lidl_stale_prices:number};
type ScanStats={events_24h:number;unresolved_24h:number;unknown_24h:number;no_price_24h:number;chain_mismatch_24h:number};

async function load(){
  const url=process.env.DATABASE_URL;
  if(!url)return {error:"DATABASE_URL puuttuu",runs:[] as Row[],pubs:[] as Pub[],history:[] as HistoryRow[],ean:null,scan:{events_24h:0,unresolved_24h:0,unknown_24h:0,no_price_24h:0,chain_mismatch_24h:0} as ScanStats};
  try{
    const sql=neon(url);
    const runs=await sql`SELECT checked_at::text AS checked_at,chain,source,ok,offer_count,outcome
      FROM ziiply_publication_run_log WHERE checked_at>NOW()-INTERVAL '14 days'
      ORDER BY checked_at DESC,id DESC LIMIT 300`;
    const history=await sql`SELECT chain,source,
      COUNT(*) FILTER(WHERE checked_at>NOW()-INTERVAL '7 days')::int AS total,
      COUNT(*) FILTER(WHERE checked_at>NOW()-INTERVAL '7 days' AND ok)::int AS succeeded,
      COUNT(DISTINCT (checked_at AT TIME ZONE 'Europe/Helsinki')::date) FILTER(WHERE checked_at>NOW()-INTERVAL '7 days')::int AS days,
      COUNT(*) FILTER(WHERE checked_at<=NOW()-INTERVAL '7 days')::int AS previous_total,
      COUNT(*) FILTER(WHERE checked_at<=NOW()-INTERVAL '7 days' AND ok)::int AS previous_succeeded,
      COUNT(DISTINCT (checked_at AT TIME ZONE 'Europe/Helsinki')::date) FILTER(WHERE checked_at<=NOW()-INTERVAL '7 days')::int AS previous_days
      FROM ziiply_publication_run_log WHERE checked_at>NOW()-INTERVAL '14 days' GROUP BY chain,source`;
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
    return {error:null,runs:runs as Row[],pubs:pubs as Pub[],ean:eanStats,scan,history:history as HistoryRow[]};
  }catch(e){return {error:e instanceof Error?e.message:"Tietokantavirhe",runs:[] as Row[],pubs:[] as Pub[],history:[] as HistoryRow[],ean:null,scan:{events_24h:0,unresolved_24h:0,unknown_24h:0,no_price_24h:0,chain_mismatch_24h:0} as ScanStats}}
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

export default async function Page({searchParams}:{searchParams:Promise<{view?:string}>}){
  const requestedView=(await searchParams).view;
  const view=requestedView==="publications"?"publications":requestedView==="data"?"data":"overview";
  const d=await load();
  const cards=CHAINS.map(c=>({...c,runs:d.runs.filter(r=>c.match(r.chain.trim())&&!["future-publication-discovery","s-kaupat-protocol"].includes(r.source))}));
  const todayFi=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const currentPubs=[...d.pubs.reduce((m,p)=>{const k=`${p.chain}::${p.valid_from}::${p.valid_until}`;const prev=m.get(k);if(!prev||p.parsed_at>prev.parsed_at)m.set(k,p);return m},new Map<string,Pub>()).values()];
  const activePubs=currentPubs.filter(p=>p.approval_state==="approved"&&p.valid_from<=todayFi&&p.valid_until>=todayFi);
  const candidatePubs=currentPubs.filter(p=>p.approval_state==="candidate");
  const activeOfferTotal=activePubs.reduce((n,p)=>n+p.offer_count,0);
  const aggregateActive=(ch:(typeof CHAINS)[number])=>{
    const rows=activePubs.filter(p=>ch.match(p.chain.trim()));
    if(!rows.length)return null;
    const first=rows.reduce((a,b)=>a.valid_from<b.valid_from?a:b);
    const last=rows.reduce((a,b)=>a.valid_until>b.valid_until?a:b);
    return {...last,
      valid_from:first.valid_from,
      valid_until:last.valid_until,
      offer_count:rows.reduce((n,p)=>n+p.offer_count,0),
      missing_price:rows.reduce((n,p)=>n+p.missing_price,0),
      missing_image:rows.reduce((n,p)=>n+p.missing_image,0),
      missing_category:rows.reduce((n,p)=>n+p.missing_category,0),
      publication_id:rows.length+" aktiivista segmenttiä"
    } as Pub;
  };
  const quality={missingPrice:activePubs.reduce((n,p)=>n+p.missing_price,0),missingImage:activePubs.reduce((n,p)=>n+p.missing_image,0),missingCategory:activePubs.reduce((n,p)=>n+p.missing_category,0)};
  const publicationQuality=CHAINS.filter(ch=>ch.key==="Lidl").map(ch=>{
    const current=aggregateActive(ch);
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
  const latestBySource=[...d.runs.reduce((m,r)=>{const k=`${r.chain}::${explainSource(r.source)}`;if(!m.has(k))m.set(k,r);return m},new Map<string,Row>()).values()];
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
  const futureDiscoveryStale=futureDiscovery.filter(x=>x.run&&Date.now()-new Date(x.run.checked_at).getTime()>8*24*60*60*1000).length;
  const futureDiscoveryHealthy=futureDiscovery.filter(x=>x.run?.ok&&Date.now()-new Date(x.run.checked_at).getTime()<=8*24*60*60*1000).length;
  // Learn from actual parser-approved publication validity dates, not just discovery probes.
  const expectedStartDays:Record<string,number[]>={"K-SUPERMARKET":[1,4],"K-MARKET":[1,4],"TOKMANNI-SPAR":[1,4]};
  const fiWeekday=(iso:string)=>new Date(iso.slice(0,10)+"T12:00:00Z").getUTCDay();
  const publicationScheduleObservations=[...new Map(d.pubs.filter(p=>p.approval_state==="approved"&&/^(K-SUPERMARKET|K-MARKET|TOKMANNI-SPAR|EUROSPAR|SPAR)/i.test(p.chain)).map(p=>[p.chain+"::"+p.publication_id+"::"+p.valid_from,p])).values()].map(p=>({chain:p.chain,publication:p.publication_id,validFrom:p.valid_from,weekday:fiWeekday(p.valid_from),parsedAt:p.parsed_at,unexpected:!expectedStartDays[/^(EUROSPAR|SPAR)/i.test(p.chain)?"TOKMANNI-SPAR":p.chain]?.includes(fiWeekday(p.valid_from))}));
  const unexpectedPublicationDays=publicationScheduleObservations.filter(p=>p.unexpected);
  const learnedWeekdays=[...new Set(unexpectedPublicationDays.map(p=>p.chain+"::"+p.weekday))];
  const latestRun=d.runs[0];
  const activeCoverageEnd=activePubs.reduce((max,p)=>p.valid_until>max?p.valid_until:max,todayFi); const nextApproved=currentPubs.filter(p=>p.approval_state==="approved"&&p.valid_from>activeCoverageEnd).sort((a,b)=>a.valid_from.localeCompare(b.valid_from))[0];
  const overlappingApproved=activePubs.filter((p,i,a)=>!CHAINS.find(ch=>ch.key==="Lidl")!.match(p.chain.trim())&&a.some((q,j)=>j!==i&&q.chain===p.chain&&q.publication_id!==p.publication_id));
  const rolloverChains=[...new Set(currentPubs.map(p=>p.chain).filter(chain=>!CHAINS[0].match(chain.trim())))].map(chain=>{const pubs=currentPubs.filter(p=>p.chain===chain);const current=pubs.filter(p=>p.approval_state==="approved"&&p.valid_from<=todayFi&&p.valid_until>=todayFi).sort((a,b)=>b.valid_until.localeCompare(a.valid_until))[0];const future=current?pubs.filter(p=>p.valid_from>current.valid_until).sort((a,b)=>a.valid_from.localeCompare(b.valid_from))[0]:pubs.filter(p=>p.valid_from>todayFi).sort((a,b)=>a.valid_from.localeCompare(b.valid_from))[0];const nextDay=current?new Date(current.valid_until+"T12:00:00Z"):null;if(nextDay)nextDay.setUTCDate(nextDay.getUTCDate()+1);const expected=nextDay?nextDay.toISOString().slice(0,10):null;const gap=Boolean(current&&future&&expected&&future.valid_from>expected);const level=!current?"red":gap?"red":!future&&current.valid_until<=todayFi?"yellow":future?.approval_state==="candidate"?"yellow":"green";return {chain,current,future,gap,level};});
  const publicationPipeline=CHAINS.filter(ch=>ch.key==="Lidl").map(ch=>{
    const current=aggregateActive(ch);
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
    ...staleRuns.map(r=>({level:"yellow",title:r.chain+": health-ajo vanhentunut",detail:r.source+" · "+new Date(r.checked_at).toLocaleString("fi-FI",{timeZone:"Europe/Helsinki"})})),
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

  const summaryChecks=[
    {name:"Prisma Hyvinkää",source:"s-prisma-hyvinkaa",success:"Tarjoushaku onnistui",failure:"Tarjoushaku epäonnistui"},
    {name:"Citymarket",source:"k-citymarket-cache",success:"Aktiivisen tarjousvälimuistin tarkistus onnistui",failure:"Tarjousvälimuistin tarkistus epäonnistui"},
    {name:"K-Supermarket Jokela",source:"k-supermarket-jokela",success:"Parserin tarkistus onnistui",failure:"Parserin tarkistus epäonnistui"},
    {name:"K-Market Hakalantori",source:"k-market-hakalantori",success:"Parserin tarkistus onnistui",failure:"Parserin tarkistus epäonnistui"},
    {name:"Eurospar",source:"eurospar-validated-feed",success:"Validoidun syötteen tarkistus onnistui",failure:"Validoidun syötteen tarkistus epäonnistui"},
    {name:"Lidl",source:"official-lidl-combined",success:"Julkaisujen käsittely valmistui; luku sisältää eri voimassaolojaksoja",failure:"Julkaisujen käsittely epäonnistui"},
    {name:"S-kauppojen yhteys",source:"s-kaupat-protocol",success:"Rajapinnan toimintatarkistus onnistui",failure:"Rajapinnan toimintatarkistus epäonnistui"},
  ].map(check=>{
    const run=d.runs.find(r=>r.source===check.source)??null;
    const ageH=run?(Date.now()-new Date(run.checked_at).getTime())/3600000:null;
    const warnAfterH=check.source==="official-lidl-combined"?30:check.source==="k-citymarket-cache"?24:8;
    const level=!run?"gray":!run.ok?"red":ageH!==null&&ageH>warnAfterH?"yellow":"green";
    const checkedDate=run?new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(run.checked_at)):null;
    const clock=run?new Intl.DateTimeFormat("fi-FI",{timeZone:"Europe/Helsinki",hour:"2-digit",minute:"2-digit"}).format(new Date(run.checked_at)):null;
    const date=run?new Intl.DateTimeFormat("fi-FI",{timeZone:"Europe/Helsinki",day:"numeric",month:"numeric",year:"numeric"}).format(new Date(run.checked_at)):null;
    const when=run?(checkedDate===todayFi?"tänään":date)+", klo "+clock:null;
    const result=!run?"Ei kirjattua tarkistusta 14 vrk aikana":(check.source==="s-kaupat-protocol"?(run.ok?"OK":"VIRHE"):run.offer_count+" tarjousta")+", "+when;
    const meaning=!run?"Seurannan tila ei ole tiedossa":(run.ok?check.success:check.failure)+(level==="yellow"?". Tarkistus on vanha; uutta tulosta odotetaan.":"");
    return {...check,run,level,result,meaning};
  });


  const trendRows=summaryChecks.map(check=>{
    const rows=d.history.filter(r=>r.source===check.source);
    const total=rows.reduce((n,r)=>n+r.total,0),succeeded=rows.reduce((n,r)=>n+r.succeeded,0);
    const previousTotal=rows.reduce((n,r)=>n+r.previous_total,0),previousSucceeded=rows.reduce((n,r)=>n+r.previous_succeeded,0);
    const enough=total>=5&&rows.some(r=>r.days>=3);
    const previousEnough=previousTotal>=5&&rows.some(r=>r.previous_days>=3);
    const rate=total?Math.round(succeeded/total*1000)/10:null;
    const change=enough&&previousEnough&&rate!==null?Math.round((rate-previousSucceeded/previousTotal*100)*10)/10:null;
    return {...check,total,succeeded,failures:total-succeeded,enough,rate,change};
  });
  const offerTrends=trendRows.filter(r=>r.source!=="s-kaupat-protocol");
  const totalChecks=offerTrends.reduce((n,r)=>n+r.total,0),totalSuccess=offerTrends.reduce((n,r)=>n+r.succeeded,0);
  const enoughOfferHistory=offerTrends.every(r=>r.enough);
  const offerRate=totalChecks?Math.round(totalSuccess/totalChecks*1000)/10:null;
  const discoveryRows=d.history.filter(r=>r.source==="future-publication-discovery");
  const discoveryTotal=discoveryRows.reduce((n,r)=>n+r.total,0),discoveryOk=discoveryRows.reduce((n,r)=>n+r.succeeded,0);
  const discoveryRate=discoveryTotal?Math.round(discoveryOk/discoveryTotal*1000)/10:null;
  const repeatedProblems=offerTrends.filter(r=>r.failures>=2);
  const weeklySummary=!totalChecks?"Tarjoushakujen tarkistushistoria puuttuu.":!enoughOfferHistory?"Seurantahistoriaa kertyy vielä. Alla näkyvät tähän mennessä kirjatut tarkistukset.":repeatedProblems.length?"Toistuvia epäonnistumisia on kirjattu: "+repeatedProblems.map(r=>r.name).join(", ")+". Katso nykyinen tila yllä olevasta taulukosta.":offerRate!==null&&offerRate>=95?"Nykyisten tarjousten tarkistukset ovat onnistuneet yleensä hyvin.":"Nykyisten tarjousten tarkistuksissa on ollut epäonnistumisia; katso kauppakohtaiset tulokset.";

  const states=cards.map(c=>state(c.runs));
  const hasCriticalQuality=quality.missingPrice>0;
  const hasQualityWarning=quality.missingImage>0||quality.missingCategory>0||overlappingApproved.length>0||rolloverWithoutNext.length>0||thinNext.length>0||nextCandidates.length>0||Boolean(eanPriceRisk);
  const overall=activeCandidates.length||currentFailures.length||hasCriticalQuality||rolloverGaps.length||unreadyExpiring.length||severeNextDrop.length||neverSuccessful.length||severeFailureStreaks.length||sourceCountCrashes.length||criticallySilentSources.length||states.some(x=>x[0]==="red")?["red","VAATII TOIMENPITEITÄ"]:states.some(x=>x[0]==="yellow"||x[0]==="gray")||futureDiscoveryErrors||futureDiscoveryMissing||futureDiscoveryStale||staleRuns.length||hasQualityWarning?["yellow","VAROITUKSIA / SEURANTA PUUTTUU"]:["green","KAIKKI SEURANNAT OK"];

  return <main style={{maxWidth:1500,margin:"0 auto",padding:28}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"end",marginBottom:22}}>
      <div><div style={{fontSize:12,letterSpacing:2,fontWeight:800,color:"#64748b"}}>ZIIPLY / INTERNAL</div>
      <h1 style={{margin:"5px 0",fontSize:36}}>Control Center</h1>
      <div style={{color:"#64748b"}}>Tarjousjulkaisut · automaatiot · EAN-pankki</div></div>
      <div style={{textAlign:"right"}}><div style={{fontSize:19,fontWeight:850}}>{dot(overall[0])} {overall[1]}</div><div style={{fontSize:11,color:"#667085",marginTop:5}}>Päivitetty {new Date().toLocaleString("fi-FI")}</div></div>
    </header>

    <nav aria-label="Control Center -näkymät" style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:20}}>{([{id:"overview",label:"Yleiskatsaus"},{id:"publications",label:"Tarjousten päivitykset"},{id:"data",label:"Tuotteet ja skanneri"}] as const).map(tab=><a key={tab.id} href={tab.id==="overview"?"/":"/?view="+tab.id} aria-current={view===tab.id?"page":undefined} style={{padding:"12px 18px",borderRadius:12,textDecoration:"none",fontWeight:800,background:view===tab.id?"#0f172a":"#fff",color:view===tab.id?"#fff":"#334155",border:"1px solid #cbd5e1"}}>{tab.label}</a>)}</nav>
    {d.error&&<div style={{background:"#fee4e2",border:"1px solid #fecdca",padding:16,borderRadius:12,marginBottom:16}}>🔴 {d.error}</div>}

    {view==="overview"&&<>
    <section style={{display:"grid",gridTemplateColumns:"minmax(0,1.45fr) minmax(320px,.55fr)",gap:14,marginBottom:18}}>
      <article style={{background:overall[0]==="red"?"#fff1f0":overall[0]==="yellow"?"#fff8e6":"#ecfdf3",border:overall[0]==="red"?"1px solid #fecdca":overall[0]==="yellow"?"1px solid #fedf89":"1px solid #abefc6",borderRadius:20,padding:22}}>
        <div style={{fontSize:12,fontWeight:900,letterSpacing:1.4,color:"#667085"}}>SYSTEM STATUS</div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginTop:8,flexWrap:"wrap"}}>
          <div style={{fontSize:30,fontWeight:950}}>{dot(overall[0])} {overall[1]}</div>
          <div style={{fontSize:12,color:"#667085"}}>{monitoredChains}/{CHAINS.length} ketjua valvonnassa · {latestBySource.length} lähdettä</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginTop:18}}>
          <div><div style={{fontSize:11,color:"#667085"}}>Lidlin aktiiviset tarjoukset julkaisuvarastossa</div><b style={{fontSize:22}}>{activeOfferTotal.toLocaleString("fi-FI")}</b></div>
          <div><div style={{fontSize:11,color:"#667085"}}>Avoimet lähdevirheet</div><b style={{fontSize:22}}>{currentFailures.length}</b></div>
          <div><div style={{fontSize:11,color:"#667085"}}>Mitä pitää tarkistaa seuraavaksi?</div><b style={{fontSize:22}}>{actionQueue.length}</b></div>
          <div><div style={{fontSize:11,color:"#667085"}}>Tuotteita viivakoodirekisterissä</div><b style={{fontSize:22}}>{d.ean?d.ean.total.toLocaleString("fi-FI"):"—"}</b></div>
        </div>
      </article>
      <article style={{background:"#0f172a",color:"#f8fafc",borderRadius:20,padding:22}}>
        <div style={{fontSize:12,fontWeight:900,letterSpacing:1.4,color:"#94a3b8"}}>NEXT ACTION</div>
        {actionQueue.length===0?<><div style={{fontSize:24,fontWeight:900,marginTop:10}}>Ei avoimia toimia</div><div style={{fontSize:13,color:"#cbd5e1",marginTop:8}}>Valvonta ei tällä hetkellä nosta julkaisuvaihdon tai parserin toimenpiteitä.</div></>:<><div style={{fontSize:24,fontWeight:900,marginTop:10}}>{dot(actionQueue[0].level)} {actionQueue[0].title}</div><div style={{fontSize:13,color:"#cbd5e1",marginTop:8,lineHeight:1.5}}>{actionQueue[0].detail}</div><div style={{fontSize:12,color:"#94a3b8",marginTop:14}}>{actionQueue.length>1?"+ "+(actionQueue.length-1)+" muuta jonossa":"Ainoa avoin toimenpide"}</div></>}
      </article>
    </section>

    <section style={{background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20,marginBottom:18}}>
      <h2 style={{marginTop:0}}>Viimeisimmät kirjatut tarkistukset</h2>
      <p style={{fontSize:13,color:"#64748b",marginTop:0}}>Tiedot luettu tietokannasta {new Date().toLocaleString("fi-FI")}. Kaikki kellonajat ovat Suomen aikaa.</p>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
        <thead><tr>{["Kohde","Tietokannan tulos","Mitä se käytännössä kertoo"].map(label=><th key={label} scope="col" style={{textAlign:"left",padding:"12px 10px",borderBottom:"2px solid #e2e8f0"}}>{label}</th>)}</tr></thead>
        <tbody>{summaryChecks.map(check=><tr key={check.source}>
          <th scope="row" style={{textAlign:"left",padding:"14px 10px",borderBottom:"1px solid #edf0f2",whiteSpace:"nowrap"}}>{dot(check.level)} {check.name}</th>
          <td style={{padding:"14px 10px",borderBottom:"1px solid #edf0f2"}}>{check.result}</td>
          <td style={{padding:"14px 10px",borderBottom:"1px solid #edf0f2",lineHeight:1.5}}>{check.meaning}</td>
        </tr>)}</tbody>
      </table></div>
      <p style={{fontSize:12,color:"#64748b",marginBottom:0,lineHeight:1.6}}>🟢 Tarkistus onnistui · 🟡 Tarkistus on vanha · 🔴 Tarkistus epäonnistui · ⚪ Seurantatieto puuttuu.<br/>Onnistunut tarkistus kertoo tiedonhaun tai käsittelyn onnistumisesta. Se ei yksin varmista jokaisen hinnan, kuvan tai tuoteryhmän oikeellisuutta. Tarjousmäärä on kyseisen tarkistuksen tulos, ei koko ketjun yhteismäärä.</p>
    </section>


    <section style={{background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20,marginBottom:18}}>
      <h2 style={{marginTop:0}}>Tilanne viimeisen 7 päivän aikana</h2>
      <p style={{lineHeight:1.6}}>{weeklySummary}</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:18}}>
        {statusCard("Nykyisten tarjousten tarkistukset",offerRate===null?"—":offerRate.toLocaleString("fi-FI")+" %",!enoughOfferHistory?"gray":offerRate!==null&&offerRate>=95?"green":"yellow",totalSuccess+" / "+totalChecks+" kirjattua tarkistusta onnistui. Osuus kuvaa tarkistuksia, ei hintojen oikeellisuutta.")}
        {statusCard("Epäonnistuneet tarjous­tarkistukset",totalChecks-totalSuccess,totalChecks===0?"gray":totalChecks>totalSuccess?"yellow":"green","Viimeisen 7 päivän aikana. Virhe on voinut korjaantua myöhemmässä tarkistuksessa.")}
        {statusCard("Tulevien lehtien etsinnät",discoveryRate===null?"—":discoveryRate.toLocaleString("fi-FI")+" %",discoveryTotal===0?"gray":discoveryOk===discoveryTotal?"green":"yellow",discoveryOk+" / "+discoveryTotal+" etsintää onnistui. Onnistunut etsintä voi myös todeta, ettei tulevaa lehteä vielä löydy.")}
      </div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
        <thead><tr>{["Kohde","Onnistuneet tarkistukset","Epäonnistumisia","Muutos edelliseen 7 päivään"].map(label=><th key={label} scope="col" style={{textAlign:"left",padding:10,borderBottom:"2px solid #e2e8f0"}}>{label}</th>)}</tr></thead>
        <tbody>{trendRows.map(row=><tr key={row.source}>
          <th scope="row" style={{textAlign:"left",padding:12,borderBottom:"1px solid #edf0f2"}}>{row.name}</th>
          <td style={{padding:12,borderBottom:"1px solid #edf0f2"}}>{row.rate===null?"Ei kirjattuja tarkistuksia":row.rate.toLocaleString("fi-FI")+" % · "+row.succeeded+" / "+row.total}{!row.enough&&row.total>0&&<div style={{fontSize:12,color:"#64748b"}}>Vielä vähän seurantatietoa</div>}</td>
          <td style={{padding:12,borderBottom:"1px solid #edf0f2"}}>{row.total?row.failures:"—"}</td>
          <td style={{padding:12,borderBottom:"1px solid #edf0f2"}}>{row.change===null?"Ei vielä riittävästi vertailutietoa":row.change===0?"Ennallaan":(row.change>0?"Parantunut +":"Heikentynyt ")+row.change.toLocaleString("fi-FI")+" prosenttiyksikköä"}</td>
        </tr>)}</tbody>
      </table></div>
      <p style={{fontSize:12,color:"#64748b",lineHeight:1.6,marginBottom:0}}>Luvut lasketaan kaikista viimeisen 7 × 24 tunnin kirjatuista tarkistuksista. S-kauppojen yhteystarkistus ja tulevien lehtien etsintä eivät kuulu tarjoushakujen yhteisprosenttiin. Viikkovertailuun vaaditaan molemmilta jaksoilta vähintään 5 tarkistusta vähintään 3 eri päivänä tietolähdettä kohti. Kirjaamatta jääneet tarkistukset eivät näy luvuissa.</p>
    </section>

    </>}
    {view==="publications"&&<><section style={{padding:18,background:"#eef6ff",border:"1px solid #cbdff5",borderRadius:14,marginBottom:18,fontSize:14,lineHeight:1.6}}><strong>Mitä tämä sivu kertoo?</strong><p style={{margin:"8px 0 0"}}>Näet, onnistuivatko automaattiset tarkistukset, puuttuuko tarjouksista tietoja ja onko seuraava tarjousjakso valmiina. Tulevan lehden etsintä on eri tarkistus kuin nykyisten tarjousten haku: etsinnän virhe ei yksin tarkoita, että nykyiset tarjoukset ovat väärin.</p></section><section style={{padding:18,background:"#eef6ff",border:"1px solid #cbdff5",borderRadius:14,marginBottom:18,fontSize:14,lineHeight:1.6}}><strong>Näin tulkitset tiedot</strong><p style={{margin:"8px 0 0"}}>Hyväksytty = järjestelmä on merkinnyt jakson hyväksytyksi. Odottaa hyväksyntää = tiedot on käsitelty, mutta hyväksyntä puuttuu. Tuoteryhmä tai kuva löytyy = kenttä on täytetty; sen sisällön oikeellisuutta ei tällä mittarilla tarkisteta. Määrän väheneminen voi johtua myös erikokoisista tarjousjaksoista. Julkaisuvaraston laatutiedot painottuvat tällä hetkellä Lidliin; ne eivät kata kaikkien kauppojen asiakasnäkymiä.</p></section>
    <section style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {statusCard("Tulevien lehtien tarkistukset onnistuneet",futureDiscoveryHealthy+" / "+futureDiscovery.length,futureDiscoveryErrors||futureDiscoveryMissing||futureDiscoveryStale?"yellow":"green","Onnistunut tarkistus viimeisen 8 päivän aikana")}
      {statusCard("Tulevia lehtiä löydetty",futureFound,futureFound?"green":"gray","Digitaalisesta lähteestä löytyneet tulevat jaksot")}
      {statusCard("Tarkistusta ei ole vielä kirjattu",futureDiscoveryMissing,futureDiscoveryMissing?"yellow":"green","Ketjut, joilta ensimmäinen tarkistus ei ole vielä kirjautunut")}
      {statusCard("Tulevan lehden etsintä epäonnistui",futureDiscoveryErrors,futureDiscoveryErrors?"yellow":"green","Ennakkotarkistus epäonnistui; ei tarkoita parseri- tai tarjousdatavirhettä")}
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Tulevien tarjouslehtien valvonta</h2>
      <div style={{marginBottom:12,fontSize:13}}>Ajastus: su-ilta, ke-ilta sekä ma/to-aamu. Puuttuva tuleva lehti on normaali tila. Todelliset alkupäivät kerätään hyväksytyistä parserijulkaisuista.</div>
      <div style={{padding:12,border:"1px solid #e5e7eb",borderRadius:10,marginBottom:12}}><strong>Poikkeavat julkaisupäivät / oppimishistoria: {unexpectedPublicationDays.length}</strong><div style={{fontSize:12,marginTop:5}}>Havaitut uudet viikonpäivät: {learnedWeekdays.length}. Havainnot eivät muuta ajastusta automaattisesti ennen vahvistusta.</div>{unexpectedPublicationDays.slice(0,15).map((p,i)=><div key={p.publication+"-"+i} style={{fontSize:12,marginTop:5}}>⚠️ {p.chain} · {p.validFrom} · {["su","ma","ti","ke","to","pe","la"][p.weekday]} · {p.publication}</div>)}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12}}>
        {futureDiscovery.map(x=>{const r=x.run;const level=!r?"gray":!r.ok?"red":r.outcome==="future-publication-found"?"green":"yellow";const label=!r?"Ei vielä ajoa":!r.ok?"Tarkistus epäonnistui":r.outcome==="future-publication-found"?"Tuleva lehti löydetty":"Ei vielä julkaistu digitaalisena";return <div key={x.chain} style={{border:"1px solid #e5e7eb",borderRadius:12,padding:14}}><div style={{fontWeight:900}}>{dot(level)} {x.chain}</div><div style={{fontSize:16,fontWeight:850,marginTop:8}}>{label}</div><div style={{fontSize:12,color:"#667085",marginTop:7}}>{r?"Viimeksi tarkistettu "+new Date(r.checked_at).toLocaleString("fi-FI",{timeZone:"Europe/Helsinki"}):"Ensimmäinen cron-ajo ei ole vielä kirjautunut"}</div><div style={{fontSize:12,color:"#667085",marginTop:4}}>{r?.outcome||"future-publication-discovery"}</div></div>})}
      </div>
      <div style={{fontSize:12,color:"#667085",marginTop:12}}>Digitaalisen lähteen puuttuminen ei ole virhe. Punainen tila tarkoittaa, että itse tarkistus epäonnistui. Löydetty tuleva julkaisu siirtyy erikseen parseroinnin ja julkaisuvaraston tarkastukseen.</div>
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {metricCard("Aktiiviset hyväksytyt julkaisut",activePubs.length,activePubs.length?"green":"yellow")}
      {metricCard("Lidlin aktiivisten julkaisujen tarjoukset",activeOfferTotal,activeOfferTotal?"green":"yellow")}
      {metricCard("Candidate / odottaa",candidatePubs.length,activeCandidates.length?"red":candidatePubs.length?"yellow":"green")}
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {statusCard("Voimassa, mutta hyväksyntä puuttuu",activeCandidates.length,activeCandidates.length?"red":"green",activeCandidates.length?"Voimassa oleva julkaisu odottaa hyväksyntää":"Ei voimassa olevia hyväksyntää odottavia jaksoja")}
      {statusCard("Tarjousjaksoja päättyy tänään",expiringToday.length,expiringToday.length?"yellow":"green",expiringToday.length?"Tarkista seuraavan julkaisun valmius":"Ei tänään päättyviä hyväksyttyjä julkaisuja")}
      {statusCard("Vanhentuneet ajot",staleRuns.length,staleRuns.length?"yellow":"green","Raja 36 h / vain lähteen viimeisin ajo")}
      {statusCard("Viimeisin toimintatarkistus",latestRun?new Date(latestRun.checked_at).toLocaleString("fi-FI",{timeZone:"Europe/Helsinki"}):"—",latestRun?.ok?"green":"yellow",latestRun?explainSource(latestRun.source):"Ei ajohistoriaa")}
      {statusCard("Seuraava hyväksytty jakso",nextApproved?nextApproved.valid_from:"—",nextApproved?"green":"gray",nextApproved?nextApproved.chain+" · "+nextApproved.publication_id:"Seuraavaa hyväksyttyä jaksoa ei löydy tallennetuista tiedoista")}
      {statusCard("Päättyy ≤36 h ilman seuraajaa",unreadyExpiring.length,unreadyExpiring.length?"red":"green",unreadyExpiring.length?"Julkaisuvaihto ei ole valmis":"Ei välitöntä vaihtoriskiä")}
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {statusCard("Hinta puuttuu",quality.missingPrice,quality.missingPrice?"red":"green","Voimassa olevat hyväksytyt tarjousjaksot")}
      {statusCard("Kuva puuttuu",quality.missingImage,quality.missingImage?"yellow":"green","Voimassa olevat hyväksytyt tarjousjaksot")}
      {statusCard("Tuoteryhmä puuttuu",quality.missingCategory,quality.missingCategory?"yellow":"green","Voimassa olevat hyväksytyt tarjousjaksot")}
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {statusCard("Valmiit vaihdot",healthyNext.length,healthyNext.length?"green":"gray","Seuraava hyväksytty jakso ilman katkosta tai suurta määräpudotusta")}
      {statusCard("Vakava määräpudotus",severeNextDrop.length,severeNextDrop.length?"red":"green","Seuraavan hyväksytyn jakson tarjousmäärä on alle neljäsosa nykyisestä")}
      {statusCard("Vaihtoriski ≤36 h",unreadyExpiring.length,unreadyExpiring.length?"red":"green","Päättyvä jakso ilman hyväksyttyä seuraajaa")}
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Heikkenikö seuraavan jakson tarjousdata?</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12,marginBottom:12}}>
        {statusCard("Suuri muutos tarjousdatassa",parserRegressionRed,parserRegressionRed?"red":"green","Määrä tai datan laatu heikkeni voimakkaasti")}
        {statusCard("Tarkistettava muutos tarjousdatassa",parserRegressionYellow,parserRegressionYellow?"yellow":"green","Seuraava julkaisu on nykyistä heikompi")}
      </div>
      <div style={{display:"grid",gap:8}}>{parserRegressions.map(x=><div key={x.key} style={{display:"grid",gridTemplateColumns:"24px minmax(180px,280px) 1fr",gap:10,padding:"10px 12px",border:"1px solid #e5e7eb",borderRadius:10}}>
        <div>{dot(x.level)}</div><div style={{fontWeight:900}}>{x.name}</div><div>{!x.current||!x.next?"Ei vielä vertailukelpoista seuraavaa julkaisua":x.signals.length?x.signals.join(" · "):"Ei havaittua regressiota"}</div>
      </div>)}</div>
      <div style={{fontSize:12,color:"#667085",marginTop:10}}>Varoitus syntyy, kun tarjousmäärä putoaa vähintään 25 % tai jokin puute kasvaa vähintään 5 %-yks. Vakava hälytys syntyy ≥40 % määräromahduksesta tai ≥15 %-yks. laatupuutteen kasvusta.</div>
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Nykyisen ja seuraavan tarjousjakson vertailu</h2>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr>{["Tila","Ketju","Nykyinen / seuraava","Hinta puuttuu","Kuva puuttuu","Tuoteryhmä puuttuu"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead>
        <tbody>{publicationQuality.map(x=>{const pair=(a:number|null,b:number|null)=>a===null?"—":a+" % → "+(b===null?"—":b+" %");return <tr key={x.key}>
          <td style={{padding:8}}>{dot(x.level)}</td><td style={{padding:8,fontWeight:900}}>{x.name}</td>
          <td style={{padding:8}}>{x.current?x.current.offer_count:"—"} → {x.next?x.next.offer_count:"—"}{x.next&&<div style={{fontSize:11,color:"#667085"}}>{x.next.approval_state} · {x.next.valid_from}–{x.next.valid_until}</div>}</td>
          <td style={{padding:8}}>{pair(x.priceNow,x.priceNext)}</td><td style={{padding:8}}>{pair(x.imageNow,x.imageNext)}</td><td style={{padding:8}}>{pair(x.categoryNow,x.categoryNext)}</td>
        </tr>})}</tbody>
      </table></div>
      <div style={{fontSize:12,color:"#667085",marginTop:10}}>Prosentit suhteutetaan julkaisun tarjousmäärään. Punainen, jos seuraavan julkaisun yhdistetty puutedata heikkenee yli 15 prosenttiyksikköä; keltainen yli 5 prosenttiyksikköä. Harmaa tarkoittaa, ettei seuraavaa julkaisua vielä ole vertailtavana.</div>
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Viimeisten tarkistusten tulokset ketjuittain</h2>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr>{["Tila","Ketju","Viimeisin onnistunut","Muutos","Virheitä / 6 ajoa","Viimeiset ajot"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead>
        <tbody>{chainHistory.map(x=><tr key={x.key}>
          <td style={{padding:8}}>{dot(x.level)}</td><td style={{padding:8,fontWeight:900}}>{x.name}</td>
          <td style={{padding:8}}>{x.newest?x.newest.offer_count+" · "+new Date(x.newest.checked_at).toLocaleString("fi-FI",{timeZone:"Europe/Helsinki"}):"—"}</td>
          <td style={{padding:8,fontWeight:800}}>{x.delta===null?"—":(x.delta>0?"+":"")+x.delta+" %"}</td>
          <td style={{padding:8}}>{x.failures} / {x.rows.length}</td>
          <td style={{padding:8}}><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{x.rows.length?x.rows.map((r,i)=><span key={i} title={r.source+" · "+r.outcome+" · "+new Date(r.checked_at).toLocaleString("fi-FI",{timeZone:"Europe/Helsinki"})} style={{padding:"3px 6px",borderRadius:7,background:r.ok?"#ecfdf3":"#fef2f2",fontWeight:800}}>{r.ok?"✓":"✕"} {r.offer_count}</span>):"Ei ajoja"}</div></td>
        </tr>)}</tbody>
      </table></div>
      <div style={{fontSize:12,color:"#667085",marginTop:10}}>Tarjousmäärän trendistä on rajattu pois future-discovery ja protokollaprobet, jotta nollatulokset eivät vääristä varsinaisen parserin kehitystä. Muutos vertaa kahta viimeisintä onnistunutta ajoa.</div>
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Mitä pitää tarkistaa seuraavaksi?</h2>
      {actionQueue.length===0?<div style={{padding:14,borderRadius:12,background:"#ecfdf3",fontWeight:800}}>🟢 Ei avoimia julkaisuvaihdon toimenpiteitä.</div>:
      <div style={{display:"grid",gap:8}}>{actionQueue.slice(0,12).map((a,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"34px minmax(160px,240px) 1fr",gap:10,alignItems:"center",padding:"10px 12px",border:"1px solid #e5e7eb",borderRadius:10}}>
        <div style={{fontWeight:900,fontSize:16}}>{i+1}</div><div style={{fontWeight:900}}>{dot(a.level)} {a.title}</div><div>{a.detail}</div>
      </div>)}</div>}
      <div style={{fontSize:12,color:"#667085",marginTop:10}}>Punaiset vaihtoriskit ja discovery-virheet nousevat ensin; niiden jälkeen tulevat 48 h varoitukset ja vielä käynnistymättömät future-discoveryt.</div>
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Ovatko tarjoukset valmiina nykyisen jakson päättyessä?</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12,marginBottom:12}}>
        {statusCard("Kriittinen ≤24 h",urgentRollover,urgentRollover?"red":"green","Seuraava hyväksytty jakso tai nykyinen jakso puuttuu")}
        {statusCard("Varoitus ≤48 h",warningRollover,warningRollover?"yellow":"green","Seuraava hyväksytty jakso ei vielä ole valmiina")}
      </div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr>{["Tila","Ketju","Aikaa jäljellä","Seuraajan vaihe / syy"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead>
        <tbody>{rolloverRisk.map(x=><tr key={x.key}><td style={{padding:8}}>{dot(x.risk)}</td><td style={{padding:8,fontWeight:800}}>{x.name}</td><td style={{padding:8}}>{x.hoursLeft===null?"—":x.hoursLeft+" h"}</td><td style={{padding:8}}>{x.reason}</td></tr>)}</tbody>
      </table></div>
      <div style={{fontSize:12,color:"#667085",marginTop:10}}>Punainen: enintään 24 h jäljellä ilman valmista seuraajaa. Keltainen: enintään 48 h. Vihreä: seuraava approved on valmiina tai vaihtoon on enemmän aikaa.</div>
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Mihin vaiheeseen seuraavan tarjousjakson käsittely on edennyt?</h2>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr>{["Tila","Ketju","Nykyinen hyväksytty jakso","Tulevan lehden etsintä","Odottaa hyväksyntää","Seuraava hyväksytty jakso"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead>
        <tbody>{publicationPipeline.map(x=>{const candidate=x.future?.approval_state==="candidate"?x.future:null;const approved=x.future?.approval_state==="approved"?x.future:null;return <tr key={x.key}>
          <td style={{padding:8}}>{dot(x.level)}</td>
          <td style={{padding:8,fontWeight:800}}>{x.name}</td>
          <td style={{padding:8}}>{x.current?x.current.valid_from+"–"+x.current.valid_until+" · "+x.current.publication_id+" · "+x.current.offer_count+" tarjousta":"—"}</td>
          <td style={{padding:8}}>{!x.discoveryApplicable?"Ei erillistä future-probea":!x.discovery?"Ei vielä ajoa":!x.discovery.ok?"🔴 Virhe":x.discoveryFound?"🟢 Löydetty":"🟡 Ei vielä digijulkaisua"}{x.discovery&&<div style={{fontSize:11,color:"#667085"}}>{new Date(x.discovery.checked_at).toLocaleString("fi-FI",{timeZone:"Europe/Helsinki"})}</div>}</td>
          <td style={{padding:8}}>{candidate?"🟡 "+candidate.valid_from+"–"+candidate.valid_until+" · "+candidate.offer_count:"—"}</td>
          <td style={{padding:8}}>{approved?"🟢 "+approved.valid_from+"–"+approved.valid_until+" · "+approved.offer_count:"—"}</td>
        </tr>})}</tbody>
      </table></div>
      <div style={{fontSize:12,color:"#667085",marginTop:10}}>Putki näyttää yhdellä rivillä, onko nykyinen julkaisu kunnossa ja kuinka pitkälle seuraava julkaisu on edennyt. Future discovery on tällä hetkellä erillisenä K-ryhmälle ja Tokmanni/SPARille.</div>
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Julkaisuvaihdon valmius</h2>
      {rolloverChains.length===0?<div style={{color:"#667085"}}>Ei julkaisuvaraston ketjuja.</div>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{["Tila","Ketju","Nykyinen päättyy","Seuraava alkaa","Seuraavan tila","Seuraavan määrä"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead><tbody>{rolloverChains.map(r=><tr key={r.chain}><td style={{padding:8}}>{dot(r.level)}</td><td style={{padding:8,fontWeight:800}}>{r.chain}</td><td style={{padding:8}}>{r.current?.valid_until||"Ei voimassa olevaa hyväksyttyä jaksoa"}</td><td style={{padding:8}}>{r.future?.valid_from||"—"}</td><td style={{padding:8}}>{r.future?explainApproval(r.future.approval_state):"—"}{r.gap?" · KATKOS":""}</td><td style={{padding:8,fontWeight:800}}>{r.future?.offer_count??"—"}{r.current&&r.future&&r.future.offer_count<Math.max(3,Math.floor(r.current.offer_count*.5))?" ⚠️":""}</td></tr>)}</tbody></table></div>}
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Puuttuvat tiedot voimassa olevista tarjouksista</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12,marginBottom:16}}>{chainHealth.map(x=><div key={x.chain} style={{border:"1px solid #e5e7eb",borderRadius:12,padding:14}}><div style={{fontWeight:900}}>{dot(x.level)} {x.chain}</div><div style={{fontSize:25,fontWeight:900,marginTop:7}}>{x.offers.toLocaleString("fi-FI")}</div><div style={{fontSize:11,color:"#667085"}}>aktiivista tarjousta</div><div style={{fontSize:12,marginTop:8}}>Hinta {x.missingPrice?"🔴 "+x.missingPrice:"🟢"} · Kuva {x.missingImage?"🟡 "+x.missingImage:"🟢"} · Tuoteryhmä {x.missingCategory?"🟡 "+x.missingCategory:"🟢"}</div><div style={{fontSize:11,color:"#667085",marginTop:6}}>Seurattuja lähteitä {x.runs} · {x.stale?"vanhentunut / puuttuu":"tuore"}</div></div>)}</div>
      {chainQuality.length===0?<div style={{color:"#667085"}}>Ei aktiivisia julkaisuja julkaisuvarastossa.</div>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{["Ketju","Julkaisuja","Tarjouksia","Hinta puuttuu","Kuva puuttuu","Tuoteryhmä puuttuu","Tila"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead><tbody>{chainQuality.map(q=>{const level=q.missingPrice?"red":q.missingImage||q.missingCategory?"yellow":"green";return <tr key={q.chain}><td style={{padding:8,fontWeight:800}}>{q.chain}</td><td style={{padding:8}}>{q.publications}</td><td style={{padding:8,fontWeight:800}}>{q.offers}</td><td style={{padding:8}}>{q.missingPrice}</td><td style={{padding:8}}>{q.missingImage}</td><td style={{padding:8}}>{q.missingCategory}</td><td style={{padding:8}}>{dot(level)} {level==="green"?"OK":level==="red"?"HINTAVIRHE":"PUUTTEITA"}</td></tr>})}</tbody></table></div>}
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {statusCard("Avoimia virheitä 24 h",unresolvedFailures24h.length,unresolvedFailures24h.length?"red":"green",unresolvedFailures24h.length?"Viimeisin ajo on yhä virheellinen":"Ei avoimia tuoreita automaatiovirheitä")}
      {statusCard("Jo korjaantuneet virheet 24 h",recoveredFailures24h.length,recoveredFailures24h.length?"yellow":"green",recoveredFailures24h.length?"Virhe on jo korjaantunut uudemmassa ajossa":"Ei palautuneita virheitä 24 h")}
      {statusCard("Korjaantuneet virheet tarkastelujaksolla",recoveredFailures.length,recoveredFailures.length?"yellow":"green",recoveredFailures.length?"Uudempi onnistunut ajo löytyy samalle lähteelle":"Ei palautumishistoriaa")}
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Milloin ketjujen tiedot viimeksi tarkistettiin?</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>{chainRunSummary.map(x=><div key={x.chain} style={{border:"1px solid #e5e7eb",borderRadius:12,padding:14}}><div style={{fontWeight:900,fontSize:18}}>{dot(x.level)} {x.chain}</div><div style={{fontSize:13,marginTop:8}}>Viimeisin ajo: <b>{x.ageH===null?"—":x.ageH.toFixed(1)+" h sitten"}</b></div><div style={{fontSize:13,marginTop:4}}>Viimeisin OK: <b>{x.okAgeH===null?"Ei kirjattua onnistumista":x.okAgeH.toFixed(1)+" h sitten"}</b></div><div style={{fontSize:12,color:"#667085",marginTop:6}}>{x.latest?explainSource(x.latest.source):"Tarkistushistoria puuttuu"}</div></div>)}</div>
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Automaattiset tarkistukset tietolähteittäin</h2>
      {sourceHealth.length===0?<div style={{color:"#667085"}}>Ei health-lähteitä 14 vrk ajalta.</div>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{["Tila","Ketju","Lähde","Viimeisin ajo","Ikä","Tarjouksia","Muutos","5 viimeistä","Peräkkäisiä epäonnistumisia","Tarkistuksen selitys"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead><tbody>{sourceHealth.map(r=><tr key={r.chain+"::"+r.source}><td style={{padding:8}}>{dot(r.level)}</td><td style={{padding:8,fontWeight:800}}>{r.chain}</td><td style={{padding:8}}>{explainSource(r.source)}</td><td style={{padding:8}}>{new Date(r.checked_at).toLocaleString("fi-FI",{timeZone:"Europe/Helsinki"})}</td><td style={{padding:8}}>{r.ageH.toLocaleString("fi-FI")} h</td><td style={{padding:8,fontWeight:800}}>{["s-kaupat-protocol","future-publication-discovery"].includes(r.source)?"Yhteys- tai etsintätarkistus":r.offer_count}</td><td style={{padding:8}}>{["s-kaupat-protocol","future-publication-discovery"].includes(r.source)?"—":r.delta===null?"—":(r.delta>0?"+":"")+r.delta.toLocaleString("fi-FI")+" %"}</td><td style={{padding:8,whiteSpace:"nowrap"}}>{r.history.map((h,i)=><span key={i} title={new Date(h.checked_at).toLocaleString("fi-FI",{timeZone:"Europe/Helsinki"})+" · "+h.outcome}>{h.ok?"🟢":"🔴"}</span>)}</td><td style={{padding:8,fontWeight:r.streak?800:400}}>{r.streak||"—"}</td><td style={{padding:8}}>{explainOutcome(r.outcome)}</td></tr>)}</tbody></table></div>}
    </section>

    <section style={{marginBottom:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Huomiota vaativat</h2>
      {attention.length===0?<div style={{padding:12,background:"#ecfdf3",borderRadius:10}}>🟢 Ei tällä hetkellä kirjattuja kriittisiä huomioita.</div>:attention.slice(0,20).map((a,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"28px 1fr",padding:"10px 0",borderBottom:"1px solid #edf0f2"}}><div>{dot(a.level)}</div><div><b>{a.title}</b><div style={{fontSize:12,color:"#667085",marginTop:3}}>{a.detail}</div></div></div>)}
    </section>

    <section style={{marginTop:18,marginBottom:12}}><div style={{fontSize:12,fontWeight:900,letterSpacing:1.4,color:"#667085"}}>MITTARIEN TARKEMMAT TIEDOT</div></section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14,marginBottom:18}}>
      {statusCard("Ketjuvalvonnan kattavuus",monitoredChains+" / "+CHAINS.length,monitoredChains===CHAINS.length?"green":"yellow",missingMonitoring.length?"Puuttuu: "+missingMonitoring.map(c=>c.name).join(", "):"Kaikilta ketjuilta löytyy kirjattuja tarkistuksia")}
      {statusCard("Seurattuja tietolähteitä",latestBySource.length,latestBySource.length?"green":"yellow","Erilliset ketjun ja tietolähteen tarkistukset tallennetussa historiassa")}
      {statusCard("Avoimet lähdevirheet",currentFailures.length,currentFailures.length?"red":"green",currentFailures.length?"Lähteen viimeisin ajo epäonnistunut":"Kaikkien kirjattujen lähteiden viimeisin ajo OK")}
      {statusCard("Lidl-hinnallisten osuus koko tuoterekisteristä",eanPriceCoverage+" %",eanPriceCoverage<50?"yellow":"green",eanFreshCoverage+" % EAN-pankista tuoreella hinnalla")}
      {statusCard("Lidl EAN-hintojen tuoreus",d.ean?d.ean.lidl_fresh_prices:0,eanPriceRisk?"yellow":"green",d.ean?d.ean.lidl_stale_prices+" vanhentunutta hintariviä":"Ei EAN-dataa")}
      {statusCard("Lidl hintojen varmennus",eanVerifiedCoverage+" %",eanVerifiedCoverage<10?"yellow":"green",d.ean?d.ean.lidl_verified_prices+" hintariviä kassavarmennettu":"Ei varmennettuja hintoja")}
      {statusCard("Vanhentuneiden osuus",eanStaleRatio+" %",eanStaleRatio>50?"red":eanStaleRatio>25?"yellow":"green","Lidl EAN-hintariveistä")}
      {statusCard("Tuotetietoja päivitetty 24 h",d.ean?d.ean.seen_24h:0,d.ean&&d.ean.seen_24h>0?"green":"yellow","Tuotteet, joiden last_seen_at päivittyi 24 tunnissa. Mukana voi olla myös automaattisia päivityksiä.")}
      {statusCard("Koko rekisterin tuotteita ilman Lidl-hintaa",eanUnpricedRatio+" %",eanUnpricedRatio>50?"yellow":"green",eanUnpriced+" EANia ilman Lidl-hintariviä")}
      {statusCard("Kuinka monella tuotteella on kuva?",eanImageCoverage+" %",eanImageCoverage<75?"yellow":"green",d.ean?d.ean.missing_image+" EANia ilman kuvaa":"Ei EAN-dataa")}
      {statusCard("Kuinka monella tuotteella on tuoteryhmä?",eanCategoryCoverage+" %",eanCategoryCoverage<75?"yellow":"green",d.ean?d.ean.missing_category+" EANia ilman kategoriaa":"Ei EAN-dataa")}
      {statusCard("Tuotedatan laskennallinen pisteytys",eanDataHealth+"/4",eanHealthState,"Hinta · tuoreus · kuva · kategoria, tavoite ≥75 %")}
      {statusCard("Seurannan laskennallinen pisteytys",overallDataHealth+"/7",overallDataHealthState,"EAN 4/4 + aktiiviset hinnat + automaatiot + julkaisuvaihdot")}
      {statusCard("Skannerin onnistumisaste 24 h",scannerTotal24h?scannerSuccessRate24h+" %":"—",scannerVolumeState,scannerTotal24h?scannerSuccess24h+" / "+scannerTotal24h+" kirjattua skannausta onnistui":"Ei kirjattuja skannauksia 24 h")}
    </section>


    </>}
    {view==="data"&&<><section style={{padding:18,background:"#eef6ff",border:"1px solid #cbdff5",borderRadius:14,marginBottom:18,fontSize:14,lineHeight:1.6}}><strong>Mitä tämä sivu kertoo?</strong><p style={{margin:"8px 0 0"}}>Vasemmalla näkyy automaattisten tarkistusten historia. Oikealla näkyy viivakoodilla tunnistettavien tuotteiden rekisteri, erilliset Lidl-hintatiedot ja skanneriin kirjautuneet tapahtumat. Tuoterekisteri ei ole kaupan varastosaldo.</p></section><section style={{padding:18,background:"#eef6ff",border:"1px solid #cbdff5",borderRadius:14,marginBottom:18,fontSize:14,lineHeight:1.6}}><strong>Mitä luvuista voi päätellä?</strong><p style={{margin:"8px 0 0"}}>Tuore hinta = järjestelmään tallennettu voimassaoloaika ei ole päättynyt; se ei tarkoita kassalla varmennettua hintaa. Kassalla varmennettu = hintarivin varmennusmerkintä on asetettu. Skanneriluvut kuvaavat vain kirjattuja tapahtumia. Jos tapahtumaloki ei ole käytettävissä, nollat eivät todista ettei skanneria käytetty. Lidl-hintojen osuus koko tuoterekisteristä ei mittaa Lidlin valikoiman kattavuutta.</p></section>
    <section style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:18}}>
      <article style={{background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
        <h2 style={{marginTop:0}}>Tarkistusten tapahtumahistoria</h2>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr>{["Aika","Ketju","Lähde","Tulos","Määrä","Tarkistuksen selitys"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead>
          <tbody>{d.runs.slice(0,80).map((r,i)=><tr key={i}>
            <td style={{padding:8}}>{new Date(r.checked_at).toLocaleString("fi-FI",{timeZone:"Europe/Helsinki"})}</td><td style={{padding:8,fontWeight:700}}>{r.chain}</td><td style={{padding:8}}>{explainSource(r.source)}</td>
            <td style={{padding:8}}>{r.ok?"🟢":"🔴"}</td><td style={{padding:8,fontWeight:800}}>{["s-kaupat-protocol","future-publication-discovery"].includes(r.source)?"Yhteys- tai etsintätarkistus":r.offer_count}</td><td style={{padding:8}}>{explainOutcome(r.outcome)}</td>
          </tr>)}</tbody>
        </table></div>
      </article>

      <article style={{background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
        <h2 style={{marginTop:0}}>Tuoterekisteri ja viivakoodiskanneri</h2>
        {d.ean?<>{metric("Tuotteita viivakoodirekisterissä",d.ean.total)}{metric("Kuvalliset",d.ean.with_image)}{metric("Tuoteryhmä tunnistettu",d.ean.classified)}{metric("Tuotetietoa päivitetty 24 h",d.ean.seen_24h)}<div style={{marginTop:14,fontSize:12,color:"#667085"}}>Lidl-hinnat</div>{metric("Lidl EAN-hintarivejä",d.ean.lidl_price_rows)}{metric("EANeja hinnoilla",d.ean.lidl_price_eans)}{metric("Tuoreita hintoja",d.ean.lidl_fresh_prices)}{metric("Varmistettu kassalla",d.ean.lidl_verified_prices)}{metric("Vanhentuneita hintoja",d.ean.lidl_stale_prices)}<div style={{marginTop:14,fontSize:12,color:"#667085"}}>Kattavuus</div>{coverage("Kuvat",d.ean.with_image,d.ean.total)}{coverage("Luokittelu",d.ean.classified,d.ean.total)}<div style={{marginTop:14}}>{metric("Kuva puuttuu",d.ean.missing_image)}{metric("Luokka puuttuu",d.ean.missing_category)}{metric("Tuotetietoa ei päivitetty 30 vrk",d.ean.stale_30d)}<div style={{marginTop:14,fontSize:12,color:"#667085"}}>Skanneri 24 h</div>{metric("Skannauksia",d.scan.events_24h)}{metric("Tuotetta ei saatu tunnistettua",d.scan.unresolved_24h)}{metric("Tuntematon viivakoodi",d.scan.unknown_24h)}{metric("Ilman hintaa",d.scan.no_price_24h)}{metric("Tuote yhdistyi väärään ketjuun",d.scan.chain_mismatch_24h)}{metric("Ongelmat yhteensä",scannerProblem24h)}{metric("Ongelmaosuus %",scannerProblemRate24h)}{metric("Onnistuneet",scannerSuccess24h)}{metric("Onnistumisaste %",scannerSuccessRate24h)}</div></>:<div>Ei EAN-dataa.</div>}
        <div style={{marginTop:18,padding:12,background:scannerVolumeState==="red"?"#fee4e2":scannerVolumeState==="yellow"?"#fff8e6":"#ecfdf3",borderRadius:10,fontSize:13}}><b>{dot(scannerVolumeState)} {scannerSummary}</b><div style={{marginTop:4,color:"#667085"}}>{scanRisk?"Selvitettäviä, tuntemattomia tai väärän ketjun tapauksia havaittu.":scanNoPriceRisk?"Tuotteita lisätty ilman hintaa.":scannerTotal24h===0?"Skanneriloki ei ole saanut tapahtumia viimeisen 24 tunnin aikana.":"Ei kirjattuja skanneriongelmia."}</div></div>
      </article>
    </section>

    </>}
    {view==="publications"&&<>
    <section style={{marginTop:18,background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:20}}>
      <h2 style={{marginTop:0}}>Tallennetut tarjousjaksot ja niiden voimassaolo</h2>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr>{["Ketju","Julkaisu","Tila","Voimassa","Määrä","Laatu","Käsitelty"].map(x=><th key={x} style={{textAlign:"left",padding:8,borderBottom:"1px solid #e5e7eb"}}>{x}</th>)}</tr></thead>
        <tbody>{d.pubs.slice(0,60).map((p,i)=><tr key={i}>
          <td style={{padding:8,fontWeight:700}}>{p.chain}</td><td style={{padding:8}}>{p.publication_id}</td>
          <td style={{padding:8}}>{p.approval_state==="approved"?"🟢":p.approval_state==="candidate"?"🟡":"⚪"} {explainApproval(p.approval_state)}</td>
          <td style={{padding:8}}>{p.valid_from} – {p.valid_until}</td><td style={{padding:8,fontWeight:800}}>{p.offer_count}</td>
          <td style={{padding:8}}>{p.missing_price?"🔴 "+p.missing_price+" hinta":p.missing_image||p.missing_category?"🟡 "+p.missing_image+" kuva / "+p.missing_category+" kat.":"🟢 OK"}</td>
          <td style={{padding:8}}>{new Date(p.parsed_at).toLocaleString("fi-FI",{timeZone:"Europe/Helsinki"})}</td>
        </tr>)}</tbody>
      </table></div>
    </section>

    </>}
    <section style={{marginTop:18,padding:16,background:"#eef6ff",borderRadius:12,fontSize:13,color:"#334155"}}>
      <b>Erillinen sovellus.</b> Control Center näyttää tietokantaan kirjatut tarkistukset, tarjousjaksot ja viivakoodilla tunnistettavat tuotteet. Se ei muuta Ziiplyn asiakassovelluksen käyttöliittymää eikä hyväksy julkaisuja automaattisesti.
    </section>
  </main>
}
function statusCard(label:string,value:number|string,state:string,note:string){return <article style={{background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:18}}><div style={{fontSize:13,color:"#667085"}}>{dot(state)} {label}</div><div style={{fontSize:24,fontWeight:900,marginTop:8}}>{typeof value==="number"?value.toLocaleString("fi-FI"):value}</div><div style={{fontSize:11,color:"#667085",marginTop:6}}>{note}</div></article>}
function coverage(label:string,value:number,total:number){const pct=total?Math.round(value/total*1000)/10:0;return <div style={{marginTop:8}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span>{label}</span><b>{pct.toLocaleString("fi-FI")} %</b></div><div style={{height:7,background:"#edf0f2",borderRadius:99,overflow:"hidden",marginTop:5}}><div style={{height:"100%",width:`${Math.min(100,pct)}%`,background:pct>=95?"#12b76a":pct>=75?"#f79009":"#f04438"}}/></div></div>}
function metricCard(label:string,value:number,state:string){return <article style={{background:"#fff",border:"1px solid #dbe2e8",borderRadius:16,padding:18}}><div style={{fontSize:13,color:"#667085"}}>{dot(state)} {label}</div><div style={{fontSize:30,fontWeight:900,marginTop:8}}>{value.toLocaleString("fi-FI")}</div></article>}
function metric(label:string,value:number){return <div style={{display:"flex",justifyContent:"space-between",padding:"11px 0",borderBottom:"1px solid #edf0f2"}}><span>{label}</span><b>{value.toLocaleString("fi-FI")}</b></div>}
function explainApproval(value:string){return ({approved:"Hyväksytty",candidate:"Odottaa hyväksyntää","image-verified":"Kuvasta tarkistettu aineisto"} as Record<string,string>)[value]??"Muu tila: "+value}
function explainSource(value:string){return ({"s-prisma-hyvinkaa":"Prisma Hyvinkään tarjoushaku","k-citymarket-cache":"Citymarketin tarjousvälimuisti","k-supermarket-jokela":"K-Supermarket Jokelan tarjoushaku","k-market-hakalantori":"K-Market Hakalantorin tarjoushaku","eurospar-validated-feed":"Eurosparin validoitu tarjousaineisto","official-lidl-combined":"Lidlin virallisten tarjousjaksojen käsittely","s-kaupat-protocol":"S-kauppojen rajapinnan yhteystarkistus","future-publication-discovery":"Tulevan tarjouslehden etsintä"} as Record<string,string>)[value]??value}
function explainOutcome(value:string){return ({"active-cache-ok":"Nykyisen tarjousvälimuistin tarkistus onnistui","parser-health-ok":"Tarjousaineiston käsittely onnistui","validated-feed-ok":"Validoidun tarjousaineiston tarkistus onnistui","candidate-staging-completed":"Tarjousjaksojen käsittely valmistui","protocol-verified":"Rajapinnan yhteystarkistus onnistui","future-discovery-http-error":"Tulevan lehden etsintä epäonnistui verkkopyynnön virheeseen","future-publication-not-yet-found":"Tulevaa lehteä ei vielä löytynyt","future-publication-found":"Tuleva tarjouslehti löytyi"} as Record<string,string>)[value]??"Tekninen tulos: "+value}

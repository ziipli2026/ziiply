export type PreflightRun={checked_at:string;source:string;ok:boolean;offer_count:number;outcome:string;details:Record<string,unknown>};
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"?v as Record<string,unknown>:{};

/** Last Sunday/Wednesday 15:00 publication window in Finnish local time, including DST/year rollover. */
export function expectedCitymarketPreflight(now=new Date(),kindFilter?:"AV"|"LV"){
  const parts=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"}).formatToParts(now);
  const part=(type:string)=>parts.find(p=>p.type===type)?.value??"";
  const date=new Date(`${part("year")}-${part("month")}-${part("day")}T12:00:00Z`);
  const today=date.getUTCDay();
  let days=0;
  while(!(kindFilter?[kindFilter==="AV"?0:3]:[0,3]).includes(date.getUTCDay())||(days===0&&Number(part("hour"))<15)){
    date.setUTCDate(date.getUTCDate()-1);days++;
  }
  const previewDate=date.toISOString().slice(0,10);
  const helsinkiHour=Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Helsinki",hour:"2-digit",hourCycle:"h23"}).format(date));
  const expectedAt=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),15-(helsinkiHour-12))).toISOString();
  const kind=date.getUTCDay()===3?"LV":"AV";
  date.setUTCDate(date.getUTCDate()+1);
  const start=date.toISOString().slice(0,10);
  const thursday=new Date(date);thursday.setUTCDate(date.getUTCDate()+4-(date.getUTCDay()||7));
  const yearStart=new Date(Date.UTC(thursday.getUTCFullYear(),0,1,12));
  const week=Math.ceil(((thursday.getTime()-yearStart.getTime())/86400000+1)/7);
  return {kind,previewDate,expectedAt,dayLabel:kind==="AV"?"SU – alkuviikon lehti":"KE – loppuviikon lehti",period:`${start}-W${week}-${kind}`,issue:`${week}${kind}`,start,windowToday:days===0&&[0,3].includes(today)};
}

export function citymarketPreflightStatus(runs:PreflightRun[],now=new Date(),kindFilter?:"AV"|"LV"){
  const expected=expectedCitymarketPreflight(now,kindFilter);
  const matches=(run:PreflightRun)=>{
    if(run.details.period===expected.period)return true;
    const next=object(run.details.next);
    const active=object(run.details.active);
    const errors=Array.isArray(run.details.errors)?run.details.errors:[];
    return run.source==="k-citymarket-cache"&&(next.period===expected.period||active.period===expected.period||errors.some(e=>new RegExp(`^(next|active) ${expected.period}:`).test(String(e))));
  };
  const matching=runs.filter(matches).sort((a,b)=>Date.parse(b.checked_at)-Date.parse(a.checked_at));
  const auto=matching.filter(r=>r.source==="k-citymarket-cache");
  const preflight=matching.find(r=>r.source==="k-citymarket-preflight");
  const latest=matching.find(r=>r.source!=="k-citymarket-source-audit");
  const report=preflight&&(!latest||Date.parse(preflight.checked_at)>=Date.parse(latest.checked_at)-120000)?preflight:latest;
  const archive=matching.find(r=>r.source==="k-citymarket-source-audit");
  const errors=report&&Array.isArray(report.details.errors)?report.details.errors.map(String).filter(e=>report.source!=="k-citymarket-cache"||new RegExp(`^(next|active) ${expected.period}:`).test(e)):[];
  const quality=object(report?.details.quality);
  const n=object(report?.details.next);
  const active=object(report?.details.active);
  const next=n.period===expected.period?n:active.period===expected.period?active:{};
  const parserOk=report?.source==="k-citymarket-cache"?next.period===expected.period&&errors.length===0:report?.ok;
  const stale=expected.windowToday&&report&&now.getTime()-Date.parse(report.checked_at)>3*3600000;
  const archiveFailed=archive&&!archive.ok;
  // Automatic field checks and source capture do not constitute a manual full-PDF audit.
  const reviewed=archive?.outcome==="pdf-review-passed"&&archive.ok&&parserOk;
  const missingOverdue=!report&&now.getTime()>Date.parse(expected.expectedAt)+30*60000;
  const level=!report?(missingOverdue?"red":"gray"):!parserOk||archiveFailed?"red":stale||!reviewed?"yellow":"green";
  const label=!report?(missingOverdue?"ENNAKKOPARSERIN AJO PUUTTUU":"ODOTTAA ENSIMMÄISTÄ AJOA"):!parserOk?"PARSERIN ESITARKASTUS EPÄONNISTUI":archiveFailed?(archive.outcome==="source-archive-review-needed"?"LÄHDEAINEISTOSSA TARKISTETTAVAA":"LÄHDEARKISTON TARKISTUS EPÄONNISTUI"):stale?"TARKISTUS VANHENEE":reviewed?"PDF-TARKISTUS HYVÄKSYTTY":"AUTOMAATTITARKISTUS TEHTY · PDF-VERTAILU ODOTTAA";
  return {...expected,level,label,first:auto.at(-1)?.checked_at??matching.at(-1)?.checked_at??null,
    latest:report?.checked_at??null,count:report?(Number(quality.total??next.offers??(report.source==="k-citymarket-cache"?0:report.offer_count))):null,
    parserOk:Boolean(parserOk),quality,errors,archive:archive?.outcome??"Lähdearkiston tarkistusta ei ole raportoitu",reviewed};
}

export function citymarketPreflightSchedule(runs:PreflightRun[],now=new Date()){
  return (["AV","LV"] as const).map(kind=>citymarketPreflightStatus(runs,now,kind));
}

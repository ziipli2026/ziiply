"use client";
import {useState} from "react";
const METRICS=[["steps","Askeleet","askelta"],["activeEnergyKcal","Aktiivisuusenergia","kcal"],["restingHeartRateBpm","Leposyke","bpm"],["hrvSdnnMs","HRV SDNN (Apple)","ms"],["hrvRmssdMs","HRV RMSSD (Android)","ms"],["sleepMinutes","Uni","min"],["remMinutes","REM-uni","min"],["coreMinutes","Kevyt uni","min"],["deepMinutes","Syvä uni","min"],["awakeMinutes","Valveilla","min"]] as const;
type Metric=typeof METRICS[number][0];
type Day={localDate:string;provider:"apple_health"|"health_connect";timezone:string}&Partial<Record<Metric,number|null>>;
type Period="day"|"week"|"month";
const isoWeek=(s:string)=>{const d=new Date(s+"T12:00:00Z");d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10)};
const key=(d:string,p:Period)=>p==="day"?d:p==="week"?isoWeek(d):d.slice(0,7);
const average=new Set<Metric>(["restingHeartRateBpm","hrvSdnnMs","hrvRmssdMs"]);
function aggregate(data:Day[],period:Period,metric:Metric){
 const groups=new Map<string,{sum:number;count:number}>();
 for(const d of data){const v=d[metric];if(typeof v!=="number"||!Number.isFinite(v)||v<0)continue;const k=key(d.localDate,period),g=groups.get(k)||{sum:0,count:0};g.sum+=v;g.count++;groups.set(k,g)}
 return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([date,g])=>({date,value:average.has(metric)?g.sum/g.count:g.sum}));
}
export default function ArvoHealthCharts({days=[]}:{days?:Day[]}){
 const [period,setPeriod]=useState<Period>("week");
 const [metric,setMetric]=useState<Metric>("steps");
 const points=aggregate(days,period,metric);
 const max=Math.max(1,...points.map(p=>p.value));
 const unit=METRICS.find(m=>m[0]===metric)?.[2]||"";
 return <section className="mt-8 rounded-xl border border-[#d3c9ad] bg-white p-4" aria-label="Terveystietojen kuvaajat">
 <h2 className="text-xl font-black">Terveys ja aktiivisuus</h2>
 <p className="mt-2 text-sm">Apple Health / Android Health Connect. Tietoja ei vielä synkronoida. Kuvaajat näkyvät, kun terveystiedot on yhdistetty luvallisesti.</p>
 <div className="mt-4 flex flex-wrap gap-2">{([["day","Päivä"],["week","Viikko"],["month","Kuukausi"]] as const).map(([v,label])=><button key={v} type="button" aria-pressed={period===v} onClick={()=>setPeriod(v)} className={`rounded-lg px-3 py-2 text-sm ${period===v?"bg-[#24573e] text-white":"border"}`}>{label}</button>)}</div>
 <label className="mt-4 block text-sm font-bold">Mittari <select className="ml-2 rounded-lg border p-2" value={metric} onChange={e=>setMetric(e.target.value as Metric)}>{METRICS.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
 {points.length===0?<p className="mt-4 rounded-lg bg-[#f8f5ed] p-4">Ei vielä terveystietoja. <a className="underline" href="/arvo-terveystiedot">Tutustu terveystietojen yhdistämiseen</a>.</p>:
 <div className="mt-5 space-y-3">{points.map(p=><div key={p.date} className="grid grid-cols-[95px_1fr_95px] items-center gap-2 text-sm"><span>{p.date}</span><div className="h-5 rounded bg-[#e5e9df]"><div className="h-5 rounded bg-[#24573e]" style={{width:`${100*p.value/max}%`}}/></div><span className="text-right">{p.value.toLocaleString("fi-FI",{maximumFractionDigits:1})} {unit}</span></div>)}</div>}
 </section>;
}

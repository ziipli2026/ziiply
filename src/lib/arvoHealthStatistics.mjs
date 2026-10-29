// Local-only health statistics aggregation. Does not read from storage or send data.
import {validateDailyHealthSummary} from "./arvoHealthContract.mjs";
export const HEALTH_METRICS=Object.freeze(["steps","activeEnergyKcal","restingHeartRateBpm","hrvSdnnMs","hrvRmssdMs","sleepMinutes","remMinutes","coreMinutes","deepMinutes","awakeMinutes"]);
const SUM_METRICS=new Set(["steps","activeEnergyKcal","sleepMinutes","remMinutes","coreMinutes","deepMinutes","awakeMinutes"]);
const pad=n=>String(n).padStart(2,"0");
function isoWeekStart(date){const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);}
function keyFor(date,period){return period==="day"?date:period==="week"?isoWeekStart(date):date.slice(0,7);}
export function aggregateHealthDays(days,period="day"){
 if(!["day","week","month"].includes(period))throw new Error("Invalid period");
 if(!Array.isArray(days))throw new Error("Invalid data");
 const buckets=new Map();
 for(const d of days){
  if(!validateDailyHealthSummary(d))throw new Error("Invalid health record");
  const key=keyFor(d.localDate,period);
  if(!buckets.has(key))buckets.set(key,{period:key,days:new Set(),totals:{},counts:{}});
  const b=buckets.get(key);b.days.add(d.localDate);
  for(const metric of HEALTH_METRICS){
   const v=d[metric];if(v===null||v===undefined)continue;
   b.totals[metric]=(b.totals[metric]??0)+v;
   b.counts[metric]=(b.counts[metric]??0)+1;
  }
 }
 return [...buckets.values()].sort((a,b)=>a.period.localeCompare(b.period)).map(b=>{
  const result={period:b.period,observedDays:b.days.size};
  for(const metric of HEALTH_METRICS){
   result[metric]=!b.counts[metric]?null:SUM_METRICS.has(metric)?Math.round(b.totals[metric]*100)/100:Math.round(b.totals[metric]/b.counts[metric]*100)/100;
  }
  return result;
 });
}
// Active energy is only the active component. Do not add it to an activity-factor
// TDEE estimate; that would double-count movement already included in the estimate.
export function nutritionEnergyBalance(intakeKcal,estimatedTdeeKcal){
 if(!Number.isFinite(intakeKcal)||!Number.isFinite(estimatedTdeeKcal))return null;
 return Math.round(intakeKcal-estimatedTdeeKcal);
}

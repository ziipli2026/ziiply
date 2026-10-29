// Native bridge contract for Apple HealthKit and Android Health Connect.
// This module never reads browser storage or sends health data to a server.
import {validateDailyHealthSummary} from "./arvoHealthContract.mjs";
export const BRIDGE_EVENT="ziiply:arvo-health-native-summary";
export function acceptNativeHealthMessage(event,approvedCategories){
 if(!event || event.type!=="ARVO_HEALTH_DAILY_SUMMARIES" || event.version!==1 || !Array.isArray(event.days) || event.days.length>366)return {ok:false,error:"INVALID_MESSAGE"};
 if(!Array.isArray(approvedCategories)||approvedCategories.length===0)return {ok:false,error:"NO_CONSENT"};
 const keys={steps:["steps"],active_energy:["activeEnergyKcal"],resting_heart_rate:["restingHeartRateBpm"],hrv:["hrvSdnnMs"],sleep_stages:["sleepMinutes","remMinutes","coreMinutes","deepMinutes","awakeMinutes"]};
 const allowed=new Set(approvedCategories.flatMap(k=>keys[k]||[]));
 if(!allowed.size)return {ok:false,error:"NO_CONSENT"};
 const days=[];
 for(const record of event.days){
  if(!validateDailyHealthSummary(record))return {ok:false,error:"INVALID_RECORD"};
  const filtered={provider:record.provider,localDate:record.localDate,timezone:record.timezone};
  for(const key of allowed)if(record[key]!==undefined)filtered[key]=record[key];
  days.push(filtered);
 }
 return {ok:true,days};
}

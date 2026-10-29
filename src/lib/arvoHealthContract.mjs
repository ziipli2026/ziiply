// Data contract shared by native HealthKit/Health Connect bridges and server validation.
// This module is pure; it does not persist or transmit health data.
export const HEALTH_CATEGORIES = Object.freeze(["steps","active_energy","resting_heart_rate","hrv","sleep_stages"]);
export const HEALTH_PROVIDERS = Object.freeze(["apple_health","health_connect"]);
const allowed = new Set(HEALTH_CATEGORIES);
export function validateHealthCategories(input) {
  return Array.isArray(input) && input.length>0 && input.every(x=>typeof x==="string"&&allowed.has(x)) && new Set(input).size===input.length;
}
export function validateDailyHealthSummary(input) {
  if(!input || typeof input!=="object" || Array.isArray(input)) return false;
  const fields=["provider","localDate","timezone","steps","activeEnergyKcal","restingHeartRateBpm","hrvSdnnMs","hrvRmssdMs","sleepSessionsAvailable","sleepMinutes","remMinutes","coreMinutes","deepMinutes","awakeMinutes"];
  if(Object.keys(input).some(key=>!fields.includes(key))) return false;
  if(!HEALTH_PROVIDERS.includes(input.provider) || !/^\d{4}-\d{2}-\d{2}$/.test(input.localDate||"") || !Number.isFinite(Date.parse(input.localDate+"T00:00:00Z"))) return false;
  if(typeof input.timezone!=="string" || input.timezone.length>64 || !/^[A-Za-z_]+\/[A-Za-z_+-]+(?:\/[A-Za-z_+-]+)?$/.test(input.timezone)) return false;
  for(const key of fields.slice(3)) {
    const v=input[key];
    if(key==="sleepSessionsAvailable"){if(v!==undefined && typeof v!=="boolean")return false;continue;}
    if(v===undefined||v===null)continue;
    if(typeof v!=="number" || !Number.isFinite(v) || v<0 || v>1e7) return false;
    if((key==="steps"||key.endsWith("Minutes")) && !Number.isInteger(v))return false;
  }
  return true;
}

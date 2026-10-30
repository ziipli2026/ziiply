// Consent-aware, pure preparation for eventual authenticated Health sync.
// No transport, storage, or permission is enabled by this module.
import { validateDailyHealthSummary, validateHealthCategories } from "./arvoHealthContract.mjs";
const METRICS = Object.freeze({
  steps:"steps", activeEnergyKcal:"active_energy",
  restingHeartRateBpm:"resting_heart_rate", hrvSdnnMs:"hrv",
  hrvRmssdMs:"hrv", sleepMinutes:"sleep_stages",
  remMinutes:"sleep_stages", coreMinutes:"sleep_stages",
  deepMinutes:"sleep_stages", awakeMinutes:"sleep_stages",
  sleepSessionsAvailable:"sleep_stages"
});
export function prepareHealthSync({ days, categories, consent, policyVersion }) {
  if (!consent || consent.action !== "grant" || consent.version !== policyVersion ||
      consent.explicit !== true || consent.serverVerified !== true)
    throw new Error("Verified server consent required");
  if (!validateHealthCategories(categories) ||
      categories.some(category => !consent.categories?.includes(category)))
    throw new Error("Invalid or unapproved health categories");
  if (!Array.isArray(days) || days.length > 30) throw new Error("Invalid day count");
  const seen = new Set();
  return days.map(day => {
    if (!validateDailyHealthSummary(day)) throw new Error("Invalid health summary");
    const key = day.provider + ":" + day.localDate;
    if (seen.has(key)) throw new Error("Duplicate health day");
    seen.add(key);
    const result = { provider:day.provider, localDate:day.localDate, timezone:day.timezone };
    for (const [field, category] of Object.entries(METRICS)) {
      if (categories.includes(category) && day[field] !== undefined) result[field] = day[field];
    }
    return result;
  });
}

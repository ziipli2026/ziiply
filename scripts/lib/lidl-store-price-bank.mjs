import { importVerifiedLidlPrices } from "./lidl-verified-price-import.mjs";

// An ephemeral, explicitly store-scoped price bank. No public-page prices,
// promotion references or cross-store fallback. No persistence or network access.
export function buildLidlStorePriceBank(rows, knownProductIds, storeId, now = new Date()) {
 const result = importVerifiedLidlPrices(rows, knownProductIds, storeId, now);
 const prices = new Map(result.prices.map(row => [row.lidlProductId, row]));
 return {
  storeId, acceptedCount: prices.size, rejected: result.rejected,
  get(lidlProductId) {
   const row = prices.get(String(lidlProductId));
   if (!row) return null;
   // Recheck expiry at read time: a once-valid cached price cannot outlive its evidence.
   if (Date.parse(row.validThrough) < Date.now()) return null;
   return {...row, comparable:true};
  },
  getAt(lidlProductId, at) {
   const row = prices.get(String(lidlProductId));
   const timestamp = at instanceof Date ? at.getTime() : NaN;
   if (!row || !Number.isFinite(timestamp) ||
       timestamp < Date.parse(row.observedAt) || timestamp > Date.parse(row.validThrough)) return null;
   return {...row, comparable:true};
  }
 };
}

import { importVerifiedLidlPrices } from "./lidl-verified-price-import.mjs";

// An ephemeral, explicitly store-scoped price bank. No public-page prices,
// promotion references or cross-store fallback. No persistence or network access.
export function buildLidlStorePriceBank(rows, knownProductIds, storeId, now = new Date()) {
 const result = importVerifiedLidlPrices(rows, knownProductIds, storeId, now);
 const prices = new Map(result.prices.map(row => [row.lidlProductId, row]));
 const freshUntil = row => row.priceSource === "verified-store-receipt"
  ? Date.parse(row.observedAt) + 24 * 60 * 60 * 1000
  : Date.parse(row.validThrough);
 return {
  storeId, acceptedCount: prices.size, rejected: result.rejected,
  get(lidlProductId) {
   const row = prices.get(String(lidlProductId));
   if (!row) return null;
   // Recheck expiry at read time: a once-valid cached price cannot outlive its evidence.
   if (freshUntil(row) < Date.now()) return null;
   return {...row, comparable:true};
  },
  getAt(lidlProductId, at) {
   const row = prices.get(String(lidlProductId));
   const timestamp = at instanceof Date ? at.getTime() : NaN;
   if (!row || !Number.isFinite(timestamp) ||
       timestamp < Date.parse(row.observedAt) || timestamp > freshUntil(row)) return null;
   return {...row, comparable:true};
  }
 };
}

import { prepareManualLidlReceipt } from "./lidl-manual-price-intake.mjs";
import { importVerifiedLidlPrices } from "./lidl-verified-price-import.mjs";

// Research-only batch processor. Input records are manually supplied with consent;
// no scraping, internal APIs, file persistence, or automatic production publishing.
export function processLidlManualPriceBatch(observations, knownProductIds, storeId, at = new Date()) {
 if (!Array.isArray(observations)) throw new TypeError("observations must be an array");
 if (!Array.isArray(knownProductIds)) throw new TypeError("knownProductIds must be an array");
 if (typeof storeId !== "string" || !storeId.trim()) throw new TypeError("storeId required");
 const candidates = [];
 const rejected = [];
 observations.forEach((row, index) => {
  const outcome = prepareManualLidlReceipt(row);
  if (!outcome.candidate) {
   rejected.push({index, lidlProductId:row?.lidlProductId ?? null, reason:outcome.reason});
  } else {
   candidates.push({...outcome.candidate, _inputIndex:index});
  }
 });
 const result = importVerifiedLidlPrices(candidates, knownProductIds, storeId, at);
 for (const row of result.rejected) {
  const source = candidates.find(candidate => candidate.lidlProductId === row.lidlProductId);
  rejected.push({index:source?._inputIndex ?? null,lidlProductId:row.lidlProductId,reason:row.reason});
 }
 return {
  storeId, inputCount:observations.length, acceptedCount:result.prices.length,
  rejectedCount:rejected.length,
  prices:result.prices, rejected,
  // Do not mistake this for current inventory or permission to publish.
  status:"research-only-not-published"
 };
}

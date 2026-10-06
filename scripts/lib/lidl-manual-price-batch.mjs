import { prepareManualLidlReceipt } from "./lidl-manual-price-intake.mjs";
import { importVerifiedLidlPrices } from "./lidl-verified-price-import.mjs";
import { mapVerifiedLidlReceiptPriceToEan } from "./lidl-verified-receipt-ean.mjs";

// Research-only batch processor. Input records are manually supplied with consent;
// no scraping, internal APIs, file persistence, or automatic production publishing.
export function processLidlManualPriceBatch(observations, knownProductIds, storeId, at = new Date(), verifiedEanLinks = []) {
 if (!Array.isArray(observations)) throw new TypeError("observations must be an array");
 if (!Array.isArray(knownProductIds)) throw new TypeError("knownProductIds must be an array");
 if (!Array.isArray(verifiedEanLinks)) throw new TypeError("verifiedEanLinks must be an array");
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
  rejected.push({index:row.inputIndex,lidlProductId:row.lidlProductId,reason:row.reason});
 }
 const neonRows = [];
 for (const price of result.prices) {
  const mapped = mapVerifiedLidlReceiptPriceToEan(price, verifiedEanLinks);
  if (mapped.row) neonRows.push(mapped.row);
  else rejected.push({index:null,lidlProductId:price.lidlProductId,reason:mapped.reason});
 }
 return {
  storeId, inputCount:observations.length, acceptedCount:result.prices.length,
  neonReadyCount:neonRows.length, rejectedCount:rejected.length,
  prices:result.prices, neonRows, rejected,
  // Rows are validated for import but are not automatically published.
  status:"verified-import-ready-not-published"
 };
}

import { classifyLidlPriceEvidence } from "./lidl-price-source-contract.mjs";

// Research-only importer: produces a store-specific price index only for independently
// verified checkout evidence. It never guesses a price from a Lidl web card or promotion.
export function importVerifiedLidlPrices(rows, knownProductIds, storeId, now = new Date()) {
  const allowed = new Set(knownProductIds.map(String));
  const accepted = new Map();
  const rejected = [];
  const reject = (row, id, reason) => rejected.push({ lidlProductId:id, reason, inputIndex:row?._inputIndex ?? null });
  const conflicted = new Set();
  for (const row of rows) {
    const id = String(row?.lidlProductId ?? "").trim();
    if (!id || !allowed.has(id)) {
      reject(row, id, "unknown-product");
      continue;
    }
    const verdict = classifyLidlPriceEvidence(row, storeId, now);
    if (!verdict.comparable) {
      reject(row, id, verdict.reason);
      continue;
    }
    if (conflicted.has(id)) { reject(row, id, "conflicting-evidence"); continue; }
    const previous = accepted.get(id);
    if (previous && Date.parse(row.observedAt) === Date.parse(previous.observedAt) &&
        row.regularPriceEur !== previous.regularPriceEur) {
      accepted.delete(id);
      conflicted.add(id);
      reject(row, id, "conflicting-evidence");
      continue;
    }
    if (!previous || Date.parse(row.observedAt) > Date.parse(previous.observedAt)) {
      accepted.set(id, {
        lidlProductId:id, storeId, regularPriceEur:verdict.regularPriceEur,
        priceKind:"regular", observedAt:row.observedAt,
        validThrough:row.validThrough, evidenceReference:row.evidenceReference,
        priceSource:row.priceSource, checkoutPriceVerified:true,
      });
    }
  }
  return { prices:[...accepted.values()], rejected };
}

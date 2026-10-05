import assert from "node:assert/strict";
import { prepareManualLidlReceipt as prepare } from "./lib/lidl-manual-price-intake.mjs";
import { importVerifiedLidlPrices } from "./lib/lidl-verified-price-import.mjs";
const row = {
 permissionToUseEvidence:true,isLidlPlus:false,isPromotion:false,isMultiBuy:false,
 priceBasis:"unit",lidlProductId:"10000000",storeId:"test-store",
 receiptUnitPriceEur:1.29,receiptEvidenceReference:"synthetic-fixture-not-real-receipt",
 receiptTimestamp:"2026-10-04T12:00:00+03:00",
 shelfPriceEur:1.29
};
const accepted=prepare(row);
assert.equal(accepted.reason,"candidate-only");
assert.equal(accepted.candidate.regularPriceEur,1.29);
const imported=importVerifiedLidlPrices([accepted.candidate],["10000000"],"test-store",new Date("2026-10-04T12:00:00Z"));
assert.equal(imported.prices.length,1);
for (const [patch, reason] of [
 [{permissionToUseEvidence:false},"permission-not-confirmed"],
 [{isLidlPlus:true},"eligibility-unconfirmed-or-promotional"],
 [{isPromotion:true},"eligibility-unconfirmed-or-promotional"],
 [{isMultiBuy:true},"eligibility-unconfirmed-or-promotional"],
 [{priceBasis:"kg"},"unsupported-price-basis"],
 [{receiptUnitPriceEur:null},"missing-receipt-price"],
 [{receiptEvidenceReference:""},"missing-receipt-evidence"],
 [{receiptTimestamp:"2026-10-04"},"missing-receipt-timestamp"],
 [{shelfPriceEur:1.49},"shelf-receipt-discrepancy"],
]) {
 const result=prepare({...row,...patch});
 assert.equal(result.candidate,null);
 assert.equal(result.reason,reason);
}
console.log("PASS: 10 manual intake cases + verified importer integration (synthetic data only)");

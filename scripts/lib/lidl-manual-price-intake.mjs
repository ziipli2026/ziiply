// Research-only adapter for manually documented in-store evidence.
// Never infer a checkout-verified price from shelf labels or Scan & Go alone.
export function prepareManualLidlReceipt(row) {
 const reject = reason => ({ candidate:null, reason });
 if (!row || row.permissionToUseEvidence !== true) return reject("permission-not-confirmed");
 if (row.observedBarcode && !["packaging-code-unverified","paistopiste-shelf-code","scale-label-code"].includes(row.observedBarcode.kind))
   return reject("invalid-observed-barcode");
 if (row.isLidlPlus !== false || row.isPromotion !== false ||
     row.isMultiBuy !== false) return reject("eligibility-unconfirmed-or-promotional");
 if (!["unit","kg","l"].includes(row.priceBasis) || row.priceBasis !== "unit")
   return reject("unsupported-price-basis"); // Do not silently map €/kg to €/piece.
 if (typeof row.lidlProductId !== "string" || !/^\d+$/.test(row.lidlProductId))
   return reject("missing-product-id");
 if (typeof row.storeId !== "string" || !row.storeId.trim())
   return reject("missing-store-id");
 if (!Number.isFinite(row.receiptUnitPriceEur) || row.receiptUnitPriceEur <= 0)
   return reject("missing-receipt-price");
 if (typeof row.receiptEvidenceReference !== "string" || !row.receiptEvidenceReference.trim())
   return reject("missing-receipt-evidence");
 if (typeof row.receiptTimestamp !== "string" || !Number.isFinite(Date.parse(row.receiptTimestamp)) ||
     !/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(row.receiptTimestamp))
   return reject("missing-receipt-timestamp");
 if (row.shelfPriceEur != null && row.shelfPriceEur !== row.receiptUnitPriceEur)
   return reject("shelf-receipt-discrepancy");
 return {reason:"candidate-only",candidate:{
   lidlProductId:row.lidlProductId,storeId:row.storeId,regularPriceEur:row.receiptUnitPriceEur,
   priceKind:"regular",priceSource:"verified-store-receipt",checkoutPriceVerified:true,
   evidenceReference:row.receiptEvidenceReference,observedAt:row.receiptTimestamp,
   validThrough:null
 }};
}

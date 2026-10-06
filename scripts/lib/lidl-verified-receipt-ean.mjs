// Maps an already source-contract-verified Lidl receipt price to the Neon EAN cache.
// Exact verified productId -> EAN identity is mandatory; no name matching or GTIN guessing.
export function mapVerifiedLidlReceiptPriceToEan(price, verifiedEanLinks) {
  if (!price || price.checkoutPriceVerified !== true ||
      price.priceSource !== "verified-store-receipt" || price.priceKind !== "regular") {
    return { row: null, reason: "price-not-verified-receipt" };
  }
  const id = String(price.lidlProductId ?? "").trim();
  const matches = (Array.isArray(verifiedEanLinks) ? verifiedEanLinks : [])
    .filter(link => String(link?.lidlProductId ?? "").trim() === id)
    .map(link => String(link?.ean ?? "").replace(/\D/g, ""))
    .filter(ean => /^\d{8,14}$/.test(ean));
  const unique = [...new Set(matches)];
  if (unique.length === 0) return { row: null, reason: "missing-verified-ean" };
  if (unique.length !== 1) return { row: null, reason: "ambiguous-verified-ean" };
  const observed = Date.parse(price.observedAt);
  if (!Number.isFinite(observed)) return { row: null, reason: "invalid-observed-at" };
  return { reason: "verified", row: {
    ean: unique[0],
    storeId: price.storeId,
    priceEur: price.regularPriceEur,
    priceKind: "regular",
    source: "verified-store-receipt",
    observedAt: price.observedAt,
    freshUntil: new Date(observed + 24 * 60 * 60 * 1000).toISOString(),
    evidenceReference: price.evidenceReference,
    checkoutPriceVerified: true
  }};
}

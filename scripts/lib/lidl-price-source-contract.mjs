/** Research-only Lidl price evidence classifier. Never a production price feed. */
export function classifyLidlPriceEvidence(row, expectedStore, now = new Date()) {
  const price = row?.regularPriceEur;
  const rejected = reason => ({ regularPriceEur: null, comparable: false, reason });
  if (!Number.isFinite(price) || price <= 0) return rejected("missing-price");
  if (row.priceKind !== "regular") return rejected("not-regular");
  if (!expectedStore || row.storeId !== expectedStore) return rejected("store-mismatch");
  if (row.priceSource === "lidl-fi-public-observation") return rejected("public-observation-not-checkout-verified");
  if (row.priceSource === "lidl-scan-go-user-observation") return rejected("scan-go-observation-not-checkout-verified");
  if (!["authorized-store-feed", "verified-store-receipt"].includes(row.priceSource) ||
      row.checkoutPriceVerified !== true || typeof row.evidenceReference !== "string" ||
      !row.evidenceReference.trim()) return rejected("unverified-source");
  const timestamp = value => typeof value === "string" &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value) &&
    Number.isFinite(Date.parse(value)) ? Date.parse(value) : NaN;
  const observed = timestamp(row.observedAt);
  const current = now instanceof Date ? now.getTime() : NaN;
  if (![observed, current].every(Number.isFinite)) return rejected("missing-freshness");
  if (observed > current) return rejected("stale-or-future");
  if (row.priceSource === "verified-store-receipt") {
    // A receipt proves the checkout price at observedAt, not a future validity period.
    const receiptFreshUntil = observed + 24 * 60 * 60 * 1000;
    if (current > receiptFreshUntil) return rejected("stale-or-future");
  } else {
    const until = timestamp(row.validThrough);
    if (!Number.isFinite(until)) return rejected("missing-freshness");
    if (until < current || until < observed) return rejected("stale-or-future");
  }
  return { regularPriceEur: price, comparable: true, reason: "verified" };
}

/** Research-only Lidl price evidence classifier. Never a production price feed. */
export function classifyLidlPriceEvidence(row, expectedStore, now = new Date()) {
  const price = row?.regularPriceEur;
  const rejected = reason => ({ regularPriceEur: null, comparable: false, reason });
  if (!Number.isFinite(price) || price <= 0) return rejected("missing-price");
  if (row.priceKind !== "regular") return rejected("not-regular");
  if (!expectedStore || row.storeId !== expectedStore) return rejected("store-mismatch");
  if (!["authorized-store-feed", "verified-store-receipt"].includes(row.priceSource) ||
      row.checkoutPriceVerified !== true || typeof row.evidenceReference !== "string" ||
      !row.evidenceReference.trim()) return rejected("unverified-source");
  const timestamp = value => typeof value === "string" &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value) &&
    Number.isFinite(Date.parse(value)) ? Date.parse(value) : NaN;
  const observed = timestamp(row.observedAt);
  const until = timestamp(row.validThrough);
  const current = now instanceof Date ? now.getTime() : NaN;
  if (![observed, until, current].every(Number.isFinite)) return rejected("missing-freshness");
  if (observed > current || until < current || until < observed) return rejected("stale-or-future");
  return { regularPriceEur: price, comparable: true, reason: "verified" };
}

export type LidlCachedPrice = {
  ean: string;
  storeId: string;
  priceEur: number;
  priceKind: "regular" | "offer" | "lidl_plus";
  observedAt: string;
  freshUntil: string;
};

export function isFreshLidlRegularPrice(
  row: LidlCachedPrice | null | undefined,
  expectedEan: string,
  expectedStoreId: string,
  now = new Date(),
) {
  if (!row || row.priceKind !== "regular") return false;
  if (row.ean !== expectedEan || row.storeId !== expectedStoreId) return false;
  if (!Number.isFinite(row.priceEur) || row.priceEur <= 0) return false;
  const observed = Date.parse(row.observedAt);
  const freshUntil = Date.parse(row.freshUntil);
  const current = now.getTime();
  return [observed, freshUntil, current].every(Number.isFinite)
    && observed <= current
    && current <= freshUntil
    && freshUntil >= observed;
}

export function lidlPriceLookupDecision(
  row: LidlCachedPrice | null | undefined,
  ean: string,
  storeId: string,
  now = new Date(),
) {
  return isFreshLidlRegularPrice(row, ean, storeId, now)
    ? { action: "use-cache" as const, priceEur: row!.priceEur }
    : { action: "refresh" as const, priceEur: null };
}

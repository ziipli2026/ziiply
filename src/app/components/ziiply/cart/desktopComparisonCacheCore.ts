/** Reject malformed cached comparison quotes before they can affect basket totals. */
export function sanitizeDesktopComparisonMatches(raw: unknown, selectedStoreKeys: readonly string[], eligibleItemKeys: readonly string[]): Record<string, Record<string, number>> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const stores = new Set(selectedStoreKeys), items = new Set(eligibleItemKeys);
  if (Object.keys(source).some(key => !stores.has(key))) return null;
  const clean: Record<string, Record<string, number>> = {};
  for (const key of stores) {
    const rows = source[key];
    if (rows === undefined) { clean[key] = {}; continue; }
    if (!rows || typeof rows !== "object" || Array.isArray(rows)) return null;
    const prices = rows as Record<string, unknown>;
    if (Object.keys(prices).some(item => !items.has(item))) return null;
    clean[key] = {};
    for (const [item, price] of Object.entries(prices)) {
      if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null;
      clean[key][item] = price;
    }
  }
  return clean;
}

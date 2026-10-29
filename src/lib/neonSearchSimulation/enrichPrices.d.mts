export type EnrichmentRow = { ean?: string; name: string; prices: Record<string, number | null> };
export type VerifiedStorePrice = { ean: string; store: string; price: number };
export function enrichNeonRows<T extends EnrichmentRow>(
  rows: T[],
  lookup: (product: { ean: string; name: string }, signal: AbortSignal) => Promise<VerifiedStorePrice[]>,
  publish: (rows: T[]) => void,
  signal: AbortSignal,
  maxProducts?: number
): Promise<T[]>;

/**
 * Isolated K-Citymarket store-specific offers research provider.
 *
 * NOT wired to public offer search or the national leaflet parser.
 * No fallback to another store: an unverified store context is an error.
 * Only public, non-personalised offers are in scope.
 */
export type KCitymarketStoreOfferProbe = {
  storeId: string;
  sourceUrl: string;
  status: "NOT_CONFIGURED" | "HTTP_ERROR" | "UNVERIFIED_STORE" | "UNSUPPORTED_SHAPE" | "OK";
  httpStatus: number | null;
  offers: unknown[];
  diagnostic: string;
};

export async function probeKCitymarketStoreOffers(options: {
  storeId: string;
  endpoint?: string;
}): Promise<KCitymarketStoreOfferProbe> {
  const storeId = String(options.storeId ?? "").trim();
  const endpoint = String(options.endpoint ?? "").trim();
  const base = { storeId, sourceUrl: endpoint, httpStatus: null, offers: [] as unknown[] };
  if (!storeId || !endpoint) return {
    ...base, status: "NOT_CONFIGURED",
    diagnostic: "Explicit store ID and verified endpoint required; no default store.",
  };
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.hostname !== "www.k-ruoka.fi") {
    return { ...base, status: "NOT_CONFIGURED", diagnostic: "Endpoint must be HTTPS www.k-ruoka.fi." };
  }
  // Do not fetch an assumed endpoint or parse another store's offers as selected-store data.
  // A verified, store-scoped data contract must be implemented before enabling network reads.
  return {
    ...base, status: "UNSUPPORTED_SHAPE",
    diagnostic: "Research scaffold only: store identity and response contract not yet verified.",
  };
}

// src/app/components/ziiply/offerSearch/ziiplyOfferSearchSources.ts

export type ZiiplyOfferSource =
  | "kmarket"
  | "ksupermarket"
  | "skaupat";

export type ZiiplyOfferChain =
  | "K"
  | "S";

export type ZiiplyOfferSearchResult = {
  id: string;

  source: ZiiplyOfferSource;
  chain: ZiiplyOfferChain;

  title: string;

  priceText?: string;
  unitPriceText?: string;
  validityText?: string;

  storeLabel?: string;

  imageUrl?: string;
  productUrl?: string;

  matchScore: number;
};

function normalizeQuery(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function createEmptyResults(): ZiiplyOfferSearchResult[] {
  return [];
}

/**
 * K-Market tarjoushaku
 */
export async function searchKMarketOffers(
  query: string,
): Promise<ZiiplyOfferSearchResult[]> {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return createEmptyResults();
  }

  // TODO:
  // 1. Fetch tarjouslehti data
  // 2. Parse tarjoukset
  // 3. Match queryyn
  // 4. Return löydöt

  return [];
}

/**
 * K-Supermarket tarjoushaku
 */
export async function searchKSupermarketOffers(
  query: string,
): Promise<ZiiplyOfferSearchResult[]> {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return createEmptyResults();
  }

  // TODO:
  // 1. Fetch tarjouslehti data
  // 2. Parse tarjoukset
  // 3. Match queryyn
  // 4. Return löydöt

  return [];
}

/**
 * S-Kaupat kampanjahaku
 */
export async function searchSKaupatOffers(
  query: string,
): Promise<ZiiplyOfferSearchResult[]> {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return createEmptyResults();
  }

  // TODO:
  // 1. Fetch kampanjadata
  // 2. Parse tarjoukset
  // 3. Match queryyn
  // 4. Return löydöt

  return [];
}

/**
 * Yhdistetty Ziiply tarjoushaku
 */
export async function searchZiiplyOffers(
  query: string,
): Promise<ZiiplyOfferSearchResult[]> {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return [];
  }

  const [
    kMarketResults,
    kSupermarketResults,
    sKaupatResults,
  ] = await Promise.all([
    searchKMarketOffers(normalizedQuery),
    searchKSupermarketOffers(normalizedQuery),
    searchSKaupatOffers(normalizedQuery),
  ]);

  return [
    ...kMarketResults,
    ...kSupermarketResults,
    ...sKaupatResults,
  ].sort((a, b) => b.matchScore - a.matchScore);
}

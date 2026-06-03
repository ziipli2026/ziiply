// src/app/components/ziiply/offerSearch/ziiplyOfferSearchSources.ts
// ZIIPLY_OFFER_SEARCH_SOURCES_V1

import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "./types";
import { fetchKruokaOffers } from "./providers/kruokaProvider";
import { fetchSKaupatOffers } from "./providers/skaupatProvider";
import {
  getCachedOfferResults,
  setCachedOfferResults,
} from "./ziiplyOfferSearchCache";

export type {
  ZiiplyOfferChain,
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
  ZiiplyOfferSource,
} from "./types";

const ZIIPLY_OFFER_SOURCES = {
  kmarket: {
    id: "kmarket",
    chain: "K",
    storeLabel: "K-Market",
    url: "https://www.k-ruoka.fi/k-market/tarjouslehti",
  },
  ksupermarket: {
    id: "ksupermarket",
    chain: "K",
    storeLabel: "K-Supermarket",
    url: "https://www.k-ruoka.fi/k-supermarket/tarjouslehti",
  },
  skaupat: {
    id: "skaupat",
    chain: "S",
    storeLabel: "S-kaupat",
    url: "https://www.s-kaupat.fi/tuotteet/kampanjat",
  },
} satisfies Record<string, ZiiplyOfferSearchSourceConfig>;

function uniqueOfferResults(results: ZiiplyOfferSearchResult[]) {
  const seen = new Set<string>();
  const unique: ZiiplyOfferSearchResult[] = [];

  for (const result of results) {
    const key = `${result.source}:${result.title}:${result.priceText ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(result);
  }

  return unique;
}

async function safelySearchSource(
  label: string,
  task: () => Promise<ZiiplyOfferSearchResult[]>,
) {
  try {
    return await task();
  } catch (error) {
    console.warn(`[Ziiply offers] ${label} epäonnistui`, error);
    return [];
  }
}

export async function searchKMarketOffers(query: string) {
  return fetchKruokaOffers(query, ZIIPLY_OFFER_SOURCES.kmarket);
}

export async function searchKSupermarketOffers(query: string) {
  return fetchKruokaOffers(query, ZIIPLY_OFFER_SOURCES.ksupermarket);
}

export async function searchSKaupatOffers(query: string) {
  return fetchSKaupatOffers(query, ZIIPLY_OFFER_SOURCES.skaupat);
}

export async function searchZiiplyOffers(query: string) {
  const cleanQuery = query.trim();

  if (!cleanQuery) return [];

  const cached = getCachedOfferResults(cleanQuery);
  if (cached) return cached;

  const [kMarketResults, kSupermarketResults, sKaupatResults] = await Promise.all([
    safelySearchSource("K-Market", () => searchKMarketOffers(cleanQuery)),
    safelySearchSource("K-Supermarket", () => searchKSupermarketOffers(cleanQuery)),
    safelySearchSource("S-kaupat", () => searchSKaupatOffers(cleanQuery)),
  ]);

  const results = uniqueOfferResults([
    ...kMarketResults,
    ...kSupermarketResults,
    ...sKaupatResults,
  ])
    .filter((result) => result.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 40);

  setCachedOfferResults(cleanQuery, results);

  return results;
}

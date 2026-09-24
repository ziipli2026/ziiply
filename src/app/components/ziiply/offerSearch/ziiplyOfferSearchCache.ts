// src/app/components/ziiply/offerSearch/ziiplyOfferSearchCache.ts
// ZIIPLY_OFFER_SEARCH_CACHE_V1

import type { ZiiplyOfferSearchResult } from "./types";

const OFFER_CACHE_MS = 1000 * 60 * 30;

type CacheEntry = {
  createdAt: number;
  results: ZiiplyOfferSearchResult[];
};

const cache = new Map<string, CacheEntry>();

export function getOfferCacheKey(query: string) {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getCachedOfferResults(query: string) {
  const key = getOfferCacheKey(query);
  const entry = cache.get(key);

  if (!entry) return null;

  if (Date.now() - entry.createdAt > OFFER_CACHE_MS) {
    cache.delete(key);
    return null;
  }

  return entry.results;
}

export function setCachedOfferResults(
  query: string,
  results: ZiiplyOfferSearchResult[],
) {
  const key = getOfferCacheKey(query);
  cache.set(key, {
    createdAt: Date.now(),
    results,
  });
}

export function clearOfferSearchCache() {
  cache.clear();
}

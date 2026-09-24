/**
 * Ziiply normal product search engine facade.
 * Location: src/app/components/ziiply/search/searchEngine.ts
 *
 * This file intentionally does NOT fetch S/K products yet.
 * Page/API can pass products in, and this core handles intent, filtering,
 * ranking, suggestions and learning.
 */

import { getIntentSearchQueries, resolveSearchIntentAI } from "./searchIntentAI";
import { rememberSearchChoice, type ZiiplySearchMemoryEventType } from "./searchIntentMemory";
import { buildSearchAutocompleteSuggestions } from "./searchAutocomplete";
import { rankNormalSearchProducts } from "./searchRanker";
import type {
  ZiiplyNormalSearchOptions,
  ZiiplyNormalSearchResult,
  ZiiplySearchProductLike,
  ZiiplySearchSuggestion,
} from "./types";

export function getNormalSearchQueries(query: string, maxQueries = 8): string[] {
  return getIntentSearchQueries(query, maxQueries);
}

export function searchNormalProducts<T extends ZiiplySearchProductLike>(
  query: string,
  products: T[],
  options: ZiiplyNormalSearchOptions<T> = {}
): ZiiplyNormalSearchResult<T>[] {
  const limit = options.limit || 30;
  return rankNormalSearchProducts(products, query, options.getBaseScore).slice(0, limit);
}

export function suggestNormalSearch<T extends ZiiplySearchProductLike>(
  query: string,
  products: T[] = [],
  limit = 10
): ZiiplySearchSuggestion[] {
  return buildSearchAutocompleteSuggestions(query, products, limit);
}

export function learnNormalSearchChoice(
  query: string,
  product: ZiiplySearchProductLike,
  eventType: ZiiplySearchMemoryEventType = "selected"
) {
  rememberSearchChoice(query, product, eventType);
}

export function explainNormalSearch(query: string) {
  return resolveSearchIntentAI(query);
}

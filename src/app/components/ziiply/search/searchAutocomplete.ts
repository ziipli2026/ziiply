/**
 * Ziiply S-kaupat style autocomplete layer.
 * Location: src/app/components/ziiply/search/searchAutocomplete.ts
 */

import { resolveSearchIntentAI } from "./searchIntentAI";
import { getLearnedSuggestions } from "./searchIntentMemory";
import { expandSearchSynonyms } from "./searchSynonyms";
import { normalizeFi, uniqueStable } from "./searchNormalizer";
import type { ZiiplySearchProductLike, ZiiplySearchSuggestion } from "./types";

const STATIC_CATEGORY_LABELS: Record<string, string[]> = {
  milk_drink: ["Maito", "Maitotuotteet", "Laktoosittomat maidot"],
  coffee: ["Kahvi", "Suodatinkahvi", "Kahvipavut"],
  cola: ["Cola", "Virvoitusjuomat", "Juomat"],
  meat: ["Jauheliha", "Liha", "Tuoretuotteet"],
  eggs: ["Kananmunat"],
  bread: ["Leipä", "Leipomo"],
  cheese: ["Juustot", "Maitotuotteet"],
  yogurt: ["Jogurtit", "Rahkat", "Maitotuotteet"],
  butter: ["Voi ja levitteet", "Rasvat"],
  cream: ["Kermat", "Maitotuotteet"],
  fish: ["Kala", "Kalat", "Tuoretuotteet"],
  fruit: ["Hedelmät"],
  vegetable: ["Vihannekset"],
  unknown: [],
};

function suggestionId(type: string, label: string) {
  return `${type}:${normalizeFi(label).replace(/\s+/g, "-")}`;
}

export function buildSearchAutocompleteSuggestions<T extends ZiiplySearchProductLike>(
  query: string,
  products: T[] = [],
  limit = 10
): ZiiplySearchSuggestion[] {
  const q = normalizeFi(query);
  if (!q) return [];

  const intent = resolveSearchIntentAI(query);
  const suggestions: ZiiplySearchSuggestion[] = [];

  if (intent.correctedQuery && intent.correctedQuery !== normalizeFi(intent.originalQuery)) {
    suggestions.push({
      id: suggestionId("correction", intent.correctedQuery),
      type: "correction",
      label: `Tarkoititko: ${intent.correctedQuery}`,
      value: intent.correctedQuery,
      score: 120,
      reason: "autocorrect",
    });
  }

  const categoryLabels = STATIC_CATEGORY_LABELS[intent.intent] || [];
  for (const label of categoryLabels) {
    suggestions.push({
      id: suggestionId("category", label),
      type: "category",
      label,
      value: label,
      category: label,
      score: 95,
      reason: "intent_category",
    });
  }

  for (const learned of getLearnedSuggestions(query, 4)) {
    suggestions.push(learned);
  }

  for (const synonym of expandSearchSynonyms(query, 6)) {
    if (!synonym || synonym === q) continue;
    suggestions.push({
      id: suggestionId("query", synonym),
      type: "query",
      label: synonym,
      value: synonym,
      score: 65,
      reason: "synonym",
    });
  }

  for (const product of products.slice(0, 50)) {
    const name = String(product.name || "").trim();
    if (!name) continue;
    const cleanName = normalizeFi(name);
    const cleanBrand = normalizeFi(product.brandName);
    if (!cleanName.includes(q) && !cleanBrand.includes(q)) continue;

    suggestions.push({
      id: `product:${product.ean || product.id || cleanName}`,
      type: "product",
      label: name,
      value: name,
      category: product.category || undefined,
      brandName: product.brandName || undefined,
      ean: product.ean || undefined,
      score: cleanName.startsWith(q) ? 85 : 72,
      reason: "product_match",
    });
  }

  const deduped = new Map<string, ZiiplySearchSuggestion>();
  for (const suggestion of suggestions) {
    const key = `${suggestion.type}:${normalizeFi(suggestion.value)}`;
    const current = deduped.get(key);
    if (!current || suggestion.score > current.score) deduped.set(key, suggestion);
  }

  return Array.from(deduped.values())
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "fi"))
    .slice(0, limit);
}

export function getSearchSuggestionQueries(query: string, limit = 8): string[] {
  const intent = resolveSearchIntentAI(query);
  return uniqueStable([
    intent.correctedQuery,
    intent.canonicalQuery,
    ...intent.preferredTerms,
    ...expandSearchSynonyms(query),
  ].map(normalizeFi).filter(Boolean)).slice(0, limit);
}

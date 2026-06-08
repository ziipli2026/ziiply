/**
 * Ziiply Search Autocomplete
 *
 * Purpose:
 * - Builds S-kaupat-style autocomplete suggestions for the normal product search.
 * - Extracts categories, brands and products from product result data.
 * - Uses intent, synonyms and memory as soft ranking signals.
 * - Does NOT fetch products by itself and does NOT touch offerSearch / Gösta.
 *
 * Suggested location:
 * src/app/components/ziiply/search/searchAutocomplete.ts
 */

import { resolveSearchIntentAI, scoreProductIntentFit, type IntentProductLike } from "./searchIntentAI";
import { getLearnedSearchBoost } from "./searchIntentMemory";
import { normalizeSearchText, splitSearchWords, normalizeEan } from "./searchNormalizer";
import { getSynonymTermsForQuery } from "./searchSynonyms";
import type { ZiiplySearchSuggestion } from "./types";

export type ZiiplyAutocompleteProduct = IntentProductLike & {
  id?: string | number | null;
  ean?: string | null;
  title?: string | null;
  brand?: string | null;
  brandName?: string | null;
  category?: string | null;
  hierarchyPath?: string[] | string | null;
  packageSize?: string | null;
  comparisonPriceUnit?: string | null;
  imageUrl?: string | null;
};

export type ZiiplyAutocompleteOptions = {
  maxCategories?: number;
  maxProducts?: number;
  maxBrands?: number;
  includeDebug?: boolean;
};

export type ZiiplyAutocompleteResult = {
  query: string;
  normalizedQuery: string;
  correctedQuery?: string;
  intent: ReturnType<typeof resolveSearchIntentAI>;
  categories: ZiiplySearchSuggestion[];
  products: ZiiplySearchSuggestion[];
  brands: ZiiplySearchSuggestion[];
  suggestions: ZiiplySearchSuggestion[];
  debug?: {
    synonymTerms: string[];
    productCount: number;
  };
};

type ScoredSuggestion = ZiiplySearchSuggestion & {
  _key: string;
  _score: number;
};

function getProductName(product: ZiiplyAutocompleteProduct): string {
  return String(product.name || product.title || "").trim();
}

function getProductBrand(product: ZiiplyAutocompleteProduct): string {
  return String(product.brandName || product.brand || "").trim();
}

function normalizeHierarchyPath(value: ZiiplyAutocompleteProduct["hierarchyPath"]): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  const raw = String(value || "").trim();
  if (!raw) return [];

  return raw
    .split(/>|\/|→|›|»|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function textMatchesQuery(text: string, query: string, extraTerms: string[]) {
  const normalizedText = normalizeSearchText(text);
  const normalizedQuery = normalizeSearchText(query);
  const queryWords = splitSearchWords(query);

  if (!normalizedText || !normalizedQuery) return false;
  if (normalizedText.includes(normalizedQuery)) return true;

  if (queryWords.length > 0 && queryWords.every((word) => normalizedText.includes(word))) {
    return true;
  }

  return extraTerms.some((term) => {
    const normalizedTerm = normalizeSearchText(term);
    return normalizedTerm.length >= 2 && normalizedText.includes(normalizedTerm);
  });
}

function addSuggestion(
  bucket: Map<string, ScoredSuggestion>,
  suggestion: ZiiplySearchSuggestion,
  score: number
) {
  const key = `${suggestion.type}:${normalizeSearchText(suggestion.value || suggestion.label)}`;
  if (!key || key === `${suggestion.type}:`) return;

  const current = bucket.get(key);
  if (!current || score > current._score) {
    bucket.set(key, {
      ...suggestion,
      score,
      _key: key,
      _score: score,
    });
  }
}

function sortedSuggestions(bucket: Map<string, ScoredSuggestion>, limit: number): ZiiplySearchSuggestion[] {
  return Array.from(bucket.values())
    .sort((a, b) => b._score - a._score || a.label.localeCompare(b.label, "fi"))
    .slice(0, limit)
    .map(({ _key, _score, ...suggestion }) => suggestion);
}

function scoreCategoryLabel(
  label: string,
  query: string,
  intent: ReturnType<typeof resolveSearchIntentAI>,
  synonymTerms: string[]
) {
  const normalizedLabel = normalizeSearchText(label);
  const normalizedQuery = normalizeSearchText(query);
  let score = 20;

  if (normalizedLabel === normalizedQuery) score += 80;
  else if (normalizedLabel.includes(normalizedQuery)) score += 45;

  if (intent.categoryHints.some((hint) => normalizedLabel.includes(normalizeSearchText(hint)))) score += 55;
  if (synonymTerms.some((term) => normalizedLabel.includes(normalizeSearchText(term)))) score += 25;

  return score;
}

function scoreBrandLabel(label: string, query: string, productName: string) {
  const normalizedLabel = normalizeSearchText(label);
  const normalizedQuery = normalizeSearchText(query);
  const normalizedName = normalizeSearchText(productName);
  let score = 10;

  if (normalizedLabel === normalizedQuery) score += 70;
  else if (normalizedLabel.includes(normalizedQuery) || normalizedQuery.includes(normalizedLabel)) score += 35;
  if (normalizedName.includes(normalizedQuery)) score += 20;

  return score;
}

function scoreProductSuggestion(
  product: ZiiplyAutocompleteProduct,
  query: string,
  intent: ReturnType<typeof resolveSearchIntentAI>,
  synonymTerms: string[]
) {
  const name = getProductName(product);
  const brand = getProductBrand(product);
  const category = String(product.category || "").trim();
  const normalizedName = normalizeSearchText(name);
  const normalizedBrand = normalizeSearchText(brand);
  const normalizedCategory = normalizeSearchText(category);
  const normalizedQuery = normalizeSearchText(query);
  const words = splitSearchWords(query);

  let score = 0;

  if (normalizedName === normalizedQuery) score += 120;
  else if (normalizedName.includes(normalizedQuery)) score += 75;

  if (words.length > 0 && words.every((word) => normalizedName.includes(word))) score += 45;
  if (normalizedBrand && normalizedBrand.includes(normalizedQuery)) score += 35;
  if (normalizedCategory && normalizedCategory.includes(normalizedQuery)) score += 25;

  score += scoreProductIntentFit(product, intent);

  for (const term of synonymTerms) {
    const normalizedTerm = normalizeSearchText(term);
    if (!normalizedTerm) continue;
    if (normalizedName.includes(normalizedTerm)) score += 16;
    if (normalizedCategory.includes(normalizedTerm)) score += 10;
  }

  const learned = getLearnedSearchBoost(query, product as any);
  score += learned.boost;

  return score;
}

export function buildZiiplyAutocomplete(
  query: string,
  products: ZiiplyAutocompleteProduct[] = [],
  options: ZiiplyAutocompleteOptions = {}
): ZiiplyAutocompleteResult {
  const normalizedQuery = normalizeSearchText(query);
  const intent = resolveSearchIntentAI(query);
  const synonymTerms = getSynonymTermsForQuery(query);

  const maxCategories = options.maxCategories ?? 5;
  const maxProducts = options.maxProducts ?? 6;
  const maxBrands = options.maxBrands ?? 4;

  const categoryBucket = new Map<string, ScoredSuggestion>();
  const productBucket = new Map<string, ScoredSuggestion>();
  const brandBucket = new Map<string, ScoredSuggestion>();

  if (!normalizedQuery) {
    return {
      query,
      normalizedQuery,
      intent,
      categories: [],
      products: [],
      brands: [],
      suggestions: [],
      debug: options.includeDebug ? { synonymTerms, productCount: products.length } : undefined,
    };
  }

  for (const product of products) {
    const name = getProductName(product);
    if (!name) continue;

    const brand = getProductBrand(product);
    const category = String(product.category || "").trim();
    const hierarchy = normalizeHierarchyPath(product.hierarchyPath);
    const ean = normalizeEan(product.ean);

    const productText = [name, brand, category, ...hierarchy].filter(Boolean).join(" ");
    const matches = textMatchesQuery(productText, query, [...synonymTerms, ...intent.includeTerms, ...intent.preferredTerms]);

    const productScore = scoreProductSuggestion(product, query, intent, synonymTerms);

    if (matches || productScore > 25) {
      addSuggestion(
        productBucket,
        {
          type: "product",
          label: name,
          value: ean || String(product.id || name),
          score: productScore,
          reason: ean ? "product_ean_match" : "product_name_match",
        },
        productScore
      );
    }

    for (const label of [category, ...hierarchy].filter(Boolean)) {
      if (!label) continue;
      const score = scoreCategoryLabel(label, query, intent, synonymTerms) + Math.max(0, productScore / 10);

      if (textMatchesQuery(label, query, [...synonymTerms, ...intent.categoryHints]) || score >= 55) {
        addSuggestion(
          categoryBucket,
          {
            type: "category",
            label,
            value: label,
            score,
            reason: "category_from_product_hierarchy",
          },
          score
        );
      }
    }

    if (brand) {
      const score = scoreBrandLabel(brand, query, name) + Math.max(0, productScore / 12);

      if (textMatchesQuery(brand, query, synonymTerms) || score >= 45) {
        addSuggestion(
          brandBucket,
          {
            type: "brand",
            label: brand,
            value: brand,
            score,
            reason: "brand_from_product_result",
          },
          score
        );
      }
    }
  }

  for (const hint of intent.categoryHints) {
    addSuggestion(
      categoryBucket,
      {
        type: "category",
        label: hint,
        value: hint,
        score: 70,
        reason: "intent_category_hint",
      },
      70
    );
  }

  const categories = sortedSuggestions(categoryBucket, maxCategories);
  const productSuggestions = sortedSuggestions(productBucket, maxProducts);
  const brands = sortedSuggestions(brandBucket, maxBrands);

  return {
    query,
    normalizedQuery,
    correctedQuery: intent.canonicalQuery !== normalizedQuery ? intent.canonicalQuery : undefined,
    intent,
    categories,
    products: productSuggestions,
    brands,
    suggestions: [...categories, ...productSuggestions, ...brands],
    debug: options.includeDebug ? { synonymTerms, productCount: products.length } : undefined,
  };
}

export function getAutocompleteLabels(result: ZiiplyAutocompleteResult) {
  return {
    categories: result.categories.map((item) => item.label),
    products: result.products.map((item) => item.label),
    brands: result.brands.map((item) => item.label),
  };
}

export const buildSearchAutocompleteSuggestions = buildZiiplyAutocomplete;

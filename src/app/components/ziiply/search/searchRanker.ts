/**
 * Ziiply normal search ranker.
 * Location: src/app/components/ziiply/search/searchRanker.ts
 *
 * v443:
 * - Ruokahauissa lemmikkituotteet painetaan alas.
 * - Esim. "makkara" ei saa nostaa koiranmakkaraa grillimakkaroiden edelle.
 */

import { resolveSearchIntentAI, isProductAllowedByIntent, scoreProductIntentFit } from "./searchIntentAI";
import { getLearnedSearchBoost } from "./searchIntentMemory";
import { getProductPackageSize, getProductSearchText, hasAny, normalizeFi, tokenizeFi } from "./searchNormalizer";
import type { ZiiplyNormalSearchResult, ZiiplySearchProductLike } from "./types";

const FOOD_INTENT_WORDS = [
  "makkara",
  "nakki",
  "grillimakkara",
  "lenkki",
  "jauheliha",
  "liha",
  "kana",
  "broileri",
  "nauta",
  "maito",
  "kahvi",
  "juusto",
  "voi",
  "leipa",
  "leipä",
];

const PET_HINTS = [
  "koira",
  "kissa",
  "lemmikki",
  "koiranruoka",
  "kissanruoka",
  "dog",
  "cat",
];

export function scoreNormalSearchProduct<T extends ZiiplySearchProductLike>(
  product: T,
  query: string,
  baseScore = 0
): ZiiplyNormalSearchResult<T> {
  const intent = resolveSearchIntentAI(query);
  const reasons: string[] = [];

  if (!isProductAllowedByIntent(product, intent)) {
    return { product, score: -9999, reasons: ["blocked_by_intent"] };
  }

  const q = normalizeFi(intent.correctedQuery || query);
  const name = normalizeFi(product.name);
  const brand = normalizeFi(product.brandName);
  const category = normalizeFi(product.category);
  const text = getProductSearchText(product);
  const queryTokens = tokenizeFi(q);

  let score = baseScore;

  if (name === q) {
    score += 100;
    reasons.push("exact_name");
  } else if (name.includes(q)) {
    score += 70;
    reasons.push("partial_name");
  }

  const matchedTokens = queryTokens.filter((token) => text.includes(token));
  if (queryTokens.length > 0 && matchedTokens.length === queryTokens.length) {
    score += 45;
    reasons.push("all_query_tokens");
  } else if (matchedTokens.length > 0) {
    score += matchedTokens.length * 12;
    reasons.push("some_query_tokens");
  }

  if (brand && q.includes(brand)) {
    score += 45;
    reasons.push("brand_in_query");
  }

  const intentScore = scoreProductIntentFit(product, intent);
  if (intentScore !== 0) {
    score += intentScore;
    reasons.push("intent_fit");
  }

  if (hasAny(category, intent.categoryHints)) {
    score += 35;
    reasons.push("category_hint");
  }

  // v443: ruokahauissa lemmikkituotteet alas.
  // Esim. "makkara" tarkoittaa käyttäjälle yleensä grillimakkaraa/ruokamakkaraa,
  // ei koiranmakkaraa.
  const hasFoodIntent = FOOD_INTENT_WORDS.some((word) => q.includes(word));
  const petText = `${category} ${text}`.toLowerCase();
  const isPetProduct = PET_HINTS.some((hint) => petText.includes(hint));

  if (hasFoodIntent && isPetProduct) {
    score -= 300;
    reasons.push("pet_penalty");
  }

  const packageSize = getProductPackageSize(product);
  if (
    packageSize &&
    hasAny(q, [
      packageSize.raw,
      `${packageSize.amount}${packageSize.unit}`,
      `${packageSize.amount} ${packageSize.unit}`,
    ])
  ) {
    score += 22;
    reasons.push("package_size_match");
  }

  const learned = getLearnedSearchBoost(query, product);
  if (learned.boost !== 0) {
    score += learned.boost;
    reasons.push(learned.reason);
  }

  return { product, score, reasons };
}

export function rankNormalSearchProducts<T extends ZiiplySearchProductLike>(
  products: T[],
  query: string,
  getBaseScore?: (product: T) => number
): ZiiplyNormalSearchResult<T>[] {
  return products
    .map((product) =>
      scoreNormalSearchProduct(product, query, getBaseScore ? getBaseScore(product) : 0)
    )
    .filter((item) => item.score > -9000)
    .sort((a, b) => b.score - a.score);
}

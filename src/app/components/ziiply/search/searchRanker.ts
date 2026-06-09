/**
 * Ziiply normal search ranker.
 * Location: src/app/components/ziiply/search/searchRanker.ts
 *
 * v443-debug:
 * - Ruokahauissa lemmikkituotteet painetaan alas.
 * - Debuggaa selaimen consoleen, osuuko ranker oikeasti makkara-hakuun.
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
  "lemmikit",
  "koiran",
  "kissan",
  "koiranruoka",
  "kissanruoka",
  "lemmikkiruoka",
  "lemmikkien",
  "dog",
  "cat",
  "pedigree",
  "cesar",
  "shelma",
  "schesir",
  "purina",
  "whiskas",
  "felix",
];

function shouldDebugRanker(query: string) {
  const q = normalizeFi(query);
  return q.includes("makkara") || q.includes("nakki") || q.includes("liha");
}

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
  const brand = normalizeFi(product.brandName || product.brand);
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

  const hasFoodIntent = FOOD_INTENT_WORDS.some((word) => q.includes(word));
  const petText = normalizeFi(`${name} ${brand} ${category} ${text}`);
  const isPetProduct = PET_HINTS.some((hint) => petText.includes(normalizeFi(hint)));

  if (hasFoodIntent && isPetProduct) {
    score -= 10000;
    reasons.push("pet_penalty_debug_minus_10000");
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

  if (shouldDebugRanker(query)) {
    console.log("[Ziiply ranker debug]", {
      query,
      q,
      name,
      brand,
      category,
      baseScore,
      finalScore: score,
      hasFoodIntent,
      isPetProduct,
      petText,
      reasons,
      product,
    });
  }

  return { product, score, reasons };
}

export function rankNormalSearchProducts<T extends ZiiplySearchProductLike>(
  products: T[],
  query: string,
  getBaseScore?: (product: T) => number
): ZiiplyNormalSearchResult<T>[] {
  const ranked = products
    .map((product) =>
      scoreNormalSearchProduct(product, query, getBaseScore ? getBaseScore(product) : 0)
    )
    .filter((item) => item.score > -9000)
    .sort((a, b) => b.score - a.score);

  if (shouldDebugRanker(query)) {
    console.log(
      "[Ziiply ranker debug top 20]",
      ranked.slice(0, 20).map((item) => ({
        name: item.product.name || item.product.title || item.product.productName,
        brand: item.product.brandName || item.product.brand,
        category: item.product.category,
        score: item.score,
        reasons: item.reasons,
      }))
    );
  }

  return ranked;
}

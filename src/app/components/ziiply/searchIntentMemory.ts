/**
 * Ziiply Search Intent Memory
 *
 * Purpose:
 * - Adds a small learning layer on top of the deterministic search intent logic.
 * - Learns from user choices: selected product, added-to-cart product, skipped/rejected product.
 * - Gives a small ranking boost to products that the user repeatedly selects for the same query.
 * - Never overrides hard exclude rules from searchIntentAI.ts.
 *
 * Suggested location:
 * src/app/components/ziiply/searchIntentMemory.ts
 */

import {
  resolveSearchIntentAI,
  isProductAllowedByIntent,
  scoreProductIntentFit,
  type IntentProductLike,
} from "./searchIntentAI";

export type ZiiplySearchMemoryEventType =
  | "selected"
  | "added_to_cart"
  | "alternative_selected"
  | "rejected"
  | "skipped";

export type ZiiplySearchMemoryProduct = IntentProductLike & {
  id?: string | number | null;
  ean?: string | null;
  price?: number | null;
  chain?: string | null;
  storeName?: string | null;
};

export type ZiiplySearchMemoryEntry = {
  key: string;
  query: string;
  canonicalQuery: string;
  intent: string;
  productKey: string;
  productName: string;
  productCategory?: string;
  productBrand?: string;
  ean?: string;
  positiveCount: number;
  negativeCount: number;
  lastEventType: ZiiplySearchMemoryEventType;
  firstSeenAt: number;
  lastSeenAt: number;
};

export type ZiiplySearchMemoryStore = {
  version: 1;
  savedAt: number;
  entries: Record<string, ZiiplySearchMemoryEntry>;
};

export type ZiiplyLearnedBoost = {
  boost: number;
  positiveCount: number;
  negativeCount: number;
  reason: string;
};

const STORAGE_KEY = "ziiply-search-intent-memory-v1";
const MAX_MEMORY_ENTRIES = 500;
const MAX_BOOST = 28;
const MIN_BOOST = -35;

function now() {
  return Date.now();
}

function safeLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeFi(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,;:!?()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEan(value: string | null | undefined) {
  return String(value || "").replace(/\D/g, "").trim();
}

function getProductKey(product: ZiiplySearchMemoryProduct) {
  const ean = normalizeEan(product.ean);
  if (ean) return `ean:${ean}`;

  const id = product.id != null ? String(product.id).trim() : "";
  if (id) return `id:${id}`;

  const name = normalizeFi(product.name);
  const brand = normalizeFi(product.brandName);
  const category = normalizeFi(product.category);

  return `name:${[brand, name, category].filter(Boolean).join("|")}`;
}

function getMemoryEntryKey(query: string, product: ZiiplySearchMemoryProduct) {
  const intent = resolveSearchIntentAI(query);
  return [
    normalizeFi(intent.canonicalQuery || query),
    intent.intent,
    getProductKey(product),
  ].join("::");
}

function emptyStore(): ZiiplySearchMemoryStore {
  return {
    version: 1,
    savedAt: now(),
    entries: {},
  };
}

export function loadSearchIntentMemory(): ZiiplySearchMemoryStore {
  const storage = safeLocalStorage();
  if (!storage) return emptyStore();

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || parsed.version !== 1 || !parsed.entries) {
      return emptyStore();
    }

    return {
      version: 1,
      savedAt: Number(parsed.savedAt || now()),
      entries: parsed.entries,
    };
  } catch {
    return emptyStore();
  }
}

export function saveSearchIntentMemory(store: ZiiplySearchMemoryStore) {
  const storage = safeLocalStorage();
  if (!storage) return;

  try {
    const entries = Object.values(store.entries)
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
      .slice(0, MAX_MEMORY_ENTRIES);

    const trimmed: ZiiplySearchMemoryStore = {
      version: 1,
      savedAt: now(),
      entries: Object.fromEntries(entries.map((entry) => [entry.key, entry])),
    };

    storage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors.
  }
}

function isPositiveEvent(eventType: ZiiplySearchMemoryEventType) {
  return eventType === "selected" || eventType === "added_to_cart" || eventType === "alternative_selected";
}

function isNegativeEvent(eventType: ZiiplySearchMemoryEventType) {
  return eventType === "rejected" || eventType === "skipped";
}

export function rememberSearchChoice(
  query: string,
  product: ZiiplySearchMemoryProduct,
  eventType: ZiiplySearchMemoryEventType = "selected"
) {
  const cleanQuery = normalizeFi(query);
  const productName = String(product.name || "").trim();
  if (!cleanQuery || !productName) return;

  const intent = resolveSearchIntentAI(query);
  const key = getMemoryEntryKey(query, product);
  const store = loadSearchIntentMemory();
  const current = store.entries[key];

  const positiveDelta = isPositiveEvent(eventType) ? 1 : 0;
  const negativeDelta = isNegativeEvent(eventType) ? 1 : 0;
  const timestamp = now();

  store.entries[key] = {
    key,
    query,
    canonicalQuery: intent.canonicalQuery || cleanQuery,
    intent: intent.intent,
    productKey: getProductKey(product),
    productName,
    productCategory: product.category || undefined,
    productBrand: product.brandName || undefined,
    ean: normalizeEan(product.ean) || undefined,
    positiveCount: Math.max(0, (current?.positiveCount || 0) + positiveDelta),
    negativeCount: Math.max(0, (current?.negativeCount || 0) + negativeDelta),
    lastEventType: eventType,
    firstSeenAt: current?.firstSeenAt || timestamp,
    lastSeenAt: timestamp,
  };

  saveSearchIntentMemory(store);
}

export function forgetSearchChoice(query: string, product: ZiiplySearchMemoryProduct) {
  const key = getMemoryEntryKey(query, product);
  const store = loadSearchIntentMemory();

  if (store.entries[key]) {
    delete store.entries[key];
    saveSearchIntentMemory(store);
  }
}

export function clearSearchIntentMemory() {
  const storage = safeLocalStorage();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {}
}

export function getLearnedSearchBoost(query: string, product: ZiiplySearchMemoryProduct): ZiiplyLearnedBoost {
  const intent = resolveSearchIntentAI(query);

  // Hard guardrail: learning must never bring excluded products back.
  if (!isProductAllowedByIntent(product, intent)) {
    return {
      boost: -100,
      positiveCount: 0,
      negativeCount: 0,
      reason: "blocked_by_intent_guardrail",
    };
  }

  const key = getMemoryEntryKey(query, product);
  const store = loadSearchIntentMemory();
  const entry = store.entries[key];

  if (!entry) {
    return {
      boost: 0,
      positiveCount: 0,
      negativeCount: 0,
      reason: "no_memory",
    };
  }

  const positive = entry.positiveCount || 0;
  const negative = entry.negativeCount || 0;

  const rawBoost = positive * 8 - negative * 12;
  const boost = Math.max(MIN_BOOST, Math.min(MAX_BOOST, rawBoost));

  return {
    boost,
    positiveCount: positive,
    negativeCount: negative,
    reason: positive >= negative ? "learned_preference" : "learned_rejection",
  };
}

export function scoreProductWithIntentMemory(product: ZiiplySearchMemoryProduct, query: string, baseScore = 0) {
  const intent = resolveSearchIntentAI(query);

  if (!isProductAllowedByIntent(product, intent)) {
    return -9999;
  }

  const intentScore = scoreProductIntentFit(product, intent);
  const learned = getLearnedSearchBoost(query, product);

  return baseScore + intentScore + learned.boost;
}

export function rankProductsWithIntentMemory<T extends ZiiplySearchMemoryProduct>(
  products: T[],
  query: string,
  getBaseScore?: (product: T) => number
): T[] {
  return products
    .map((product) => ({
      product,
      score: scoreProductWithIntentMemory(product, query, getBaseScore ? getBaseScore(product) : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);
}

export function getSearchMemoryDebug(query: string) {
  const cleanQuery = normalizeFi(query);
  const intent = resolveSearchIntentAI(query);
  const store = loadSearchIntentMemory();

  const entries = Object.values(store.entries)
    .filter((entry) => normalizeFi(entry.canonicalQuery) === normalizeFi(intent.canonicalQuery || cleanQuery))
    .sort((a, b) => b.positiveCount - a.positiveCount || b.lastSeenAt - a.lastSeenAt)
    .slice(0, 20);

  return {
    query,
    intent: intent.intent,
    canonicalQuery: intent.canonicalQuery,
    memoryCount: entries.length,
    entries,
  };
}

/**
 * Suggested integration points:
 *
 * 1) When user taps product result:
 * rememberSearchChoice(activeSearchTerm, product, "selected")
 *
 * 2) When user adds product to cart:
 * rememberSearchChoice(activeSearchTerm, product, "added_to_cart")
 *
 * 3) When user picks alternative product:
 * rememberSearchChoice(originalCartItem.name, alternativeProduct, "alternative_selected")
 *
 * 4) When user dismisses/rejects bad result:
 * rememberSearchChoice(activeSearchTerm, product, "rejected")
 *
 * 5) During ranking:
 * const ranked = rankProductsWithIntentMemory(products, query, existingScoreFn)
 */

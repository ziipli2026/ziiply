/**
 * Ziiply Search Intent Memory
 * Location: src/app/components/ziiply/search/searchIntentMemory.ts
 *
 * V2:
 * - Lives inside /search module.
 * - Learns selected / added / rejected products per canonical query + intent.
 * - Exposes autocomplete-ready learned suggestions.
 * - Never overrides hard exclude rules from searchIntentAI.ts.
 */

import {
  resolveSearchIntentAI,
  isProductAllowedByIntent,
  scoreProductIntentFit,
  type IntentProductLike,
} from "./searchIntentAI";
import { normalizeEan, normalizeFi } from "./searchNormalizer";
import type { ZiiplySearchSuggestion } from "./types";

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
  correctedQuery: string;
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
  version: 2;
  savedAt: number;
  entries: Record<string, ZiiplySearchMemoryEntry>;
};

export type ZiiplyLearnedBoost = {
  boost: number;
  positiveCount: number;
  negativeCount: number;
  reason: string;
};

const STORAGE_KEY = "ziiply-search-intent-memory-v2";
const LEGACY_STORAGE_KEY = "ziiply-search-intent-memory-v1";
const MAX_MEMORY_ENTRIES = 700;
const MAX_BOOST = 32;
const MIN_BOOST = -40;

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
  return [normalizeFi(intent.canonicalQuery || query), intent.intent, getProductKey(product)].join("::");
}

function emptyStore(): ZiiplySearchMemoryStore {
  return {
    version: 2,
    savedAt: now(),
    entries: {},
  };
}

function migrateLegacyStore(parsed: any): ZiiplySearchMemoryStore {
  const entries = Object.values(parsed?.entries || {}) as any[];
  const migratedEntries: Record<string, ZiiplySearchMemoryEntry> = {};

  for (const entry of entries) {
    if (!entry?.key || !entry?.productName) continue;
    migratedEntries[String(entry.key)] = {
      key: String(entry.key),
      query: String(entry.query || entry.canonicalQuery || ""),
      canonicalQuery: String(entry.canonicalQuery || entry.query || ""),
      correctedQuery: String(entry.correctedQuery || entry.canonicalQuery || entry.query || ""),
      intent: String(entry.intent || "unknown"),
      productKey: String(entry.productKey || ""),
      productName: String(entry.productName || ""),
      productCategory: entry.productCategory || undefined,
      productBrand: entry.productBrand || undefined,
      ean: entry.ean || undefined,
      positiveCount: Number(entry.positiveCount || 0),
      negativeCount: Number(entry.negativeCount || 0),
      lastEventType: entry.lastEventType || "selected",
      firstSeenAt: Number(entry.firstSeenAt || now()),
      lastSeenAt: Number(entry.lastSeenAt || now()),
    };
  }

  return { version: 2, savedAt: now(), entries: migratedEntries };
}

export function loadSearchIntentMemory(): ZiiplySearchMemoryStore {
  const storage = safeLocalStorage();
  if (!storage) return emptyStore();

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.version === 2 && parsed.entries) {
        return {
          version: 2,
          savedAt: Number(parsed.savedAt || now()),
          entries: parsed.entries,
        };
      }
    }

    const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) return migrateLegacyStore(JSON.parse(legacyRaw));

    return emptyStore();
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
      version: 2,
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
    correctedQuery: intent.correctedQuery || cleanQuery,
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

  if (!isProductAllowedByIntent(product, intent)) {
    return { boost: -100, positiveCount: 0, negativeCount: 0, reason: "blocked_by_intent_guardrail" };
  }

  const key = getMemoryEntryKey(query, product);
  const store = loadSearchIntentMemory();
  const entry = store.entries[key];

  if (!entry) return { boost: 0, positiveCount: 0, negativeCount: 0, reason: "no_memory" };

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
  if (!isProductAllowedByIntent(product, intent)) return -9999;
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
    .map((product) => ({ product, score: scoreProductWithIntentMemory(product, query, getBaseScore ? getBaseScore(product) : 0) }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);
}

export function getLearnedSuggestions(query: string, limit = 6): ZiiplySearchSuggestion[] {
  const cleanQuery = normalizeFi(query);
  const intent = resolveSearchIntentAI(query);
  const store = loadSearchIntentMemory();
  const canonical = normalizeFi(intent.canonicalQuery || cleanQuery);

  return Object.values(store.entries)
    .filter((entry) => {
      const entryQuery = normalizeFi(entry.canonicalQuery);
      return entryQuery === canonical || entryQuery.startsWith(cleanQuery) || entry.productName.toLowerCase().includes(cleanQuery);
    })
    .filter((entry) => (entry.positiveCount || 0) > (entry.negativeCount || 0))
    .sort((a, b) =>
      (b.positiveCount - b.negativeCount) - (a.positiveCount - a.negativeCount) || b.lastSeenAt - a.lastSeenAt
    )
    .slice(0, limit)
    .map((entry) => ({
      id: `learned:${entry.key}`,
      type: "product",
      label: entry.productName,
      value: entry.productName,
      category: entry.productCategory,
      brandName: entry.productBrand,
      ean: entry.ean,
      score: 70 + Math.min(30, entry.positiveCount * 4),
      reason: "learned_from_choices",
    }));
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
    correctedQuery: intent.correctedQuery,
    canonicalQuery: intent.canonicalQuery,
    memoryCount: entries.length,
    entries,
  };
}

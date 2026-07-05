// src/app/components/ziiply/offerSearch/ziiplyOfferSearchSources.ts
// ZIIPLY_OFFER_SEARCH_SOURCES_V11_WITHIN_CHAIN_S_MULTI_STORE_FIX
//
// V11 korjaus:
// - Gösta ei enää aja S-kaupat-provideria, kun kauppavalinta on Ketjun sisältä -> K-ryhmä.
// - K-provider valitaan mukaan scope/withinChain/kStoreId-kontekstin perusteella.
// - K-lähde valitaan kStoreName-nimen mukaan: K-Market / K-Supermarket / K-Citymarket.
// - Ketjujen väliltä voi ajaa sekä S- että K-providerit rinnakkain.
//
// V6 korjaus:
// - Special query __ziiply_all_offers__ runs a broad S-kaupat seed sweep once and bypasses intent ranking/matchScore filtering.
// - Gösta master dataset gets the provider offer list as-is, so local category counts are not based on a tiny ranked sample.
//
// V5 korjaus:
// - Vanhaa pelkän hakusanan välimuistia ei käytetä oletuksena, jotta Varkaus/Mikkeli-tyyppinen
//   stale tarjousdata ei voi jäädä kummittelemaan Göstan tuloksiin.
// - Tulosikkuna nostettu 40 -> 500, jotta kategoriat muodostuvat koko tarjouskirjosta eivätkä vain
//   ensimmäisestä pienestä ranked-otoksesta.
// - Säilyttää S-kaupat MVP -polun ja K-Ruoka-funktiot ennallaan.
//
// Debugin perusteella K-Ruoka palauttaa Vercel-serverille Cloudflare 403 -sivun,
// joten K-Market ja K-Supermarket pidetään mukana funktioina mutta ei ajeta
// yhdistetyssä MVP-haussa. S-kaupat palauttaa HTML:n oikein ja toimii ensin.

import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "./types";
import { fetchKruokaOffers, type KruokaOfferProviderOptionsV10 } from "./providers/kruokaProvider";
import { fetchSKaupatOffers, type SKaupatOfferProviderOptionsV173 } from "./providers/skaupatProvider";
import {
  getCachedOfferResults,
  setCachedOfferResults,
} from "./ziiplyOfferSearchCache";

import {
  resolveSearchIntentAI,
} from "../searchIntentAI";

import {
  rankProductsWithIntentMemory,
} from "../searchIntentMemory";

export type {
  ZiiplyOfferChain,
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
  ZiiplyOfferSource,
} from "./types";

export type ZiiplyOfferSearchSourceContextV8 = SKaupatOfferProviderOptionsV173 & KruokaOfferProviderOptionsV10 & {
  areaLabel?: string | null;
  storeMode?: string | null;
  storeCompareScope?: string | null;
  withinChain?: string | null;
  selectedChain?: string | null;
  sStoreId?: string | number | null;
  sStoreName?: string | null;
  sStoreIds?: Array<string | number | null | undefined> | null;
  sStoreNames?: Array<string | null | undefined> | null;
  kStoreId?: string | number | null;
  kStoreName?: string | null;
  kStoreIds?: Array<string | number | null | undefined> | null;
  kStoreNames?: Array<string | null | undefined> | null;
};

function splitOfferMultiValueV11(value: unknown): string[] {
  return String(value ?? "")
    .split(/\s*(?:\|\||;|\n)\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeOfferStoreListV11(arrayValue: unknown, fallbackValue: unknown): string[] {
  const fromArray = Array.isArray(arrayValue)
    ? arrayValue.map((value) => String(value ?? "").trim()).filter(Boolean)
    : [];

  return Array.from(new Set([...fromArray, ...splitOfferMultiValueV11(fallbackValue)]));
}

function hasAnyOfferStoreV11(arrayValue: unknown, fallbackValue: unknown): boolean {
  return normalizeOfferStoreListV11(arrayValue, fallbackValue).some(isRealStoreIdV10);
}

function normalizeSKaupatProviderOptionsV8(
  options?: ZiiplyOfferSearchSourceContextV8,
): SKaupatOfferProviderOptionsV173 | undefined {
  if (!options) return undefined;

  // Route/page context uses sStoreId/sStoreName, while skaupatProvider expects
  // storeId/storeName. Without this bridge the provider cannot resolve the
  // selected S-store and may return [] or leave the UI showing stale results.
  return {
    ...options,
    storeId: options.storeId ?? options.sStoreId ?? null,
    storeName: options.storeName ?? options.sStoreName ?? null,
  };
}


function normalizeKruokaProviderOptionsV9(
  options?: ZiiplyOfferSearchSourceContextV8,
): KruokaOfferProviderOptionsV10 | undefined {
  if (!options) return undefined;

  return {
    ...options,
    storeId: options.kStoreId ?? options.storeId ?? null,
    storeName: options.kStoreName ?? options.storeName ?? null,
    kStoreId: options.kStoreId ?? null,
    kStoreName: options.kStoreName ?? null,
  };
}

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
  kcitymarket: {
    id: "kcitymarket",
    chain: "K",
    storeLabel: "K-Citymarket",
    url: "https://www.k-ruoka.fi/k-citymarket/tarjouslehti",
  },
  skaupat: {
    id: "skaupat",
    chain: "S",
    storeLabel: "S-kaupat",
    url: "https://www.s-kaupat.fi/tuotteet/kampanjat",
  },
} satisfies Record<string, ZiiplyOfferSearchSourceConfig>;

const OFFER_SEARCH_SOURCE_REVISION = "v11";
const ENABLE_OFFER_SEARCH_CACHE = false;
const MAX_OFFER_SEARCH_RESULTS = 1000;
const ZIIPLY_GOSTA_MASTER_QUERY_V6 = "__ziiply_all_offers__";

// V8: master query is passed directly to provider; provider handles DISCOUNTED filter.

function getOfferSearchCacheKey(query: string) {
  return `${OFFER_SEARCH_SOURCE_REVISION}:${query}`;
}

function normalizeOfferUniqueText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9åäö\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getUniqueOfferKeyV4(result: ZiiplyOfferSearchResult) {
  const anyResult = result as any;
  const ean = normalizeOfferUniqueText(anyResult.ean || anyResult.gtin || anyResult.barcode || "");

  if (ean) return `ean:${ean}`;

  const title = normalizeOfferUniqueText(result.title);
  const store = normalizeOfferUniqueText(result.storeLabel);

  if (title) return `title:${title}|store:${store}`;

  return normalizeOfferUniqueText(
    [result.source, result.title, result.priceText].filter(Boolean).join("|"),
  );
}

function uniqueOfferResults(results: ZiiplyOfferSearchResult[]) {
  const seen = new Set<string>();
  const unique: ZiiplyOfferSearchResult[] = [];

  for (const result of results) {
    const key = getUniqueOfferKeyV4(result);
    if (!key || seen.has(key)) continue;
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

export async function searchKMarketOffers(
  query: string,
  options?: KruokaOfferProviderOptionsV10,
) {
  return fetchKruokaOffers(query, ZIIPLY_OFFER_SOURCES.kmarket, options);
}

export async function searchKSupermarketOffers(
  query: string,
  options?: KruokaOfferProviderOptionsV10,
) {
  return fetchKruokaOffers(query, ZIIPLY_OFFER_SOURCES.ksupermarket, options);
}


export async function searchKCitymarketOffers(
  query: string,
  options?: KruokaOfferProviderOptionsV10,
) {
  return fetchKruokaOffers(query, ZIIPLY_OFFER_SOURCES.kcitymarket, options);
}

function isRealStoreIdV10(value: unknown) {
  const text = String(value ?? "").trim();
  return Boolean(text && text !== "0" && !/^valitse/i.test(text));
}

function normalizeChainValueV10(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

function getProviderScopeV10(options?: ZiiplyOfferSearchSourceContextV8) {
  const scope = String(options?.storeCompareScope ?? "").trim();
  const withinChain = normalizeChainValueV10((options as any)?.withinChain ?? (options as any)?.selectedChain);
  const hasS = hasAnyOfferStoreV11(options?.sStoreIds, options?.sStoreId ?? options?.storeId);
  const hasK = hasAnyOfferStoreV11(options?.kStoreIds, options?.kStoreId);

  if (scope === "within_chain") {
    // Tärkein korjaus:
    // Ketjun sisältä / K-ryhmässä vanha activeStores voi edelleen sisältää S-kaupan.
    // Silloin S-provider EI saa ajaa, koska Gösta näyttää muuten Prisma/S-kaupat-osumia.
    if (withinChain === "K") return { useS: false, useK: hasK };
    if (withinChain === "S") return { useS: hasS, useK: false };

    // Fallback vanhoille page-versioille, joissa withinChain ei vielä tule contextiin.
    if (hasK) return { useS: false, useK: true };
    if (hasS) return { useS: true, useK: false };
  }

  return {
    useS: hasS || scope !== "within_chain",
    useK: hasK,
  };
}

function getKruokaSourceByStoreNameV10(options?: ZiiplyOfferSearchSourceContextV8): ZiiplyOfferSearchSourceConfig {
  const name = normalizeOfferUniqueText(options?.kStoreName ?? options?.storeName ?? "");

  if (name.includes("citymarket") || name.includes("k citymarket")) {
    return {
      ...ZIIPLY_OFFER_SOURCES.kcitymarket,
      storeLabel: String(options?.kStoreName || ZIIPLY_OFFER_SOURCES.kcitymarket.storeLabel),
    };
  }

  if (name.includes("supermarket") || name.includes("k supermarket")) {
    return {
      ...ZIIPLY_OFFER_SOURCES.ksupermarket,
      storeLabel: String(options?.kStoreName || ZIIPLY_OFFER_SOURCES.ksupermarket.storeLabel),
    };
  }

  return {
    ...ZIIPLY_OFFER_SOURCES.kmarket,
    storeLabel: String(options?.kStoreName || ZIIPLY_OFFER_SOURCES.kmarket.storeLabel),
  };
}

export async function searchSelectedKruokaOffersV10(
  query: string,
  options?: ZiiplyOfferSearchSourceContextV8,
) {
  const source = getKruokaSourceByStoreNameV10(options);
  const kOptions = normalizeKruokaProviderOptionsV9(options);
  return fetchKruokaOffers(query, source, kOptions);
}

export async function searchSKaupatOffers(
  query: string,
  options?: SKaupatOfferProviderOptionsV173,
) {
  return fetchSKaupatOffers(query, ZIIPLY_OFFER_SOURCES.skaupat, options);
}

export async function searchSelectedSKaupatOffersV11(
  query: string,
  options?: ZiiplyOfferSearchSourceContextV8,
) {
  const ids = normalizeOfferStoreListV11(options?.sStoreIds, options?.sStoreId ?? options?.storeId);
  const names = normalizeOfferStoreListV11(options?.sStoreNames, options?.sStoreName ?? options?.storeName);
  const maxLength = Math.max(ids.length, names.length);

  if (maxLength <= 1) {
    return searchSKaupatOffers(query, normalizeSKaupatProviderOptionsV8(options));
  }

  const allResults: ZiiplyOfferSearchResult[] = [];
  const seenStores = new Set<string>();

  for (let index = 0; index < maxLength; index += 1) {
    const storeId = ids[index] || "";
    const storeName = names[index] || "";
    const key = `${storeId}|${storeName}`.toLowerCase();
    if (!storeId && !storeName) continue;
    if (seenStores.has(key)) continue;
    seenStores.add(key);

    const storeResults = await searchSKaupatOffers(query, {
      ...(normalizeSKaupatProviderOptionsV8(options) as any),
      storeId: storeId || null,
      storeName: storeName || null,
      sStoreId: storeId || null,
      sStoreName: storeName || null,
    } as SKaupatOfferProviderOptionsV173);

    allResults.push(...storeResults);
  }

  return allResults;
}

export async function searchZiiplyOffers(
  query: string,
  options?: ZiiplyOfferSearchSourceContextV8,
) {
  const cleanQuery = query.trim();

  if (!cleanQuery) return [];

  const isGostaMasterQuery = normalizeOfferUniqueText(cleanQuery) === normalizeOfferUniqueText(ZIIPLY_GOSTA_MASTER_QUERY_V6);

  const providerOptions = normalizeSKaupatProviderOptionsV8(options);
  const kProviderOptions = normalizeKruokaProviderOptionsV9(options);
  const hasSelectedKStoreV9 = Boolean(kProviderOptions?.storeId || kProviderOptions?.kStoreId);

  const cacheKey = getOfferSearchCacheKey(cleanQuery);
  const cached = ENABLE_OFFER_SEARCH_CACHE ? getCachedOfferResults(cacheKey) : null;
  if (cached) return cached;

  const providerScopeV10 = getProviderScopeV10(options);

  if (typeof console !== "undefined") {
    console.warn("[Ziiply offers V10 provider scope]", {
      query: cleanQuery,
      storeCompareScope: options?.storeCompareScope,
      withinChain: (options as any)?.withinChain,
      sStoreId: options?.sStoreId,
      sStoreName: options?.sStoreName,
      kStoreId: options?.kStoreId,
      kStoreName: options?.kStoreName,
      providerScopeV10,
    });
  }

  const sKaupatResults = providerScopeV10.useS
    ? await safelySearchSource(
        isGostaMasterQuery ? "S-kaupat master V10" : "S-kaupat V10",
        () => searchSelectedSKaupatOffersV11(cleanQuery, options),
      )
    : [];

  const kResults = providerScopeV10.useK && hasSelectedKStoreV9
    ? await safelySearchSource(
        isGostaMasterQuery ? "K-Ruoka master V10" : "K-Ruoka V10",
        () => searchSelectedKruokaOffersV10(cleanQuery, options),
      )
    : [];

  const uniqueAllResults = uniqueOfferResults([
    ...sKaupatResults,
    ...kResults,
  ]);

  const results = isGostaMasterQuery
    ? uniqueAllResults.slice(0, MAX_OFFER_SEARCH_RESULTS)
    : (() => {
        const intent = resolveSearchIntentAI(cleanQuery);

        const rankedResults = rankProductsWithIntentMemory(
          uniqueAllResults
            .filter((result) => Number(result.matchScore || 0) > 0)
            .map((result) => ({
              ...result,
              category:
                result.rawText ||
                result.title ||
                "",
              brandName: result.storeLabel,
            })),
          cleanQuery,
          (product) => Number(product.matchScore || 0),
        );

        return rankedResults
          .sort((a, b) => {
            const aExact =
              a.title?.toLowerCase().includes(intent.canonicalQuery.toLowerCase()) ? 1 : 0;
            const bExact =
              b.title?.toLowerCase().includes(intent.canonicalQuery.toLowerCase()) ? 1 : 0;

            if (aExact !== bExact) {
              return bExact - aExact;
            }

            return Number(b.matchScore || 0) - Number(a.matchScore || 0);
          })
          .slice(0, MAX_OFFER_SEARCH_RESULTS);
      })();

  if (ENABLE_OFFER_SEARCH_CACHE) {
    setCachedOfferResults(cacheKey, results);
  }

  return results;
}

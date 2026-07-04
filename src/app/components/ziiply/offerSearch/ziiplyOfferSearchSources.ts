// src/app/components/ziiply/offerSearch/ziiplyOfferSearchSources.ts
// ZIIPLY_OFFER_SEARCH_SOURCES_V13_VISIBLE_K_DEBUG
//
// V13 korjaus:
// - Jos K-scope on aktiivinen mutta K-provideria ei ajeta tai se palauttaa 0,
//   palautetaan näkyvä GÖSTA K DEBUG -kortti iPhoneen.
//
// V12 korjaus:
// - Tukee useaa K-kauppaa samassa Gösta-haussa.
// - page.tsx V530 voi lähettää kStoreId="cityId,localId" ja kStoreName="City || Local".
// - K-provider ajetaan jokaiselle K-kaupalle erikseen ja tulokset yhdistetään.
// - Jos Citymarket palauttaa 0, K-Market/K-Supermarketin tarjoukset näkyvät silti.
//
// V10 korjaus:
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
  sStoreId?: string | number | null;
  sStoreName?: string | null;
  kStoreId?: string | number | null;
  kStoreName?: string | null;
};

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
    id: "ksupermarket",
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

const OFFER_SEARCH_SOURCE_REVISION = "v13";
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
  const hasS = isRealStoreIdV10(options?.sStoreId ?? options?.storeId);
  const hasK = isRealStoreIdV10(options?.kStoreId);

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


function splitMultiValueV12(value: unknown): string[] {
  return String(value ?? "")
    .split(/\s*(?:,|\|\||;|\n)\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getKruokaStoreOptionsListV12(
  options?: ZiiplyOfferSearchSourceContextV8,
): KruokaOfferProviderOptionsV10[] {
  if (!options) return [];

  const ids = splitMultiValueV12(options.kStoreId ?? options.storeId);
  const names = splitMultiValueV12(options.kStoreName ?? options.storeName);

  const maxLength = Math.max(ids.length, names.length);
  const result: KruokaOfferProviderOptionsV10[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < maxLength; index += 1) {
    const storeId = ids[index] || ids[0] || "";
    const storeName = names[index] || names[0] || "";

    if (!isRealStoreIdV10(storeId)) continue;

    const key = `${storeId}|${storeName}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      ...options,
      storeId,
      storeName,
      kStoreId: storeId,
      kStoreName: storeName,
    });
  }

  return result;
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

export async function searchSelectedKruokaOffersV12(
  query: string,
  options?: ZiiplyOfferSearchSourceContextV8,
) {
  const storeOptions = getKruokaStoreOptionsListV12(options);

  if (storeOptions.length === 0) return [];

  const allResults = await Promise.all(
    storeOptions.map(async (storeOption) => {
      const source = getKruokaSourceByStoreNameV10(storeOption as ZiiplyOfferSearchSourceContextV8);
      return safelySearchSource(
        `K-Ruoka V12 ${String(storeOption.kStoreName || storeOption.storeName || storeOption.kStoreId || storeOption.storeId)}`,
        () => fetchKruokaOffers(query, source, storeOption),
      );
    }),
  );

  return allResults.flat();
}

export async function searchSKaupatOffers(
  query: string,
  options?: SKaupatOfferProviderOptionsV173,
) {
  return fetchSKaupatOffers(query, ZIIPLY_OFFER_SOURCES.skaupat, options);
}


function makeVisibleKSourceDebugResultV13(details: {
  query: string;
  options?: ZiiplyOfferSearchSourceContextV8;
  providerScope: { useS: boolean; useK: boolean };
  kProviderOptionsList: KruokaOfferProviderOptionsV10[];
  reason: string;
}): ZiiplyOfferSearchResult {
  const kStores = details.kProviderOptionsList
    .map((store, index) => `${index + 1}:${String(store.kStoreId || store.storeId || "-")} ${String(store.kStoreName || store.storeName || "-")}`)
    .join(" | ");

  const lines = [
    "GÖSTA K DEBUG",
    `reason=${details.reason}`,
    `query=${details.query || "-"}`,
    `scope=${String(details.options?.storeCompareScope || "-")}`,
    `withinChain=${String((details.options as any)?.withinChain || (details.options as any)?.selectedChain || "-")}`,
    `useS=${details.providerScope.useS ? "yes" : "no"}`,
    `useK=${details.providerScope.useK ? "yes" : "no"}`,
    `sStoreId=${String(details.options?.sStoreId || "-")}`,
    `sStoreName=${String(details.options?.sStoreName || "-")}`,
    `kStoreId=${String(details.options?.kStoreId || "-")}`,
    `kStoreName=${String(details.options?.kStoreName || "-")}`,
    `kStores=${kStores || "-"}`,
  ];

  return {
    id: `k-source-debug-${Date.now()}`,
    source: "kmarket" as any,
    chain: "K" as any,
    title: lines.join(" · "),
    priceText: "0,00 €",
    unitPriceText: "",
    validityText: "",
    benefitText: "Debug-kortti: source-layer ei saanut yhtään oikeaa K-tarjousta.",
    storeLabel: "K DEBUG SOURCES",
    productUrl: "",
    imageUrl: "",
    rawText: lines.join(" "),
    matchScore: 9999,
    category: "Muut",
    categoryPath: "Debug / Muut",
    breadcrumbs: "Debug / Muut",
    hierarchy: "Debug / Muut",
    department: "Debug",
    productGroup: "Muut",
    mainCategory: "Debug",
    subCategory: "Muut",
    _debugKProviderRevision: "ZIIPLY_OFFER_SEARCH_SOURCES_V13_VISIBLE_K_DEBUG",
  } as unknown as ZiiplyOfferSearchResult;
}


export async function searchZiiplyOffers(
  query: string,
  options?: ZiiplyOfferSearchSourceContextV8,
) {
  const cleanQuery = query.trim();

  if (!cleanQuery) return [];

  const isGostaMasterQuery = normalizeOfferUniqueText(cleanQuery) === normalizeOfferUniqueText(ZIIPLY_GOSTA_MASTER_QUERY_V6);

  const providerOptions = normalizeSKaupatProviderOptionsV8(options);
  const kProviderOptionsListV12 = getKruokaStoreOptionsListV12(options);
  const hasSelectedKStoreV9 = kProviderOptionsListV12.length > 0;

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
      kProviderOptionsListV12,
      providerScopeV10,
    });
  }

  const sKaupatResults = providerScopeV10.useS
    ? await safelySearchSource(
        isGostaMasterQuery ? "S-kaupat master V10" : "S-kaupat V10",
        () => searchSKaupatOffers(cleanQuery, providerOptions),
      )
    : [];

  let kResults = providerScopeV10.useK && hasSelectedKStoreV9
    ? await safelySearchSource(
        isGostaMasterQuery ? "K-Ruoka master V13 multi-store" : "K-Ruoka V13 multi-store",
        () => searchSelectedKruokaOffersV12(cleanQuery, options),
      )
    : [];

  if (providerScopeV10.useK && !hasSelectedKStoreV9) {
    kResults = [
      makeVisibleKSourceDebugResultV13({
        query: cleanQuery,
        options,
        providerScope: providerScopeV10,
        kProviderOptionsList: kProviderOptionsListV12,
        reason: "K scope active but no usable kStoreId/kStoreName reached sources",
      }),
    ];
  }

  if (providerScopeV10.useK && hasSelectedKStoreV9 && kResults.length === 0) {
    kResults = [
      makeVisibleKSourceDebugResultV13({
        query: cleanQuery,
        options,
        providerScope: providerScopeV10,
        kProviderOptionsList: kProviderOptionsListV12,
        reason: "K provider returned zero results",
      }),
    ];
  }

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

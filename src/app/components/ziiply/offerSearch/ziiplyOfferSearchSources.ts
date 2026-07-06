// src/app/components/ziiply/offerSearch/ziiplyOfferSearchSources.ts
// ZIIPLY_OFFER_SEARCH_SOURCES_V18_MASTER_ONLY_ETARJOUS_DEBUG
//
// V15 korjaus:
// - Göstan tuoteryhmähaussa tunnettu kategoria (Liha, Valmisruoka jne.) suodatetaan providerin omasta category-kentästä.
// - Non-food kuten paistinpannu/muovilaatikko ei enää pääse Liha/Valmisruoka-hakuun vain siksi, että hakusana/ranker osuu.
// - Ranking ei enää ylikirjoita result.category-kenttää rawTextillä, koska se sotki kortin tuoteryhmämerkintöjä.
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
  fetchETarjouslehdetOffers,
  type ETarjouslehdetProviderOptions,
} from "./providers/etarjouslehdetProvider";
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

export type ZiiplyOfferSearchSourceContextV8 = SKaupatOfferProviderOptionsV173 & KruokaOfferProviderOptionsV10 & ETarjouslehdetProviderOptions & {
  areaLabel?: string | null;
  storeMode?: string | null;
  storeCompareScope?: string | null;
  withinChain?: string | null;
  selectedChain?: string | null;
  sStoreId?: string | number | null;
  sStoreName?: string | null;
  sStoreIds?: Array<string | number | null | undefined> | null;
  sStoreNames?: Array<string | null | undefined> | null;
  etarjouslehdetStoreId?: string | null;
  eTarjouslehdetStoreId?: string | null;
  tjekStoreId?: string | null;
  etarjouslehdetStoreIds?: Array<string | null | undefined> | null;
  eTarjouslehdetStoreIds?: Array<string | null | undefined> | null;
  tjekStoreIds?: Array<string | null | undefined> | null;
  etarjouslehdetStoreNames?: Array<string | null | undefined> | null;
  kStoreId?: string | number | null;
  kStoreName?: string | null;
  kStoreIds?: Array<string | number | null | undefined> | null;
  kStoreNames?: Array<string | null | undefined> | null;
};

function splitOfferMultiValueV13(value: unknown): string[] {
  const normalized = String(value ?? "")
    .replaceAll("\r", "")
    .replaceAll("\n", "||")
    .replaceAll(";", "||");

  return normalized
    .split("||")
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeOfferStoreListV11(arrayValue: unknown, fallbackValue: unknown): string[] {
  const fromArray = Array.isArray(arrayValue)
    ? arrayValue.map((value) => String(value ?? "").trim()).filter(Boolean)
    : [];

  return Array.from(new Set([...fromArray, ...splitOfferMultiValueV13(fallbackValue)]));
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


function isSMarketStoreNameV16(value: unknown) {
  const name = normalizeOfferUniqueText(value);
  return name.includes("s market") || name.includes("smarket");
}

function normalizeSKaupatProviderOptionsWithoutSMarketsV16(
  options?: ZiiplyOfferSearchSourceContextV8,
): SKaupatOfferProviderOptionsV173 | undefined {
  const base = normalizeSKaupatProviderOptionsV8(options);
  if (!base || !options) return base;

  const ids = normalizeOfferStoreListV11(options?.sStoreIds, options?.sStoreId ?? options?.storeId);
  const names = normalizeOfferStoreListV11(options?.sStoreNames, options?.sStoreName ?? options?.storeName);
  const maxLength = Math.max(ids.length, names.length);

  if (maxLength === 0) return base;

  const keptIds: string[] = [];
  const keptNames: string[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const storeId = ids[index] || "";
    const storeName = names[index] || "";

    // Prisma jää AINA S-kaupat.fi-hakuun. S-marketit poistetaan tästä providerista,
    // koska ne haetaan erillisellä eTarjouslehdet/Tjek-providerilla.
    if (isSMarketStoreNameV16(storeName)) continue;

    keptIds.push(storeId);
    keptNames.push(storeName);
  }

  if (keptIds.length === 0 && keptNames.length === 0) {
    return {
      ...base,
      storeId: null,
      storeName: null,
      sStoreId: null,
      sStoreName: null,
      storeIds: [],
      storeNames: [],
      sStoreIds: [],
      sStoreNames: [],
      stores: [],
    };
  }

  return {
    ...base,
    storeId: keptIds[0] || null,
    storeName: keptNames[0] || null,
    sStoreId: keptIds[0] || null,
    sStoreName: keptNames[0] || null,
    storeIds: keptIds,
    storeNames: keptNames,
    sStoreIds: keptIds,
    sStoreNames: keptNames,
    stores: keptIds.map((storeId, index) => ({
      storeId,
      storeName: keptNames[index] || null,
      sStoreId: storeId,
      sStoreName: keptNames[index] || null,
    })),
  };
}

function normalizeETarjouslehdetProviderOptionsV16(
  options?: ZiiplyOfferSearchSourceContextV8,
): ETarjouslehdetProviderOptions | undefined {
  if (!options) return undefined;

  const ids = normalizeOfferStoreListV11(
    options?.etarjouslehdetStoreIds ?? options?.eTarjouslehdetStoreIds ?? options?.tjekStoreIds,
    options?.etarjouslehdetStoreId ?? options?.eTarjouslehdetStoreId ?? options?.tjekStoreId,
  );
  const names = normalizeOfferStoreListV11(
    options?.etarjouslehdetStoreNames,
    options?.sStoreName ?? options?.storeName,
  );
  const sNames = normalizeOfferStoreListV11(options?.sStoreNames, options?.sStoreName ?? options?.storeName);
  const maxLength = Math.max(ids.length, names.length, sNames.length);

  const stores = [];

  for (let index = 0; index < maxLength; index += 1) {
    const etarjouslehdetStoreId = ids[index] || "";
    const storeName = names[index] || sNames[index] || "";

    if (!etarjouslehdetStoreId) continue;
    if (storeName && !isSMarketStoreNameV16(storeName)) continue;

    stores.push({
      storeId: etarjouslehdetStoreId,
      storeName: storeName || "S-market",
      etarjouslehdetStoreId,
      eTarjouslehdetStoreId: etarjouslehdetStoreId,
      tjekStoreId: etarjouslehdetStoreId,
      chain: "S-market",
    });
  }

  return {
    ...options,
    stores,
    etarjouslehdetStoreId: ids[0] || null,
    eTarjouslehdetStoreId: ids[0] || null,
    tjekStoreId: ids[0] || null,
    storeName: names[0] || sNames[0] || options.storeName || null,
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
    // ZiiplyOfferSource-type ei tunne erillistä kcitymarket-id:tä; käytetään ksupermarket-id:tä kuten aiemmassa build-ok versiossa.
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
  etarjouslehdet: {
    id: "skaupat",
    chain: "S",
    storeLabel: "S-market",
    url: "https://etarjouslehdet.fi/S-market",
  },
} satisfies Record<string, ZiiplyOfferSearchSourceConfig>;

const OFFER_SEARCH_SOURCE_REVISION = "v18-etarjous-master-only-debug";
const ENABLE_OFFER_SEARCH_CACHE = false;
const MAX_OFFER_SEARCH_RESULTS = 1000;
const ZIIPLY_GOSTA_MASTER_QUERY_V6 = "__ziiply_all_offers__";

// V8: master query is passed directly to provider; provider handles DISCOUNTED filter.


const STRICT_GOSTA_CATEGORY_QUERIES_V15 = new Set([
  "kahvi",
  "maitotuotteet",
  "liha",
  "kala",
  "leipomo",
  "hevi",
  "juomat",
  "pakasteet",
  "valmisruoka",
  "kuivatuotteet",
  "makeiset keksit",
  "lemmikit",
  "koti",
  "muut",
]);

function normalizeGostaCategoryKeyV15(value: unknown) {
  return normalizeOfferUniqueText(value)
    .replace(/&/g, " ")
    .replace(/\bja\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getResultCategoryTextV15(result: ZiiplyOfferSearchResult) {
  const anyResult = result as any;
  return String(
    anyResult.category ||
      anyResult.categoryLabel ||
      anyResult.group ||
      anyResult.department ||
      anyResult.productGroup ||
      "",
  ).trim();
}

function isStrictGostaCategoryQueryV15(query: string) {
  return STRICT_GOSTA_CATEGORY_QUERIES_V15.has(normalizeGostaCategoryKeyV15(query));
}

function offerMatchesStrictGostaCategoryV15(result: ZiiplyOfferSearchResult, query: string) {
  const queryKey = normalizeGostaCategoryKeyV15(query);
  const categoryKey = normalizeGostaCategoryKeyV15(getResultCategoryTextV15(result));

  if (!queryKey || !categoryKey) return false;
  if (categoryKey === queryKey) return true;

  // Makeiset & keksit voi tulla eri lähteistä muodossa "Makeiset", "Keksit" tai "Makeiset ja keksit".
  if (queryKey === "makeiset keksit") {
    return categoryKey === "makeiset" || categoryKey === "keksit" || categoryKey === "makeiset keksit";
  }

  return false;
}

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
  const skaupatOptions = normalizeSKaupatProviderOptionsWithoutSMarketsV16(options);
  const ids = normalizeOfferStoreListV11(skaupatOptions?.sStoreIds, skaupatOptions?.sStoreId ?? skaupatOptions?.storeId);
  const names = normalizeOfferStoreListV11(skaupatOptions?.sStoreNames, skaupatOptions?.sStoreName ?? skaupatOptions?.storeName);
  const maxLength = Math.max(ids.length, names.length);

  if (maxLength <= 1) {
    return searchSKaupatOffers(query, skaupatOptions);
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
      ...(skaupatOptions as any),
      storeId: storeId || null,
      storeName: storeName || null,
      sStoreId: storeId || null,
      sStoreName: storeName || null,
    } as SKaupatOfferProviderOptionsV173);

    allResults.push(...storeResults);
  }

  return allResults;
}

export async function searchSelectedETarjouslehdetOffersV16(
  query: string,
  options?: ZiiplyOfferSearchSourceContextV8,
) {
  const etarjousOptions = normalizeETarjouslehdetProviderOptionsV16(options);

  console.warn("[ETARJOUS DEBUG V18 sources] normalized options", {
    query,
    incomingSStoreId: options?.sStoreId,
    incomingSStoreName: options?.sStoreName,
    incomingSStoreIds: options?.sStoreIds,
    incomingSStoreNames: options?.sStoreNames,
    incomingETStoreId: options?.etarjouslehdetStoreId ?? options?.eTarjouslehdetStoreId ?? options?.tjekStoreId,
    incomingETStoreIds: options?.etarjouslehdetStoreIds ?? options?.eTarjouslehdetStoreIds ?? options?.tjekStoreIds,
    normalizedStores: etarjousOptions?.stores ?? [],
  });

  // V17 DEBUG: älä palauta tyhjää tässä. Anna providerin palauttaa näkyvä DBG-kortti,
  // jos eTarjouslehdet-storeId puuttuu kokonaan. Näin nähdään UI:ssa asti, miksi S-market puuttuu.
  return fetchETarjouslehdetOffers(
    query,
    ZIIPLY_OFFER_SOURCES.etarjouslehdet,
    etarjousOptions,
  );
}

export async function searchZiiplyOffers(
  query: string,
  options?: ZiiplyOfferSearchSourceContextV8,
) {
  const cleanQuery = query.trim();

  if (!cleanQuery) return [];

  const isGostaMasterQuery = normalizeOfferUniqueText(cleanQuery) === normalizeOfferUniqueText(ZIIPLY_GOSTA_MASTER_QUERY_V6);

  const providerOptions = normalizeSKaupatProviderOptionsWithoutSMarketsV16(options);
  const kProviderOptions = normalizeKruokaProviderOptionsV9(options);
  const hasSelectedKStoreV9 = Boolean(kProviderOptions?.storeId || kProviderOptions?.kStoreId);

  const cacheKey = getOfferSearchCacheKey(cleanQuery);
  const cached = ENABLE_OFFER_SEARCH_CACHE ? getCachedOfferResults(cacheKey) : null;
  if (cached) return cached;

  const providerScopeV10 = getProviderScopeV10(options);

  if (typeof console !== "undefined") {
    console.warn("[Ziiply offers V18 provider scope DEBUG]", {
      query: cleanQuery,
      storeCompareScope: options?.storeCompareScope,
      withinChain: (options as any)?.withinChain,
      sStoreId: options?.sStoreId,
      sStoreName: options?.sStoreName,
      sStoreIds: options?.sStoreIds,
      sStoreNames: options?.sStoreNames,
      etarjouslehdetStoreId: options?.etarjouslehdetStoreId ?? options?.eTarjouslehdetStoreId ?? options?.tjekStoreId,
      etarjouslehdetStoreIds: options?.etarjouslehdetStoreIds ?? options?.eTarjouslehdetStoreIds ?? options?.tjekStoreIds,
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

  // V18: eTarjouslehdet/Tjek ajetaan VAIN Göstan aktiiviset tarjoukset -masterhaussa.
  // Ei tekstikenttähaussa, koska Gösta ei hae S-market-tarjouslehteä vapaalla tekstillä.
  const eTarjouslehdetResults = isGostaMasterQuery && providerScopeV10.useS
    ? await safelySearchSource(
        "eTarjouslehdet master V18 DEBUG",
        () => searchSelectedETarjouslehdetOffersV16(cleanQuery, options),
      )
    : [];

  const kResults = providerScopeV10.useK && hasSelectedKStoreV9
    ? await safelySearchSource(
        isGostaMasterQuery ? "K-Ruoka master V10" : "K-Ruoka V10",
        () => searchSelectedKruokaOffersV10(cleanQuery, options),
      )
    : [];

  console.warn("[ETARJOUS DEBUG V18 counts]", {
    query: cleanQuery,
    sKaupatCount: sKaupatResults.length,
    eTarjouslehdetCount: eTarjouslehdetResults.length,
    kCount: kResults.length,
  });

  const uniqueAllResults = uniqueOfferResults([
    ...sKaupatResults,
    ...eTarjouslehdetResults,
    ...kResults,
  ]);

  const strictCategoryQueryV15 = isStrictGostaCategoryQueryV15(cleanQuery);

  const results = isGostaMasterQuery
    ? uniqueAllResults.slice(0, MAX_OFFER_SEARCH_RESULTS)
    : strictCategoryQueryV15
      ? uniqueAllResults
          .filter((result) => offerMatchesStrictGostaCategoryV15(result, cleanQuery))
          .sort((a, b) => Number(b.matchScore || 0) - Number(a.matchScore || 0))
          .slice(0, MAX_OFFER_SEARCH_RESULTS)
      : (() => {
          const intent = resolveSearchIntentAI(cleanQuery);

          const rankedResults = rankProductsWithIntentMemory(
            uniqueAllResults
              .filter((result) => Number(result.matchScore || 0) > 0)
              .map((result) => ({
                ...result,
                // Älä ylikirjoita result.category-kenttää rawTextillä.
                // Kortti ja tuoteryhmäcountit käyttävät alkuperäistä providerin category-arvoa.
                brandName: (result as any).brandName || result.storeLabel,
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

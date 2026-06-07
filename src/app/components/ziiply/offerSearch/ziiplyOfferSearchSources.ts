// src/app/components/ziiply/offerSearch/ziiplyOfferSearchSources.ts
// ZIIPLY_OFFER_SEARCH_SOURCES_V8_GOSTA_MASTER_PROVIDER_DIRECT
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
import { fetchKruokaOffers } from "./providers/kruokaProvider";
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

export type ZiiplyOfferSearchSourceContextV8 = SKaupatOfferProviderOptionsV173;

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
  skaupat: {
    id: "skaupat",
    chain: "S",
    storeLabel: "S-kaupat",
    url: "https://www.s-kaupat.fi/tuotteet/kampanjat",
  },
} satisfies Record<string, ZiiplyOfferSearchSourceConfig>;

const OFFER_SEARCH_SOURCE_REVISION = "v8";
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

export async function searchKMarketOffers(query: string) {
  return fetchKruokaOffers(query, ZIIPLY_OFFER_SOURCES.kmarket);
}

export async function searchKSupermarketOffers(query: string) {
  return fetchKruokaOffers(query, ZIIPLY_OFFER_SOURCES.ksupermarket);
}

export async function searchSKaupatOffers(
  query: string,
  options?: SKaupatOfferProviderOptionsV173,
) {
  return fetchSKaupatOffers(query, ZIIPLY_OFFER_SOURCES.skaupat, options);
}

export async function searchZiiplyOffers(
  query: string,
  options?: SKaupatOfferProviderOptionsV173,
) {
  const cleanQuery = query.trim();

  if (!cleanQuery) return [];

  const isGostaMasterQuery = normalizeOfferUniqueText(cleanQuery) === normalizeOfferUniqueText(ZIIPLY_GOSTA_MASTER_QUERY_V6);

  const cacheKey = getOfferSearchCacheKey(cleanQuery);
  const cached = ENABLE_OFFER_SEARCH_CACHE ? getCachedOfferResults(cacheKey) : null;
  if (cached) return cached;

  // V2 MVP: vain S-kaupat aktiivisena, koska K-Ruoka blokkaa serverifetchin 403:lla.
  // V7: Göstan master-haku EI saa välittää taikahakusanaa S-kaupat API:n queryStringiksi.
  // Sen sijaan haetaan kerran laajalla ruokakori-/arjen seed-joukolla ja annetaan corelle
  // master-datasetti, jota kategoriat voivat suodattaa paikallisesti.
  const sKaupatResults = isGostaMasterQuery
    ? await safelySearchSource("S-kaupat master", () =>
        searchSKaupatOffers(cleanQuery, options),
      )
    : await safelySearchSource("S-kaupat", () =>
        searchSKaupatOffers(cleanQuery, options),
      );

  const uniqueSResults = uniqueOfferResults(sKaupatResults);

  const results = isGostaMasterQuery
    ? uniqueSResults.slice(0, MAX_OFFER_SEARCH_RESULTS)
    : (() => {
        const intent = resolveSearchIntentAI(cleanQuery);

        const rankedResults = rankProductsWithIntentMemory(
          uniqueSResults
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

// ============================================================================
// ZIIPLY_OFFER_SEARCH_SOURCES_V34_KRUOKA_DEBUG_BRIDGE
// Revision: V34-KRUOKA-DEBUG-BRIDGE
// Date: 2026-09-20
//
// Muutos V33:een:
// - Välittää kruokaProvider V49:n viimeisimmän pipeline-debugtilan page.tsx:lle.
// - Ei muuta S/K-provider-reititystä eikä tarjoushakua.
// ============================================================================

// ============================================================================
// ZIIPLY_OFFER_SEARCH_SOURCES_V33_K_LOCAL_KRUOKA_ENABLED
// Revision: V33-K-LOCAL-KRUOKA-ENABLED
// Date: 2026-09-20
//
// Muutos V32:een:
// - Aktivoi nykyisen kruokaProvider.ts-polun vain K-Marketille ja K-Supermarketille.
// - K-Citymarket jätetään edelleen pois käytöstä.
// - S-providerien V32-reititys säilyy muuttumattomana.
// - Ei muuta normaalia tuotehakua, GPS:ää, store selectionia tai S-providerien logiikkaa.
// ============================================================================

// ============================================================================
// ZIIPLY_OFFER_SEARCH_SOURCES_V32_EXCLUSIVE_S_STORE_PROVIDER_ROUTING
// Revision: V32-EXCLUSIVE-S-STORE-PROVIDER-ROUTING
// Date: 2026-09-20
//
// Muutos V31:een:
// - Valittu Prisma ajaa VAIN nykyisen skaupatProvider / V216-polun.
// - Valittu S-market / Alepa / Sale ajaa VAIN skaupatLocalCampaignProvider-polun.
// - Tyhjällä Prisma-kontekstilla ei enää kutsuta V216-provideria.
// - K-Ruoka ja eTarjouslehdet pysyvät pois käytöstä.
// - Ei muutoksia page.tsx:ään, SearchCoreen, normaaliin tuotehakuun,
//   Justiinaan, GPS:ään, store selectioniin tai /api/store-searchiin.
// ============================================================================

// ============================================================================
// ZIIPLY_OFFER_SEARCH_SOURCES_V31_SLOCAL_SKAUPAT_CAMPAIGNS
// Revision: V31-SLOCAL-SKAUPAT-CAMPAIGNS
// Date: 2026-09-20
//
// Muutos V30:een:
// - Prisma jatkaa nykyisellä skaupatProvider / RemoteFilteredProducts -polulla.
// - S-lähikaupat (S-market, Alepa, Sale) ohjataan uuteen
//   skaupatLocalCampaignProvider V1 / RemoteGetPageContent -polkuun.
// - Ketjujen väliltä käyttää vain sillä hetkellä valittua S-kauppaa.
// - Ketjun sisältä / S voi hakea sekä valitun Prisman että valitun S-lähikaupan.
// - eTarjouslehdet pysyy pois käytöstä.
// - K-Ruoka pysyy pois käytöstä.
// - Ei muutoksia page.tsx:ään, normaaliin tuotehakuun, Justiinaan,
//   store selectioniin, GPS:ään tai /api/store-searchiin.
// ============================================================================

// ZIIPLY_OFFER_SEARCH_SOURCES_V30_GOSTA_MASTER_NO_LIMIT
// Revision: V30-GOSTA-MASTER-NO-LIMIT
// Date: 2026-09-19
//
// Muutos:
// - Pohja on V29-KRUOKA-DISABLED.
// - Göstan master-haussa ei enää leikata uniqueAllResults-listaa MAX_OFFER_SEARCH_RESULTS-rajalla.
// - Providerilta tuleva koko master-aineisto pääsee page/master-datasettiin.
// - Tavallisten hakujen ja strict category -hakujen nykyiset MAX_OFFER_SEARCH_RESULTS-rajat säilyvät.
// - K-Ruoka pysyy kokonaan pois käytöstä kuten V29:ssa.
// - S-market eTarjouslehdet pysyy pois käytöstä kuten V28:ssa.
// - Ei muita toiminnallisia muutoksia.
//
// ============================================================================

// ZIIPLY_OFFER_SEARCH_SOURCES_V29_KRUOKA_DISABLED
// Revision: V29-KRUOKA-DISABLED
// Date: 2026-09-19
//
// Muutos:
// - K-Ruoka / K-Market / K-Supermarket / K-Citymarket tarjoushaku on kokonaan pois käytöstä Göstan tarjoushausta.
// - K-providerin koodi jätetään tiedostoon myöhempää korjausta varten, mutta sitä ei kutsuta.
// - Prisma / S-kaupat tarjoushaku säilyy ennallaan.
// - S-market eTarjouslehdet pysyy pois käytöstä kuten V28:ssa.
// - Ei muutoksia page.tsx:ään, korttiin, routeen tai S-kaupat provideriin.

// ZIIPLY_OFFER_SEARCH_SOURCES_V28_ETARJOUSLEHDET_DISABLED
// Revision: V28-ETARJOUSLEHDET-DISABLED
// Date: 2026-07-12
//
// Korjaus:
// - Prisma pidetään S-kaupat.fi-providerissa.
// - S-marketit poistetaan S-kaupat.fi-providerilta, koska kaikki S-marketit eivät löydy s-kaupat.fi:stä.
// - Valitut S-market-nimet haetaan suoraan etarjouslehdetProvider.ts-providerilla, ei olematonta lisäroutea.
// - Ei kovakoodata Vehkojaa: route ratkaisee julkaisun eTarjouslehdetin S-market-fronts-datasta nimen perusteella.
// - K-provider säilyy ennallaan.

// src/app/components/ziiply/offerSearch/ziiplyOfferSearchSources.ts
// ZIIPLY_OFFER_SEARCH_SOURCES_V15_STRICT_CATEGORY_QUERY_NO_RERANK_CATEGORY
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
import {
  fetchKruokaOffers,
  getLastKruokaPipelineDebugV49,
  type KruokaOfferProviderOptionsV10,
  type KruokaPipelineDebugV49,
} from "./providers/kruokaProvider";
import { fetchSKaupatOffers, type SKaupatOfferProviderOptionsV173 } from "./providers/skaupatProvider";
import { fetchSKaupatLocalCampaignOffersV1 } from "./providers/skaupatLocalCampaignProvider";
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

export function getKruokaOfferPipelineDebugV34(): KruokaPipelineDebugV49 | null {
  return getLastKruokaPipelineDebugV49();
}

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
    // Build-fix: ZiiplyOfferSource-union ei tunne uutta etarjouslehdet-id:tä.
    // Käytetään olemassa olevaa skaupat-id:tä, mutta erillistä storeLabel/url-arvoa.
    id: "skaupat",
    chain: "S",
    storeLabel: "S-market",
    url: "https://etarjouslehdet.fi/S-market",
  },
} satisfies Record<string, ZiiplyOfferSearchSourceConfig>;

const OFFER_SEARCH_SOURCE_REVISION = "v33-k-local-kruoka-enabled";
const ENABLE_OFFER_SEARCH_CACHE = false;
const ENABLE_ETARJOUSLEHDET_PROVIDER_V28 = false;
const ENABLE_KRUOKA_PROVIDER_V33 = true;
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

function isKLocalOfferStoreNameV33(value: unknown) {
  const name = normalizeOfferUniqueText(value);
  if (!name || name.includes("citymarket")) return false;
  return name.includes("k market") || name.includes("k supermarket");
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


function isSLocalOfferStoreNameV31(value: unknown) {
  const text = normalizeOfferUniqueText(value);
  return (
    text.includes("s market") ||
    text.includes("s-market") ||
    text === "alepa" ||
    text.startsWith("alepa ") ||
    text === "sale" ||
    text.startsWith("sale ")
  );
}

function isSMarketOfferStoreNameV21(value: unknown) {
  return isSLocalOfferStoreNameV31(value);
}

function isPrismaOfferStoreNameV21(value: unknown) {
  return normalizeOfferUniqueText(value).includes("prisma");
}

function normalizeSKaupatProviderOptionsPrismaOnlyV21(
  options?: ZiiplyOfferSearchSourceContextV8,
): ZiiplyOfferSearchSourceContextV8 | undefined {
  if (!options) return undefined;

  const ids = normalizeOfferStoreListV11(options.sStoreIds, options.sStoreId ?? options.storeId);
  const names = normalizeOfferStoreListV11(options.sStoreNames, options.sStoreName ?? options.storeName);
  const maxLength = Math.max(ids.length, names.length);
  const nextIds: string[] = [];
  const nextNames: string[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const id = ids[index] || "";
    const name = names[index] || "";

    // V31: vanha Prisma-provider saa vain oikeat Prismat.
    // S-market / Alepa / Sale menevät erilliseen RemoteGetPageContent-provideriin.
    if (isSLocalOfferStoreNameV31(name)) continue;
    if (isPrismaOfferStoreNameV21(name)) {
      nextIds.push(id);
      nextNames.push(name);
    }
  }

  return {
    ...options,
    storeId: nextIds[0] || null,
    storeName: nextNames[0] || null,
    sStoreId: nextIds[0] || null,
    sStoreName: nextNames[0] || null,
    sStoreIds: nextIds,
    sStoreNames: nextNames,
  } as ZiiplyOfferSearchSourceContextV8;
}

function getSelectedSLocalStoresV31(options?: ZiiplyOfferSearchSourceContextV8) {
  const ids = normalizeOfferStoreListV11(options?.sStoreIds, options?.sStoreId ?? options?.storeId);
  const names = normalizeOfferStoreListV11(options?.sStoreNames, options?.sStoreName ?? options?.storeName);
  const maxLength = Math.max(ids.length, names.length);
  const stores: Array<{ id: string; name: string }> = [];

  for (let index = 0; index < maxLength; index += 1) {
    const id = ids[index] || "";
    const name = names[index] || "";
    if (!name || !isSLocalOfferStoreNameV31(name)) continue;
    stores.push({ id, name });
  }

  const seen = new Set<string>();
  return stores.filter((store) => {
    const key = `${store.id}|${store.name}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchSelectedSLocalCampaignOffersV31(
  query: string,
  options?: ZiiplyOfferSearchSourceContextV8,
) {
  const stores = getSelectedSLocalStoresV31(options);
  const allResults: ZiiplyOfferSearchResult[] = [];

  for (const store of stores) {
    const storeResults = await fetchSKaupatLocalCampaignOffersV1(
      query,
      {
        ...ZIIPLY_OFFER_SOURCES.skaupat,
        storeLabel: store.name,
      },
      {
        storeId: store.id || null,
        storeName: store.name,
        sStoreId: store.id || null,
        sStoreName: store.name,
        areaLabel: options?.areaLabel,
        storeMode: options?.storeMode,
        storeCompareScope: options?.storeCompareScope,
      },
    );
    allResults.push(...storeResults);
  }

  return allResults;
}

function makeETSourceDebugResultV25(title: string, detail: string): ZiiplyOfferSearchResult {
  return {
    id: `etsrc-v25-${Date.now()}-${title}`,
    source: "etarjous-debug",
    sourceUrl: "https://etarjouslehdet.fi/S-market",
    chain: "S-market",
    storeLabel: "ET DEBUG",
    storeName: "ET DEBUG",
    shopName: "ET DEBUG",
    title,
    priceText: "0,00 €",
    unitPriceText: "",
    benefitText: detail,
    validityText: "DEBUG",
    imageUrl: "",
    image: "",
    pictureUrl: "",
    productUrl: "https://etarjouslehdet.fi/S-market",
    rawText: `${title} ${detail}`,
    matchScore: 999999,
    category: "Muut",
    categoryPath: "Muut",
    breadcrumbs: "Muut",
    hierarchy: "Muut",
    taxonomy: "Muut",
    department: "Muut",
    productGroup: "Muut",
    mainCategory: "Muut",
    subCategory: "Muut",
    brandName: "DEBUG",
    ean: "",
  } as unknown as ZiiplyOfferSearchResult;
}

async function searchSelectedSMarketETarjouslehdetOffersV28Disabled(
  _query: string,
  _options?: ZiiplyOfferSearchSourceContextV8,
): Promise<ZiiplyOfferSearchResult[]> {
  // V28: eTarjouslehdet on tarkoituksella kokonaan pois päältä.
  // Tämä palauttaa aina tyhjän listan eikä kutsu provideria lainkaan.
  return [];
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

  const providerOptions = normalizeSKaupatProviderOptionsPrismaOnlyV21(options);
  const selectedSLocalStoresV32 = getSelectedSLocalStoresV31(options);
  const hasSelectedPrismaV32 = Boolean(
    normalizeOfferStoreListV11(
      providerOptions?.sStoreIds,
      providerOptions?.sStoreId ?? providerOptions?.storeId,
    ).length ||
    normalizeOfferStoreListV11(
      providerOptions?.sStoreNames,
      providerOptions?.sStoreName ?? providerOptions?.storeName,
    ).length
  );
  const hasSelectedSLocalV32 = selectedSLocalStoresV32.length > 0;

  const kProviderOptions = normalizeKruokaProviderOptionsV9(options);
  const selectedKStoreNameV33 = String(kProviderOptions?.kStoreName ?? kProviderOptions?.storeName ?? "").trim();
  const hasSelectedKLocalStoreV33 = Boolean(
    (kProviderOptions?.storeId || kProviderOptions?.kStoreId) &&
    isKLocalOfferStoreNameV33(selectedKStoreNameV33),
  );

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
      hasSelectedPrismaV32,
      hasSelectedSLocalV32,
      selectedSLocalStoresV32,
      providerScopeV10,
    });
  }

  // V32: S-providerit ovat toisensa poissulkevia valitun kaupan perusteella.
  // Prisma -> vanha V216-polku. S-market/Alepa/Sale -> local campaign -polku.
  // Tärkeää: V216:ta ei kutsuta tyhjällä Prisma-kontekstilla.
  const sKaupatResults = providerScopeV10.useS && hasSelectedPrismaV32
    ? await safelySearchSource(
        isGostaMasterQuery ? "Prisma S-kaupat master V32" : "Prisma S-kaupat V32",
        () => searchSelectedSKaupatOffersV11(cleanQuery, providerOptions),
      )
    : [];

  const sLocalCampaignResults = providerScopeV10.useS && hasSelectedSLocalV32
    ? await safelySearchSource(
        isGostaMasterQuery ? "S-local S-kaupat campaigns master V32" : "S-local S-kaupat campaigns V32",
        () => searchSelectedSLocalCampaignOffersV31(cleanQuery, options),
      )
    : [];

  const eTarjouslehdetResults =
    ENABLE_ETARJOUSLEHDET_PROVIDER_V28 && providerScopeV10.useS
      ? await safelySearchSource(
          isGostaMasterQuery
            ? "S-market eTarjouslehdet master V28"
            : "S-market eTarjouslehdet V28",
          () => searchSelectedSMarketETarjouslehdetOffersV28Disabled(cleanQuery, options),
        )
      : [];

  // V33: K-Ruoka on käytössä vain valitulle K-Marketille / K-Supermarketille.
  // K-Citymarket rajataan tässä tarkoituksella pois, kunnes sen oma polku on varmennettu.
  const kResults = ENABLE_KRUOKA_PROVIDER_V33 && providerScopeV10.useK && hasSelectedKLocalStoreV33
    ? await safelySearchSource(
        isGostaMasterQuery ? "K-local K-Ruoka master V33" : "K-local K-Ruoka V33",
        () => searchSelectedKruokaOffersV10(cleanQuery, options),
      )
    : [];

  const uniqueAllResults = uniqueOfferResults([
    ...eTarjouslehdetResults,
    ...sKaupatResults,
    ...sLocalCampaignResults,
    ...kResults,
  ]);

  const strictCategoryQueryV15 = isStrictGostaCategoryQueryV15(cleanQuery);

  const results = isGostaMasterQuery
    ? uniqueAllResults
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

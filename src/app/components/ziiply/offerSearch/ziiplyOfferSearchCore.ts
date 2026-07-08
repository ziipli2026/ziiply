// ============================================================================
// ZIIPLY_OFFER_SEARCH_CORE_V163_CATEGORY_CORE_FINAL_OVERRIDE
// Revision: V162
// Date: 2026-07-04
//
// Muutokset:
// - Palauttaa Göstan master-tarjousdatan välimuistin käyttöön.
// - Kun tuoteryhmät on kerran haettu samalla kauppakontekstilla, takaisin
//   tuoteryhmiin palaaminen käyttää samaa master-datasettiä eikä lataa sitä
//   uudelleen joka kerta.
// - Välimuisti on kontekstikohtainen: eri kauppa/alue saa oman cache-avaimen.
// - Kategoriat tulevat nyt korjatusta CategoryCore V162 -luokittelusta.
// - Ei muutoksia kuviin, skanneriin, äänihakuun eikä kauppavalintaan.
// ============================================================================

// ============================================================================
// ZIIPLY_OFFER_SEARCH_CORE_V160_CATEGORY_FROM_MASTER_RESTORED
// Revision: V160
// Date: 2026-06-07
//
// Purpose:
// - Keeps V146 Gösta offer search orchestration.
// - V156: Kaikki/category searches use one master offer dataset and local category filtering.
// - V152: store/area context is included in request URLs so old Varkaus/Mikkeli results cannot be reused silently.
// - V153: category seed searches use the food-basket scoped S-kanava map from ziiplyOfferCategoryCore.
// - V153: keeps cache-busting/store context params ready for S-kanava Kampanjat/offer route support.
// - V154: explicitly types optional context in searchZiiplyGostaOffersV146 options so page.tsx can pass active area/store context without TypeScript build failure.
// - V155: fixes missing comment prefix in header that broke webpack parsing.
// - Keeps V147 compatibility exports required by page.tsx:
//   - GOSTA_OFFER_CATEGORY_SUGGESTIONS_V147
//   - isZiiplyGostaCategorySelectionV147
//   - mapZiiplyGostaOfferToCardOfferV147
//
// Install path:
// src/app/components/ziiply/offerSearch/ziiplyOfferSearchCore.ts
// ============================================================================

// src/app/components/ziiply/offerSearch/ziiplyOfferSearchCore.ts
// V146_GOSTA_SEARCH_CORE_ORCHESTRATOR
// Göstan tarjoushaun orkestrointi pois page.tsx:stä.
// Vastuut:
// - Kaikki / tuoteryhmä / vapaa tekstihaku
// - tuoteryhmäkohtaisten siemenhakujen ajo
// - API-vastausten parsiminen
// - dedupe
// - roskasuodatus
// - näkyvien tulosten suodatus

import {
  getGostaCategoryLabelFromFilterV136,
  getOfferCategoryV106,
  getOfferProductTitleV113,
  isBadOfferSearchResultV106,
  isGostaCategorySelectionV136,
  isKnownOfferCategoryFilterV113,
  type ZiiplyGostaOfferLike,
} from "./ziiplyOfferCategoryCore";

export type ZiiplyGostaOfferSearchContextV152 = {
  areaLabel?: string;
  storeMode?: string;
  storeCompareScope?: string;
  withinChain?: string | null;
  sStoreId?: string | number;
  sStoreName?: string;
  sStoreIds?: Array<string | number | null | undefined>;
  sStoreNames?: Array<string | null | undefined>;
  kStoreId?: string | number;
  kStoreName?: string;
  kStoreIds?: Array<string | number | null | undefined>;
  kStoreNames?: Array<string | null | undefined>;
};

export type ZiiplyGostaOfferSearchCoreResult = {
  results: ZiiplyGostaOfferLike[];
  querySnapshot: string;
  cardFilter: string;
  showingAllAreaOffers: boolean;
  trackingKey: string;
  searchAllAreaOffers: boolean;
  searchByCategory: boolean;
  categoryLabel: string;
};

function normalizeGostaCoreText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " ja ")
    .replace(/[^a-z0-9åäö\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGostaContextListV164(values: unknown, fallback?: unknown): string[] {
  const rawValues = Array.isArray(values) ? values : [];
  const normalizedFallback = String(fallback ?? "")
    .replaceAll("\r", "")
    .replaceAll("\n", "||")
    .replaceAll(";", "||");

  const splitFallback = normalizedFallback
    .split("||")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  const combined = [
    ...rawValues.map((value) => String(value ?? "").trim()).filter(Boolean),
    ...splitFallback,
  ];

  return Array.from(new Set(combined));
}

async function parseOfferSearchResponse(response: Response) {
  const data = await response.json();
  if (!response.ok || data?.ok === false) {
    throw new Error(String(data?.error || `Tarjoushaku epäonnistui: ${response.status}`));
  }
  return Array.isArray(data?.results) ? (data.results as ZiiplyGostaOfferLike[]) : [];
}

function buildOfferSearchContextKeyV152(context?: ZiiplyGostaOfferSearchContextV152) {
  if (!context) return "";

  return [
    context.areaLabel,
    context.storeMode,
    context.storeCompareScope,
    context.withinChain,
    ...normalizeGostaContextListV164(context.sStoreIds, context.sStoreId),
    ...normalizeGostaContextListV164(context.sStoreNames, context.sStoreName),
    ...normalizeGostaContextListV164(context.kStoreIds, context.kStoreId),
    ...normalizeGostaContextListV164(context.kStoreNames, context.kStoreName),
  ]
    .map((value) => normalizeGostaCoreText(value))
    .filter(Boolean)
    .join("|");
}

const ZIIPLY_GOSTA_MASTER_QUERY_V156 = "__ziiply_all_offers__";
const ZIIPLY_GOSTA_MASTER_CACHE_TTL_MS_V156 = 5 * 60 * 1000;
const ziiplyGostaMasterCacheV156 = new Map<string, { expiresAt: number; promise: Promise<ZiiplyGostaOfferLike[]> }>();

async function fetchOfferSearchResults(query: string, context?: ZiiplyGostaOfferSearchContextV152) {
  const params = new URLSearchParams();
  params.set("q", query);

  // V152: nämä parametrit toimivat vähintään cache-avaimena selaimelle/Vercelille.
  // Jos route tukee niitä myöhemmin, sama koodi rajaa tarjoukset myös oikeaan aktiiviseen alueeseen/kauppaan.
  const contextKey = buildOfferSearchContextKeyV152(context);
  if (contextKey) params.set("ctx", contextKey);
  if (context?.areaLabel) params.set("area", String(context.areaLabel));
  if (context?.storeMode) params.set("storeMode", String(context.storeMode));
  if (context?.storeCompareScope) params.set("scope", String(context.storeCompareScope));
  if (context?.withinChain) params.set("withinChain", String(context.withinChain));

  const sStoreIdsV162 = normalizeGostaContextListV164(context?.sStoreIds, context?.sStoreId);
  const sStoreNamesV162 = normalizeGostaContextListV164(context?.sStoreNames, context?.sStoreName);
  const kStoreIdsV162 = normalizeGostaContextListV164(context?.kStoreIds, context?.kStoreId);
  const kStoreNamesV162 = normalizeGostaContextListV164(context?.kStoreNames, context?.kStoreName);

  if (sStoreIdsV162.length > 0) params.set("sStoreId", sStoreIdsV162.join("||"));
  if (sStoreNamesV162.length > 0) params.set("sStoreName", sStoreNamesV162.join("||"));
  if (kStoreIdsV162.length > 0) params.set("kStoreId", kStoreIdsV162.join("||"));
  if (kStoreNamesV162.length > 0) params.set("kStoreName", kStoreNamesV162.join("||"));
  params.set("_", `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const response = await fetch(`/api/offers/search?${params.toString()}`, {
    cache: "no-store",
  });
  return parseOfferSearchResponse(response);
}

async function fetchGostaMasterOfferResultsV156(context?: ZiiplyGostaOfferSearchContextV152) {
  const contextKey = buildOfferSearchContextKeyV152(context) || "global";
  const now = Date.now();
  const cached = ziiplyGostaMasterCacheV156.get(contextKey);

  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = fetchOfferSearchResults(ZIIPLY_GOSTA_MASTER_QUERY_V156, context)
    .then((results) => cleanZiiplyGostaOfferResultsV146(results))
    .catch((error) => {
      ziiplyGostaMasterCacheV156.delete(contextKey);
      throw error;
    });

  ziiplyGostaMasterCacheV156.set(contextKey, {
    expiresAt: now + ZIIPLY_GOSTA_MASTER_CACHE_TTL_MS_V156,
    promise,
  });

  return promise;
}


function getCompactGostaTitleKeyV149(value: unknown) {
  const normalized = normalizeGostaCoreText(value)
    .replace(/\b\d+[,.]?\d*\s*(g|kg|ml|l|kpl|pkt|ps|plo|prk)\b/g, " ")
    .replace(/\b\d+\s*x\s*\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = normalized
    .split(/\s+/)
    .filter((word) => word.length > 1);

  return words.slice(0, 4).join(" ");
}


function getUltraCompactGostaTitleKeyV150(value: unknown) {
  const stopWords = new Set([
    "snellmanin",
    "snellman",
    "hk",
    "atria",
    "saarioinen",
    "kotimaista",
    "rainbow",
    "xtra",
    "pirkka",
    "coop",
    "s",
    "k",
  ]);

  const normalized = normalizeGostaCoreText(value)
    .replace(/\b\d+[,.]?\d*\s*(g|kg|ml|l|kpl|pkt|ps|plo|prk)\b/g, " ")
    .replace(/\b\d+\s*x\s*\d+\b/g, " ")
    .replace(/\b(grilli|grillattu|marinoitu|maustettu|nopea|ohut|filee|suikale|pala|viipale|pakkaus|rasia)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = normalized
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

  return words.slice(0, 3).join(" ");
}

function getGostaOfferDedupeKeyV148(item: ZiiplyGostaOfferLike) {
  const anyItem = item as any;
  const ean = normalizeGostaCoreText(anyItem?.ean || anyItem?.gtin || anyItem?.barcode || "");

  if (ean) return `ean:${ean}`;

  const title =
    item?.title || item?.name || item?.productName || "";
  const title3 = getUltraCompactGostaTitleKeyV150(title);
  const store = normalizeGostaCoreText(item?.storeLabel || "");
  const price = normalizeGostaCoreText(item?.priceText || "");

  if (title3) return `title3:${title3}|price:${price}|store:${store}`;

  return normalizeGostaCoreText([item?.id, title, price].filter(Boolean).join("|"));
}

export function dedupeZiiplyGostaOfferResultsV146(results: ZiiplyGostaOfferLike[]) {
  const seen = new Set<string>();

  return results.filter((item) => {
    const key = getGostaOfferDedupeKeyV148(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function cleanZiiplyGostaOfferResultsV146(results: ZiiplyGostaOfferLike[]) {
  const seen = new Set<string>();

  return results.filter((item) => {
    if (isBadOfferSearchResultV106(item)) return false;

    const key = getGostaOfferDedupeKeyV148(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function filterZiiplyGostaOfferResultsV146(
  results: ZiiplyGostaOfferLike[],
  filterValue: string,
) {
  const filter = normalizeGostaCoreText(filterValue).trim();
  if (!filter || filter === "kaikki" || filter === "all") return results;

  return results.filter((item) => {
    const category = normalizeGostaCoreText(getOfferCategoryV106(item));

    // Tunnettu tuoteryhmächip ei ole vapaatekstihaku koko tarjousriviin.
    // Tämä estää esim. vaippojen päätymistä Maitotuotteisiin/Lihaan raakatekstin takia.
    if (isKnownOfferCategoryFilterV113(filter)) {
      return category === filter;
    }

    const title = normalizeGostaCoreText(getOfferProductTitleV113(item));
    const categoryMeta = normalizeGostaCoreText(
      [item?.category, item?.department, item?.productGroup].filter(Boolean).join(" "),
    );

    return title.includes(filter) || categoryMeta.includes(filter);
  });
}

export async function searchZiiplyGostaOffersV146(options: {
  query: string;
  terms?: string[];
  context?: ZiiplyGostaOfferSearchContextV152;
}) {
  const cleanedQuery = String(options.query || "").trim();
  const termSnapshot = (options.terms || []).join(", ").trim();
  const offerQuerySnapshot = termSnapshot || cleanedQuery;

  const categorySearchLabel = isGostaCategorySelectionV136(offerQuerySnapshot)
    ? getGostaCategoryLabelFromFilterV136(offerQuerySnapshot)
    : "";

  const normalizedCategorySearch = normalizeGostaCoreText(categorySearchLabel).trim();
  const searchAllAreaOffers = !offerQuerySnapshot || normalizedCategorySearch === "kaikki";
  const searchByCategory =
    !!categorySearchLabel &&
    normalizedCategorySearch !== "kaikki" &&
    isKnownOfferCategoryFilterV113(normalizedCategorySearch);

  const trackingKey = searchAllAreaOffers
    ? "__all_area_offers_category_seeded__"
    : searchByCategory
      ? `__category_${normalizedCategorySearch}__`
      : offerQuerySnapshot;

  let nextResults: ZiiplyGostaOfferLike[] = [];

  if (searchAllAreaOffers || searchByCategory) {
    // V160:
    // Category chips must not run a direct text search like q="Liha" or q="Hevi".
    // They use the full Gösta master offer dataset and then filter locally by
    // the category classifier. This restores the earlier working category behavior.
    const masterResults = await fetchGostaMasterOfferResultsV156(options.context);

    nextResults = searchByCategory
      ? masterResults.filter(
          (item) =>
            normalizeGostaCoreText(getOfferCategoryV106(item)) === normalizedCategorySearch,
        )
      : masterResults;
  } else {
    nextResults = await fetchOfferSearchResults(offerQuerySnapshot, options.context);
  }

  const results = searchAllAreaOffers || searchByCategory
    ? dedupeZiiplyGostaOfferResultsV146(nextResults)
    : cleanZiiplyGostaOfferResultsV146(nextResults);

  return {
    results,
    querySnapshot: searchByCategory ? categorySearchLabel : offerQuerySnapshot,
    cardFilter: searchAllAreaOffers ? "" : searchByCategory ? categorySearchLabel : offerQuerySnapshot,
    showingAllAreaOffers: searchAllAreaOffers,
    trackingKey,
    searchAllAreaOffers,
    searchByCategory,
    categoryLabel: categorySearchLabel,
  } satisfies ZiiplyGostaOfferSearchCoreResult;
}

// V147 compatibility exports for thin page.tsx.
export { GOSTA_CATEGORY_LABELS_V136 as GOSTA_OFFER_CATEGORY_SUGGESTIONS_V147 } from "./ziiplyOfferCategoryCore";

export function isZiiplyGostaCategorySelectionV147(value: string) {
  return isGostaCategorySelectionV136(value);
}

export function mapZiiplyGostaOfferToCardOfferV147(item: ZiiplyGostaOfferLike) {
  return {
    id: item.id,
    name: item.title,
    title: item.title,
    productName: item.title,
    storeName: item.storeLabel,
    chain: item.chain,
    price: item.priceText,
    offerPrice: item.priceText,
    normalPrice: item.unitPriceText,
    originalPrice: item.unitPriceText,
    discountText: item.benefitText || item.validityText,
    image: item.imageUrl,
    imageUrl: item.imageUrl,
    pictureUrl: item.imageUrl,
    productUrl: item.productUrl,
    category: getOfferCategoryV106(item),
    __sourceOfferSearchResult: item,
  };
}

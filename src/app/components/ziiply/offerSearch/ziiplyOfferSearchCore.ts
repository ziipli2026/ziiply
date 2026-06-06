// ============================================================================
// ZIIPLY_OFFER_SEARCH_CORE_V150_ULTRA_FUZZY_DEDUPE
// Revision: V150
// Date: 2026-06-05
//
// Purpose:
// - Keeps V146 Gösta offer search orchestration.
// - V148: strict and fuzzy dedupe by EAN/title so category seed searches cannot duplicate the same product.
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
  getGostaCategorySeedQueriesV136,
  getOfferCategoryV106,
  getOfferProductTitleV113,
  isBadOfferSearchResultV106,
  isGostaCategorySelectionV136,
  isKnownOfferCategoryFilterV113,
  type ZiiplyGostaOfferLike,
} from "./ziiplyOfferCategoryCore";

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

async function parseOfferSearchResponse(response: Response) {
  const data = await response.json();
  if (!response.ok || data?.ok === false) {
    throw new Error(String(data?.error || `Tarjoushaku epäonnistui: ${response.status}`));
  }
  return Array.isArray(data?.results) ? (data.results as ZiiplyGostaOfferLike[]) : [];
}

async function fetchOfferSearchResults(query: string) {
  const response = await fetch(`/api/offers/search?q=${encodeURIComponent(query)}`, {
    cache: "no-store",
  });
  return parseOfferSearchResponse(response);
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
    const seedQueries = getGostaCategorySeedQueriesV136(
      searchByCategory ? categorySearchLabel : "Kaikki",
    );

    const settled = await Promise.allSettled(
      seedQueries.map((seedQuery) => fetchOfferSearchResults(seedQuery)),
    );

    nextResults = settled.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );

    if (searchByCategory) {
      nextResults = nextResults.filter(
        (item) => normalizeGostaCoreText(getOfferCategoryV106(item)) === normalizedCategorySearch,
      );
    }
  } else {
    nextResults = await fetchOfferSearchResults(offerQuerySnapshot);
  }

  const results = dedupeZiiplyGostaOfferResultsV146(nextResults);

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

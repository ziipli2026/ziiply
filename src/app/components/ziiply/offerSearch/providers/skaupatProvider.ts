// ============================================================================
// SKAUPAT_PROVIDER_V174_STORE_DIRECTORY_RESOLVER
// Revision: V178
// Date: 2026-06-06
//
// Fix:
// - Fixes real S-kaupat product list field:
////   data.store.products.productListItems[]
//// - V153 proved rootKeys include productListItems, not products.
//// - Keeps visible diagnostics temporarily.
//   data.store.products.products[]
//   data.store.products.structuredFacets[]
// - Reads category facet from structuredFacets where key === "category"
//   and values are in objectValue[].
// - Reads product data from each ProductListItem.product.
// - Reads category path from product.hierarchyPath[].
// - Keeps fetchSKaupatOffers(query, config) signature unchanged.
//
// Install path:
// src/app/components/ziiply/offerSearch/providers/skaupatProvider.ts
// ============================================================================
//
// V160 fix:
// - Gösta is an offer search: normal-priced shelf products are filtered out.
// - Includes only products with campaign/offer signal:
//   campaignPrice, lowest30DayPrice, campaignPriceValidUntil, campaign label,
//   or currentPrice < regularPrice.
// - Sponsored/ad-labelled rows remain filtered out.
// - S-kaupat prices remain in euros; no cents conversion here.
//

// V171 Gösta master dataset:
// - Special query __ziiply_all_offers__ no longer uses empty S-kaupat queryString; direct calls fall back to broad safe seeds.
// - Paginates more 48-item pages for master mode, while keeping normal searches smaller.
// - Category chips can then filter this master dataset locally without new seed searches.
//
// V170 safe pagination:
// V173 store context:
// - fetchSKaupatOffers accepts an optional storeId/storeName context.
// - RemoteFilteredProducts uses the selected S-store id instead of the hardcoded default.
// - Product storeId validation also uses that selected store id.
//
// V170 safe pagination:
// - Keeps the original working S-kaupat RemoteFilteredProducts limit at 48.
// - Fetches several 48-item pages with offset/page variables instead of raising limit.
// - If S-kaupat ignores offset/page variables, dedupe keeps the result stable.
// - Does not change storeId behavior yet.
//
// ============================================================================

import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "../types";
import { resolveSKaupatStoreIdFromDirectoryV1 } from "../../location/ziiplyStoreDirectory";

type UnknownRecord = Record<string, unknown>;

const SKAUPAT_REMOTE_FILTERED_PRODUCTS_HASH_V156 =
  "44ca017dddccfe49e787b483f471f26217adca807f8c71101d11e881dab9e480";

const DEFAULT_SKAUPAT_STORE_ID_V156 = "513971200";

export type SKaupatOfferProviderOptionsV173 = {
  storeId?: string | number | null;
  storeName?: string | null;
};

async function getEffectiveSKaupatStoreIdV174(
  options?: SKaupatOfferProviderOptionsV173,
): Promise<string | null> {
  const raw = firstString(options?.storeId);
  const storeName = firstString(options?.storeName);

  // First trust a real numeric S-kaupat storeId if the caller already has one.
  // Do not treat the old MVP fallback id as proof of a selected store.
  if (/^\d{5,}$/.test(raw) && raw !== DEFAULT_SKAUPAT_STORE_ID_V156) {
    return raw;
  }

  // Resolve real S-kaupat id from S-kaupat store URLs:
  // /myymala/<slug>/<storeId>
  const resolvedFromDirectory = await resolveSKaupatStoreIdFromDirectoryV1(storeName);

  if (resolvedFromDirectory) {
    console.warn("[GOSTA] S-kaupat storeId resolved from directory", {
      storeId: raw || null,
      storeName,
      resolvedStoreId: resolvedFromDirectory,
    });
    return resolvedFromDirectory;
  }

  // If caller gave some numeric id, allow it only as a last resort, but log it.
  if (/^\d{5,}$/.test(raw)) {
    console.warn("[GOSTA] using provided numeric storeId after directory miss", {
      storeId: raw,
      storeName,
    });
    return raw;
  }

  // Important: do not silently fall back to DEFAULT_SKAUPAT_STORE_ID_V156.
  // Returning [] is safer than showing another store's offers.
  console.warn("[GOSTA] missing real S-kaupat storeId, skipping S-kaupat offer fetch", {
    storeId: options?.storeId,
    storeName: options?.storeName,
  });

  return null;
}
const SKAUPAT_GOSTA_MASTER_QUERY_V171 = "__ziiply_all_offers__";

// V176: Gösta master feed uses S-kaupat's real discounted label filter.
// Do not use DISCOUNTED as a search word.

function isGostaMasterQueryV171(query: string): boolean {
  return normalizeText(query) === normalizeText(SKAUPAT_GOSTA_MASTER_QUERY_V171);
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function coerceUnknownList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  const record = asRecord(value);
  if (!record) return [];

  const directArrays = [
    record.items,
    record.results,
    record.nodes,
    record.edges,
    record.productListItems,
    record.products,
    record.listItems,
  ];

  for (const candidate of directArrays) {
    if (Array.isArray(candidate)) {
      if (candidate === record.edges) {
        return candidate.map((edge) => {
          const edgeRecord = asRecord(edge);
          return edgeRecord?.node ?? edge;
        });
      }

      return candidate;
    }
  }

  const values = Object.values(record);
  const objectValues = values.filter((entry) => entry && typeof entry === "object");

  // Last-resort support for object maps like { "0": {...}, "1": {...} }.
  if (objectValues.length > 0 && objectValues.length === values.length) {
    return objectValues;
  }

  return [];
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;

    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      if (text) return text;
      continue;
    }

    const objectValue = asRecord(value);
    if (objectValue) {
      const text = firstString(
        objectValue.name,
        objectValue.title,
        objectValue.label,
        objectValue.displayName,
        objectValue.localizedName,
        objectValue.slug,
        objectValue.value,
        objectValue.text,
      );
      if (text) return text;
    }
  }

  return "";
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " ja ")
    .replace(/[^a-z0-9åäö\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPathValue(object: unknown, path: string[]): unknown {
  let current: unknown = object;

  for (const key of path) {
    if (Array.isArray(current)) {
      const index = Number(key);
      current = Number.isFinite(index) ? current[index] : undefined;
      continue;
    }

    const record = asRecord(current);
    if (!record) return undefined;
    current = record[key];
  }

  return current;
}

function getSProductsRoot(data: unknown): UnknownRecord | null {
  return asRecord(getPathValue(data, ["data", "store", "products"]));
}

function getSProductListItems(data: unknown): UnknownRecord[] {
  const root = getSProductsRoot(data);
  if (!root) return [];

  const list =
    coerceUnknownList(root.productListItems).length > 0
      ? coerceUnknownList(root.productListItems)
      : coerceUnknownList(root.products).length > 0
        ? coerceUnknownList(root.products)
        : coerceUnknownList(root.items).length > 0
          ? coerceUnknownList(root.items)
          : [];

  return list
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return null;

      // Some GraphQL clients wrap list items in node/item/data.
      return asRecord(record.node) || asRecord(record.item) || asRecord(record.data) || record;
    })
    .filter(Boolean) as UnknownRecord[];
}
function getStructuredFacets(data: unknown): UnknownRecord[] {
  const root = getSProductsRoot(data);
  if (!root) return [];

  return coerceUnknownList(root.structuredFacets)
    .map(asRecord)
    .filter(Boolean) as UnknownRecord[];
}
function getCategoryFacetNames(data: unknown): string[] {
  const categoryFacet = getStructuredFacets(data).find(
    (facet) => normalizeText(facet.key) === "category",
  );

  if (!categoryFacet) return [];

  const values =
    asArray(categoryFacet.objectValue).length > 0
      ? asArray(categoryFacet.objectValue)
      : asArray(categoryFacet.stringValue).length > 0
        ? asArray(categoryFacet.stringValue)
        : asArray(categoryFacet.values).length > 0
          ? asArray(categoryFacet.values)
          : [];

  return values
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return firstString(entry);

      return firstString(record.name, record.label, record.title, record.value, record.slug);
    })
    .filter(Boolean);
}

function getCategoryFacetPaths(data: unknown): Array<{ name: string; value: string; count?: number }> {
  const categoryFacet = getStructuredFacets(data).find(
    (facet) => normalizeText(facet.key) === "category",
  );

  if (!categoryFacet) return [];

  const values =
    asArray(categoryFacet.objectValue).length > 0
      ? asArray(categoryFacet.objectValue)
      : asArray(categoryFacet.stringValue).length > 0
        ? asArray(categoryFacet.stringValue)
        : asArray(categoryFacet.values).length > 0
          ? asArray(categoryFacet.values)
          : [];

  return values
    .map((entry) => {
      const record = asRecord(entry);

      if (!record) {
        const name = firstString(entry);
        return name ? { name, value: name } : null;
      }

      const name = firstString(record.name, record.label, record.title, record.value);
      const value = firstString(record.value, record.slug, record.name);
      const count = typeof record.doc_count === "number" ? record.doc_count : undefined;

      if (!name && !value) return null;
      return { name, value, count };
    })
    .filter(Boolean) as Array<{ name: string; value: string; count?: number }>;
}

function numberFromUnknown(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const number = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

function formatPrice(value: unknown): string {
  const number = numberFromUnknown(value);
  if (number == null) return "";
  return `${number.toFixed(2).replace(".", ",")} €`;
}

function cleanRepeatedCampaignTextV161(value: string): string {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";

  const parts = text
    .split(/\s*[·|]\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    return Array.from(new Set(parts)).join(" · ");
  }

  // Handles exact doubled strings like:
  // "2 kpl = 3,99 € 2 kpl = 3,99 €"
  const half = Math.floor(text.length / 2);
  if (text.length % 2 === 0) {
    const left = text.slice(0, half).trim();
    const right = text.slice(half).trim();
    if (left && left === right) return left;
  }

  const repeatedOfferPattern =
    /^(.+?\b(?:kpl|pkt|ps|plo|prk|kg|g|l|ml)\s*=\s*[\d,.]+\s*€)\s+\1$/i;
  const repeatedMatch = text.match(repeatedOfferPattern);
  if (repeatedMatch?.[1]) return repeatedMatch[1].trim();

  return text;
}


function getCompactProductTitleKeyV165(value: unknown): string {
  const normalized = normalizeText(value)
    .replace(/\b\d+[,.]?\d*\s*(g|kg|ml|l|kpl|pkt|ps|plo|prk)\b/g, " ")
    .replace(/\b\d+\s*x\s*\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = normalized
    .split(/\s+/)
    .filter((word) => word.length > 1);

  // 4 first meaningful words catch cases where the same product title
  // differs only by package suffix or campaign metadata.
  return words.slice(0, 4).join(" ");
}


function getUltraCompactProductTitleKeyV166(value: unknown): string {
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

  const normalized = normalizeText(value)
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

function getSOfferDedupeKeyV161(item: ZiiplyOfferSearchResult): string {
  const anyItem = item as any;
  const ean = firstString(anyItem.ean, anyItem.gtin, anyItem.barcode);

  if (ean) return `ean:${normalizeText(ean)}`;

  const title3 = getUltraCompactProductTitleKeyV166(item.title);
  const price = normalizeText(item.priceText);
  const store = normalizeText(item.storeLabel);

  if (title3) return `title3:${title3}|price:${price}|store:${store}`;

  return normalizeText([item.title, item.priceText].filter(Boolean).join("|"));
}

function dedupeSOfferResultsV161(
  results: ZiiplyOfferSearchResult[],
): ZiiplyOfferSearchResult[] {
  const byKey = new Map<string, ZiiplyOfferSearchResult>();

  for (const item of results) {
    const key = getSOfferDedupeKeyV161(item);
    if (!key) continue;

    const previous = byKey.get(key);
    if (!previous) {
      byKey.set(key, item);
      continue;
    }

    const previousScore =
      String(previous.benefitText || "").length +
      String(previous.imageUrl || "").length +
      String((previous as any).categoryPath || "").length;

    const nextScore =
      String(item.benefitText || "").length +
      String(item.imageUrl || "").length +
      String((item as any).categoryPath || "").length;

    if (nextScore > previousScore) byKey.set(key, item);
  }

  return Array.from(byKey.values());
}

function formatComparisonPrice(price: unknown, unit: unknown): string {
  const number = numberFromUnknown(price);
  const unitText = firstString(unit);
  if (number == null || !unitText) return "";

  const normalizedUnit = unitText
    .replace("KGM", "kg")
    .replace("KG", "kg")
    .replace("LTR", "l")
    .replace("L", "l")
    .replace("PCE", "kpl");

  return `${number.toFixed(2).replace(".", ",")} €/${normalizedUnit.toLowerCase()}`;
}

function buildSCloudImageUrl(urlTemplate: string): string {
  if (!urlTemplate) return "";

  return urlTemplate
    .replace("{MODIFIERS}", "w_400,h_400,c_fit")
    .replace("{EXTENSION}", "jpg");
}

function getHierarchyItems(product: UnknownRecord): UnknownRecord[] {
  return asArray(product.hierarchyPath)
    .map(asRecord)
    .filter(Boolean) as UnknownRecord[];
}

function getCategoryMeta(product: UnknownRecord, fallbackFacetNames: string[]) {
  const hierarchy = getHierarchyItems(product);

  // S-kaupat gives hierarchy leaf-first:
  // [specific category, parent category, main category]
  const names = hierarchy
    .map((item) => firstString(item.name))
    .filter(Boolean);

  const slugs = hierarchy
    .map((item) => firstString(item.slug))
    .filter(Boolean);

  const leaf = names[0] || fallbackFacetNames[0] || "";
  const parent = names[1] || "";
  const main = names[names.length - 1] || parent || leaf || "";

  const categoryPath = names.length > 0
    ? [...names].reverse().join(" / ")
    : fallbackFacetNames.slice(0, 3).join(" / ");

  const slugPath = slugs.length > 0 ? [...slugs].reverse().join(" / ") : "";

  return {
    category: leaf,
    categoryPath,
    breadcrumbs: categoryPath,
    hierarchy: categoryPath,
    taxonomy: slugPath,
    department: main,
    productGroup: parent || leaf,
    mainCategory: main,
    subCategory: leaf,
  };
}

function getProductFromListItem(item: UnknownRecord): UnknownRecord | null {
  return (
    asRecord(item.product) ||
    asRecord(item.node) ||
    asRecord(item.item) ||
    (firstString(item.name, item.ean, item.id) ? item : null)
  );
}

function getPricing(product: UnknownRecord): UnknownRecord {
  const storePricing = asRecord(getPathValue(product, ["store", "pricing"]));
  const pricing = asRecord(product.pricing);

  return storePricing || pricing || {};
}

function getLabels(listItem: UnknownRecord, product: UnknownRecord): string {
  const labels = [
    ...asArray(listItem.labels),
    ...asArray(getPathValue(product, ["store", "labels"])),
  ];

  return labels
    .map((label) => {
      const record = asRecord(label);
      return record ? firstString(record.labelText, record.labelType, record.name) : firstString(label);
    })
    .filter(Boolean)
    .join(" ");
}

function isSponsoredSProductListItem(listItem: UnknownRecord, product: UnknownRecord): boolean {
  const text = normalizeText(
    [
      listItem.__typename,
      listItem.adId,
      listItem.sponsored,
      listItem.isSponsored,
      listItem.sponsoredMetadata,
      product.adId,
      product.sponsored,
      product.isSponsored,
      getLabels(listItem, product),
    ]
      .filter(Boolean)
      .join(" "),
  );

  return (
    text.includes("sponsoroitu") ||
    text.includes("sponsored") ||
    text.includes("sponsoredmetadata") ||
    text.includes("advertisement")
  );
}

function hasSOfferSignal(
  listItem: UnknownRecord,
  product: UnknownRecord,
  pricing: UnknownRecord,
): boolean {
  const labelsText = normalizeText(getLabels(listItem, product));
  const currentPrice = numberFromUnknown(
    pricing.campaignPrice ?? pricing.currentPrice ?? product.price,
  );
  const regularPrice = numberFromUnknown(pricing.regularPrice ?? product.price);
  const campaignPrice = numberFromUnknown(pricing.campaignPrice);
  const lowest30DayPrice = numberFromUnknown(pricing.lowest30DayPrice);
  const validUntil = firstString(pricing.campaignPriceValidUntil);

  const hasCampaignPrice = campaignPrice != null;
  const hasValidCampaignDate = Boolean(validUntil);
  const hasLowest30DayReference = lowest30DayPrice != null;
  const hasDiscountAgainstRegular =
    currentPrice != null &&
    regularPrice != null &&
    regularPrice > 0 &&
    currentPrice < regularPrice - 0.005;

  const hasCampaignLabel =
    labelsText.includes("kampanja") ||
    labelsText.includes("tarjous") ||
    labelsText.includes("campaign") ||
    labelsText.includes("discount");

  return (
    hasCampaignPrice ||
    hasValidCampaignDate ||
    hasLowest30DayReference ||
    hasDiscountAgainstRegular ||
    hasCampaignLabel
  );
}


function belongsToSelectedSHypermarketV163(
  product: UnknownRecord,
  selectedStoreId: string,
): boolean {
  const productStoreId = firstString(product.storeId);

  // RemoteFilteredProducts is scoped with storeId, but some rows may still include storeId.
  // If product has a storeId, it must match the selected S-store, not the old hardcoded MVP store.
  // If S-kaupat omits it for some rows, allow the row instead of killing all results.
  return !productStoreId || productStoreId === selectedStoreId;
}


function getImageUrl(product: UnknownRecord): string {
  const mainImageTemplate = firstString(
    getPathValue(product, ["productDetails", "productImages", "mobileReadyHeroImage", "urlTemplate"]),
    getPathValue(product, ["productDetails", "productImages", "mainImage", "urlTemplate"]),
  );

  if (mainImageTemplate) return buildSCloudImageUrl(mainImageTemplate);

  const direct = firstString(
    product.imageUrl,
    product.pictureUrl,
    getPathValue(product, ["image", "url"]),
  );

  if (direct.startsWith("//")) return `https:${direct}`;
  return direct;
}

function getProductUrl(product: UnknownRecord): string {
  const slug = firstString(product.slug);
  if (slug) return `https://www.s-kaupat.fi/tuote/${slug}/${firstString(product.ean, product.id)}`;

  const direct = firstString(product.productUrl, product.url);
  if (!direct) return "";
  if (direct.startsWith("http")) return direct;
  if (direct.startsWith("/")) return `https://www.s-kaupat.fi${direct}`;
  return direct;
}

function getMatchScore(query: string, title: string, categoryText: string): number {
  const q = normalizeText(query);
  const titleText = normalizeText(title);
  const category = normalizeText(categoryText);

  if (!q) return 1;

  let score = 1;
  if (titleText === q) score += 120;
  if (titleText.includes(q)) score += 80;
  if (category.includes(q)) score += 30;

  const words = q.split(/\s+/).filter((word) => word.length > 2);
  for (const word of words) {
    if (titleText.includes(word)) score += 20;
    if (category.includes(word)) score += 8;
  }

  return score;
}

function mapSProductListItemToOfferResult(
  listItem: UnknownRecord,
  options: {
    query: string;
    config: ZiiplyOfferSearchSourceConfig;
    fallbackFacetNames: string[];
    index: number;
    selectedStoreId: string;
    discountedOnly?: boolean;
  },
): ZiiplyOfferSearchResult | null {
  const product = getProductFromListItem(listItem);
  if (!product) return null;

  const title = firstString(product.name);
  if (!title) return null;

  if (isSponsoredSProductListItem(listItem, product)) return null;
  if (!belongsToSelectedSHypermarketV163(product, options.selectedStoreId)) return null;

  const pricing = getPricing(product);

  if (!options.discountedOnly && !hasSOfferSignal(listItem, product, pricing)) {
    return null;
  }

  const currentPrice =
    pricing.campaignPrice ??
    pricing.currentPrice ??
    product.price;

  const regularPrice =
    pricing.regularPrice ??
    product.price;

  const comparisonPrice =
    pricing.comparisonPrice ??
    product.comparisonPrice;

  const comparisonUnit =
    pricing.comparisonUnit ??
    product.comparisonUnit;

  const priceText = formatPrice(currentPrice);
  const unitPriceText = formatComparisonPrice(comparisonPrice, comparisonUnit);
  const categoryMeta = getCategoryMeta(product, options.fallbackFacetNames);
  const imageUrl = getImageUrl(product);
  const productUrl = getProductUrl(product);
  const labelsText = cleanRepeatedCampaignTextV161(getLabels(listItem, product));

  const campaignValidUntil = firstString(pricing.campaignPriceValidUntil);
  const isCampaign =
    currentPrice != null &&
    regularPrice != null &&
    Number(currentPrice) < Number(regularPrice);

  const benefitText = cleanRepeatedCampaignTextV161(
    isCampaign
      ? `Kampanja${regularPrice ? `, normaalisti ${formatPrice(regularPrice)}` : ""}`
      : labelsText,
  );

  const rawText = [
    title,
    product.brandName,
    priceText,
    unitPriceText,
    labelsText,
    categoryMeta.category,
    categoryMeta.categoryPath,
    categoryMeta.department,
    categoryMeta.productGroup,
  ]
    .filter(Boolean)
    .join(" ");

  const id = firstString(
    product.ean,
    product.id,
    product.sokId,
    `skaupat-product-${options.query}-${options.index}`,
  );

  return {
    id,
    source: options.config.id,
    sourceUrl: options.config.url,
    chain: options.config.chain,
    storeLabel: options.config.storeLabel,
    title,
    priceText,
    unitPriceText,
    benefitText,
    validityText: campaignValidUntil ? `Voimassa ${campaignValidUntil}` : "",
    imageUrl,
    productUrl,
    rawText,
    matchScore: getMatchScore(
      options.query,
      title,
      `${categoryMeta.category} ${categoryMeta.categoryPath}`,
    ),

    // Category metadata consumed by ziiplyOfferCategoryCore.ts
    category: categoryMeta.category,
    categoryPath: categoryMeta.categoryPath,
    breadcrumbs: categoryMeta.breadcrumbs,
    hierarchy: categoryMeta.hierarchy,
    taxonomy: categoryMeta.taxonomy,
    department: categoryMeta.department,
    productGroup: categoryMeta.productGroup,
    mainCategory: categoryMeta.mainCategory,
    subCategory: categoryMeta.subCategory,
    brandName: firstString(product.brandName),
    ean: firstString(product.ean),
  } as unknown as ZiiplyOfferSearchResult;
}

function buildRemoteFilteredProductsUrl(
  query: string,
  offset = 0,
  selectedStoreId: string,
  discountedOnly = false,
): string {
  const page = Math.floor(offset / 48) + 1;
  const queryString = discountedOnly ? "" : query;

  const variables = {
    availabilityDate: "2026-06-07",
    facets: [
      { key: "brandName", order: "asc" },
      { key: "category" },
      { key: "labels" },
    ],
    filters: discountedOnly
      ? [
          {
            key: "labels",
            value: ["DISCOUNTED"],
          },
        ]
      : [],
    generatedSessionId: "1d6b5de9-df99-4608-af07-7d754955df82",
    fetchSponsoredContent: discountedOnly ? true : false,
    limit: discountedOnly ? 24 : 48,
    offset,
    skip: offset,
    page,
    queryString,
    sortForAvailabilityLabelDate: discountedOnly ? "2026-06-07" : undefined,
    storeId: selectedStoreId,
    useRandomId: false,
    marketingId: "d0bcc6e5-6130-494e-b6fb-12b5cb9c60cf",
  };

  const extensions = {
    persistedQuery: {
      version: 1,
      sha256Hash: SKAUPAT_REMOTE_FILTERED_PRODUCTS_HASH_V156,
    },
  };

  const url = new URL("https://api.s-kaupat.fi/");
  url.searchParams.set("operationName", "RemoteFilteredProducts");
  url.searchParams.set("variables", JSON.stringify(variables));
  url.searchParams.set("extensions", JSON.stringify(extensions));
  return url.toString();
}

async function fetchSKaupatRemoteFilteredProductsPageV170(
  query: string,
  config: ZiiplyOfferSearchSourceConfig,
  offset: number,
  selectedStoreId: string,
  discountedOnly = false,
): Promise<ZiiplyOfferSearchResult[]> {
  const response = await fetch(buildRemoteFilteredProductsUrl(query, offset, selectedStoreId, discountedOnly), {
    method: "GET",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "accept-language": "fi",
      origin: "https://www.s-kaupat.fi",
      referer: "https://www.s-kaupat.fi/",
      "x-client-name": "skaupat-web",
      "x-client-version": "production-45c31f7a746096c6da12e16aba1887e031fbd9de",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`S-kaupat RemoteFilteredProducts failed: ${response.status}`);
  }

  const data = await response.json();
  const root = getSProductsRoot(data);
  const fallbackFacetNames = getCategoryFacetNames(data);
  const categoryFacetPaths = getCategoryFacetPaths(data);
  const listItems = getSProductListItems(data);

  const mappedResults = listItems
    .map((item, index) =>
      mapSProductListItemToOfferResult(item, {
        query,
        config,
        fallbackFacetNames,
        index,
        selectedStoreId,
        discountedOnly,
      }),
    )
    .filter(Boolean) as ZiiplyOfferSearchResult[];

  return dedupeSOfferResultsV161(mappedResults);
}

async function fetchSKaupatRemoteFilteredProductsV170(
  query: string,
  config: ZiiplyOfferSearchSourceConfig,
  options?: SKaupatOfferProviderOptionsV173,
  discountedOnly = false,
): Promise<ZiiplyOfferSearchResult[]> {
  const selectedStoreId = await getEffectiveSKaupatStoreIdV174(options);
  if (!selectedStoreId) return [];

  const pageOffsets = discountedOnly
    ? [0, 24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312, 336, 360, 384, 408, 432, 456, 480]
    : isGostaMasterQueryV171(query)
      ? [0, 48, 96, 144, 192, 240, 288, 336, 384, 432, 480, 528, 576, 624, 672, 720, 768, 816, 864, 912]
      : [0, 48, 96, 144, 192];
  const pages: ZiiplyOfferSearchResult[][] = [];

  for (const offset of pageOffsets) {
    try {
      const pageResults = await fetchSKaupatRemoteFilteredProductsPageV170(query, config, offset, selectedStoreId, discountedOnly);
      pages.push(pageResults);

      // Stop early if S-kaupat returns a short page. If offset is ignored, the
      // next page will dedupe away later, but this keeps the request count small
      // when there clearly are no more rows.
      if (discountedOnly ? pageResults.length < 20 : pageResults.length < 40) break;
    } catch (error) {
      if (offset === 0) throw error;
      console.warn(`[Ziiply offers] S-kaupat pagination page failed at offset ${offset}`, error);
      break;
    }
  }

  return dedupeSOfferResultsV161(pages.flat());
}

export async function fetchSKaupatOffers(
  query: string,
  config: ZiiplyOfferSearchSourceConfig,
  options?: SKaupatOfferProviderOptionsV173,
): Promise<ZiiplyOfferSearchResult[]> {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) return [];

  try {
    if (isGostaMasterQueryV171(cleanQuery)) {
      return await fetchSKaupatRemoteFilteredProductsV170(
        "",
        config,
        options,
        true,
      );
    }

    return await fetchSKaupatRemoteFilteredProductsV170(cleanQuery, config, options);
  } catch (error) {
    console.warn("[Ziiply offers] S-kaupat RemoteFilteredProducts failed", error);
    return [];
  }
}

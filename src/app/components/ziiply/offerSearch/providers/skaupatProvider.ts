// ============================================================================
// SKAUPAT_PROVIDER_V152_EXPLICIT_PRODUCTLIST_PATH
// Revision: V152
// Date: 2026-06-05
//
// Fix:
// - Uses the real S-kaupat RemoteFilteredProducts response structure:
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

import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const SKAUPAT_REMOTE_FILTERED_PRODUCTS_HASH_V152 =
  "44ca017dddccfe49e787b483f471f26217adca807f8c71101d11e881dab9e480";

const DEFAULT_SKAUPAT_STORE_ID_V152 = "513971200";

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

  return asArray(root.products)
    .map(asRecord)
    .filter(Boolean) as UnknownRecord[];
}

function getStructuredFacets(data: unknown): UnknownRecord[] {
  const root = getSProductsRoot(data);
  if (!root) return [];

  return asArray(root.structuredFacets)
    .map(asRecord)
    .filter(Boolean) as UnknownRecord[];
}

function getCategoryFacetNames(data: unknown): string[] {
  const categoryFacet = getStructuredFacets(data).find(
    (facet) => normalizeText(facet.key) === "category",
  );

  if (!categoryFacet) return [];

  return asArray(categoryFacet.objectValue)
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return firstString(entry);

      return firstString(record.name, record.label, record.title, record.value);
    })
    .filter(Boolean);
}

function getCategoryFacetPaths(data: unknown): Array<{ name: string; value: string; count?: number }> {
  const categoryFacet = getStructuredFacets(data).find(
    (facet) => normalizeText(facet.key) === "category",
  );

  if (!categoryFacet) return [];

  return asArray(categoryFacet.objectValue)
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return null;

      const name = firstString(record.name, record.label, record.title);
      const value = firstString(record.value, record.slug);
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
  return asRecord(item.product);
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
  },
): ZiiplyOfferSearchResult | null {
  const product = getProductFromListItem(listItem);
  if (!product) return null;

  const title = firstString(product.name);
  if (!title) return null;

  const pricing = getPricing(product);
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
  const labelsText = getLabels(listItem, product);

  const campaignValidUntil = firstString(pricing.campaignPriceValidUntil);
  const isCampaign =
    currentPrice != null &&
    regularPrice != null &&
    Number(currentPrice) < Number(regularPrice);

  const benefitText = isCampaign
    ? `Kampanja${regularPrice ? `, normaalisti ${formatPrice(regularPrice)}` : ""}`
    : labelsText;

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

function buildRemoteFilteredProductsUrl(query: string): string {
  const variables = {
    facets: [
      { key: "brandName", order: "asc" },
      { key: "category" },
      { key: "labels" },
    ],
    generatedSessionId: "ziiply-gosta-v152",
    fetchSponsoredContent: true,
    limit: 48,
    queryString: query,
    storeId: DEFAULT_SKAUPAT_STORE_ID_V152,
    useRandomId: false,
    marketingId: "ziiply-gosta-v152",
  };

  const extensions = {
    persistedQuery: {
      version: 1,
      sha256Hash: SKAUPAT_REMOTE_FILTERED_PRODUCTS_HASH_V152,
    },
  };

  const url = new URL("https://api.s-kaupat.fi/");
  url.searchParams.set("operationName", "RemoteFilteredProducts");
  url.searchParams.set("variables", JSON.stringify(variables));
  url.searchParams.set("extensions", JSON.stringify(extensions));
  return url.toString();
}

async function fetchSKaupatRemoteFilteredProductsV152(
  query: string,
  config: ZiiplyOfferSearchSourceConfig,
): Promise<ZiiplyOfferSearchResult[]> {
  const response = await fetch(buildRemoteFilteredProductsUrl(query), {
    method: "GET",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "accept-language": "fi",
      "x-client-name": "skaupat-web",
      "x-client-version": "production-45c31f7a746096c6da12e16aba1887e031fbd9de",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`S-kaupat RemoteFilteredProducts failed: ${response.status}`);
  }

  const data = await response.json();
  const fallbackFacetNames = getCategoryFacetNames(data);
  void getCategoryFacetPaths;

  const listItems = getSProductListItems(data);

  return listItems
    .map((item, index) =>
      mapSProductListItemToOfferResult(item, {
        query,
        config,
        fallbackFacetNames,
        index,
      }),
    )
    .filter(Boolean) as ZiiplyOfferSearchResult[];
}

export async function fetchSKaupatOffers(
  query: string,
  config: ZiiplyOfferSearchSourceConfig,
): Promise<ZiiplyOfferSearchResult[]> {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) return [];

  try {
    return await fetchSKaupatRemoteFilteredProductsV152(cleanQuery, config);
  } catch (error) {
    console.warn("[Ziiply offers] S-kaupat RemoteFilteredProducts failed", error);
    return [];
  }
}

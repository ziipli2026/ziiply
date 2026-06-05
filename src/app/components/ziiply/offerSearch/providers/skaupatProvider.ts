// ============================================================================
// SKAUPAT_PROVIDER_V151_REMOTE_PRODUCTS_DEBUG_VISIBLE_BREAK
// Revision: V151
// Date: 2026-06-05
//
// Fix after V149:
// - V150 still returned zero visible results.
//// - Adds a visible diagnostic offer row if RemoteFilteredProducts returns
////   no parseable products or throws.
//// - This tells whether S-kaupat API is reachable from Vercel and whether
////   parser sees category facets/product-like objects.
//
// Install path:
// src/app/components/ziiply/offerSearch/providers/skaupatProvider.ts
// ============================================================================

import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const SKAUPAT_REMOTE_FILTERED_PRODUCTS_HASH_V150 =
  "44ca017dddccfe49e787b483f471f26217adca807f8c71101d11e881dab9e480";

const DEFAULT_SKAUPAT_STORE_ID_V150 = "513971200";

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
        objectValue.fi,
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

    const currentRecord = asRecord(current);
    if (!currentRecord) return undefined;
    current = currentRecord[key];
  }

  return current;
}

function readNestedString(object: UnknownRecord, paths: string[][]): string {
  for (const path of paths) {
    const text = firstString(getPathValue(object, path));
    if (text) return text;
  }

  return "";
}

function collectStringArray(value: unknown): string[] {
  if (!value) return [];

  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text ? [text] : [];
  }

  const record = asRecord(value);
  if (record) {
    const text = firstString(record);
    if (text) return [text];
  }

  return asArray(value)
    .flatMap((entry) => collectStringArray(entry))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getProductTitle(item: UnknownRecord): string {
  return firstString(
    item.name,
    item.title,
    item.productName,
    item.productTitle,
    item.displayName,
    item.localizedName,
    item.description,
    readNestedString(item, [
      ["product", "name"],
      ["product", "title"],
      ["product", "displayName"],
      ["item", "name"],
      ["node", "name"],
      ["node", "title"],
    ]),
  );
}

function hasAnyOwnKey(item: UnknownRecord, keys: string[]): boolean {
  return keys.some((key) => item[key] != null);
}

function looksLikeProduct(item: UnknownRecord): boolean {
  const title = getProductTitle(item);
  if (!title || title.length < 2) return false;

  const typeName = normalizeText(item.__typename);
  if (
    typeName.includes("facet") ||
    typeName.includes("categoryfacet") ||
    typeName.includes("filter") ||
    typeName.includes("navigation")
  ) {
    return false;
  }

  const hasPriceSignal =
    hasAnyOwnKey(item, [
      "price",
      "priceText",
      "currentPrice",
      "currentPriceText",
      "offerPrice",
      "offerPriceText",
      "unitPrice",
      "unitPriceText",
      "comparisonPrice",
      "comparisonPriceText",
      "pricing",
      "storeItem",
      "storeItems",
      "availability",
    ]) ||
    Boolean(
      readNestedString(item, [
        ["price", "formatted"],
        ["price", "text"],
        ["pricing", "priceText"],
        ["pricing", "currentPriceText"],
        ["storeItem", "priceText"],
        ["storeItems", "0", "priceText"],
      ]),
    );

  const hasProductSignal =
    hasAnyOwnKey(item, [
      "ean",
      "gtin",
      "productId",
      "id",
      "brandName",
      "brand",
      "imageUrl",
      "pictureUrl",
      "productUrl",
      "url",
    ]) ||
    Boolean(
      readNestedString(item, [
        ["product", "id"],
        ["product", "ean"],
        ["product", "gtin"],
        ["brand", "name"],
        ["images", "0", "url"],
      ]),
    );

  return Boolean(hasPriceSignal || hasProductSignal);
}

function collectProductObjects(root: unknown): UnknownRecord[] {
  const queue: unknown[] = [root];
  const visited = new Set<unknown>();
  const products: UnknownRecord[] = [];
  const seenKeys = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
      continue;
    }

    const record = asRecord(current);
    if (!record) continue;

    if (looksLikeProduct(record)) {
      const key = normalizeText(
        [
          record.id,
          record.productId,
          record.ean,
          record.gtin,
          getProductTitle(record),
          getPriceText(record),
        ]
          .filter(Boolean)
          .join("|"),
      );

      if (key && !seenKeys.has(key)) {
        seenKeys.add(key);
        products.push(record);
      }
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === "object") queue.push(value);
    }
  }

  return products.slice(0, 96);
}

function extractCategoryFacetNames(root: unknown): string[] {
  const queue: unknown[] = [root];
  const visited = new Set<unknown>();
  const names: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
      continue;
    }

    const record = asRecord(current);
    if (!record) continue;

    const key = normalizeText(record.key || record.id || record.name || record.label || record.__typename);
    const looksCategoryFacet =
      key === "category" ||
      key.includes("category") ||
      normalizeText(record.__typename).includes("categoryfacet");

    if (looksCategoryFacet) {
      const values =
        asArray(record.values).length > 0
          ? asArray(record.values)
          : asArray(record.options).length > 0
            ? asArray(record.options)
            : asArray(record.items).length > 0
              ? asArray(record.items)
              : asArray(record.buckets);

      for (const value of values) {
        const valueRecord = asRecord(value);
        const name = valueRecord
          ? firstString(
              valueRecord.name,
              valueRecord.title,
              valueRecord.label,
              valueRecord.value,
              valueRecord.slug,
              valueRecord.displayName,
            )
          : firstString(value);
        if (name) names.push(name);
      }
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === "object") queue.push(value);
    }
  }

  return Array.from(new Set(names));
}

function numberFromUnknown(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const number = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

function formatPriceNumber(value: unknown): string {
  const number = numberFromUnknown(value);
  if (number == null) return "";
  return `${number.toFixed(2).replace(".", ",")} €`;
}

function getPriceText(item: UnknownRecord): string {
  const direct = firstString(
    item.priceText,
    item.offerPriceText,
    item.currentPriceText,
    item.formattedPrice,
    item.displayPrice,
    readNestedString(item, [
      ["price", "formatted"],
      ["price", "text"],
      ["currentPrice", "formatted"],
      ["currentPrice", "text"],
      ["pricing", "priceText"],
      ["pricing", "currentPriceText"],
      ["storeItem", "priceText"],
      ["storeItems", "0", "priceText"],
    ]),
  );
  if (direct) return direct;

  return formatPriceNumber(
    item.price ??
      item.currentPrice ??
      item.offerPrice ??
      getPathValue(item, ["pricing", "price"]) ??
      getPathValue(item, ["pricing", "currentPrice"]) ??
      getPathValue(item, ["storeItem", "price"]) ??
      getPathValue(item, ["storeItems", "0", "price"]),
  );
}

function getUnitPriceText(item: UnknownRecord): string {
  return firstString(
    item.unitPriceText,
    item.comparisonPriceText,
    item.comparisonPrice,
    readNestedString(item, [
      ["pricing", "comparisonPriceText"],
      ["pricing", "unitPriceText"],
      ["storeItem", "comparisonPriceText"],
      ["storeItem", "unitPriceText"],
      ["storeItems", "0", "comparisonPriceText"],
      ["storeItems", "0", "unitPriceText"],
    ]),
  );
}

function getImageUrl(item: UnknownRecord): string {
  const image = firstString(
    item.imageUrl,
    item.pictureUrl,
    item.image,
    item.thumbnail,
    readNestedString(item, [
      ["product", "imageUrl"],
      ["product", "pictureUrl"],
      ["images", "0", "url"],
      ["image", "url"],
      ["media", "0", "url"],
    ]),
  );

  if (!image) return "";
  if (image.startsWith("//")) return `https:${image}`;
  return image;
}

function getProductUrl(item: UnknownRecord): string {
  const url = firstString(
    item.productUrl,
    item.url,
    item.href,
    readNestedString(item, [["product", "url"], ["link", "url"]]),
  );

  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `https://www.s-kaupat.fi${url}`;
  return url;
}

function extractCategoryMeta(item: UnknownRecord, fallbackFacetNames: string[]) {
  const categoryPathParts = [
    ...collectStringArray(item.categoryPath),
    ...collectStringArray(item.categories),
    ...collectStringArray(item.breadcrumbs),
    ...collectStringArray(item.breadcrumb),
    ...collectStringArray(item.taxonomy),
    ...collectStringArray(item.hierarchy),
    ...collectStringArray(getPathValue(item, ["product", "categories"])),
    ...collectStringArray(getPathValue(item, ["product", "categoryPath"])),
  ];

  const category = firstString(
    item.category,
    item.categoryName,
    item.mainCategory,
    item.subCategory,
    readNestedString(item, [
      ["product", "category"],
      ["product", "categoryName"],
      ["category", "name"],
      ["category", "title"],
      ["category", "label"],
      ["department", "name"],
      ["productGroup", "name"],
    ]),
    categoryPathParts.at(-1),
    fallbackFacetNames[0],
  );

  const department = firstString(
    item.department,
    item.departmentName,
    item.mainCategory,
    readNestedString(item, [["department", "name"], ["department", "title"]]),
    categoryPathParts[0],
  );

  const productGroup = firstString(
    item.productGroup,
    item.productGroupName,
    item.subCategory,
    readNestedString(item, [["productGroup", "name"], ["productGroup", "title"]]),
    categoryPathParts.at(-1),
  );

  const categoryPath = Array.from(
    new Set([department, ...categoryPathParts, category].filter(Boolean)),
  ).join(" / ");

  return {
    category,
    categoryPath,
    breadcrumbs: categoryPath || category,
    department,
    productGroup,
    mainCategory: department,
    subCategory: productGroup || category,
  };
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

function mapSProductToOfferResult(
  item: UnknownRecord,
  options: {
    query: string;
    config: ZiiplyOfferSearchSourceConfig;
    fallbackFacetNames: string[];
    index: number;
  },
): ZiiplyOfferSearchResult {
  const title = getProductTitle(item);

  const brandName = firstString(
    item.brandName,
    item.brand,
    readNestedString(item, [["brand", "name"], ["product", "brandName"]]),
  );

  const categoryMeta = extractCategoryMeta(item, options.fallbackFacetNames);
  const priceText = getPriceText(item);
  const unitPriceText = getUnitPriceText(item);
  const imageUrl = getImageUrl(item);
  const productUrl = getProductUrl(item);

  const rawText = [
    title,
    brandName,
    priceText,
    unitPriceText,
    categoryMeta.category,
    categoryMeta.categoryPath,
    categoryMeta.department,
    categoryMeta.productGroup,
    firstString(item.labels),
  ]
    .filter(Boolean)
    .join(" ");

  const id = firstString(
    item.id,
    item.productId,
    item.ean,
    item.gtin,
    readNestedString(item, [["product", "id"], ["product", "ean"], ["item", "id"]]),
    `skaupat-remote-${options.query}-${options.index}`,
  );

  return {
    id,
    source: options.config.id,
    sourceUrl: options.config.url,
    chain: options.config.chain,
    storeLabel: options.config.storeLabel,
    title: title || options.query,
    priceText,
    unitPriceText,
    benefitText: firstString(item.benefitText, item.campaignText, item.discountText, item.labels),
    validityText: firstString(item.validityText, item.validUntil, item.campaignValidity),
    imageUrl,
    productUrl,
    rawText,
    matchScore: getMatchScore(
      options.query,
      title,
      `${categoryMeta.category} ${categoryMeta.categoryPath}`,
    ),

    category: categoryMeta.category,
    categoryPath: categoryMeta.categoryPath,
    breadcrumbs: categoryMeta.breadcrumbs,
    department: categoryMeta.department,
    productGroup: categoryMeta.productGroup,
    mainCategory: categoryMeta.mainCategory,
    subCategory: categoryMeta.subCategory,
    brandName,
  } as unknown as ZiiplyOfferSearchResult;
}

function buildRemoteFilteredProductsUrl(query: string): string {
  const variables = {
    facets: [
      { key: "brandName", order: "asc" },
      { key: "category" },
      { key: "labels" },
    ],
    generatedSessionId: "ziiply-gosta-v150",
    fetchSponsoredContent: true,
    limit: 48,
    queryString: query,
    storeId: DEFAULT_SKAUPAT_STORE_ID_V150,
    useRandomId: false,
    marketingId: "ziiply-gosta-v150",
  };

  const extensions = {
    persistedQuery: {
      version: 1,
      sha256Hash: SKAUPAT_REMOTE_FILTERED_PRODUCTS_HASH_V150,
    },
  };

  const url = new URL("https://api.s-kaupat.fi/");
  url.searchParams.set("operationName", "RemoteFilteredProducts");
  url.searchParams.set("variables", JSON.stringify(variables));
  url.searchParams.set("extensions", JSON.stringify(extensions));
  return url.toString();
}

async function fetchSKaupatRemoteFilteredProductsV150(
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
  const fallbackFacetNames = extractCategoryFacetNames(data);
  const productItems = collectProductObjects(data);

  const results = productItems
    .map((item, index) =>
      mapSProductToOfferResult(item, {
        query,
        config,
        fallbackFacetNames,
        index,
      }),
    )
    .filter((item) => String((item as any).title || "").trim().length > 1);

  if (results.length === 0) {
    const topKeys = asRecord(data)
      ? Object.keys(data as UnknownRecord).slice(0, 8).join(", ")
      : typeof data;

    return [
      {
        id: `skaupat-debug-empty-${Date.now()}`,
        source: config.id,
        sourceUrl: config.url,
        chain: config.chain,
        storeLabel: config.storeLabel,
        title: `DEBUG S-kaupat: API vastasi, mutta tuotteita ei parsittu`,
        priceText: "",
        unitPriceText: "",
        benefitText: `query="${query}" facets=${fallbackFacetNames.length} products=${productItems.length} topKeys=${topKeys}`,
        validityText: "V151 diagnostics",
        imageUrl: "",
        productUrl: "",
        rawText: `DEBUG SKAUPAT EMPTY query ${query} facets ${fallbackFacetNames.join(" ")}`,
        matchScore: 999,
        category: "Muut",
        categoryPath: fallbackFacetNames.join(" / "),
        breadcrumbs: fallbackFacetNames.join(" / "),
        department: "",
        productGroup: "",
      } as unknown as ZiiplyOfferSearchResult,
    ];
  }

  return results;
}

export async function fetchSKaupatOffers(
  query: string,
  config: ZiiplyOfferSearchSourceConfig,
): Promise<ZiiplyOfferSearchResult[]> {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) return [];

  try {
    return await fetchSKaupatRemoteFilteredProductsV150(cleanQuery, config);
  } catch (error) {
    console.warn("[Ziiply offers] S-kaupat RemoteFilteredProducts failed", error);

    return [
      {
        id: `skaupat-debug-error-${Date.now()}`,
        source: config.id,
        sourceUrl: config.url,
        chain: config.chain,
        storeLabel: config.storeLabel,
        title: `DEBUG S-kaupat: API-haku epäonnistui`,
        priceText: "",
        unitPriceText: "",
        benefitText: String(error instanceof Error ? error.message : error),
        validityText: "V151 diagnostics",
        imageUrl: "",
        productUrl: "",
        rawText: `DEBUG SKAUPAT ERROR query ${cleanQuery}`,
        matchScore: 999,
        category: "Muut",
        categoryPath: "",
        breadcrumbs: "",
        department: "",
        productGroup: "",
      } as unknown as ZiiplyOfferSearchResult,
    ];
  }
}

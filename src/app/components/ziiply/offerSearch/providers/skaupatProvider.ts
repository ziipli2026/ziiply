// ============================================================================
// SKAUPAT_PROVIDER_V149_TYPESCRIPT_RETURN_FIX
// Revision: V149
// Date: 2026-06-05
//
// Fix:
// - Adds explicit return type to recursive firstString helper.
// - Keeps V148 RemoteFilteredProducts/category facet logic unchanged.
//
// Install path:
// src/app/components/ziiply/offerSearch/providers/skaupatProvider.ts
// ============================================================================

import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const SKAUPAT_REMOTE_FILTERED_PRODUCTS_HASH_V148 =
  "44ca017dddccfe49e787b483f471f26217adca807f8c71101d11e881dab9e480";

// Networkista löytynyt toimiva storeId. Myöhemmin tämän voi vaihtaa aktiivisen kaupan mukaan.
const DEFAULT_SKAUPAT_STORE_ID_V148 = "513971200";

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
    }

    const objectValue = asRecord(value);
    if (objectValue) {
      const text = firstString(
        objectValue.name,
        objectValue.title,
        objectValue.label,
        objectValue.displayName,
        objectValue.slug,
        objectValue.value,
      );
      if (text) return text;
    }
  }

  return "";
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " ja ")
    .replace(/[^a-z0-9åäö\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readNestedString(object: UnknownRecord, paths: string[][]) {
  for (const path of paths) {
    let current: unknown = object;

    for (const key of path) {
      const currentRecord = asRecord(current);
      if (!currentRecord) {
        current = undefined;
        break;
      }

      current = currentRecord[key];
    }

    const text = firstString(current);
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

function findFirstObjectArray(root: unknown, predicate: (item: UnknownRecord) => boolean) {
  const queue: unknown[] = [root];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      const objects = current.map(asRecord).filter(Boolean) as UnknownRecord[];
      if (objects.length >= 1 && objects.some(predicate)) return objects;
      for (const item of current) queue.push(item);
      continue;
    }

    const record = asRecord(current);
    if (!record) continue;

    for (const value of Object.values(record)) {
      if (value && typeof value === "object") queue.push(value);
    }
  }

  return [];
}

function looksLikeProduct(item: UnknownRecord) {
  const title = firstString(
    item.name,
    item.title,
    item.productName,
    item.displayName,
    item.localizedName,
    readNestedString(item, [["product", "name"], ["product", "title"], ["item", "name"]]),
  );

  if (!title || title.length < 2) return false;

  const hasPrice =
    item.price != null ||
    item.priceText != null ||
    item.currentPrice != null ||
    item.unitPrice != null ||
    item.unitPriceText != null ||
    item.comparisonPrice != null ||
    item.pricing != null ||
    item.storeItems != null ||
    item.storeItem != null;

  const hasProductSignal =
    item.ean != null ||
    item.gtin != null ||
    item.productId != null ||
    item.id != null ||
    item.brandName != null ||
    item.imageUrl != null ||
    item.pictureUrl != null ||
    item.productUrl != null;

  return Boolean(hasPrice || hasProductSignal);
}

function extractCategoryFacetNames(root: unknown) {
  const candidates = findFirstObjectArray(root, (item) => {
    const key = normalizeText(item.key || item.id || item.name || item.label);
    return key === "category" || key.includes("category");
  });

  const names: string[] = [];

  for (const candidate of candidates) {
    const key = normalizeText(candidate.key || candidate.id || candidate.name || candidate.label);
    if (key !== "category" && !key.includes("category")) continue;

    const values =
      asArray(candidate.values).length > 0
        ? asArray(candidate.values)
        : asArray(candidate.options).length > 0
          ? asArray(candidate.options)
          : asArray(candidate.items);

    for (const value of values) {
      const valueRecord = asRecord(value);
      const name = valueRecord
        ? firstString(valueRecord.name, valueRecord.title, valueRecord.label, valueRecord.value, valueRecord.slug)
        : firstString(value);
      if (name) names.push(name);
    }
  }

  return Array.from(new Set(names));
}

function getPriceText(item: UnknownRecord) {
  const direct = firstString(
    item.priceText,
    item.offerPriceText,
    item.currentPriceText,
    item.formattedPrice,
    item.displayPrice,
    readNestedString(item, [["price", "formatted"], ["price", "text"], ["pricing", "priceText"], ["storeItem", "priceText"]]),
  );
  if (direct) return direct;

  const numeric =
    item.price ??
    item.currentPrice ??
    item.offerPrice ??
    readNestedString(item, [["pricing", "price"], ["storeItem", "price"], ["storeItems", "0", "price"]]);

  if (typeof numeric === "number" && Number.isFinite(numeric)) {
    return `${numeric.toFixed(2).replace(".", ",")} €`;
  }

  const numericText = firstString(numeric);
  return numericText;
}

function getUnitPriceText(item: UnknownRecord) {
  return firstString(
    item.unitPriceText,
    item.comparisonPriceText,
    item.comparisonPrice,
    readNestedString(item, [
      ["pricing", "comparisonPriceText"],
      ["pricing", "unitPriceText"],
      ["storeItem", "comparisonPriceText"],
      ["storeItem", "unitPriceText"],
    ]),
  );
}

function getImageUrl(item: UnknownRecord) {
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

function getProductUrl(item: UnknownRecord) {
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

function getMatchScore(query: string, title: string, categoryText: string) {
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
  const title = firstString(
    item.name,
    item.title,
    item.productName,
    item.displayName,
    item.localizedName,
    readNestedString(item, [["product", "name"], ["product", "title"], ["item", "name"]]),
  );

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
    title: title || firstString(item.productName) || options.query,
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

    // V148: category metadata consumed by ziiplyOfferCategoryCore.ts
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

function buildRemoteFilteredProductsUrl(query: string) {
  const variables = {
    facets: [
      { key: "brandName", order: "asc" },
      { key: "category" },
      { key: "labels" },
    ],
    generatedSessionId: "ziiply-gosta-v148",
    fetchSponsoredContent: true,
    limit: 48,
    queryString: query,
    storeId: DEFAULT_SKAUPAT_STORE_ID_V148,
    useRandomId: false,
    marketingId: "ziiply-gosta-v148",
  };

  const extensions = {
    persistedQuery: {
      version: 1,
      sha256Hash: SKAUPAT_REMOTE_FILTERED_PRODUCTS_HASH_V148,
    },
  };

  const url = new URL("https://api.s-kaupat.fi/");
  url.searchParams.set("operationName", "RemoteFilteredProducts");
  url.searchParams.set("variables", JSON.stringify(variables));
  url.searchParams.set("extensions", JSON.stringify(extensions));
  return url.toString();
}

async function fetchSKaupatRemoteFilteredProductsV148(
  query: string,
  config: ZiiplyOfferSearchSourceConfig,
) {
  const response = await fetch(buildRemoteFilteredProductsUrl(query), {
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
        "Mozilla/5.0 (compatible; ZiiplyBot/1.0; +https://ziiply.fi)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`S-kaupat RemoteFilteredProducts failed: ${response.status}`);
  }

  const data = await response.json();
  const fallbackFacetNames = extractCategoryFacetNames(data);
  const productItems = findFirstObjectArray(data, looksLikeProduct);

  return productItems
    .map((item, index) =>
      mapSProductToOfferResult(item, {
        query,
        config,
        fallbackFacetNames,
        index,
      }),
    )
    .filter((item) => String((item as any).title || "").trim().length > 1);
}

export async function fetchSKaupatOffers(
  query: string,
  config: ZiiplyOfferSearchSourceConfig,
): Promise<ZiiplyOfferSearchResult[]> {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) return [];

  try {
    return await fetchSKaupatRemoteFilteredProductsV148(cleanQuery, config);
  } catch (error) {
    console.warn("[Ziiply offers] S-kaupat RemoteFilteredProducts fallback failed", error);
    return [];
  }
}

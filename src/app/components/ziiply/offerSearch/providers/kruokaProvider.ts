// src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts
// ============================================================================
// ZIIPLY_KRUOKA_PROVIDER_V47_KRUOKA_ONLY_DYNAMIC
// Revision: V47
// Date: 2026-07-14
//
// - Ei Ruoanhinta.fi:tä.
// - Ei Jokela/S441-kovakoodausta.
// - Ei HAR-snapshotia.
// - Käyttää vain K-Ruoan omaa tarjouslehteä, applicationState-dataa ja
//   /kr-api/raw-offer/product-map -rajapintaa.
// - Kauppa määräytyy käyttäjän valitseman K-kaupan nimestä.
// - Jos K-Ruoka estää palvelinpyynnön, provider palauttaa tyhjän listan eikä
//   koskaan korvaa sitä väärällä kaupalla tai kolmannen osapuolen datalla.
// ============================================================================

import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "../types";

export type KruokaOfferProviderOptionsV10 = {
  storeId?: string | number | null;
  storeName?: string | null;
  kStoreId?: string | number | null;
  kStoreName?: string | null;
  kStoreIds?: Array<string | number | null | undefined> | null;
  kStoreNames?: Array<string | null | undefined> | null;
};

type UnknownRecord = Record<string, unknown>;

type KRawOffer = {
  Id?: string | number;
  id?: string | number;
  Name?: string;
  name?: string;
  Price?: number | string;
  price?: number | string;
  Eans?: Array<string | number>;
  eans?: Array<string | number>;
  [key: string]: unknown;
};

const KRUOKA_ORIGIN = "https://www.k-ruoka.fi";
const PRODUCT_MAP_URL = `${KRUOKA_ORIGIN}/kr-api/raw-offer/product-map`;

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/&/g, " ja ")
    .replace(/[^a-z0-9åäö]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyStoreName(value: unknown): string {
  return normalize(value)
    .replace(/^k citymarket\s+/, "k-citymarket-")
    .replace(/^k supermarket\s+/, "k-supermarket-")
    .replace(/^k market\s+/, "k-market-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getSelectedStoreName(options?: KruokaOfferProviderOptionsV10): string {
  return String(
    options?.kStoreName ??
      options?.storeName ??
      options?.kStoreNames?.[0] ??
      "",
  ).trim();
}

function getBrochurePath(storeName: string): string {
  const name = normalize(storeName);
  if (name.includes("citymarket")) return "/k-citymarket/tarjouslehti";
  if (name.includes("supermarket")) return "/k-supermarket/tarjouslehti";
  return "/k-market/tarjouslehti";
}

function buildBrochureUrl(storeName: string): string {
  const path = getBrochurePath(storeName);
  const storeSlug = slugifyStoreName(storeName);
  const params = new URLSearchParams();

  if (storeSlug) params.set("kauppa", storeSlug);
  params.set("sivu", "1");

  return `${KRUOKA_ORIGIN}${path}?${params.toString()}`;
}

function htmlEntityDecode(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function maybeDecodeURIComponent(value: string): string {
  if (!value.includes("%")) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractApplicationState(html: string): UnknownRecord {
  const match = html.match(
    /<div[^>]*id=["']applicationState["'][^>]*data-state=(["'])([\s\S]*?)\1[^>]*>/,
  );

  if (!match?.[2]) {
    throw new Error("K-Ruoka applicationState puuttuu tarjouslehden HTML:stä");
  }

  const decoded = maybeDecodeURIComponent(htmlEntityDecode(match[2]));
  const parsed = JSON.parse(decoded) as unknown;

  if (!parsed || typeof parsed !== "object") {
    throw new Error("K-Ruoka applicationState ei ole objekti");
  }

  return parsed as UnknownRecord;
}

function getByPath(root: unknown, path: string[]): unknown {
  let current = root;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as UnknownRecord)[key];
  }
  return current;
}

function findStoreOffers(state: UnknownRecord): {
  kStoreId: string;
  offers: KRawOffer[];
} {
  const stores = getByPath(state, [
    "reduxState",
    "offerBrochurePage",
    "stores",
  ]);

  if (!stores || typeof stores !== "object") {
    throw new Error("K-Ruoka offerBrochurePage.stores puuttuu");
  }

  const storeMap = stores as UnknownRecord;
  const candidates = Object.entries(storeMap);

  for (const [kStoreId, storeValue] of candidates) {
    const offers = getByPath(storeValue, ["response", "offers"]);
    if (Array.isArray(offers) && offers.length > 0) {
      return { kStoreId, offers: offers as KRawOffer[] };
    }
  }

  throw new Error("K-Ruoka tarjouslehdestä ei löytynyt tarjouksia");
}

function collectEans(offers: KRawOffer[]): string[] {
  const result = new Set<string>();

  for (const offer of offers) {
    const eans = offer.Eans ?? offer.eans ?? [];
    for (const ean of eans) {
      const value = String(ean ?? "").trim();
      if (value) result.add(value);
    }
  }

  return Array.from(result);
}

async function fetchBrochureHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "fi-FI,fi;q=0.9,en;q=0.7",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15",
    },
    cache: "no-store",
    redirect: "follow",
  });

  if (!response.ok) {
    const preview = await response.text().catch(() => "");
    throw new Error(
      `K-Ruoka tarjouslehti HTTP ${response.status}: ${preview.slice(0, 160)}`,
    );
  }

  return response.text();
}

async function fetchProductMap(
  kStoreId: string,
  eans: string[],
  brochureUrl: string,
): Promise<Record<string, UnknownRecord>> {
  if (eans.length === 0) return {};

  const response = await fetch(PRODUCT_MAP_URL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "fi-FI,fi;q=0.9,en;q=0.7",
      "Content-Type": "application/json",
      Origin: KRUOKA_ORIGIN,
      Referer: brochureUrl,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15",
    },
    body: JSON.stringify({
      storeId: kStoreId,
      eans,
      requirePromotionValidAt: new Date().toISOString(),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const preview = await response.text().catch(() => "");
    throw new Error(
      `K-Ruoka product-map HTTP ${response.status}: ${preview.slice(0, 160)}`,
    );
  }

  const data = (await response.json()) as unknown;
  return data && typeof data === "object"
    ? (data as Record<string, UnknownRecord>)
    : {};
}

function activeDiscount(product: UnknownRecord): UnknownRecord | null {
  const discount = getByPath(product, ["mobilescan", "pricing", "discount"]);
  if (!discount || typeof discount !== "object") return null;

  const row = discount as UnknownRecord;
  const price = Number(row.price);
  if (!Number.isFinite(price) || price <= 0) return null;

  const now = Date.now();
  const start = row.startDate
    ? new Date(String(row.startDate)).getTime()
    : Number.NEGATIVE_INFINITY;
  const end = row.endDate
    ? new Date(String(row.endDate)).getTime()
    : Number.POSITIVE_INFINITY;

  if (Number.isFinite(start) && start > now) return null;
  if (Number.isFinite(end) && end < now) return null;

  const storeAvailable = getByPath(row, ["discountAvailability", "store"]);
  if (storeAvailable === false) return null;

  return row;
}

function localizedName(product: UnknownRecord): string {
  return String(
    getByPath(product, ["localizedName", "finnish"]) ??
      getByPath(product, ["productAttributes", "marketingName", "fi"]) ??
      product.ean ??
      "K-Ruoka tarjous",
  );
}

function imageUrl(product: UnknownRecord): string | null {
  const images = product.images;
  if (Array.isArray(images) && typeof images[0] === "string") return images[0];

  const nested = getByPath(product, ["productAttributes", "image", "url"]);
  return typeof nested === "string" && nested ? nested : null;
}

function topCategory(product: UnknownRecord): string {
  const tree = getByPath(product, ["category", "tree"]);
  if (Array.isArray(tree) && tree.length > 0) {
    const value = getByPath(tree[0], ["localizedName", "finnish"]);
    if (value) return String(value);
  }

  return String(
    getByPath(product, ["category", "localizedName", "finnish"]) ?? "Muut",
  );
}

function subCategory(product: UnknownRecord): string {
  const tree = getByPath(product, ["category", "tree"]);
  if (Array.isArray(tree) && tree.length > 0) {
    const value = getByPath(tree[tree.length - 1], [
      "localizedName",
      "finnish",
    ]);
    if (value) return String(value);
  }
  return topCategory(product);
}

function priceText(value: unknown): string {
  const numberValue = Number(value);
  return Number.isFinite(numberValue)
    ? numberValue.toFixed(2).replace(".", ",")
    : "";
}

function validityText(value: unknown): string | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return undefined;

  return `Voimassa ${date.toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  })} asti`;
}

function matchesQuery(result: ZiiplyOfferSearchResult, query: string): boolean {
  const q = normalize(query);
  if (!q || String(query).trim().startsWith("__ziiply")) return true;

  const item = result as unknown as UnknownRecord;
  return normalize(
    [
      item.title,
      item.name,
      item.productName,
      item.brand,
      item.ean,
      item.category,
      item.categoryPath,
      item.productGroup,
      item.subCategory,
    ]
      .filter(Boolean)
      .join(" "),
  ).includes(q);
}

function mapProduct(
  product: UnknownRecord,
  index: number,
  displayStoreId: string,
  displayStoreName: string,
  brochureUrl: string,
): ZiiplyOfferSearchResult | null {
  const discount = activeDiscount(product);
  if (!discount) return null;

  const ean = String(product.ean ?? product.baseEan ?? product.id ?? "").trim();
  if (!ean) return null;

  const title = localizedName(product);
  const category = topCategory(product);
  const categoryPath = String(
    getByPath(product, ["category", "path"]) ?? category,
  );
  const unitPriceValue = getByPath(discount, ["unitPrice", "value"]);
  const unitPriceUnit = getByPath(discount, ["unitPrice", "unit"]);
  const unitPrice =
    typeof unitPriceValue === "number"
      ? `${priceText(unitPriceValue)}${unitPriceUnit ? `/${String(unitPriceUnit)}` : ""}`
      : "";

  const productSlug = getByPath(product, [
    "productAttributes",
    "urlSlug",
  ]);
  const productUrl =
    typeof productSlug === "string" && productSlug
      ? `${KRUOKA_ORIGIN}/kauppa/tuote/${encodeURIComponent(productSlug)}`
      : brochureUrl;

  const discountType = String(discount.discountType ?? "").toUpperCase();
  const isPlussa =
    discountType === "PLUSSA" || discountType === "LOYALTY";

  return {
    id: `kruoka-v47-${displayStoreId}-${String(discount.campaignId ?? ean)}-${ean}-${index}`,
    title,
    name: title,
    productName: title,
    price: Number(discount.price),
    priceText: priceText(discount.price),
    offerPrice: priceText(discount.price),
    previousPrice:
      getByPath(product, ["mobilescan", "pricing", "normal", "price"]) ?? null,
    unitPrice,
    unitPriceText: unitPrice,
    unitPriceUnit: unitPriceUnit ?? null,
    imageUrl: imageUrl(product),
    image: imageUrl(product),
    pictureUrl: imageUrl(product),
    storeId: displayStoreId,
    storeName: displayStoreName,
    storeLabel: displayStoreName,
    chain: "K",
    source: "kruoka",
    provider: "kruoka",
    offerId: discount.campaignId ?? ean,
    ean,
    eans: [ean],
    brand: getByPath(product, ["brand", "name"]) ?? null,
    additionalInfo:
      discount.discountPercentageText ??
      (typeof discount.discountPercentage === "number"
        ? `-${discount.discountPercentage}%`
        : null),
    benefitText: isPlussa ? "Plussa-tarjous" : undefined,
    validityText: validityText(discount.endDate),
    category,
    categoryPath,
    productGroup: category,
    mainCategory: category,
    subCategory: subCategory(product),
    validFrom: discount.startDate ?? null,
    validUntil: discount.endDate ?? null,
    isPlussaOffer: isPlussa,
    url: productUrl,
    productUrl,
    debug: {
      providerVersion: "V47_KRUOKA_ONLY_DYNAMIC",
      kRuokaStoreId: getByPath(product, ["store", "id"]) ?? null,
      selectedStoreId: displayStoreId,
      campaignId: discount.campaignId ?? null,
    },
  } as unknown as ZiiplyOfferSearchResult;
}

export async function fetchKruokaOffers(
  query: string,
  _source: ZiiplyOfferSearchSourceConfig,
  options?: KruokaOfferProviderOptionsV10,
): Promise<ZiiplyOfferSearchResult[]> {
  const displayStoreName = getSelectedStoreName(options);
  const displayStoreId = String(
    options?.kStoreId ?? options?.storeId ?? "",
  ).trim();

  if (!displayStoreName) return [];

  const brochureUrl = buildBrochureUrl(displayStoreName);

  try {
    const html = await fetchBrochureHtml(brochureUrl);
    const state = extractApplicationState(html);
    const { kStoreId, offers } = findStoreOffers(state);
    const eans = collectEans(offers);
    const productMap = await fetchProductMap(kStoreId, eans, brochureUrl);

    const seen = new Set<string>();
    const results: ZiiplyOfferSearchResult[] = [];

    for (const [index, product] of Object.values(productMap).entries()) {
      const mapped = mapProduct(
        product,
        index,
        displayStoreId || kStoreId,
        displayStoreName,
        brochureUrl,
      );
      if (!mapped || !matchesQuery(mapped, query)) continue;

      const ean = String((mapped as unknown as UnknownRecord).ean ?? mapped.id);
      if (seen.has(ean)) continue;
      seen.add(ean);
      results.push(mapped);
    }

    return results;
  } catch (error) {
    console.error("[Ziiply K provider V47] K-Ruoka-only haku epäonnistui", {
      selectedStoreId: displayStoreId,
      selectedStoreName: displayStoreName,
      brochureUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

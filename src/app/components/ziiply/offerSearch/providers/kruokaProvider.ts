// ============================================================================
// ZIIPLY_KRUOKA_PROVIDER_V51_DIRECT_FETCH_OFFERS_DEBUG_COMPAT
// Revision: V51-DIRECT-FETCH-OFFERS-DEBUG-COMPAT
// Date: 2026-09-21
//
// Muutos V49:ään:
// - Poistaa pakollisen K-Ruoka tarjouslehti-HTML-fetchin, joka saa Vercelissä 403.
// - Kokeilee K-Ruoan /kr-api/fetch-offers -endpointia suoraan valitun kaupan tiedoilla.
// - EI käytä Ruoanhinta.fi:tä eikä eTarjouslehdetiä.
// - Säilyttää product-map-vaiheen ja tarjouskorttien normalisoinnin.
// - Tallentaa endpointin HTTP-statuksen, vastausmuodon, löydetyn K-storeId:n,
//   offer/EAN-määrät ja product-map-statuksen pipeline-debugiin.
// - Debug EI kulje tarjousrivinä eikä vaikuta tarjous-/kategoria-aineistoon.
// - Tämä on tarkoituksella diagnostiikkaversio: seuraava testi kertoo nykyisen
//   fetch-offers-requestin vaatiman storeId/body-muodon ilman Cloudflare-HTML-porttia.
// ============================================================================

// src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts

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

export type KruokaPipelineDebugV49 = {
  selectedStoreName: string;
  selectedStoreId: string;
  brochureUrl: string;
  brochureHttp: number | null;
  applicationState: "NOT_RUN" | "OK" | "FAIL";
  fetchOffersHttp?: number | null;
  fetchOffersShape?: string | null;
  kStoreId: string | null;
  brochureOffers: number | null;
  eans: number | null;
  productMapHttp: number | null;
  productMapProducts: number | null;
  activeOffers: number | null;
  error: string | null;
};

let lastKruokaPipelineDebugV49: KruokaPipelineDebugV49 | null = null;

export function getLastKruokaPipelineDebugV49(): KruokaPipelineDebugV49 | null {
  return lastKruokaPipelineDebugV49
    ? { ...lastKruokaPipelineDebugV49 }
    : null;
}

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
const FETCH_OFFERS_URL = `${KRUOKA_ORIGIN}/kr-api/fetch-offers`;

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

function getByPath(root: unknown, path: string[]): unknown {
  let current = root;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as UnknownRecord)[key];
  }
  return current;
}

function asOfferArray(value: unknown): KRawOffer[] | null {
  return Array.isArray(value) ? (value as KRawOffer[]) : null;
}

function findOffersInFetchResponse(data: unknown): {
  kStoreId: string | null;
  offers: KRawOffer[];
  shape: string;
} {
  // Tunnetut/tyypilliset JSON-muodot ensin.
  const direct = asOfferArray(data);
  if (direct) return { kStoreId: null, offers: direct, shape: "array" };

  if (!data || typeof data !== "object") {
    return { kStoreId: null, offers: [], shape: typeof data };
  }

  const root = data as UnknownRecord;
  const paths: Array<{ path: string[]; label: string }> = [
    { path: ["offers"], label: "offers" },
    { path: ["response", "offers"], label: "response.offers" },
    { path: ["data", "offers"], label: "data.offers" },
    { path: ["data", "response", "offers"], label: "data.response.offers" },
  ];

  for (const candidate of paths) {
    const offers = asOfferArray(getByPath(root, candidate.path));
    if (offers) {
      const kStoreId = String(
        root.storeId ??
          getByPath(root, ["store", "id"]) ??
          getByPath(root, ["response", "storeId"]) ??
          getByPath(root, ["data", "storeId"]) ??
          "",
      ).trim() || null;
      return { kStoreId, offers, shape: candidate.label };
    }
  }

  // Jos vastaus on store-map (esim. { S441: { response: { offers: [...] } } }),
  // etsitään ensimmäinen oikea offer-array ja otetaan avain K-storeId:ksi.
  for (const [key, value] of Object.entries(root)) {
    const offers =
      asOfferArray(getByPath(value, ["response", "offers"])) ??
      asOfferArray(getByPath(value, ["offers"]));
    if (offers) {
      return { kStoreId: key, offers, shape: `store-map:${key}` };
    }
  }

  return {
    kStoreId: null,
    offers: [],
    shape: `object:${Object.keys(root).slice(0, 12).join(",")}`,
  };
}

async function fetchOffersDirect(
  displayStoreId: string,
  displayStoreName: string,
  brochureUrl: string,
  debug?: KruokaPipelineDebugV49,
): Promise<{ kStoreId: string; offers: KRawOffer[] }> {
  // V50: ei tarjouslehden HTML:ää. Endpointille annetaan kaikki jo Ziiplyllä
  // varmasti olevat kauppatiedot. Seuraava debug kertoo hyväksyykö nykyinen
  // K-Ruoka tämän request-muodon vai vaatiiko se sisäisen S/L-storeId:n.
  const response = await fetch(FETCH_OFFERS_URL, {
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
      storeId: displayStoreId || undefined,
      storeName: displayStoreName || undefined,
      requirePromotionValidAt: new Date().toISOString(),
    }),
    cache: "no-store",
  });

  if (debug) debug.fetchOffersHttp = response.status;

  const raw = await response.text().catch(() => "");
  if (!response.ok) {
    if (debug) debug.fetchOffersShape = `HTTP ${response.status}: ${raw.slice(0, 240)}`;
    throw new Error(
      `K-Ruoka fetch-offers HTTP ${response.status}: ${raw.slice(0, 240)}`,
    );
  }

  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    if (debug) debug.fetchOffersShape = `NON_JSON:${raw.slice(0, 240)}`;
    throw new Error(`K-Ruoka fetch-offers ei palauttanut JSONia: ${raw.slice(0, 240)}`);
  }

  const found = findOffersInFetchResponse(data);
  if (debug) debug.fetchOffersShape = found.shape;

  if (!found.offers.length) {
    throw new Error(`K-Ruoka fetch-offers: tarjouksia ei löytynyt; shape=${found.shape}`);
  }

  // product-map tarvitsee K-Ruoan sisäisen storeId:n. Jos endpoint ei anna sitä
  // erikseen, hyväksytään displayStoreId vain diagnostiikkana; product-map-debug
  // kertoo heti, onko tunniste oikeaa muotoa.
  const kStoreId = found.kStoreId || displayStoreId;
  if (!kStoreId) {
    throw new Error("K-Ruoka fetch-offers palautti tarjoukset mutta K-storeId puuttuu");
  }

  return { kStoreId, offers: found.offers };
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

async function fetchBrochureHtml(
  url: string,
  debug?: KruokaPipelineDebugV49,
): Promise<string> {
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

  if (debug) debug.brochureHttp = response.status;

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
  debug?: KruokaPipelineDebugV49,
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

  if (debug) debug.productMapHttp = response.status;

  if (!response.ok) {
    const preview = await response.text().catch(() => "");
    throw new Error(
      `K-Ruoka product-map HTTP ${response.status}: ${preview.slice(0, 160)}`,
    );
  }

  const data = (await response.json()) as unknown;
  const mapped =
    data && typeof data === "object"
      ? (data as Record<string, UnknownRecord>)
      : {};
  if (debug) debug.productMapProducts = Object.keys(mapped).length;
  return mapped;
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
      providerVersion: "V51_DIRECT_FETCH_OFFERS_DEBUG_COMPAT",
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
  const debugV49: KruokaPipelineDebugV49 = {
    selectedStoreName: displayStoreName,
    selectedStoreId: displayStoreId,
    brochureUrl,
    brochureHttp: null,
    applicationState: "NOT_RUN",
    fetchOffersHttp: null,
    fetchOffersShape: null,
    kStoreId: null,
    brochureOffers: null,
    eans: null,
    productMapHttp: null,
    productMapProducts: null,
    activeOffers: null,
    error: null,
  };
  lastKruokaPipelineDebugV49 = debugV49;

  try {
    // V50: HTML/applicationState-vaihe ohitetaan kokonaan.
    // applicationState jää NOT_RUN-arvoon tarkoituksella.
    const { kStoreId, offers } = await fetchOffersDirect(
      displayStoreId,
      displayStoreName,
      brochureUrl,
      debugV49,
    );
    debugV49.kStoreId = kStoreId;
    debugV49.brochureOffers = offers.length;

    const eans = collectEans(offers);
    debugV49.eans = eans.length;
    const productMap = await fetchProductMap(kStoreId, eans, brochureUrl, debugV49);

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

    debugV49.activeOffers = results.length;
    lastKruokaPipelineDebugV49 = { ...debugV49 };
    return results;
  } catch (error) {
    debugV49.error = error instanceof Error ? error.message : String(error);
    lastKruokaPipelineDebugV49 = { ...debugV49 };
    console.error("[Ziiply K provider V51] K-Ruoka-only haku epäonnistui", {
      selectedStoreId: displayStoreId,
      selectedStoreName: displayStoreName,
      brochureUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

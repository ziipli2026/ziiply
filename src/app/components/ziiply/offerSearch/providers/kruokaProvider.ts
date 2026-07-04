// src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts
// ZIIPLY_KRUOKA_OFFER_PROVIDER_V21_BROWSER_LIKE_PRODUCT_MAP_HEADERS
// Revision: V17
// Date: 2026-07-04
//
// Fix:
// - V10 käytti pääosin product-map/EAN-polkuja. Se voi palauttaa 0 tulosta väärällä
//   kauppakontekstilla, vaikka K-Ruoan tarjouslehti näyttää tarjouksia.
// - V12 käyttää ensisijaisesti HAR:sta löytynyttä oikeaa tarjousrajapintaa:
//   POST https://www.k-ruoka.fi/kr-api/fetch-offers
// - Tarjous-ID:t poimitaan tarjouslehden HTML:stä, esim. tarjouslehti-310488P -> 310488P.
// - Product-map jää vain fallbackiksi.
// - Ei koske S-kaupat-provideriin.
// - V13: jos K-provider palauttaa 0 tulosta, palautetaan näkyvä GÖSTA K DEBUG -kortti iPhoneen.
// V15: HAR vahvisti, että tarjouslehtisivu lähettää raw-offer/product-map-kutsun
// täyden EAN-listan kanssa. Siksi product-map ajetaan nyt ensisijaisena
// laajalla EAN-seedillä jokaiselle valitulle K-kaupalle erikseen.
// fetch-offers jää tueksi yksittäisiin tarjous=tarjouslehti-310488P-polkuhin.


import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "../types";
import {
  createStableOfferId,
  looksLikePriceLine,
  looksLikeUnitPriceLine,
  looksLikeValidityLine,
  scoreOfferMatch,
  stripHtmlToLines,
} from "../utils/offerMatcher";

type UnknownRecord = Record<string, unknown>;

type KruokaHttpDebugStatsV19 = {
  statuses: string[];
  chunks: number;
  responseItems: number;
  jsonOk: number;
  jsonFail: number;
  firstKeys: string;
  firstSample: string;
};

function createKruokaHttpDebugStatsV19(): KruokaHttpDebugStatsV19 {
  return {
    statuses: [],
    chunks: 0,
    responseItems: 0,
    jsonOk: 0,
    jsonFail: 0,
    firstKeys: "",
    firstSample: "",
  };
}

function summarizeKruokaValueV19(value: unknown, maxLength = 260) {
  try {
    return JSON.stringify(value).slice(0, maxLength);
  } catch {
    return String(value ?? "").slice(0, maxLength);
  }
}

export type KruokaOfferProviderOptionsV10 = {
  storeId?: string | number | null;
  storeName?: string | null;
  kStoreId?: string | number | null;
  kStoreName?: string | null;
};

const KRUOKA_PROVIDER_REVISION_V12 = "KRUOKA_PROVIDER_V21_BROWSER_LIKE_PRODUCT_MAP_HEADERS";
const KRUOKA_FETCH_OFFERS_URL_V12 = "https://www.k-ruoka.fi/kr-api/fetch-offers";
const KRUOKA_PRODUCT_MAP_URL_V12 = "https://www.k-ruoka.fi/kr-api/raw-offer/product-map";
const DEFAULT_KRUOKA_STORE_ID_V12 = "L654";
const GOSTA_MASTER_QUERY_V12 = "__ziiply_all_offers__";

// HAR product-map -pyynnöstä poimitut selainheaderit.
// Ei kovakoodata evästeitä: cookie yritetään kerätä ensin saman originin HTML-pyynnöstä.
const KRUOKA_BROWSER_BUILD_NUMBER_V21 = "31640";
const KRUOKA_BROWSER_EXPERIMENTS_V21 =
  "ab4d.10001.1!d2ae.10003.1!a.00157.1!a.00171.0!a.00174.1!a.00175.0!a.00177.1!a.00180.1";
const KRUOKA_BROWSER_USER_AGENT_V21 =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15";


const KRUOKA_DEBUG_EANS_V12 = [
  "6409100032401",
  "6409100032944",
  "6409100033781",
  "6409100034757",
  "6407800019395",
  "6407800019425",
  "6407800019463",
  "6407800019616",
  "6407870070227",
  "6407870074881",
  "6407870075512",
  "6407870077141",
  "6407880080582",
  "6406510091196",
  "6406510094562",
  "6406510094852",
  "6406510096474",
  "6406510096719",
  "6406510096726",
  "6406510096795",
  "6406510096801",
  "6406510096818",
  "6406510701361",
  "6406510702429",
  "6406510702702",
  "6406510703952",
  "6437002001454",
  "6430064400890",
  "6430064401439",
  "6430064405048",
  "6430064405055",
  "6430064407554",
  "6430064407707",
  "6430064408001",
  "6430064408049",
  "6430064408445",
  "6430064408506",
  "6430064403624",
  "6430064403631",
  "6430064403648",
  "6430064403662",
  "6430064403679",
  "6430064403686",
  "6410405123657",
  "8420982902253",
  "2000326600005",
  "6410405051844",
  "6416046731305",
  "6410405330802",
  "6409100062071",
  "6409100070311",
  "6409100070328",
  "6409100070434",
  "6409100071257",
  "6409100071288",
  "6409100071356",
  "6409100071899",
  "6409100072070",
  "6409100078034",
  "6437005053368",
  "6408430061587",
  "6408430061686",
  "6408430670307",
  "6408430690190",
  "6408430690367",
  "6408430690510",
  "6408430671120",
  "6408430671168",
  "6408430046652",
  "6408430048441",
  "6408430102822",
  "6408430103256",
  "6408430103447",
  "6408430043200",
  "6408430141487",
  "6408430142798",
  "6408430020072",
  "6408430020539",
  "6408430021024",
  "6408430021031",
  "6408430021048",
  "6408430023431",
  "6408430024933",
  "6408430026432",
  "6408430401215",
  "6408430401277",
  "6408430401444",
  "6408430401611",
  "6408430408665",
  "6408430408832",
  "6408430033805",
  "6408430039371",
  "0000057095431",
  "6415600501781",
  "6415600502054",
  "6415600506434",
  "6415600545754",
  "6415600546072",
  "6415600546126",
  "6415600546157",
  "6415600546188",
  "6415600546607",
  "6415600549493",
  "6415600555722",
  "6415600563697",
  "6415600564878",
  "6415600570992",
  "6415600571081",
  "6415600574488",
  "6415600577632",
  "6415600577861",
  "6415600581301",
  "6415600581776",
  "6415600584661",
  "6415600587457",
  "6415600591843",
  "6415600592239",
  "6415600594684",
  "6415600594868",
  "6410400032848",
  "6410400032855",
  "6410400049013",
  "6410402007059",
  "6410405050458",
  "6410405199874",
  "6410405199898",
  "6410405199911",
  "6410405199935",
  "6410405328854",
  "6410405328885",
  "6410405323521",
  "6410405358202",
  "6410405048561",
  "6410405053749",
  "6410405053763",
  "6410405355461",
  "6410405355492",
  "6410405251411",
  "6410405251435",
  "6410405251459",
  "6410405251473",
  "6410405251497",
  "6410405261038",
  "6410405303172",
  "6410405222893",
  "6410405222916",
  "6410405222930",
  "6410405222954",
  "6410405364920",
  "6410405364951",
  "6410405364982",
  "6410405365019",
];

const KRUOKA_HEADERS = new Set([
  "K-Market digitarjouslehti",
  "K-Supermarket digitarjouslehti",
  "K-Citymarket digitarjouslehti",
  "Digitarjouslehden osiot",
  "Tarjoukset voimassa valitussa kaupassa",
  "Näytä tuotteet",
  "Plussa-kortilla",
  "Pysyvästi edullinen",
]);

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function numberFromUnknown(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(
    String(value ?? "")
      .replace(/\s/g, "")
      .replace("€", "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, ""),
  );
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9åäö\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPrice(value: unknown) {
  const number = numberFromUnknown(value);
  if (number == null) return "";
  return `${number.toLocaleString("fi-FI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

function formatOfferUnit(unit: unknown) {
  const record = asRecord(unit);
  const unitText = firstString(record?.fi, record?.finnish, record?.sv, unit);
  return unitText ? `/${unitText}` : "";
}

function formatUnitPrice(unitPrice: UnknownRecord | null) {
  if (!unitPrice) return "";
  const value = numberFromUnknown(unitPrice.value);
  const unit = firstString(unitPrice.unit);
  if (value == null || !unit) return "";
  const normalizedUnit = unit
    .replace("KGM", "kg")
    .replace("KG", "kg")
    .replace("LTR", "l")
    .replace("L", "l")
    .replace("PCE", "kpl")
    .toLowerCase();
  return `${value.toFixed(2).replace(".", ",")} €/${normalizedUnit}`;
}

function getPathValue(value: unknown, path: Array<string | number>): unknown {
  let current: unknown = value;
  for (const key of path) {
    if (Array.isArray(current) && typeof key === "number") {
      current = current[key];
      continue;
    }
    const record = asRecord(current);
    if (!record) return undefined;
    current = record[String(key)];
  }
  return current;
}

function getLocalizedFi(value: unknown) {
  const record = asRecord(value);
  return firstString(record?.finnish, record?.fi, record?.name, value);
}

function resolveKnownKruokaStoreIdV17(storeName: unknown, rawStoreId: unknown) {
  const name = normalizeText(storeName);
  const raw = firstString(rawStoreId).trim();

  // K-Ruoan oikea storeId EI ole sama asia kuin Ziiplyn/kauppahaun sisäinen numeric id.
  // Esim. käyttäjän HAR-tiedostot:
  // - K-Market Munckinkatu käyttää K-Ruoka API:ssa storeId:tä L654
  // - K-Citymarket Hyvinkää käyttää K-Ruoka API:ssa storeId:tä N183
  // Siksi numeric-id:tä kuten 3221 EI saa muuttaa kaavamaisesti muotoon L3221.
  if (name.includes("munckinkatu") || name.includes("munckin")) return "L654";
  if (name.includes("citymarket") && name.includes("hyvink")) return "N183";

  // Jos API/store-search on joskus jo antanut oikean K-Ruoka-id:n, käytetään sitä sellaisenaan.
  if (/^[A-Z]\d+$/i.test(raw)) return raw.toUpperCase();

  // Tuntematonta numeric-id:tä ei prefiksata. Palautetaan se sellaisenaan,
  // jotta debug näyttää rehellisesti väärän/sisäisen id:n eikä keksittyä L-id:tä.
  return raw;
}

function getKruokaStoreIdV12(options?: KruokaOfferProviderOptionsV10) {
  return (
    resolveKnownKruokaStoreIdV17(options?.kStoreName ?? options?.storeName, options?.kStoreId) ||
    resolveKnownKruokaStoreIdV17(options?.kStoreName ?? options?.storeName, options?.storeId) ||
    DEFAULT_KRUOKA_STORE_ID_V12
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function extractKruokaOfferIdsFromHtmlV12(html: string) {
  const ids = new Set<string>();

  for (const match of html.matchAll(/tarjouslehti-([0-9]{3,10}[A-Z])/gi)) {
    ids.add(match[1].toUpperCase());
  }

  for (const match of html.matchAll(/\b([0-9]{3,10}P)\b/g)) {
    ids.add(match[1].toUpperCase());
  }

  return Array.from(ids);
}

function extractKruokaEansFromHtmlV12(html: string) {
  const eans = new Set<string>();
  for (const match of html.matchAll(/\b\d{13}\b/g)) {
    eans.add(match[0]);
  }
  return Array.from(eans);
}


function getSetCookieHeaderValuesV21(headers: Headers): string[] {
  const anyHeaders = headers as Headers & {
    getSetCookie?: () => string[];
    raw?: () => Record<string, string[]>;
  };

  if (typeof anyHeaders.getSetCookie === "function") {
    return anyHeaders.getSetCookie();
  }

  if (typeof anyHeaders.raw === "function") {
    return anyHeaders.raw()["set-cookie"] || [];
  }

  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function setCookieLinesToCookieHeaderV21(setCookieLines: string[]) {
  const pairs = setCookieLines
    .map((line) => line.split(";")[0]?.trim())
    .filter(Boolean);

  return Array.from(new Set(pairs)).join("; ");
}

function makeKruokaJsonHeadersV21(referer: string, cookieHeader?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Language": "fi-FI,fi;q=0.9",
    Origin: "https://www.k-ruoka.fi",
    Referer: referer,
    "User-Agent": KRUOKA_BROWSER_USER_AGENT_V21,
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "X-K-Build-Number": KRUOKA_BROWSER_BUILD_NUMBER_V21,
    "X-K-Experiments": KRUOKA_BROWSER_EXPERIMENTS_V21,
  };

  if (cookieHeader) headers.Cookie = cookieHeader;

  return headers;
}

async function fetchKruokaBrochureHtmlV12(source: ZiiplyOfferSearchSourceConfig) {
  const response = await fetch(source.url, {
    cache: "no-store",
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "fi-FI,fi;q=0.9,en;q=0.8",
      "user-agent": KRUOKA_BROWSER_USER_AGENT_V21,
    },
  });

  const cookieHeader = setCookieLinesToCookieHeaderV21(getSetCookieHeaderValuesV21(response.headers));

  if (!response.ok) {
    console.warn(`[Ziiply K offers] brochure HTML failed ${source.id}: ${response.status}`);
    return { html: "", cookieHeader };
  }

  return { html: await response.text(), cookieHeader };
}

async function fetchKruokaOffersByOfferIdsV12(
  storeId: string,
  offerIds: string[],
  source: ZiiplyOfferSearchSourceConfig,
  cookieHeader?: string,
) {
  const uniqueIds = Array.from(
    new Set(
      offerIds
        .map((id) => String(id || "").trim().replace(/^tarjouslehti-/i, "").toUpperCase())
        .filter((id) => /^[0-9]{3,10}P$/.test(id)),
    ),
  );

  const offers: UnknownRecord[] = [];
  const debug = createKruokaHttpDebugStatsV19();

  for (const idChunk of chunk(uniqueIds, 40)) {
    debug.chunks += 1;
    const response = await fetch(KRUOKA_FETCH_OFFERS_URL_V12, {
      method: "POST",
      cache: "no-store",
      headers: makeKruokaJsonHeadersV21(source.url, cookieHeader),
      body: JSON.stringify({ storeId, offerIds: idChunk, pricing: {} }),
    });

    debug.statuses.push(String(response.status));

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (!debug.firstSample && text) debug.firstSample = text.slice(0, 260);
      console.warn(`[Ziiply K offers] fetch-offers failed ${response.status}`);
      continue;
    }

    const json = await response.json().catch(() => {
      debug.jsonFail += 1;
      return null;
    });
    if (!json) continue;
    debug.jsonOk += 1;

    const record = asRecord(json);
    if (record && !debug.firstKeys) debug.firstKeys = Object.keys(record).slice(0, 10).join(",");
    if (!debug.firstSample) debug.firstSample = summarizeKruokaValueV19(json);

    const list = asArray(record?.offers).map(asRecord).filter(Boolean) as UnknownRecord[];
    debug.responseItems += list.length;
    offers.push(...list);
  }

  return { offers, debug };
}

async function fetchKruokaProductMapV12(storeId: string, eans: string[], referer: string, cookieHeader?: string) {
  const uniqueEans = Array.from(new Set(eans.map(String).filter((ean) => /^\d{13}$/.test(ean))));
  const products: UnknownRecord[] = [];
  const debug = createKruokaHttpDebugStatsV19();

  for (const eanChunk of chunk(uniqueEans, 120)) {
    debug.chunks += 1;
    const response = await fetch(KRUOKA_PRODUCT_MAP_URL_V12, {
      method: "POST",
      cache: "no-store",
      headers: makeKruokaJsonHeadersV21(referer, cookieHeader),
      body: JSON.stringify({ storeId, eans: eanChunk }),
    });

    debug.statuses.push(String(response.status));

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (!debug.firstSample && text) debug.firstSample = text.slice(0, 260);
      console.warn(`[Ziiply K offers] product-map failed ${response.status}`);
      continue;
    }

    const json = await response.json().catch(() => {
      debug.jsonFail += 1;
      return null;
    });
    if (!json) continue;
    debug.jsonOk += 1;

    const map = asRecord(json);
    if (!map) continue;
    if (!debug.firstKeys) debug.firstKeys = Object.keys(map).slice(0, 10).join(",");
    if (!debug.firstSample) debug.firstSample = summarizeKruokaValueV19(map);

    for (const value of Object.values(map)) {
      const record = asRecord(value);
      if (record) products.push(record);
    }
    debug.responseItems += Object.keys(map).length;
  }

  return { products, debug };
}

function hasKruokaOfferSignalV12(product: UnknownRecord) {
  const discount = asRecord(getPathValue(product, ["mobilescan", "pricing", "discount"]));
  if (!discount) return false;

  const discountPrice = numberFromUnknown(discount.price);
  const endDate = firstString(discount.endDate);
  const discountType = firstString(discount.discountType);
  const discountPercentage = numberFromUnknown(discount.discountPercentage);

  return (
    discountPrice != null ||
    Boolean(endDate) ||
    Boolean(discountType) ||
    discountPercentage != null
  );
}

function findFirstImageUrlV12(value: unknown, depth = 0): string {
  if (depth > 6) return "";

  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith("//")) return `https:${value}`;
    if (value.startsWith("/")) return `https://www.k-ruoka.fi${value}`;
    return "";
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findFirstImageUrlV12(entry, depth + 1);
      if (found) return found;
    }
    return "";
  }

  const record = asRecord(value);
  if (!record) return "";

  const direct = firstString(
    record.url,
    record.src,
    record.imageUrl,
    record.pictureUrl,
    record.thumbnailUrl,
    record.href,
  );
  if (direct) {
    const normalized = findFirstImageUrlV12(direct, depth + 1);
    if (normalized) return normalized;
  }

  for (const [key, child] of Object.entries(record)) {
    if (!/image|picture|photo|media|thumbnail|main/i.test(key)) continue;
    const found = findFirstImageUrlV12(child, depth + 1);
    if (found) return found;
  }

  return "";
}

function getKruokaImageUrlV12(product: UnknownRecord) {
  return (
    findFirstImageUrlV12(product.image) ||
    findFirstImageUrlV12(product.images) ||
    findFirstImageUrlV12(product.productImages) ||
    findFirstImageUrlV12(product.media) ||
    findFirstImageUrlV12(product)
  );
}

function getKruokaCategoryMetaV12(product: UnknownRecord) {
  const tree = asArray(getPathValue(product, ["category", "tree"]))
    .map(asRecord)
    .filter(Boolean) as UnknownRecord[];

  const names = tree
    .map((node) => getLocalizedFi(node.localizedName))
    .filter(Boolean);

  const categoryPath = names.join(" / ");
  const main = names[0] || "";
  const leaf = names[names.length - 1] || main || "";
  const parent = names.length > 1 ? names[names.length - 2] : "";

  return {
    category: leaf || main,
    categoryPath,
    breadcrumbs: categoryPath,
    hierarchy: categoryPath,
    department: main,
    productGroup: parent || leaf || main,
    mainCategory: main,
    subCategory: leaf || main,
  };
}

function getKruokaProductUrlV12(product: UnknownRecord) {
  const productAttributes = asRecord(product.productAttributes);
  const slug = firstString(product.slug, productAttributes?.urlSlug);
  const ean = firstString(product.ean, product.id);
  if (slug) return `https://www.k-ruoka.fi/kauppa/tuote/${slug}`;
  if (ean) return `https://www.k-ruoka.fi/kauppa/tuote/${ean}`;
  return "";
}

function getKruokaMatchScoreV12(query: string, title: string, categoryText: string) {
  const cleanQuery = normalizeText(query);
  const normalizedTitle = normalizeText(title);
  const normalizedCategory = normalizeText(categoryText);

  if (!cleanQuery || cleanQuery === normalizeText(GOSTA_MASTER_QUERY_V12)) return 1;

  let score = 0;
  if (normalizedTitle === cleanQuery) score += 120;
  if (normalizedTitle.includes(cleanQuery)) score += 80;
  if (normalizedCategory.includes(cleanQuery)) score += 30;

  for (const word of cleanQuery.split(/\s+/).filter((part) => part.length > 2)) {
    if (normalizedTitle.includes(word)) score += 20;
    if (normalizedCategory.includes(word)) score += 8;
  }

  return score;
}

function mapKruokaFetchOfferToResultV12(
  offer: UnknownRecord,
  query: string,
  source: ZiiplyOfferSearchSourceConfig,
  storeId: string,
  index: number,
): ZiiplyOfferSearchResult | null {
  const products = asArray(offer.products).map(asRecord).filter(Boolean) as UnknownRecord[];
  const firstProductWrapper = products[0];
  const firstProduct = asRecord(firstProductWrapper?.product) || firstProductWrapper || {};

  const title = getLocalizedFi(offer.localizedTitle) || getLocalizedFi(firstProduct.localizedName) || firstString(offer.title, firstProduct.name);
  if (!title) return null;

  const pricing = asRecord(offer.pricing) || {};
  const normalPricing = asRecord(offer.normalPricing) || {};
  const price = numberFromUnknown(pricing.price ?? getPathValue(firstProduct, ["mobilescan", "pricing", "discount", "price"]));
  const normalPrice = numberFromUnknown(normalPricing.price ?? getPathValue(firstProduct, ["mobilescan", "pricing", "normal", "price"]));
  const priceText = formatPrice(price ?? normalPrice);

  const unitText = formatOfferUnit(pricing.unit);
  const unitPriceText =
    formatUnitPrice(asRecord(getPathValue(firstProduct, ["mobilescan", "pricing", "discount", "unitPrice"]))) ||
    formatUnitPrice(asRecord(getPathValue(firstProduct, ["mobilescan", "pricing", "normal", "unitPrice"])));

  const categoryMeta = getKruokaCategoryMetaV12(firstProduct);
  const imageUrl = firstString(offer.image) || getKruokaImageUrlV12(firstProduct);
  const productUrl = getKruokaProductUrlV12(firstProduct);
  const ean = firstString(firstProduct.ean, firstProduct.baseEan, firstProduct.id, firstProductWrapper?.id);

  const benefitText = [
    "K-kaupan tarjous",
    normalPrice != null && price != null && normalPrice > price ? `normaalisti ${formatPrice(normalPrice)}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const productNames = products
    .map((entry) => asRecord(entry.product) || entry)
    .map((product) => getLocalizedFi(product.localizedName) || firstString(product.name))
    .filter(Boolean)
    .slice(0, 8)
    .join(" ");

  const rawText = [
    title,
    productNames,
    priceText,
    unitText,
    unitPriceText,
    benefitText,
    categoryMeta.category,
    categoryMeta.categoryPath,
    categoryMeta.department,
    categoryMeta.productGroup,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: createStableOfferId([source.id, storeId, firstString(offer.id), ean, title, priceText, index]),
    source: source.id,
    sourceUrl: source.url,
    chain: source.chain,
    storeLabel: source.storeLabel,
    title,
    priceText: unitText && priceText ? `${priceText}${unitText}` : priceText,
    unitPriceText,
    benefitText,
    validityText: "",
    imageUrl,
    productUrl,
    rawText,
    matchScore: getKruokaMatchScoreV12(query, title, `${categoryMeta.categoryPath} ${productNames}`),
    category: categoryMeta.category,
    categoryPath: categoryMeta.categoryPath,
    breadcrumbs: categoryMeta.breadcrumbs,
    hierarchy: categoryMeta.hierarchy,
    department: categoryMeta.department,
    productGroup: categoryMeta.productGroup,
    mainCategory: categoryMeta.mainCategory,
    subCategory: categoryMeta.subCategory,
    ean,
    _debugKProviderRevision: KRUOKA_PROVIDER_REVISION_V12,
    _debugKStoreId: storeId,
    _debugKSource: "kr-api/fetch-offers",
    _debugKOfferId: firstString(offer.id),
  } as unknown as ZiiplyOfferSearchResult;
}

function mapKruokaProductMapItemToOfferV12(
  product: UnknownRecord,
  query: string,
  source: ZiiplyOfferSearchSourceConfig,
  storeId: string,
  index: number,
): ZiiplyOfferSearchResult | null {
  if (!hasKruokaOfferSignalV12(product)) return null;

  const title = getLocalizedFi(product.localizedName) || firstString(product.name);
  if (!title) return null;

  const pricing = asRecord(getPathValue(product, ["mobilescan", "pricing"])) || {};
  const normal = asRecord(pricing.normal);
  const discount = asRecord(pricing.discount);

  const discountPrice = numberFromUnknown(discount?.price);
  const normalPrice = numberFromUnknown(normal?.price);
  const priceText = formatPrice(discountPrice ?? normalPrice);
  const unitPriceText = formatUnitPrice(asRecord(discount?.unitPrice) || asRecord(normal?.unitPrice));
  const endDate = firstString(discount?.endDate);
  const categoryMeta = getKruokaCategoryMetaV12(product);
  const imageUrl = getKruokaImageUrlV12(product);
  const productUrl = getKruokaProductUrlV12(product);
  const ean = firstString(product.ean, product.baseEan, product.id);

  const benefitText = [
    "K-kaupan tarjous",
    normalPrice != null && discountPrice != null && normalPrice > discountPrice
      ? `normaalisti ${formatPrice(normalPrice)}`
      : "",
    firstString(discount?.discountPercentageText),
  ]
    .filter(Boolean)
    .join(", ");

  const rawText = [
    title,
    priceText,
    unitPriceText,
    benefitText,
    categoryMeta.category,
    categoryMeta.categoryPath,
    categoryMeta.department,
    categoryMeta.productGroup,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: createStableOfferId([source.id, storeId, ean, title, priceText, index]),
    source: source.id,
    sourceUrl: source.url,
    chain: source.chain,
    storeLabel: source.storeLabel,
    title,
    priceText,
    unitPriceText,
    benefitText,
    validityText: endDate ? `Voimassa ${endDate}` : "",
    imageUrl,
    productUrl,
    rawText,
    matchScore: getKruokaMatchScoreV12(query, title, categoryMeta.categoryPath),
    category: categoryMeta.category,
    categoryPath: categoryMeta.categoryPath,
    breadcrumbs: categoryMeta.breadcrumbs,
    hierarchy: categoryMeta.hierarchy,
    department: categoryMeta.department,
    productGroup: categoryMeta.productGroup,
    mainCategory: categoryMeta.mainCategory,
    subCategory: categoryMeta.subCategory,
    ean,
    _debugKProviderRevision: `${KRUOKA_PROVIDER_REVISION_V12}_PRODUCT_MAP_FALLBACK`,
    _debugKStoreId: storeId,
    _debugKSource: "raw-offer/product-map",
  } as unknown as ZiiplyOfferSearchResult;
}

function isLikelyKruokaProductTitle(line: string) {
  if (line.length < 4 || line.length > 145) return false;
  if (KRUOKA_HEADERS.has(line)) return false;
  if (/^(Etuhinta|Hinta|Yksikköhinta|Ilman|Voimassa|Vain|Myös|norm\.|Mobiilietu|Plussa)/i.test(line)) return false;
  if (looksLikePriceLine(line) || looksLikeUnitPriceLine(line) || looksLikeValidityLine(line)) return false;
  if (/^\d+$/.test(line)) return false;
  if (/^\/\w+/.test(line)) return false;

  return /[a-zåäö]/i.test(line);
}

function parseKruokaOffersFromHtml(
  html: string,
  query: string,
  source: ZiiplyOfferSearchSourceConfig,
): ZiiplyOfferSearchResult[] {
  const lines = stripHtmlToLines(html);
  const results: ZiiplyOfferSearchResult[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const title = lines[index];

    if (!isLikelyKruokaProductTitle(title)) continue;

    const windowLines = lines.slice(index + 1, index + 10);
    const rawText = [title, ...windowLines].join(" ");
    const matchScore = scoreOfferMatch(title, query, rawText);

    if (matchScore <= 0) continue;

    const priceText =
      windowLines.find((line) => /^Etuhinta/i.test(line)) ||
      windowLines.find((line) => /^Hinta/i.test(line)) ||
      windowLines.find(looksLikePriceLine);

    const unitPriceText = windowLines.find(looksLikeUnitPriceLine);
    const validityText = windowLines.find(looksLikeValidityLine);
    const benefitText = windowLines.find((line) =>
      /plussa|mobiilietu|ilman plussa|vain k/i.test(line),
    );

    results.push({
      id: createStableOfferId([source.id, title, priceText, validityText]),
      source: source.id,
      chain: source.chain,
      title,
      priceText,
      unitPriceText,
      validityText,
      benefitText,
      storeLabel: source.storeLabel,
      productUrl: source.url,
      matchScore,
      rawText,
      _debugKProviderRevision: `${KRUOKA_PROVIDER_REVISION_V12}_HTML_FALLBACK`,
    } as unknown as ZiiplyOfferSearchResult);
  }

  return results;
}


function makeKruokaVisibleDebugOfferV13(details: {
  query: string;
  source: ZiiplyOfferSearchSourceConfig;
  storeId: string;
  storeName?: string | null;
  htmlLength?: number;
  offerIdsCount?: number;
  eansCount?: number;
  productMapCount?: number;
  productMapMappedCount?: number;
  productMapFilteredCount?: number;
  productMapDebug?: KruokaHttpDebugStatsV19;
  fetchOffersTried?: boolean;
  fetchOffersRawCount?: number;
  fetchOffersMappedCount?: number;
  fetchOffersFilteredCount?: number;
  fetchOffersDebug?: KruokaHttpDebugStatsV19;
  htmlFallbackCount?: number;
  note?: string;
}): ZiiplyOfferSearchResult {
  const pmStatus = details.productMapDebug?.statuses.join("/") || "-";
  const foStatus = details.fetchOffersDebug?.statuses.join("/") || "-";
  const shortTitle = [
    `KDBG ${details.storeId || "-"}`,
    `pm:${details.productMapCount ?? 0}/${details.productMapMappedCount ?? 0}/${details.productMapFilteredCount ?? 0}`,
    `pmSt:${pmStatus}`,
    `fo:${details.fetchOffersRawCount ?? 0}/${details.fetchOffersMappedCount ?? 0}/${details.fetchOffersFilteredCount ?? 0}`,
    `foSt:${foStatus}`,
    `html:${details.htmlFallbackCount ?? 0}`,
  ].join(" ");

  const visibleBenefit = [
    `store=${details.storeName || details.source.storeLabel || "-"}`,
    `htmlLen=${details.htmlLength ?? 0}`,
    `offerIds=${details.offerIdsCount ?? 0}`,
    `eans=${details.eansCount ?? 0}`,
    `pmChunks=${details.productMapDebug?.chunks ?? 0}`,
    `jsonOk=${details.productMapDebug?.jsonOk ?? 0}`,
    `keys=${details.productMapDebug?.firstKeys || "-"}`,
  ].join(" · ");

  const lines = [
    shortTitle,
    `source=${details.source.id}`,
    `storeLabel=${details.source.storeLabel}`,
    `storeId=${details.storeId || "-"}`,
    `storeName=${details.storeName || "-"}`,
    `query=${details.query || "-"}`,
    visibleBenefit,
    `sample=${details.productMapDebug?.firstSample || details.fetchOffersDebug?.firstSample || "-"}`,
    `note=${details.note || "-"}`,
  ];

  return {
    id: createStableOfferId(["k-debug", details.source.id, details.storeId, details.query, details.note]),
    source: details.source.id,
    chain: details.source.chain,
    title: shortTitle,
    priceText: details.storeId === "N183" ? "0,01 €" : details.storeId === "L654" ? "0,02 €" : "0,03 €",
    unitPriceText: "",
    validityText: "",
    benefitText: visibleBenefit,
    storeLabel: `K DEBUG ${details.storeId || ""}`.trim(),
    productUrl: details.source.url,
    imageUrl: "",
    rawText: lines.join(" "),
    matchScore: 9999,
    category: "Muut",
    categoryPath: "Debug / Muut",
    breadcrumbs: "Debug / Muut",
    hierarchy: "Debug / Muut",
    department: "Debug",
    productGroup: "Muut",
    mainCategory: "Debug",
    subCategory: "Muut",
    _debugKProviderRevision: `${KRUOKA_PROVIDER_REVISION_V12}_VISIBLE_DEBUG`,
    _debugKStoreId: details.storeId,
    _debugKSource: details.source.id,
  } as unknown as ZiiplyOfferSearchResult;
}


function filterKruokaResultsForQueryV12(
  items: ZiiplyOfferSearchResult[],
  query: string,
) {
  const cleanQuery = normalizeText(query);
  const isMaster = !cleanQuery || cleanQuery === normalizeText(GOSTA_MASTER_QUERY_V12);
  if (isMaster) return items;
  return items.filter((item) => Number(item.matchScore || 0) > 0);
}

export async function fetchKruokaOffers(
  query: string,
  source: ZiiplyOfferSearchSourceConfig,
  options?: KruokaOfferProviderOptionsV10,
): Promise<ZiiplyOfferSearchResult[]> {
  const storeId = getKruokaStoreIdV12(options);
  const brochureResult = await fetchKruokaBrochureHtmlV12(source);
  const html = brochureResult.html;
  const cookieHeader = brochureResult.cookieHeader;
  const offerIds = html ? extractKruokaOfferIdsFromHtmlV12(html) : [];
  const extractedEans = html ? extractKruokaEansFromHtmlV12(html) : [];
  const eans = Array.from(new Set([
    ...extractedEans,
    ...KRUOKA_DEBUG_EANS_V12,
  ])).filter((ean) => /^\d{13}$/.test(String(ean)));

  console.warn("[Ziiply K offers V15] start", {
    source: source.id,
    storeLabel: source.storeLabel,
    storeId,
    query,
    htmlLength: html.length,
    offerIds: offerIds.length,
    eans: eans.length,
  });

  // V15: product-map ensin. HAR:n mukaan tarjouslehti käyttää tätä täyden
  // EAN-listan kanssa. Tämä toimii kauppakohtaisesti: sama EAN-lista ajetaan
  // aina valitun storeId:n läpi, jolloin K-Ruoka palauttaa kyseisen kaupan
  // normaalihinnan/tarjoushinnan/saatavuuden.
  const productMapResult = await fetchKruokaProductMapV12(storeId, eans, source.url, cookieHeader);
  const productMapItems = productMapResult.products;
  const productMapMapped = productMapItems
    .map((product, index) => mapKruokaProductMapItemToOfferV12(product, query, source, storeId, index))
    .filter(Boolean) as ZiiplyOfferSearchResult[];

  const productMapFiltered = filterKruokaResultsForQueryV12(productMapMapped, query);
  if (productMapFiltered.length > 0) {
    console.warn("[Ziiply K offers V15] product-map primary ok", {
      source: source.id,
      storeId,
      productMapItems: productMapItems.length,
      count: productMapFiltered.length,
      first: productMapFiltered[0]?.title,
    });
    return productMapFiltered;
  }

  let fetchOffersDebug: KruokaHttpDebugStatsV19 | undefined;
  let fetchOffersRawCount = 0;
  let fetchOffersMappedCount = 0;
  let fetchOffersFilteredCount = 0;

  // Tuki yksittäisen tarjouskortin polulle: tarjous=tarjouslehti-310488P.
  // fetch-offers vaatii pelkän 310488P-muodon, ei tarjouslehti-alkua.
  if (offerIds.length > 0) {
    const fetchOffersResult = await fetchKruokaOffersByOfferIdsV12(storeId, offerIds, source, cookieHeader);
    const offers = fetchOffersResult.offers;
    fetchOffersDebug = fetchOffersResult.debug;
    fetchOffersRawCount = offers.length;
    const mapped = offers
      .map((offer, index) => mapKruokaFetchOfferToResultV12(offer, query, source, storeId, index))
      .filter(Boolean) as ZiiplyOfferSearchResult[];
    fetchOffersMappedCount = mapped.length;

    const filtered = filterKruokaResultsForQueryV12(mapped, query);
    fetchOffersFilteredCount = filtered.length;

    if (filtered.length > 0) {
      console.warn("[Ziiply K offers V15] fetch-offers fallback ok", {
        source: source.id,
        storeId,
        offerIds: offerIds.length,
        count: filtered.length,
        first: filtered[0]?.title,
      });
      return filtered;
    }
  }

  let htmlFallbackCount = 0;
  if (html) {
    const htmlResults = parseKruokaOffersFromHtml(html, query, source);
    htmlFallbackCount = htmlResults.length;
    console.warn("[Ziiply K offers V15] html fallback", {
      source: source.id,
      storeId,
      count: htmlResults.length,
    });
    if (htmlResults.length > 0) return htmlResults;
  }

  return [
    makeKruokaVisibleDebugOfferV13({
      query,
      source,
      storeId,
      storeName: options?.kStoreName ?? options?.storeName ?? null,
      htmlLength: html.length,
      offerIdsCount: offerIds.length,
      eansCount: eans.length,
      productMapCount: productMapItems.length,
      productMapMappedCount: productMapMapped.length,
      productMapFilteredCount: productMapFiltered.length,
      productMapDebug: productMapResult.debug,
      fetchOffersTried: offerIds.length > 0,
      fetchOffersRawCount,
      fetchOffersMappedCount,
      fetchOffersFilteredCount,
      fetchOffersDebug,
      htmlFallbackCount,
      note: "K-provider V19 returned zero real offers; HTTP/JSON counters visible",
    }),
  ];
}

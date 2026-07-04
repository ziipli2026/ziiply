// src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts
// ZIIPLY_KRUOKA_OFFER_PROVIDER_V10_FETCH_OFFERS_PRODUCT_MAP_DEBUG
// Revision: V10
// Date: 2026-07-04
//
// Muutokset:
// - Vanha K-Ruoka HTML-riviparsinta jätetty fallbackiksi, mutta pääpolku vaihdettu
//   K-Ruoan omaan JSON-rajapintaan.
// - Käyttää HAR-tutkimuksessa löytynyttä endpointia:
//   POST https://www.k-ruoka.fi/kr-api/raw-offer/product-map
// - product-map palauttaa tuotteille mobilescan.pricing.normal ja mobilescan.pricing.discount.
// - Gösta näyttää vain tarjoussignaalin sisältävät K-tuotteet.
// - Tukee valittua K-kauppaa: options.kStoreId / options.storeId, esim. L654.
// - Lisää näkyvät debug-kentät tuloksiin (_debugKProviderRevision, _debugKStoreId, _debugKSource).
// - Ei koske S-kaupat-provideriin.

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

export type KruokaOfferProviderOptionsV10 = {
  storeId?: string | number | null;
  storeName?: string | null;
  kStoreId?: string | number | null;
  kStoreName?: string | null;
};

const KRUOKA_PROVIDER_REVISION_V10 = "KRUOKA_PROVIDER_V10_FETCH_OFFERS_PRODUCT_MAP_DEBUG";
const KRUOKA_PRODUCT_MAP_URL_V10 = "https://www.k-ruoka.fi/kr-api/raw-offer/product-map";
const DEFAULT_KRUOKA_STORE_ID_V10 = "L654";
const GOSTA_MASTER_QUERY_V10 = "__ziiply_all_offers__";

// V10: turvallinen aloitussetti K-Market HAR:sta. Tämä ei ole lopullinen koko tarjouslehti,
// mutta varmistaa, että K-polku saadaan näkyvästi toimimaan jo ensimmäisessä debug-vaiheessa.
// Kun seuraavassa vaiheessa saadaan EANit suoraan tarjouslehti-HTML:stä tai muusta listasta,
// tätä käytetään vain fallbackina.
const KRUOKA_DEBUG_EANS_V10 = [
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
];

const KRUOKA_HEADERS = new Set([
  "K-Market digitarjouslehti",
  "K-Supermarket digitarjouslehti",
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

function getKruokaStoreIdV10(options?: KruokaOfferProviderOptionsV10) {
  return firstString(
    options?.kStoreId,
    options?.storeId,
    DEFAULT_KRUOKA_STORE_ID_V10,
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function extractKruokaEansFromHtmlV10(html: string) {
  const eans = new Set<string>();

  // K-Ruoka-tuotelinkit sisältävät usein EANin slugissa tai query-parametrissa.
  for (const match of html.matchAll(/\b\d{13}\b/g)) {
    eans.add(match[0]);
  }

  return Array.from(eans);
}

async function fetchKruokaBrochureHtmlV10(source: ZiiplyOfferSearchSourceConfig) {
  const response = await fetch(source.url, {
    cache: "no-store",
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "fi-FI,fi;q=0.9,en;q=0.8",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
    },
  });

  if (!response.ok) {
    console.warn(`[Ziiply K offers] brochure HTML failed ${source.id}: ${response.status}`);
    return "";
  }

  return response.text();
}

async function fetchKruokaProductMapV10(storeId: string, eans: string[]) {
  const uniqueEans = Array.from(new Set(eans.map(String).filter((ean) => /^\d{13}$/.test(ean))));
  const products: UnknownRecord[] = [];

  for (const eanChunk of chunk(uniqueEans, 120)) {
    const response = await fetch(KRUOKA_PRODUCT_MAP_URL_V10, {
      method: "POST",
      cache: "no-store",
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        origin: "https://www.k-ruoka.fi",
        referer: "https://www.k-ruoka.fi/k-market/tarjouslehti",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
      },
      body: JSON.stringify({ storeId, eans: eanChunk }),
    });

    if (!response.ok) {
      console.warn(`[Ziiply K offers] product-map failed ${response.status}`);
      continue;
    }

    const json = await response.json().catch(() => null);
    const map = asRecord(json);
    if (!map) continue;

    for (const value of Object.values(map)) {
      const record = asRecord(value);
      if (record) products.push(record);
    }
  }

  return products;
}

function hasKruokaOfferSignalV10(product: UnknownRecord) {
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

function findFirstImageUrlV10(value: unknown, depth = 0): string {
  if (depth > 6) return "";

  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith("//")) return `https:${value}`;
    if (value.startsWith("/")) return `https://www.k-ruoka.fi${value}`;
    return "";
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findFirstImageUrlV10(entry, depth + 1);
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
    const normalized = findFirstImageUrlV10(direct, depth + 1);
    if (normalized) return normalized;
  }

  for (const [key, child] of Object.entries(record)) {
    if (!/image|picture|photo|media|thumbnail|main/i.test(key)) continue;
    const found = findFirstImageUrlV10(child, depth + 1);
    if (found) return found;
  }

  return "";
}

function getKruokaImageUrlV10(product: UnknownRecord) {
  return (
    findFirstImageUrlV10(product.images) ||
    findFirstImageUrlV10(product.productImages) ||
    findFirstImageUrlV10(product.media) ||
    findFirstImageUrlV10(product)
  );
}

function getKruokaCategoryMetaV10(product: UnknownRecord) {
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

function getKruokaProductUrlV10(product: UnknownRecord) {
  const slug = firstString(product.slug);
  const ean = firstString(product.ean, product.id);
  if (slug && ean) return `https://www.k-ruoka.fi/kauppa/tuote/${slug}-${ean}`;
  return "";
}

function getKruokaMatchScoreV10(query: string, title: string, categoryText: string) {
  const cleanQuery = normalizeText(query);
  const normalizedTitle = normalizeText(title);
  const normalizedCategory = normalizeText(categoryText);

  if (!cleanQuery || cleanQuery === normalizeText(GOSTA_MASTER_QUERY_V10)) return 1;

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

function mapKruokaProductMapItemToOfferV10(
  product: UnknownRecord,
  query: string,
  source: ZiiplyOfferSearchSourceConfig,
  storeId: string,
  index: number,
): ZiiplyOfferSearchResult | null {
  if (!hasKruokaOfferSignalV10(product)) return null;

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
  const categoryMeta = getKruokaCategoryMetaV10(product);
  const imageUrl = getKruokaImageUrlV10(product);
  const productUrl = getKruokaProductUrlV10(product);
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
    matchScore: getKruokaMatchScoreV10(query, title, categoryMeta.categoryPath),
    category: categoryMeta.category,
    categoryPath: categoryMeta.categoryPath,
    breadcrumbs: categoryMeta.breadcrumbs,
    hierarchy: categoryMeta.hierarchy,
    department: categoryMeta.department,
    productGroup: categoryMeta.productGroup,
    mainCategory: categoryMeta.mainCategory,
    subCategory: categoryMeta.subCategory,
    ean,

    // Debug näkyy tarvittaessa JSONissa / kortin rawTextissä, mutta ei riko UI:ta.
    _debugKProviderRevision: KRUOKA_PROVIDER_REVISION_V10,
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
      _debugKProviderRevision: `${KRUOKA_PROVIDER_REVISION_V10}_HTML_FALLBACK`,
    } as unknown as ZiiplyOfferSearchResult);
  }

  return results;
}

export async function fetchKruokaOffers(
  query: string,
  source: ZiiplyOfferSearchSourceConfig,
  options?: KruokaOfferProviderOptionsV10,
): Promise<ZiiplyOfferSearchResult[]> {
  const storeId = getKruokaStoreIdV10(options);
  const html = await fetchKruokaBrochureHtmlV10(source);
  const extractedEans = html ? extractKruokaEansFromHtmlV10(html) : [];
  const eans = extractedEans.length > 0 ? extractedEans : KRUOKA_DEBUG_EANS_V10;

  console.warn("[Ziiply K offers V10] start", {
    source: source.id,
    storeId,
    query,
    extractedEans: extractedEans.length,
    usedEans: eans.length,
  });

  const productMapItems = await fetchKruokaProductMapV10(storeId, eans);
  const mapped = productMapItems
    .map((product, index) => mapKruokaProductMapItemToOfferV10(product, query, source, storeId, index))
    .filter(Boolean) as ZiiplyOfferSearchResult[];

  const cleanQuery = normalizeText(query);
  const isMaster = !cleanQuery || cleanQuery === normalizeText(GOSTA_MASTER_QUERY_V10);
  const queryFiltered = isMaster
    ? mapped
    : mapped.filter((item) => Number(item.matchScore || 0) > 0);

  if (queryFiltered.length > 0) {
    console.warn("[Ziiply K offers V10] product-map ok", {
      source: source.id,
      storeId,
      count: queryFiltered.length,
      first: queryFiltered[0]?.title,
    });
    return queryFiltered;
  }

  // Fallback vanhaan HTML-parseriin, jos product-map ei palauttanut mitään.
  if (html) {
    const htmlResults = parseKruokaOffersFromHtml(html, query, source);
    console.warn("[Ziiply K offers V10] html fallback", {
      source: source.id,
      storeId,
      count: htmlResults.length,
    });
    return htmlResults;
  }

  return [];
}

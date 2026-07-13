// src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts
// ZIIPLY_KRUOKA_PROVIDER_V42_KSUPERMARKET_JOKELA_OFFICIAL_PRODUCT_MAP
//
// V42:
// - Poistaa Ruoanhinta.fi:n tarjousmassan kokonaan tästä providerista.
// - Käyttää K-Ruoan omaa /kr-api/raw-offer/product-map -endpointia.
// - K-Supermarket Jokelan virallinen K-Ruoka storeId on S441.
// - EAN-lista on poimittu käyttäjän 12.7.2026 tallentamasta
//   K-Supermarket Jokelan tarjouslehden sivu 1 HAR-tiedostosta.
// - Mukaan hyväksytään vain tuotteet, joilla on K-Ruoan oma mobilescan.pricing.discount.
// - Voimassaolo tarkistetaan startDate/endDate-kentistä.
// - Ei näkyviä debug-tuotteita eikä 80/1000 rivin keinotekoista leikkausta.
// - Muut K-kaupat palauttavat tässä rajatussa versiossa tyhjän tuloksen,
//   jotta Jokelan lehteä ei koskaan näytetä väärälle kaupalle.

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

type ProductMapDiscount = {
  price?: number | null;
  unit?: string | null;
  unitPrice?: {
    value?: number | null;
    unit?: string | null;
    contentSize?: number | null;
  } | null;
  discountPercentage?: number | null;
  discountPercentageText?: string | null;
  discountType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  campaignId?: string | null;
  discountAvailability?: {
    web?: boolean | null;
    store?: boolean | null;
  } | null;
};

type ProductMapProduct = {
  id?: string | null;
  ean?: string | null;
  baseEan?: string | null;
  localizedName?: {
    finnish?: string | null;
    swedish?: string | null;
    english?: string | null;
  } | null;
  store?: {
    id?: string | null;
    isLocal?: boolean | null;
  } | null;
  availability?: {
    store?: boolean | null;
    web?: boolean | null;
  } | null;
  isAvailable?: boolean | null;
  mobilescan?: {
    pricing?: {
      normal?: {
        price?: number | null;
        unit?: string | null;
        unitPrice?: {
          value?: number | null;
          unit?: string | null;
          contentSize?: number | null;
        } | null;
      } | null;
      discount?: ProductMapDiscount | null;
    } | null;
  } | null;
  category?: {
    localizedName?: {
      finnish?: string | null;
      swedish?: string | null;
      english?: string | null;
    } | null;
    path?: string | null;
    tree?: Array<{
      localizedName?: {
        finnish?: string | null;
        swedish?: string | null;
        english?: string | null;
      } | null;
      slug?: string | null;
    }> | null;
  } | null;
  productAttributes?: {
    ean?: string | null;
    urlSlug?: string | null;
    image?: {
      url?: string | null;
    } | null;
    marketingName?: {
      fi?: string | null;
      sv?: string | null;
      en?: string | null;
    } | null;
    labelName?: {
      fi?: string | null;
      sv?: string | null;
    } | null;
    brand?: string | null;
  } | null;
};

type ProductMapResponse = Record<string, ProductMapProduct>;

const K_SUPERMARKET_JOKELA_STORE_ID_V42 = "S441";
const K_SUPERMARKET_JOKELA_NAME_V42 = "K-Supermarket Jokela";

const K_SUPERMARKET_JOKELA_PAGE1_EANS_V42 = [
  "2000101000006",
  "2000101100003",
  "6409100026448",
  "6409100026592",
  "6409100026684",
  "6409100026899",
  "6409100026967",
  "6409100028121",
  "6408430037001",
  "2391373800006",
  "2391383100004",
  "6413300308600",
  "6429810891044",
  "6429810891051",
  "6429810891068",
  "6429810891075",
  "6429810891082",
  "6429810891099",
  "6429810891105",
  "2000410300002",
  "2000410400009",
  "6406300000261",
  "6406300000292",
  "6406300011397",
  "6406300014237",
  "6406300014244",
  "6406300014367",
  "6406300014435",
  "6406300014657",
  "6416453053113",
  "6416453053120",
  "6416453053144",
  "6416453053199",
  "6416453076136",
  "2000686300003",
  "2000524700002",
  "6006258002395",
  "6410405044884",
  "6410405330963",
  "2000333500008",
  "6410405109750",
  "6416046375004",
  "6416046375509",
  "6416046375905",
  "6410405099648",
  "2358689100008",
  "2350467900008",
  "2000113400009",
  "2000121000000",
  "2391162500001",
  "2000221900002",
  "2000281500006",
  "2350012200003",
  "2000417400002",
  "2000953900004",
  "6407080003589",
  "6408800004718",
  "6408800020381",
  "6408800020503",
  "6408800020916",
  "6416627011284",
  "6407800008498",
  "6407800009143",
  "6407800025983",
  "6409100051525",
  "6409100051549",
  "6409100053130",
  "6409100055387",
  "6409100055394",
  "6409100055516",
  "6409100055530",
  "6409100055660",
  "6409100055837",
  "6409100070441",
  "6412000057139",
  "6412000057153",
  "6413467519901",
  "6413467616808",
  "6410402026302",
  "6408430142644",
  "6408430142774",
  "8719200006133",
  "6416710300967",
  "6416710301391",
  "6430064400883",
  "6430064401453",
  "6430064404836",
  "6430064405000",
  "6430064406670",
  "0000042360889",
  "0000042361244",
  "0000042467045",
  "4005808445639",
  "4005808479719",
  "4005900355300",
  "4005900370525",
  "4005900370556",
  "4005900370617",
  "4005900370655",
  "4005900370716",
  "4005900462060",
  "4005900462091",
  "4005900462121",
  "4005900462152",
  "4005900601872",
  "4005900601902",
  "4005900601933",
  "4005900601971",
  "4005900602008",
  "4005900602114",
  "4005900605498",
  "4005900606457",
  "4005900702579",
  "4005900702630",
  "4005900702661",
  "4005900901514",
  "4005900997692",
  "4005900998354",
  "4006000002514",
  "4006000056784",
  "4006000103488",
  "4006000128689",
  "4006000132242",
  "4006000132273",
  "4006000137933",
  "4006000137964",
  "4006000138237",
  "4006000173009",
  "4006000217079",
  "4006000217086",
  "4006000229096",
  "6410405122506",
  "6410405141538",
  "6408659993003",
  "6408659993034",
  "6408659993164",
  "6408659993294",
  "6410405341297",
  "6410405341310",
  "6410405341334",
  "6410405341358",
  "6430066382866",
  "6430066384280",
  "6409770076965",
  "6409770077061",
  "6409770079607",
  "6409770080054",
  "6409770080108",
  "6409770080313",
  "6409770080603",
  "6409770080658",
  "6409770080962",
  "6418784011107",
  "6410803642019",
  "6411401035470",
  "6411401035807",
  "6411401035890",
  "6411401036712",
  "6416453040090",
  "7310532301241",
  "7310532301258",
  "7310532304600",
  "7310532305249",
  "7310532305881",
  "7090046314103",
  "7090046314134",
  "7090046314165",
  "7090046314257",
  "6413600015161",
  "6413605229549",
  "6413605250871",
  "6413605000841",
  "6413605201194",
  "6413605264434",
  "6413605264441",
  "6413605283374",
  "6413605319264",
  "6413605365872",
  "6429811306073",
  "6429811306080",
  "6429811306097",
  "6429811306103",
  "6429811306240",
  "6412000036127",
  "6412000036134",
  "6412000036202",
  "6412000036226",
  "6412000036233",
  "6412000036240",
  "6412000036257"
] as const;

function normalizeTextV42(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/[^a-z0-9åäö]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSelectedStoreNameV42(options?: KruokaOfferProviderOptionsV10): string {
  return String(
    options?.kStoreName ??
    options?.storeName ??
    options?.kStoreNames?.[0] ??
    "",
  ).trim();
}

function isKSupermarketJokelaV42(options?: KruokaOfferProviderOptionsV10): boolean {
  const name = normalizeTextV42(getSelectedStoreNameV42(options));
  return name.includes("k supermarket jokela") ||
    name.includes("ksupermarket jokela");
}

function isActiveDiscountV42(discount?: ProductMapDiscount | null): boolean {
  if (!discount || typeof discount.price !== "number" || !Number.isFinite(discount.price)) {
    return false;
  }

  const now = Date.now();
  const start = discount.startDate ? new Date(discount.startDate).getTime() : Number.NEGATIVE_INFINITY;
  const end = discount.endDate ? new Date(discount.endDate).getTime() : Number.POSITIVE_INFINITY;

  if (Number.isFinite(start) && start > now) return false;
  if (Number.isFinite(end) && end < now) return false;

  return discount.discountAvailability?.store !== false;
}

function formatPriceV42(value: unknown): string {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "";
  return numberValue.toFixed(2).replace(".", ",");
}

function formatValidityV42(endDate?: string | null): string | undefined {
  if (!endDate) return undefined;
  const date = new Date(endDate);
  if (Number.isNaN(date.getTime())) return undefined;

  return `Voimassa ${date.toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  })} asti`;
}

function getTopCategoryV42(product: ProductMapProduct): string {
  return String(
    product.category?.tree?.[0]?.localizedName?.finnish ??
    product.category?.localizedName?.finnish ??
    "Muut",
  ).trim() || "Muut";
}

function getSubCategoryV42(product: ProductMapProduct): string {
  const tree = product.category?.tree ?? [];
  return String(
    tree[tree.length - 1]?.localizedName?.finnish ??
    product.category?.localizedName?.finnish ??
    "Tarjoukset",
  ).trim() || "Tarjoukset";
}

function getTitleV42(product: ProductMapProduct): string {
  return String(
    product.localizedName?.finnish ??
    product.productAttributes?.marketingName?.fi ??
    product.productAttributes?.labelName?.fi ??
    product.ean ??
    "K-Ruoka tarjous",
  ).trim();
}

function matchesQueryV42(result: ZiiplyOfferSearchResult, query: string): boolean {
  const normalizedQuery = normalizeTextV42(query);
  if (!normalizedQuery || normalizedQuery.startsWith("ziiply all offers")) return true;
  if (String(query).trim().startsWith("__ziiply")) return true;

  const anyResult = result as any;
  const haystack = normalizeTextV42([
    result.title,
    anyResult.name,
    anyResult.brand,
    anyResult.ean,
    anyResult.category,
    anyResult.categoryPath,
    anyResult.productGroup,
    anyResult.mainCategory,
    anyResult.subCategory,
  ].filter(Boolean).join(" "));

  return haystack.includes(normalizedQuery);
}

async function fetchProductMapBatchV42(
  storeId: string,
  eans: readonly string[],
): Promise<ProductMapResponse> {
  const response = await fetch("https://www.k-ruoka.fi/kr-api/raw-offer/product-map", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Origin: "https://www.k-ruoka.fi",
      Referer: "https://www.k-ruoka.fi/k-supermarket/tarjouslehti?sivu=1",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Safari/605.1.15",
    },
    body: JSON.stringify({
      storeId,
      eans,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `K-Ruoka product-map failed: status=${response.status}, body=${body.slice(0, 300)}`,
    );
  }

  return await response.json() as ProductMapResponse;
}

async function fetchKSupermarketJokelaProductMapV42(): Promise<ProductMapResponse> {
  const batchSize = 100;
  const merged: ProductMapResponse = {};

  for (let index = 0; index < K_SUPERMARKET_JOKELA_PAGE1_EANS_V42.length; index += batchSize) {
    const batch = K_SUPERMARKET_JOKELA_PAGE1_EANS_V42.slice(index, index + batchSize);
    const response = await fetchProductMapBatchV42(
      K_SUPERMARKET_JOKELA_STORE_ID_V42,
      batch,
    );
    Object.assign(merged, response);
  }

  return merged;
}

function mapProductV42(
  product: ProductMapProduct,
  index: number,
): ZiiplyOfferSearchResult | null {
  const discount = product.mobilescan?.pricing?.discount;
  if (!isActiveDiscountV42(discount)) return null;

  const ean = String(product.ean ?? product.baseEan ?? product.id ?? "").trim();
  if (!ean) return null;

  const title = getTitleV42(product);
  const category = getTopCategoryV42(product);
  const categoryPath = String(product.category?.path ?? category);
  const unitPriceValue = discount?.unitPrice?.value;
  const unitPriceUnit = discount?.unitPrice?.unit ?? discount?.unit ?? null;
  const unitPriceText =
    typeof unitPriceValue === "number" && Number.isFinite(unitPriceValue)
      ? `${formatPriceV42(unitPriceValue)}${unitPriceUnit ? `/${unitPriceUnit}` : ""}`
      : "";

  const price = Number(discount?.price);
  const imageUrl =
    product.productAttributes?.image?.url ??
    `https://public.keskofiles.com/f/k-ruoka/product/${ean}`;

  const productUrl = product.productAttributes?.urlSlug
    ? `https://www.k-ruoka.fi/kauppa/tuote/${encodeURIComponent(product.productAttributes.urlSlug)}`
    : "https://www.k-ruoka.fi/k-supermarket/tarjouslehti?sivu=1";

  return {
    id: `kruoka-v42-s441-${discount?.campaignId ?? ean}-${ean}-${index}`,
    title,
    name: title,
    price,
    priceText: formatPriceV42(price),
    previousPrice: product.mobilescan?.pricing?.normal?.price ?? null,
    unitPrice: unitPriceText,
    unitPriceText,
    unitPriceUnit,
    imageUrl,
    storeId: K_SUPERMARKET_JOKELA_STORE_ID_V42,
    storeName: K_SUPERMARKET_JOKELA_NAME_V42,
    storeLabel: K_SUPERMARKET_JOKELA_NAME_V42,
    chain: "K",
    source: "kruoka",
    provider: "kruoka",
    offerId: discount?.campaignId ?? ean,
    ean,
    eans: [ean],
    additionalInfo:
      discount?.discountPercentageText ??
      (typeof discount?.discountPercentage === "number"
        ? `-${discount.discountPercentage}%`
        : null),
    benefitText:
      discount?.discountType === "LOYALTY" ||
      discount?.discountType === "PLUSA"
        ? "Plussa-tarjous"
        : undefined,
    validityText: formatValidityV42(discount?.endDate),
    category,
    categoryPath,
    productGroup: category,
    mainCategory: category,
    subCategory: getSubCategoryV42(product),
    validFrom: discount?.startDate ?? null,
    validUntil: discount?.endDate ?? null,
    isPlussaOffer:
      discount?.discountType === "LOYALTY" ||
      discount?.discountType === "PLUSA",
    url: productUrl,
    productUrl,
    debug: {
      providerVersion: "V42_KSUPERMARKET_JOKELA_OFFICIAL_PRODUCT_MAP",
      sourceApi: "https://www.k-ruoka.fi/kr-api/raw-offer/product-map",
      kRuokaStoreId: K_SUPERMARKET_JOKELA_STORE_ID_V42,
      campaignId: discount?.campaignId ?? null,
    },
  } as unknown as ZiiplyOfferSearchResult;
}

export async function fetchKruokaOffers(
  query: string,
  _source: ZiiplyOfferSearchSourceConfig,
  options?: KruokaOfferProviderOptionsV10,
): Promise<ZiiplyOfferSearchResult[]> {
  // Tämä V42 on tarkoituksella rajattu HAR-varmennettuun K-Supermarket Jokelaan.
  if (!isKSupermarketJokelaV42(options)) return [];

  try {
    const map = await fetchKSupermarketJokelaProductMapV42();
    const results = Object.values(map)
      .map((product, index) => mapProductV42(product, index))
      .filter((result): result is ZiiplyOfferSearchResult => Boolean(result))
      .filter((result) => matchesQueryV42(result, query));

    const seen = new Set<string>();
    return results.filter((result) => {
      const anyResult = result as any;
      const key = String(anyResult.ean || result.id || "").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch (error) {
    console.warn("[Ziiply K provider V42] K-Supermarket Jokela tarjoushaku epäonnistui", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

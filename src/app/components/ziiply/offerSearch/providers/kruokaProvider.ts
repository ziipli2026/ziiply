// src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts
// ZIIPLY_KRUOKA_PROVIDER_V33_RUOANHINTA_API_DEBUG
//
// Debug-versio: EI hae enää K-Ruoan product-mapia eikä HTML:ää.
// Hakee K-tarjoukset ruoanhinta.fi:n backendistä:
//   https://api.ruoanhinta.fi/api/offers?storeId=3344&skip=0&take=200
//
// Tarkoitus: varmistaa, että K-tarjoukset saadaan Göstaan rakenteisena JSON:na ilman K-Ruoan Cloudflare-estettä.

import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "../types";

export type KruokaOfferProviderOptionsV10 = {
  storeId?: string | number | null;
  storeName?: string | null;
  kStoreId?: string | number | null;
  kStoreName?: string | null;
};

type RuoanHintaOffer = {
  id?: number | string;
  type?: string | null;
  source?: string | null;
  title?: string | null;
  description?: string | null;
  requiresLoyaltyCard?: boolean | null;
  loyaltyProgram?: string | null;
  offerPrice?: number | null;
  previousPrice?: number | null;
  offerComparisonPrice?: number | null;
  previousComparisonPrice?: number | null;
  comparisonPriceUnit?: string | null;
  discountPercent?: number | null;
  batchQuantity?: number | null;
  batchTotalPrice?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  item?: {
    id?: number | string;
    name?: string | null;
    ean?: string | null;
    pictureUrl?: string | null;
    brandName?: string | null;
    urlSlug?: string | null;
    category?: string | null;
    itemCategories?: Array<{
      category?: {
        name?: string | null;
        slug?: string | null;
        parentCategory?: {
          name?: string | null;
          slug?: string | null;
          parentCategory?: {
            name?: string | null;
            slug?: string | null;
          } | null;
        } | null;
      } | null;
    }>;
  } | null;
  storeItem?: {
    storeId?: number | string | null;
    price?: number | null;
    priceUnit?: string | null;
    comparisonPrice?: number | null;
    comparisonPriceUnit?: string | null;
  } | null;
};

type RuoanHintaResponse = {
  offers?: RuoanHintaOffer[];
};

const DEFAULT_RUOANHINTA_STORE_ID = "3344";
const PAGE_SIZE = 200;
const MAX_PAGES = 10;

function normalizeStoreId(options?: KruokaOfferProviderOptionsV10): string | null {
  const raw = options?.kStoreId ?? options?.storeId ?? null;
  if (raw === null || raw === undefined || raw === "") return null;
  return String(raw);
}

function normalizeStoreName(options?: KruokaOfferProviderOptionsV10): string {
  return String(options?.kStoreName ?? options?.storeName ?? "K-Ruoka / Ruoanhinta");
}

function resolveRuoanHintaStoreId(options?: KruokaOfferProviderOptionsV10): string {
  const raw = normalizeStoreId(options);

  // Ruoanhinta käyttää omaa numeerista storeId:tä. K-Ruoan L654/K986-tyyppinen tunnus ei käy tähän endpointtiin.
  // Debugissä käytetään defaulttina käyttäjän löytämää toimivaa storeId:tä 3344.
  if (raw && /^\d+$/.test(raw)) return raw;
  return DEFAULT_RUOANHINTA_STORE_ID;
}

function centsToEuros(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value) / 100;
}

function centsToPriceText(value: number | null | undefined): string | null {
  const euros = centsToEuros(value);
  if (euros === null) return null;
  return euros.toFixed(2).replace(".", ",");
}

function centsToUnitText(value: number | null | undefined, unit?: string | null): string | null {
  const euros = centsToPriceText(value);
  if (!euros) return null;
  return unit ? `${euros}/${unit}` : euros;
}

function categoryName(offer: RuoanHintaOffer): string {
  const first = offer.item?.itemCategories?.[0]?.category;
  return (
    first?.parentCategory?.parentCategory?.name ??
    first?.parentCategory?.name ??
    first?.name ??
    offer.item?.category ??
    "K-Ruoka tarjoukset"
  );
}

function subCategoryName(offer: RuoanHintaOffer): string {
  const first = offer.item?.itemCategories?.[0]?.category;
  return first?.name ?? offer.item?.category ?? "Tarjoukset";
}

function matchesQuery(offer: RuoanHintaOffer, query: string): boolean {
  const q = query.trim().toLowerCase();

  // Göstan master-tarjoushaku käyttää sisäistä erikoishakua, ei käyttäjän tekstihakua.
  if (!q || q.startsWith("__ziiply")) return true;

  const haystack = [
    offer.id,
    offer.type,
    offer.source,
    offer.item?.name,
    offer.item?.brandName,
    offer.item?.ean,
    offer.item?.urlSlug,
    offer.item?.category,
    offer.title,
    offer.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

function asDebugResult(args: {
  id: string;
  title: string;
  detail?: string;
  storeId?: string | null;
  storeName?: string | null;
  debug?: unknown;
}): ZiiplyOfferSearchResult {
  const title = args.detail ? `${args.title} — ${args.detail}` : args.title;

  return {
    id: `k-debug-v33-${args.id}`,
    title,
    name: title,
    price: null,
    unitPrice: null,
    imageUrl: null,
    storeId: args.storeId ?? DEFAULT_RUOANHINTA_STORE_ID,
    storeName: args.storeName ?? "K DEBUG",
    chain: "K",
    source: "kruoka",
    provider: "kruoka",
    url: "https://ruoanhinta.fi/",
    debug: args.debug ?? null,
  } as unknown as ZiiplyOfferSearchResult;
}

function toOfferResult(args: {
  offer: RuoanHintaOffer;
  index: number;
  storeId: string;
  storeName: string;
}): ZiiplyOfferSearchResult {
  const offer = args.offer;
  const item = offer.item ?? {};
  const offerId = String(offer.id ?? `ruoanhinta-${args.index}`);
  const name = String(item.name ?? offer.title ?? "K-Ruoka tarjous");
  const price = centsToEuros(offer.offerPrice ?? offer.storeItem?.price ?? null);
  const previousPrice = centsToEuros(offer.previousPrice ?? null);
  const unitPriceText = centsToUnitText(
    offer.offerComparisonPrice ?? offer.storeItem?.comparisonPrice ?? null,
    offer.comparisonPriceUnit ?? offer.storeItem?.comparisonPriceUnit ?? null,
  );

  const isPlussa = Boolean(offer.requiresLoyaltyCard || offer.loyaltyProgram === "k-plussa");
  const isBatch = typeof offer.batchQuantity === "number" && typeof offer.batchTotalPrice === "number";
  const priceText = isBatch
    ? `${offer.batchQuantity} kpl ${centsToPriceText(offer.batchTotalPrice) ?? ""} €`.trim()
    : centsToPriceText(offer.offerPrice ?? offer.storeItem?.price ?? null);

  return {
    id: `kruoka-v33-ruoanhinta-${offerId}-${args.index}`,
    title: name,
    name,
    price,
    priceText,
    previousPrice,
    unitPrice: unitPriceText,
    unitPriceText,
    unitPriceUnit: offer.comparisonPriceUnit ?? offer.storeItem?.comparisonPriceUnit ?? null,
    imageUrl: item.pictureUrl ?? null,
    storeId: args.storeId,
    storeName: args.storeName,
    storeLabel: args.storeName,
    chain: "K",
    source: "kruoka",
    provider: "kruoka",
    offerId,
    ean: item.ean ?? null,
    eans: item.ean ? [item.ean] : [],
    brand: item.brandName ?? null,
    unit: offer.storeItem?.priceUnit ?? null,
    additionalInfo: offer.discountPercent != null ? `-${offer.discountPercent}%` : null,
    benefitText: isPlussa ? "Plussa-tarjous" : undefined,
    validityText: offer.expiresAt ? `Voimassa ${offer.expiresAt}` : undefined,
    category: categoryName(offer),
    categoryPath: item.category ?? categoryName(offer),
    productGroup: categoryName(offer),
    mainCategory: categoryName(offer),
    subCategory: subCategoryName(offer),
    validFrom: offer.startsAt ?? null,
    validUntil: offer.expiresAt ?? null,
    isPlussaOffer: isPlussa,
    url: item.urlSlug
      ? `https://www.k-ruoka.fi/kauppa/tuote/${encodeURIComponent(item.urlSlug)}`
      : "https://ruoanhinta.fi/",
    debug: {
      providerVersion: "V33_RUOANHINTA_API_DEBUG",
      rawOffer: offer,
      sourceApi: "https://api.ruoanhinta.fi/api/offers",
      ruoanhintaStoreId: args.storeId,
    },
  } as unknown as ZiiplyOfferSearchResult;
}

async function fetchRuoanHintaOffers(storeId: string): Promise<RuoanHintaOffer[]> {
  const all: RuoanHintaOffer[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const skip = page * PAGE_SIZE;
    const url = `https://api.ruoanhinta.fi/api/offers?storeId=${encodeURIComponent(storeId)}&skip=${skip}&take=${PAGE_SIZE}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Origin: "https://ruoanhinta.fi",
        Referer: "https://ruoanhinta.fi/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`ruoanhinta offers failed: status=${res.status}, body=${text.slice(0, 300)}`);
    }

    const data = (await res.json()) as RuoanHintaResponse;
    const offers = Array.isArray(data.offers) ? data.offers : [];
    all.push(...offers);

    if (offers.length < PAGE_SIZE) break;
  }

  return all;
}

export async function fetchKruokaOffers(
  query: string,
  _source: ZiiplyOfferSearchSourceConfig,
  options?: KruokaOfferProviderOptionsV10,
): Promise<ZiiplyOfferSearchResult[]> {
  const selectedStoreId = normalizeStoreId(options);
  const storeName = normalizeStoreName(options);
  const ruoanhintaStoreId = resolveRuoanHintaStoreId(options);

  const debugStart = asDebugResult({
    id: "01-start",
    title: "[K DEBUG V33] Ruoanhinta API käytössä",
    detail: `selected=${selectedStoreId ?? "NULL"}, apiStore=${ruoanhintaStoreId}`,
    storeId: ruoanhintaStoreId,
    storeName,
    debug: { options },
  });

  try {
    const rawOffers = await fetchRuoanHintaOffers(ruoanhintaStoreId);
    const filtered = rawOffers.filter((offer) => matchesQuery(offer, query));

    const debugOk = asDebugResult({
      id: "02-ok",
      title: "[K DEBUG V33] tarjoukset haettu",
      detail: `raw=${rawOffers.length}, shown=${Math.min(filtered.length, 80)}`,
      storeId: ruoanhintaStoreId,
      storeName,
      debug: {
        query,
        rawCount: rawOffers.length,
        filteredCount: filtered.length,
        sample: rawOffers[0] ?? null,
      },
    });

    const offers = filtered.slice(0, 80).map((offer, index) =>
      toOfferResult({
        offer,
        index,
        storeId: ruoanhintaStoreId,
        storeName,
      }),
    );

    return [debugStart, debugOk, ...offers];
  } catch (error) {
    return [
      debugStart,
      asDebugResult({
        id: "99-error",
        title: "[K DEBUG V33] Ruoanhinta API virhe",
        detail: error instanceof Error ? error.message : String(error),
        storeId: ruoanhintaStoreId,
        storeName,
        debug: { error },
      }),
    ];
  }
}

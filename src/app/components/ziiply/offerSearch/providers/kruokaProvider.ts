// src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts
// ZIIPLY_KRUOKA_PROVIDER_V34_RUOANHINTA_SELECTED_STORE_DATEFIX
//
// EI hae enää K-Ruoan product-mapia eikä HTML:ää.
// Hakee K-tarjoukset ruoanhinta.fi:n backendistä valitun K-kaupan perusteella.
// V34:
// - poistettu pakotettu storeId=3344 varsinaisesta hausta
// - jos Ziiplyn valittu K-storeId ei ole ruoanhinta.fi:n numeerinen storeId,
//   provider etsii oikean storeId:n /api/stores/minimal-listasta kaupan nimen perusteella
// - voimassaoloaika muotoillaan muodossa "Voimassa 5.7." eikä ISO-aikaleimana
// - debug-kortteja ei palauteta normaalissa onnistuneessa haussa

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

type RuoanHintaStore = {
  id?: number | string;
  name?: string | null;
  chain?: string | null;
  type?: string | null;
  urlSlug?: string | null;
};

const PAGE_SIZE = 200;
const MAX_PAGES = 10;
const STORE_PAGE_SIZE = 200;
const MAX_STORE_PAGES = 40;

function normalizeStoreId(options?: KruokaOfferProviderOptionsV10): string | null {
  const raw = options?.kStoreId ?? options?.storeId ?? null;
  if (raw === null || raw === undefined || raw === "") return null;
  return String(raw);
}

function normalizeStoreName(options?: KruokaOfferProviderOptionsV10): string {
  return String(options?.kStoreName ?? options?.storeName ?? "K-Ruoka / Ruoanhinta");
}

function normalizeStoreSearchText(value: unknown): string {
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

function stripKStorePrefix(value: string): string {
  return normalizeStoreSearchText(value)
    .replace(/^(k citymarket|k supermarket|k market|citymarket|ksupermarket|kmarket)\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatValidityText(expiresAt?: string | null): string | undefined {
  if (!expiresAt) return undefined;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return undefined;

  return `Voimassa ${date.toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
  })}.`;
}

async function fetchRuoanHintaStores(): Promise<RuoanHintaStore[]> {
  const all: RuoanHintaStore[] = [];

  for (let page = 0; page < MAX_STORE_PAGES; page += 1) {
    const skip = page * STORE_PAGE_SIZE;
    const url = `https://api.ruoanhinta.fi/api/stores/minimal?skip=${skip}&take=${STORE_PAGE_SIZE}`;

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
      throw new Error(`ruoanhinta stores failed: status=${res.status}, body=${text.slice(0, 240)}`);
    }

    const stores = (await res.json()) as RuoanHintaStore[];
    const pageStores = Array.isArray(stores) ? stores : [];
    all.push(...pageStores);

    if (pageStores.length < STORE_PAGE_SIZE) break;
  }

  return all;
}

function scoreRuoanHintaStoreMatch(store: RuoanHintaStore, wantedName: string): number {
  const storeName = normalizeStoreSearchText(store.name);
  const storeSlug = normalizeStoreSearchText(store.urlSlug);
  const wanted = normalizeStoreSearchText(wantedName);
  const wantedStripped = stripKStorePrefix(wantedName);
  const storeStripped = stripKStorePrefix(String(store.name ?? store.urlSlug ?? ""));

  if (!wanted) return 0;

  let score = 0;
  if (storeName === wanted) score += 1000;
  if (storeStripped && wantedStripped && storeStripped === wantedStripped) score += 850;
  if (storeName.includes(wanted) || wanted.includes(storeName)) score += 650;
  if (storeStripped && wantedStripped && (storeStripped.includes(wantedStripped) || wantedStripped.includes(storeStripped))) score += 520;
  if (storeSlug.includes(wanted.replace(/\s+/g, " "))) score += 240;

  const wantedTokens = wantedStripped.split(" ").filter((token) => token.length >= 3);
  for (const token of wantedTokens) {
    if (storeName.includes(token) || storeSlug.includes(token)) score += 45;
  }

  const chain = normalizeStoreSearchText(store.chain);
  if (wanted.includes("citymarket") && chain.includes("citymarket")) score += 160;
  if (wanted.includes("supermarket") && chain.includes("supermarket")) score += 160;
  if (wanted.includes("market") && chain.includes("market")) score += 80;

  return score;
}

async function resolveRuoanHintaStoreId(options?: KruokaOfferProviderOptionsV10): Promise<{ storeId: string | null; matchedStoreName?: string | null; reason?: string }> {
  const raw = normalizeStoreId(options);
  const selectedName = normalizeStoreName(options);

  if (raw && /^\d+$/.test(raw)) {
    return { storeId: raw, matchedStoreName: selectedName, reason: "selected id was already numeric" };
  }

  const stores = await fetchRuoanHintaStores();
  const kStores = stores.filter((store) => normalizeStoreSearchText(store.type) === "k" || normalizeStoreSearchText(store.chain).startsWith("k"));

  const scored = kStores
    .map((store) => ({ store, score: scoreRuoanHintaStoreMatch(store, selectedName) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best?.store?.id || best.score < 90) {
    return {
      storeId: null,
      matchedStoreName: null,
      reason: `Ruoanhinta storeId not found for selected K store: ${selectedName || raw || "unknown"}`,
    };
  }

  return {
    storeId: String(best.store.id),
    matchedStoreName: best.store.name ?? selectedName,
    reason: `matched by name, score=${best.score}`,
  };
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
    id: `k-debug-v34-${args.id}`,
    title,
    name: title,
    price: null,
    unitPrice: null,
    imageUrl: null,
    storeId: args.storeId ?? "unresolved",
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
    id: `kruoka-v34-ruoanhinta-${offerId}-${args.index}`,
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
    validityText: formatValidityText(offer.expiresAt),
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
      providerVersion: "V34_RUOANHINTA_SELECTED_STORE_DATEFIX",
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
  const selectedStoreName = normalizeStoreName(options);

  try {
    const resolved = await resolveRuoanHintaStoreId(options);

    if (!resolved.storeId) {
      return [
        asDebugResult({
          id: "99-store-not-found",
          title: "[K DEBUG V34] Valittua K-kauppaa ei löytynyt Ruoanhinta-listasta",
          detail: resolved.reason ?? `selected=${selectedStoreId ?? "NULL"}, name=${selectedStoreName}`,
          storeId: selectedStoreId ?? null,
          storeName: selectedStoreName,
          debug: { options, resolved },
        }),
      ];
    }

    const storeName = resolved.matchedStoreName || selectedStoreName;
    const rawOffers = await fetchRuoanHintaOffers(resolved.storeId);
    const filtered = rawOffers.filter((offer) => matchesQuery(offer, query));

    const offers = filtered.slice(0, 80).map((offer, index) =>
      toOfferResult({
        offer,
        index,
        storeId: resolved.storeId,
        storeName,
      }),
    );

    return offers;
  } catch (error) {
    return [
      asDebugResult({
        id: "99-error",
        title: "[K DEBUG V34] Ruoanhinta API virhe",
        detail: error instanceof Error ? error.message : String(error),
        storeId: selectedStoreId ?? null,
        storeName: selectedStoreName,
        debug: { error, options },
      }),
    ];
  }
}

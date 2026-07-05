// src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts
// ZIIPLY_KRUOKA_PROVIDER_V27_VISIBLE_STAGE_DEBUG
//
// Debug-versio ilman Vercel-logien tarvetta.
// Palauttaa debug-kortit suoraan Göstan UI:hin jokaisesta vaiheesta:
// 1) provider käynnistyi
// 2) mitä storeId/storeName/options tuli sisään
// 3) mikä tarjouslehti-URL haettiin
// 4) löytyikö applicationState
// 5) montako offeria ja EANia löytyi
// 6) product-map status
// 7) ensimmäiset oikeat K-tarjouskortit
//
// Tämä tiedosto on tarkoitettu korvaamaan väliaikaisesti:
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
};

type KOffer = {
  Id?: string;
  id?: string;
  Name?: string;
  name?: string;
  Price?: number | string;
  price?: number | string;
  Eans?: string[];
  eans?: string[];
  [key: string]: unknown;
};

type KProductMapItem = {
  id?: string;
  ean?: string;
  localizedName?: {
    finnish?: string;
    swedish?: string;
    [key: string]: unknown;
  };
  pictureUrls?: string[];
  [key: string]: unknown;
};

const KRUOKA_ORIGIN = "https://www.k-ruoka.fi";
const KRUOKA_PRODUCT_MAP_URL = `${KRUOKA_ORIGIN}/kr-api/raw-offer/product-map`;

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
    id: `k-debug-${args.id}`,
    title,
    name: title,
    price: null,
    unitPrice: null,
    imageUrl: null,
    storeId: args.storeId ?? null,
    storeName: args.storeName ?? "K DEBUG",
    chain: "K-Ruoka",
    source: "kruoka",
    provider: "kruoka",
    url: "https://www.k-ruoka.fi/k-market/tarjouslehti",
    debug: args.debug ?? null,
  } as unknown as ZiiplyOfferSearchResult;
}

function htmlEntityDecode(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
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

function extractApplicationState(html: string): unknown {
  const divMatch = html.match(/<div[^>]*id=["']applicationState["'][^>]*>/);
  const divTag = divMatch?.[0];

  if (!divTag) {
    throw new Error("applicationState div not found");
  }

  const dataStateMatch = divTag.match(/data-state=(["'])([\s\S]*?)\1/);

  if (!dataStateMatch?.[2]) {
    throw new Error("applicationState data-state attribute not found");
  }

  const decoded = maybeDecodeURIComponent(htmlEntityDecode(dataStateMatch[2]));
  return JSON.parse(decoded);
}

function getByPath(root: unknown, path: string[]): unknown {
  let current: unknown = root;

  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function normalizeStoreId(options?: KruokaOfferProviderOptionsV10): string | null {
  const raw = options?.kStoreId ?? options?.storeId ?? null;
  if (raw === null || raw === undefined || raw === "") return null;
  return String(raw);
}

function findOffersFromState(state: unknown, wantedStoreId: string | null): {
  storeId: string;
  offers: KOffer[];
  storeIds: string[];
  usedWantedStore: boolean;
} {
  const stores = getByPath(state, ["reduxState", "offerBrochurePage", "stores"]);

  if (!stores || typeof stores !== "object") {
    throw new Error("reduxState.offerBrochurePage.stores not found");
  }

  const storeMap = stores as Record<string, unknown>;
  const storeIds = Object.keys(storeMap);
  const hasWantedStore = Boolean(wantedStoreId && storeMap[wantedStoreId]);
  const storeId = hasWantedStore ? String(wantedStoreId) : storeIds[0];

  if (!storeId) {
    throw new Error("No storeIds found in applicationState");
  }

  const offers = getByPath(storeMap[storeId], ["response", "offers"]);

  if (!Array.isArray(offers)) {
    throw new Error(`response.offers not found for storeId ${storeId}`);
  }

  return {
    storeId,
    offers: offers as KOffer[],
    storeIds,
    usedWantedStore: hasWantedStore,
  };
}

function collectEans(offers: KOffer[]): string[] {
  const all: string[] = [];

  for (const offer of offers) {
    const eans = offer.Eans ?? offer.eans ?? [];
    for (const ean of eans) {
      const normalized = String(ean).trim();
      if (normalized) all.push(normalized);
    }
  }

  return [...new Set(all)];
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))];
}

function buildBrochureUrls(
  source: ZiiplyOfferSearchSourceConfig,
  options?: KruokaOfferProviderOptionsV10,
): string[] {
  const src = source as unknown as Record<string, unknown>;
  const sourceCandidates = [
    src.url,
    src.href,
    src.offerUrl,
    src.offersUrl,
    src.brochureUrl,
  ].filter((value): value is string => typeof value === "string" && value.includes("k-ruoka.fi"));

  const storeName = String(options?.kStoreName ?? options?.storeName ?? "").toLowerCase();

  const guessedByStoreName = storeName.includes("citymarket")
    ? `${KRUOKA_ORIGIN}/k-citymarket/tarjouslehti`
    : storeName.includes("supermarket")
      ? `${KRUOKA_ORIGIN}/k-supermarket/tarjouslehti`
      : storeName.includes("market")
        ? `${KRUOKA_ORIGIN}/k-market/tarjouslehti`
        : null;

  return uniqueStrings([
    ...sourceCandidates,
    guessedByStoreName,
    `${KRUOKA_ORIGIN}/k-market/tarjouslehti`,
    `${KRUOKA_ORIGIN}/k-supermarket/tarjouslehti`,
    `${KRUOKA_ORIGIN}/k-citymarket/tarjouslehti`,
  ]);
}

async function fetchHtml(url: string): Promise<{ status: number; ok: boolean; text: string }> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "fi-FI,fi;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15",
    },
    cache: "no-store",
  });

  const text = await response.text().catch(() => "");
  return { status: response.status, ok: response.ok, text };
}

async function fetchProductMap(args: {
  storeId: string;
  eans: string[];
  referer: string;
}): Promise<{
  status: number;
  ok: boolean;
  map: Record<string, KProductMapItem>;
  errorPreview?: string;
}> {
  if (args.eans.length === 0) {
    return { status: 0, ok: true, map: {} };
  }

  const response = await fetch(KRUOKA_PRODUCT_MAP_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Language": "fi-FI,fi;q=0.9",
      "Content-Type": "application/json",
      Origin: KRUOKA_ORIGIN,
      Referer: args.referer,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15",
      "X-K-Build-Number": "31640",
    },
    body: JSON.stringify({ storeId: args.storeId, eans: args.eans }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorPreview = await response.text().then((t) => t.slice(0, 240)).catch(() => "");
    return { status: response.status, ok: false, map: {}, errorPreview };
  }

  return {
    status: response.status,
    ok: true,
    map: (await response.json()) as Record<string, KProductMapItem>,
  };
}

function toOfferResult(args: {
  offer: KOffer;
  productMap: Record<string, KProductMapItem>;
  storeId: string;
  storeName: string | null;
  index: number;
}): ZiiplyOfferSearchResult {
  const eans = (args.offer.Eans ?? args.offer.eans ?? []).map(String);
  const firstProduct = eans.map((ean) => args.productMap[ean]).find(Boolean);
  const offerId = String(args.offer.Id ?? args.offer.id ?? `offer-${args.index}`);
  const offerName = String(
    args.offer.Name ?? args.offer.name ?? firstProduct?.localizedName?.finnish ?? "K-Ruoka tarjous",
  );
  const price = args.offer.Price ?? args.offer.price ?? null;

  return {
    id: `kruoka-v27-${args.storeId}-${offerId}-${args.index}`,
    title: `[K TARJOUS] ${offerName}`,
    name: offerName,
    price,
    unitPrice: null,
    imageUrl: firstProduct?.pictureUrls?.[0] ?? null,
    storeId: args.storeId,
    storeName: args.storeName ?? "K-Ruoka",
    chain: "K-Ruoka",
    source: "kruoka",
    provider: "kruoka",
    offerId,
    ean: eans[0] ?? null,
    eans,
    url: `${KRUOKA_ORIGIN}/k-market/tarjouslehti?tarjous=${encodeURIComponent(offerId)}`,
    debug: {
      rawOffer: args.offer,
      firstProduct,
      eanCount: eans.length,
    },
  } as unknown as ZiiplyOfferSearchResult;
}

export async function fetchKruokaOffers(
  query: string,
  source: ZiiplyOfferSearchSourceConfig,
  options?: KruokaOfferProviderOptionsV10,
): Promise<ZiiplyOfferSearchResult[]> {
  const wantedStoreId = normalizeStoreId(options);
  const storeName = String(options?.kStoreName ?? options?.storeName ?? "K DEBUG");
  const debugCards: ZiiplyOfferSearchResult[] = [];

  const addDebug = (id: string, title: string, detail?: string, debug?: unknown) => {
    debugCards.push(asDebugResult({ id, title, detail, storeId: wantedStoreId, storeName, debug }));
  };

  addDebug("01-start", "[K DEBUG 1] provider käynnistyi", `storeId=${wantedStoreId ?? "NULL"}`);
  addDebug("02-options", "[K DEBUG 2] options", `store=${storeName}`, { query, options, source });

  const urls = buildBrochureUrls(source, options);
  addDebug("03-urls", "[K DEBUG 3] kokeiltavat URL:t", urls.join(" | "));

  let selectedUrl: string | null = null;
  let selectedStoreId: string | null = null;
  let offers: KOffer[] = [];
  let availableStoreIds: string[] = [];
  let htmlLength = 0;

  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i];

    try {
      const htmlResult = await fetchHtml(url);
      htmlLength = htmlResult.text.length;
      addDebug(
        `04-html-${i}`,
        `[K DEBUG 4.${i + 1}] HTML fetch`,
        `${htmlResult.status}, len=${htmlLength}, ${url.replace(KRUOKA_ORIGIN, "")}`,
      );

      if (!htmlResult.ok || !htmlResult.text) {
        continue;
      }

      const state = extractApplicationState(htmlResult.text);
      const found = findOffersFromState(state, wantedStoreId);

      selectedUrl = url;
      selectedStoreId = found.storeId;
      offers = found.offers;
      availableStoreIds = found.storeIds;

      addDebug(
        "05-state-ok",
        "[K DEBUG 5] applicationState OK",
        `selected=${found.storeId}, wanted=${wantedStoreId ?? "NULL"}, usedWanted=${String(found.usedWantedStore)}`,
        { availableStoreIds: found.storeIds.slice(0, 20), firstOffer: found.offers[0] ?? null },
      );

      break;
    } catch (error) {
      addDebug(
        `04-error-${i}`,
        `[K DEBUG 4.${i + 1}] URL ei kelvannut`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  if (!selectedUrl || !selectedStoreId) {
    addDebug("99-stop-no-state", "[K DEBUG STOP] applicationState/offers ei löytynyt", `htmlLen=${htmlLength}`);
    return debugCards;
  }

  const eans = collectEans(offers);
  addDebug(
    "06-counts",
    "[K DEBUG 6] tarjoukset ja EANit",
    `offers=${offers.length}, eans=${eans.length}, stores=${availableStoreIds.slice(0, 5).join(",")}`,
  );

  let productMap: Record<string, KProductMapItem> = {};

  try {
    const productMapResult = await fetchProductMap({
      storeId: selectedStoreId,
      eans,
      referer: selectedUrl,
    });

    productMap = productMapResult.map;

    addDebug(
      "07-product-map",
      "[K DEBUG 7] product-map",
      `status=${productMapResult.status}, ok=${String(productMapResult.ok)}, products=${Object.keys(productMap).length}`,
      { errorPreview: productMapResult.errorPreview ?? null, firstProductKey: Object.keys(productMap)[0] ?? null },
    );
  } catch (error) {
    addDebug(
      "07-product-map-error",
      "[K DEBUG 7] product-map kaatui",
      error instanceof Error ? error.message : String(error),
    );
  }

  const q = query.trim().toLowerCase();
  const visibleOffers = offers
    .filter((offer) => {
      if (!q) return true;
      const offerName = String(offer.Name ?? offer.name ?? "").toLowerCase();
      const eansForOffer = (offer.Eans ?? offer.eans ?? []).map(String);
      return offerName.includes(q) || eansForOffer.some((ean) => ean.includes(q));
    })
    .slice(0, 25)
    .map((offer, index) =>
      toOfferResult({
        offer,
        productMap,
        storeId: selectedStoreId,
        storeName,
        index,
      }),
    );

  addDebug("08-return", "[K DEBUG 8] palautetaan UI:hin", `debug=${debugCards.length}, offers=${visibleOffers.length}`);

  return [...debugCards, ...visibleOffers];
}

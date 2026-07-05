// src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts
// ZIIPLY_KRUOKA_PROVIDER_V24_DEBUG_APPLICATION_STATE
//
// Debug-versio K-Ruoka tarjouslehdelle.
// Tarkoitus:
// 1) Hakee tarjouslehden HTML:n
// 2) Purkaa <div id="applicationState" data-state="...">
// 3) Lukee offerBrochurePage.stores[storeId].response.offers
// 4) Kerää EANit
// 5) Yrittää product-map-kutsua, mutta EI kaadu jos se palauttaa 403
// 6) Palauttaa debug-kortteja vain löydetyistä tarjouksista
//
// HUOM: Tämä on debug-versio. Kun data varmistuu, siivotaan kentät lopulliseen muotoon.

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
  images?: unknown;
  [key: string]: unknown;
};

const KRUOKA_ORIGIN = "https://www.k-ruoka.fi";
const KRUOKA_BROCHURE_URL = `${KRUOKA_ORIGIN}/k-market/tarjouslehti`;
const KRUOKA_PRODUCT_MAP_URL = `${KRUOKA_ORIGIN}/kr-api/raw-offer/product-map`;

function debugLog(label: string, data?: unknown) {
  // Pidä nämä toistaiseksi näkyvissä, jotta Vercel-logista näkee mitä tapahtuu.
  console.log(`[kruokaProvider:debug] ${label}`, data ?? "");
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
  // Safari-lähdekoodissa data-state on id="applicationState" divissä.
  const match = html.match(/<div[^>]*id=["']applicationState["'][^>]*data-state=(["'])(.*?)\1[^>]*>/s);

  if (!match?.[2]) {
    throw new Error("applicationState data-state not found from K-Ruoka HTML");
  }

  const raw = match[2];
  const decoded = maybeDecodeURIComponent(htmlEntityDecode(raw));

  try {
    return JSON.parse(decoded);
  } catch (error) {
    debugLog("applicationState JSON.parse failed, first 500 chars", decoded.slice(0, 500));
    throw error;
  }
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
} {
  const stores = getByPath(state, ["reduxState", "offerBrochurePage", "stores"]);

  if (!stores || typeof stores !== "object") {
    throw new Error("reduxState.offerBrochurePage.stores not found from applicationState");
  }

  const storeMap = stores as Record<string, unknown>;
  const storeIds = Object.keys(storeMap);
  const storeId = wantedStoreId && storeMap[wantedStoreId] ? wantedStoreId : storeIds[0];

  if (!storeId) {
    throw new Error("No stores found from offerBrochurePage.stores");
  }

  const offers = getByPath(storeMap[storeId], ["response", "offers"]);

  if (!Array.isArray(offers)) {
    throw new Error(`No response.offers array found for storeId ${storeId}`);
  }

  return { storeId, offers: offers as KOffer[], storeIds };
}

function collectEans(offers: KOffer[]): string[] {
  const all = offers.flatMap((offer) => offer.Eans ?? offer.eans ?? []);
  return [...new Set(all.map(String).filter(Boolean))];
}

async function fetchProductMap(storeId: string, eans: string[]): Promise<Record<string, KProductMapItem>> {
  if (eans.length === 0) return {};

  const response = await fetch(KRUOKA_PRODUCT_MAP_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Language": "fi-FI,fi;q=0.9",
      "Content-Type": "application/json",
      Origin: KRUOKA_ORIGIN,
      Referer: KRUOKA_BROCHURE_URL,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15",
      "X-K-Build-Number": "31640",
    },
    body: JSON.stringify({ storeId, eans }),
    cache: "no-store",
  });

  debugLog("product-map status", response.status);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    debugLog("product-map failed body preview", text.slice(0, 500));
    return {};
  }

  return (await response.json()) as Record<string, KProductMapItem>;
}

function offerMatchesQuery(offer: KOffer, productMap: Record<string, KProductMapItem>, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const offerName = String(offer.Name ?? offer.name ?? "").toLowerCase();
  if (offerName.includes(q)) return true;

  const eans = offer.Eans ?? offer.eans ?? [];
  return eans.some((ean) => {
    const product = productMap[String(ean)];
    const productName = String(product?.localizedName?.finnish ?? "").toLowerCase();
    return String(ean).includes(q) || productName.includes(q);
  });
}

function toDebugResult(
  offer: KOffer,
  productMap: Record<string, KProductMapItem>,
  storeId: string,
  storeName?: string | null,
): ZiiplyOfferSearchResult {
  const eans = (offer.Eans ?? offer.eans ?? []).map(String);
  const firstProduct = eans.map((ean) => productMap[ean]).find(Boolean);
  const offerId = String(offer.Id ?? offer.id ?? "");
  const offerName = String(offer.Name ?? offer.name ?? firstProduct?.localizedName?.finnish ?? "K-Ruoka tarjous");
  const price = offer.Price ?? offer.price ?? null;

  // Käytetään any-rakennetta, koska projektin ZiiplyOfferSearchResult-tyyppi ei ole tässä tiedostossa näkyvissä.
  // Lopullisessa versiossa kentät kannattaa mapata täsmälleen types.ts:n mukaan.
  return {
    id: `kruoka-debug-${storeId}-${offerId || eans[0] || Math.random().toString(36).slice(2)}`,
    source: "kruoka",
    provider: "kruoka",
    chain: "K-Ruoka",
    storeId,
    storeName: storeName ?? null,
    title: `[K DEBUG] ${offerName}`,
    name: offerName,
    price,
    offerId,
    ean: eans[0] ?? null,
    eans,
    imageUrl: firstProduct?.pictureUrls?.[0] ?? null,
    debug: {
      note: "K-Ruoka tarjouslehti parsed from applicationState; product-map best effort",
      rawOffer: offer,
      firstProduct,
    },
  } as unknown as ZiiplyOfferSearchResult;
}

export async function fetchKruokaOffers(
  query: string,
  _source: ZiiplyOfferSearchSourceConfig,
  options?: KruokaOfferProviderOptionsV10,
): Promise<ZiiplyOfferSearchResult[]> {
  try {
    const wantedStoreId = normalizeStoreId(options);

    debugLog("start", {
      query,
      wantedStoreId,
      storeName: options?.kStoreName ?? options?.storeName ?? null,
    });

    const htmlResponse = await fetch(KRUOKA_BROCHURE_URL, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fi-FI,fi;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15",
      },
      cache: "no-store",
    });

    debugLog("brochure html status", htmlResponse.status);

    if (!htmlResponse.ok) {
      debugLog("brochure html failed", await htmlResponse.text().then((t) => t.slice(0, 500)).catch(() => ""));
      return [];
    }

    const html = await htmlResponse.text();
    debugLog("brochure html length", html.length);

    const state = extractApplicationState(html);
    const { storeId, offers, storeIds } = findOffersFromState(state, wantedStoreId);
    const eans = collectEans(offers);

    debugLog("applicationState parsed", {
      selectedStoreId: storeId,
      availableStoreIds: storeIds,
      offerCount: offers.length,
      eanCount: eans.length,
      firstOffer: offers[0],
    });

    const productMap = await fetchProductMap(storeId, eans);
    debugLog("productMap parsed", {
      productCount: Object.keys(productMap).length,
      firstProductKey: Object.keys(productMap)[0] ?? null,
    });

    const storeName = options?.kStoreName ?? options?.storeName ?? null;

    const results = offers
      .filter((offer) => offerMatchesQuery(offer, productMap, query))
      .slice(0, 30)
      .map((offer) => toDebugResult(offer, productMap, storeId, storeName));

    debugLog("return results", {
      resultCount: results.length,
      firstResult: results[0] ?? null,
    });

    return results;
  } catch (error) {
    console.error("[kruokaProvider:debug] failed", error);
    return [];
  }
}

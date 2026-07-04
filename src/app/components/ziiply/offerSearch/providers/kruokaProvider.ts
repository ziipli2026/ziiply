// src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts
// ZIIPLY_KRUOKA_PROVIDER_DISABLED_V23_SAFE_NOOP
//
// K-provider väliaikaisesti pois päältä.
// Syy: K-Ruoan raw-offer/product-map palauttaa Vercel/server fetchillä 403,
// ja nykyinen K-provider tuottaa debug-kortteja / sotkee Göstan tuloksia.
// Tämä tiedosto pitää S-kauppojen Göstan ehjänä ja palauttaa K-haulle tyhjän listan.
// Ei muuta S-kauppojen provideria, routea, pageä, kategorioita tai OfferSearchCardia.

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

export async function fetchKruokaOffers(
  _query: string,
  _source: ZiiplyOfferSearchSourceConfig,
  _options?: KruokaOfferProviderOptionsV10,
): Promise<ZiiplyOfferSearchResult[]> {
  return [];
}

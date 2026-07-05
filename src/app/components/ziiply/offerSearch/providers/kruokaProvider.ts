// src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts
// ZIIPLY_KRUOKA_PROVIDER_V26_FORCED_PROVIDER_START_CARD
//
// Debug-testi 1: varmista, kutsuuko Ziiplyn tarjoushaku K-provideria lainkaan.
// Tämä versio EI hae K-Ruokaa eikä product-mapia.
// Se palauttaa aina yhden näkyvän debug-kortin heti funktion alussa.
//
// Tulkinta:
// - Jos [K DEBUG] provider käynnistyi näkyy Göstan tarjouksissa -> K-provideria kutsutaan.
// - Jos kortti ei näy -> K-provideria EI kutsuta / tulos suodatetaan pois reitillä tai UI:ssa.

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
  options?: KruokaOfferProviderOptionsV10,
): Promise<ZiiplyOfferSearchResult[]> {
  const storeId = String(options?.kStoreId ?? options?.storeId ?? "NO_STORE_ID");
  const storeName = String(options?.kStoreName ?? options?.storeName ?? "NO_STORE_NAME");

  console.log("[kruokaProvider:V26] provider called", {
    storeId,
    storeName,
    options,
  });

  return [
    {
      id: `k-debug-provider-started-${storeId}`,
      title: "[K DEBUG] provider käynnistyi",
      name: "[K DEBUG] provider käynnistyi",
      price: null,
      unitPrice: null,
      imageUrl: null,
      storeId,
      storeName,
      chain: "K-Ruoka",
      source: "kruoka",
      provider: "kruoka",
      url: "https://www.k-ruoka.fi/k-market/tarjouslehti",
      debug: {
        note: "V26 forced start card. If this is visible, K-provider is called by the app.",
        receivedOptions: options ?? null,
      },
    } as unknown as ZiiplyOfferSearchResult,
  ];
}

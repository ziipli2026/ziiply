// src/app/components/ziiply/offerSearch/types.ts
// ZIIPLY_OFFER_SEARCH_TYPES_V1

export type ZiiplyOfferSource = "kmarket" | "ksupermarket" | "skaupat";
export type ZiiplyOfferChain = "K" | "S";

export type ZiiplyOfferSearchResult = {
  id: string;
  source: ZiiplyOfferSource;
  chain: ZiiplyOfferChain;

  title: string;
  priceText?: string;
  unitPriceText?: string;
  validityText?: string;
  benefitText?: string;
  storeLabel?: string;

  imageUrl?: string;
  productUrl?: string;

  matchScore: number;

  rawText?: string;
};

export type ZiiplyOfferSearchSourceConfig = {
  id: ZiiplyOfferSource;
  chain: ZiiplyOfferChain;
  storeLabel: string;
  url: string;
};

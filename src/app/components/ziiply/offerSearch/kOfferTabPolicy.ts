export type KOfferTabRow = {
  title?: unknown;
  name?: unknown;
  productName?: unknown;
  brandName?: unknown;
  price?: unknown;
  offerPrice?: unknown;
  priceText?: unknown;
  packageSize?: unknown;
  ean?: unknown;
  campaignType?: unknown;
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " ja ")
    .replace(/[^a-z0-9åäö\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function productText(row: KOfferTabRow): string {
  return normalize([row.brandName, row.title || row.name || row.productName, row.packageSize].filter(Boolean).join(" "));
}

function priceNumber(row: KOfferTabRow): number | null {
  const raw = row.offerPrice ?? row.price ?? row.priceText;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const match = String(raw ?? "").replace(",", ".").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function kOfferOverlapKey(row: KOfferTabRow): string {
  const ean = String(row.ean ?? "").replace(/\D/g, "");
  const price = priceNumber(row);
  const identity = ean.length >= 8 ? "ean:" + ean : "text:" + productText(row);
  return identity + "|price:" + (price == null ? "" : price.toFixed(2));
}

/**
 * Tarjoukset is authoritative. A store campaign is suppressed only when it is
 * the same product at the same price as a current leaflet offer.
 */
export function removeCampaignCopiesOfLeaflet<T extends KOfferTabRow>(
  leafletOffers: readonly T[],
  campaigns: readonly T[],
): T[] {
  const offerKeys = new Set(leafletOffers.map(kOfferOverlapKey).filter(key => !key.startsWith("text:|")));
  return campaigns.filter(row => !offerKeys.has(kOfferOverlapKey(row)));
}

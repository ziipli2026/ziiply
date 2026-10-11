/**
 * Shared, conservative offer-image enrichment matching.
 * This module never modifies offers, prices or parser output.
 */
export type OfferImageCandidate = {
  ean?: string | null;
  productCode?: string | null;
  name?: string | null;
  brand?: string | null;
  packageSize?: string | null;
  imageUrl?: string | null;
  source?: string | null;
};
export type ImageMatch = { accepted: boolean; reason: string };
const clean = (v: unknown) => String(v ?? "").toLocaleLowerCase("fi-FI").normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const code = (v: unknown) => String(v ?? "").trim();
const validImage = (v: unknown) => {
  if (typeof v !== "string" || !v.trim()) return false;
  try {
    const url = new URL(v, "https://ziiply.fi");
    return (url.protocol === "https:" || (v.startsWith("/") && !v.startsWith("//"))) && !/\s/.test(v);
  } catch { return false; }
};
/** Only exact, independently verified product identifiers permit automatic reuse. */
export function matchOfferImage(offer: OfferImageCandidate, candidate: OfferImageCandidate): ImageMatch {
  if (!validImage(candidate.imageUrl)) return { accepted: false, reason: "missing-or-invalid-image" };
  const eanA = code(offer.ean), eanB = code(candidate.ean);
  const skuA = code(offer.productCode), skuB = code(candidate.productCode);
  if (eanA && eanB && eanA !== eanB) return { accepted: false, reason: "ean-conflict" };
  if (skuA && skuB && skuA !== skuB) return { accepted: false, reason: "product-code-conflict" };
  if (offer.brand && candidate.brand && clean(offer.brand) !== clean(candidate.brand)) return { accepted: false, reason: "brand-conflict" };
  if (offer.packageSize && candidate.packageSize && clean(offer.packageSize) !== clean(candidate.packageSize)) return { accepted: false, reason: "package-conflict" };
  if (offer.name && candidate.name && clean(offer.name) !== clean(candidate.name)) return { accepted: false, reason: "name-conflict" };
  if (eanA && eanB && /^\d{8,14}$/.test(eanA)) return { accepted: true, reason: "exact-ean" };
  // An EAN-bearing offer requires the same EAN even when SKU or name agrees.
  if (eanA && !eanB) return { accepted: false, reason: "candidate-ean-missing" };
  if (eanA && !/^\d{8,14}$/.test(eanA)) return { accepted: false, reason: "invalid-offer-ean" };
  if (skuA && skuB && offer.source && candidate.source && clean(offer.source) === clean(candidate.source))
    return { accepted: true, reason: "exact-source-product-code" };
  // EAN-less leaflets: accept only an exact named product with an equal
  // explicit pack size. Generic/multi-product titles are never safe matches.
  const nameA = clean(offer.name), nameB = clean(candidate.name);
  const sizeA = clean(offer.packageSize), sizeB = clean(candidate.packageSize);
  const ambiguous = /\b(tai|seka|sekä|valikoima|erilaiset|useita|lajitelma)\b/i;
  if (nameA && nameA === nameB && nameA.length >= 12 &&
      sizeA && sizeA === sizeB && !ambiguous.test(nameA) &&
      !/[–-]\s*\d+\s*(g|kg|ml|l)\b/i.test(String(offer.packageSize))) {
    return { accepted: true, reason: "exact-name-and-package" };
  }
  return { accepted: false, reason: "insufficient-identity" };
}
export function enrichOfferImage<T extends OfferImageCandidate>(offer: T, candidates: OfferImageCandidate[]): T {
  if (offer.imageUrl) return offer;
  const verified = candidates.filter(candidate => matchOfferImage(offer, candidate).accepted);
  const distinct = [...new Set(verified.map(candidate => candidate.imageUrl))];
  return distinct.length === 1 ? { ...offer, imageUrl: distinct[0] } : offer;
}

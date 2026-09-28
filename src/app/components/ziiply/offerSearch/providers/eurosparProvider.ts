import bundledFeed from "./eurospar-feed.json";
// EUROSPAR provider backed by the validated bundled Ruokasanomat feed.

export type EurosparOffer = {
  id: string;
  title: string;
  price: number;
  normalPrice?: number | null;
  normalPriceText?: string | null;
  normalPriceMin?: number | null;
  normalPriceMax?: number | null;
  unitPrice?: number | null;
  unitPriceText?: string | null;
  unitPriceMin?: number | null;
  unitPriceMax?: number | null;
  unit?: string | null;
  packageSize?: string | null;
  offerQuantity?: number | null;
  offerUnit?: string | null;
  priceBasis: "single-unit" | "multi-buy-total";
  singleEquivalentPrice: number;
  discountPercent?: number | null;
  restriction?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  category?: string | null;
  eans: string[];
  identityStatus?: string | null;
  chain: "EUROSPAR";
  storeType: "EUROSPAR";
  source: "EUROSPAR tarjouslehti";
  stores: string[];
  page?: number | null;
};

type FeedOffer = Record<string, unknown>;
type Feed = {
  schemaVersion?: number;
  healthy?: boolean;
  validity?: { from?: string; to?: string };
  offers?: FeedOffer[];
};

export const EUROSPAR_PROVIDER_VERSION = 4;

const norm = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase("fi-FI");
const num = (value: unknown) => {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const iso = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) ? String(value) : null;
const range = (value: unknown) => {
  if (value == null || value === "") return { text: null, min: null, max: null };
  const text = String(value).trim();
  const parts = text.split(/\s*[-–]\s*/).map(num);
  if (parts.length === 1 && parts[0] !== null) return { text, min: parts[0], max: parts[0] };
  if (parts.length === 2 && parts.every((part) => part !== null)) {
    return { text, min: parts[0], max: parts[1] };
  }
  return { text, min: null, max: null };
};

export function adaptEurosparFeed(feed: Feed, storeName: string, date: string): EurosparOffer[] {
  if (feed.schemaVersion !== 1 || !feed.healthy || !Array.isArray(feed.offers)) return [];
  const from = iso(feed.validity?.from);
  const to = iso(feed.validity?.to);
  const today = iso(date);
  if (!from || !to || !today || today < from || today > to) return [];

  const wanted = norm(storeName);
  if (!wanted) return [];

  return feed.offers.flatMap((raw) => {
    const stores = Array.isArray(raw.stores) ? raw.stores.map(String) : [];
    if (!stores.some((store) => norm(store) === wanted)) return [];

    const price = num(raw.offerPrice);
    const multi = raw.multiUnit && typeof raw.multiUnit === "object"
      ? raw.multiUnit as { quantity?: unknown; unit?: unknown }
      : null;
    const quantity = Number.isInteger(multi?.quantity) ? Number(multi?.quantity) : null;
    const priceBasis = raw.priceBasis;
    if (!(price && price > 0) || (priceBasis !== "single-unit" && priceBasis !== "multi-buy-total")) return [];
    if (priceBasis === "multi-buy-total" && (!quantity || quantity < 2)) return [];

    const normalRange = range(raw.normalPrice);
    const unitRange = range(raw.unitPrice);

    return [{
      id: String(raw.id ?? ""),
      title: String(raw.name ?? ""),
      price,
      normalPrice: normalRange.min === normalRange.max ? normalRange.min : null,
      normalPriceText: normalRange.text,
      normalPriceMin: normalRange.min,
      normalPriceMax: normalRange.max,
      unitPrice: unitRange.min === unitRange.max ? unitRange.min : null,
      unitPriceText: unitRange.text,
      unitPriceMin: unitRange.min,
      unitPriceMax: unitRange.max,
      unit: raw.unitPriceUnit ? String(raw.unitPriceUnit) : null,
      packageSize: raw.size ? String(raw.size) : null,
      offerQuantity: quantity,
      offerUnit: multi?.unit ? String(multi.unit) : null,
      priceBasis,
      singleEquivalentPrice: priceBasis === "multi-buy-total"
        ? Number((price / Number(quantity)).toFixed(4))
        : price,
      discountPercent: typeof raw.discountPercent === "number" ? raw.discountPercent : null,
      restriction: raw.restriction ? String(raw.restriction) : null,
      validFrom: raw.validFrom ? String(raw.validFrom) : from,
      validTo: raw.validTo ? String(raw.validTo) : to,
      category: raw.category ? String(raw.category) : "Muut",
      eans: Array.isArray(raw.eans) ? raw.eans.map(String) : [],
      identityStatus: raw.identityStatus ? String(raw.identityStatus) : null,
      chain: "EUROSPAR",
      storeType: "EUROSPAR",
      source: "EUROSPAR tarjouslehti",
      stores,
      page: typeof raw.page === "number" ? raw.page : null,
    }];
  }).filter((offer) => offer.id && offer.title);
}

export async function fetchEurosparOffers(storeName: string, date: string): Promise<EurosparOffer[]> {
  return adaptEurosparFeed(bundledFeed as Feed, storeName, date);
}

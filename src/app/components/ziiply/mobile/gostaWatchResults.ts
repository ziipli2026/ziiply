import { matchesGostaWatch } from "./gostaWatchMatch";

const snapshotKey = "ziiply-gosta-watch-results-v1";
const snapshotVersion = 5;
export const watchResultsChanged = "ziiply-gosta-watch-results-changed";

export type WatchOffer = {
  query: string;
  queries?: string[];
  title: string;
  price: string;
  priceText?: string;
  store: string;
  source: string;
  chain?: string;
  packageSize?: string;
  imageUrl?: string;
  validUntil?: string;
  validFrom?: string;
  ean?: string;
  nutrition?: unknown;
  bundleQuantity?: number;
  bundleTotalPrice?: number;
  comparisonPrice?: string;
  priceBasis?: string;
};

export function mapWatchOffers(offers: unknown[], terms: string[]): WatchOffer[] {
  return offers.filter((offer): offer is Record<string, unknown> =>
    Boolean(offer && typeof offer === "object")).map(offer => {
    const queries = Array.isArray(offer.watchQueries) && offer.watchQueries.length
      ? offer.watchQueries.map(String)
      : terms.filter(query => matchesGostaWatch(query, offer));
    const source = (offer.__sourceOfferSearchResult || {}) as Record<string, unknown>;
    const ean = [offer.ean, source.ean].map(value => String(value ?? "").trim()).find(value => /^\d{8,14}$/.test(value));
    return {
      ean,
      nutrition: offer.nutrition ?? (offer.product as Record<string, unknown> | undefined)?.nutrition ?? source.nutrition,
      bundleQuantity: Number(offer.bundleQuantity || source.multiBuyQuantity || source.offerQuantity) || undefined,
      bundleTotalPrice: Number(offer.bundleTotalPrice || source.multiBuyTotalPrice || offer.offerPrice || offer.price) || undefined,
      validFrom: String(offer.validFrom || source.validFrom || ""),
      query: queries[0] || "",
      queries,
      title: String(offer.title || offer.name || offer.productName || "Tarjous"),
      price: String(offer.offerPrice ?? offer.price ?? ""),
      priceText: String(offer.priceText || ""),
      store: String(offer.storeName || offer.chain || ""),
      source: String(offer.source || offer.sourceType || offer.chain || ""),
      chain: String(offer.chain || ""),
      packageSize: String(offer.packageSize || offer.packSize || offer.size || offer.quantityText || ""),
      imageUrl: String(offer.imageUrl || offer.pictureUrl || offer.image || ""),
      validUntil: String(offer.validUntil || source.validUntil || source.validTo || ""),
      comparisonPrice: String(offer.comparisonPriceText || (typeof offer.unitPrice === "string" ? offer.unitPrice : "") || ""),
      priceBasis: String(offer.priceBasis || ""),
    };
  });
}

export function readWatchResults() {
  try {
    const snapshot = JSON.parse(window.localStorage.getItem(snapshotKey) || "null");
    if (!snapshot || !Array.isArray(snapshot.offers)) return null;
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Helsinki" }).format(new Date());
    const offers = (snapshot.offers as WatchOffer[]).filter(offer => {
      const date = offer.validUntil?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
      return !date || date >= today;
    });
    return { key: String(snapshot.key || ""), offers, at: Number(snapshot.at) || 0,
      current: snapshot.version === snapshotVersion, partial: Boolean(snapshot.partial) };
  } catch {
    return null;
  }
}

export function saveWatchResults(key: string, offers: WatchOffer[], partial: boolean, startedAt: number) {
  const previous = readWatchResults();
  if (previous?.key === key && previous.current && previous.at > startedAt) return;
  if (partial && (!offers.length || (previous?.offers.length && !previous.partial && previous.current))) return;
  try {
    window.localStorage.setItem(snapshotKey, JSON.stringify({ key, offers, partial, version: snapshotVersion, at: Date.now() }));
    window.dispatchEvent(new Event(watchResultsChanged));
  } catch {}
}

export function watchPackageSize(offer: WatchOffer): string {
  if (offer.packageSize && /\d/.test(offer.packageSize)) return offer.packageSize;
  return offer.title.match(/\b(?:(?:n\.|noin)\s*)?(?:\d+\s*[x×]\s*)?\d+(?:[,.]\d+)?\s*(?:kg|g|ml|cl|dl|l|kpl|pkt|pss)\b/i)?.[0] || "";
}

export function watchCartPrice(offer: WatchOffer) {
  const packageSize = watchPackageSize(offer);
  const quotedRate = [offer.price, offer.priceText].map(text => text?.match(/^(\d+(?:[,.]\d+)?)\s*(?:€|eur)\s*\/\s*kg\b/i)).find(Boolean);
  const weighted = /^per[-_]kg$/i.test(offer.priceBasis || "") || Boolean(quotedRate);
  const printedBundle = [offer.price, offer.priceText].map(text => text?.match(/^(\d+(?:[,.]\d+)?)\s*€\s*\/\s*(\d+)\s*kpl\b/i)).find(Boolean);
  const quantity = Number(printedBundle?.[2] || offer.bundleQuantity);
  const bundleQuantity = !weighted && Number.isInteger(quantity) && quantity > 1 ? quantity : 1;
  const amount = quotedRate?.[1] || printedBundle?.[1] || (bundleQuantity > 1 ? String(offer.bundleTotalPrice ?? offer.price) : offer.price);
  const price = Number(amount.trim().replace(/\s*€$/, "").replace(",", "."));
  if (!Number.isFinite(price) || price <= 0) return null;

  const weight = weighted ? packageSize.match(/^(?:(?:n\.|noin)\s*)?(\d+(?:[,.]\d+)?)\s*(kg|g)$/i) : null;
  const estimatedWeightKg = weight ? Number(weight[1].replace(",", ".")) / (weight[2].toLowerCase() === "g" ? 1000 : 1) : undefined;
  return { price, weighted, estimatedWeightKg, bundleQuantity };
}

export function watchValidity(offer: WatchOffer) {
  const date = (value?: string) => {
    const iso = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const local = value?.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})?$/);
    if (!iso && !local) return null;
    return iso ? { year: iso[1], month: +iso[2], day: +iso[3] }
      : { year: local?.[3], month: Number(local?.[2]), day: Number(local?.[1]) };
  };
  const from = date(offer.validFrom);
  const until = date(offer.validUntil);
  const short = (d: NonNullable<ReturnType<typeof date>>) => `${d.day}.${d.month}.`;
  if (from && until) {
    if (from.year && until.year && from.year !== until.year) return `Voimassa ${short(from)}${from.year}–${short(until)}${until.year}`;
    if (short(from) !== short(until)) return `Voimassa ${from.month === until.month ? from.day + "." : short(from)}–${short(until)}`;
  }
  if (until) return `Voimassa ${short(until)}${until.year || ""} saakka`;
  return from ? `Voimassa alkaen ${short(from)}` : "";
}

import { matchesGostaWatch } from "./gostaWatchMatch";

const snapshotKey = "ziiply-gosta-watch-results-v1";
const snapshotVersion = 3;
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
  comparisonPrice?: string;
  priceBasis?: string;
};

export function mapWatchOffers(offers: unknown[], terms: string[]): WatchOffer[] {
  return offers.filter((offer): offer is Record<string, unknown> =>
    Boolean(offer && typeof offer === "object")).map(offer => {
    const queries = Array.isArray(offer.watchQueries) && offer.watchQueries.length
      ? offer.watchQueries.map(String)
      : terms.filter(query => matchesGostaWatch(query, offer));
    return {
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
      validUntil: String(offer.validUntil || ""),
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
  const price = Number((quotedRate?.[1] || offer.price).trim().replace(/\s*€$/, "").replace(",", "."));
  if (!Number.isFinite(price) || price <= 0) return null;

  const weight = weighted ? packageSize.match(/^(?:(?:n\.|noin)\s*)?(\d+(?:[,.]\d+)?)\s*(kg|g)$/i) : null;
  const estimatedWeightKg = weight ? Number(weight[1].replace(",", ".")) / (weight[2].toLowerCase() === "g" ? 1000 : 1) : undefined;
  return { price, weighted, estimatedWeightKg };
}

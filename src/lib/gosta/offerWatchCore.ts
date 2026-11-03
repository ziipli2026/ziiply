/**
 * Pure server-side Gösta watch matching. Only normalized, approved and CURRENT
 * publication rows are supplied by the database worker (never general product search).
 */
export type WatchOffer = Record<string, unknown>;
export type Watch = { id: string; query: string; store_scope: unknown };
export const finnishDate = (date = new Date()) => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit",
}).format(date);
export function isFinnishWatchSlot(date = new Date()) {
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Helsinki", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(date);
  return ["07:00", "13:00", "19:00"].includes(time);
}
export function normalizeWatchText(input: unknown) {
  return String(input ?? "").normalize("NFKC").toLocaleLowerCase("fi")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim()
    .replace(/\s+/g, " ");
}
export function offerTitle(offer: WatchOffer) {
  return String(offer.title || offer.productName || offer.name || "").trim();
}
export function matchesWatch(offer: WatchOffer, query: string) {
  const words = normalizeWatchText(query).split(" ").filter(w => w.length > 1);
  if (!words.length) return false;
  const title = normalizeWatchText(offerTitle(offer));
  const text = normalizeWatchText([title, offer.brandName || "", offer.category || ""].join(" "));
  return words.every(word => text.split(" ").some(token => token === word || (word.length >= 4 && token.startsWith(word))));
}
export function priceOf(offer: WatchOffer) {
  if (offer.hasConcretePrice === false) return null;
  const value = offer.offerPrice ?? offer.price;
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".")) : NaN;
  return Number.isFinite(number) && number > 0 ? number : null;
}
export function currentOffer(offer: WatchOffer) {
  return offer.resolutionSanity !== "fail" && !offer.isInvalid && priceOf(offer) !== null && offerTitle(offer).length >= 3;
}
export function normalizeScope(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 30) : [];
}
export function pickMatches(offers: Array<WatchOffer & { publicationChain: string; publicationId: string }>, watch: Watch, max = 100) {
  const scope = normalizeScope(watch.store_scope).map(normalizeWatchText);
  const selected = offers.filter(offer => {
    const chain = normalizeWatchText(offer.publicationChain);
    const shop = normalizeWatchText(offer.storeName || offer.shopName || offer.storeLabel || "");
    return (scope.length === 0 || scope.some(item => item === chain || item === shop)) && currentOffer(offer) && matchesWatch(offer, watch.query);
  }).map(offer => ({
    id: String(offer.id || offer.offerId || [offer.publicationChain, offer.publicationId, offerTitle(offer)].join(":")),
    title: offerTitle(offer),
    price: priceOf(offer),
    chain: offer.publicationChain,
    store: String(offer.storeName || offer.shopName || offer.storeLabel || ""),
    imageUrl: String(offer.imageUrl || offer.image || ""),
    sourceUrl: String(offer.sourceUrl || ""),
    publicationId: offer.publicationId,
  }));
  const seen = new Set<string>();
  return selected.filter(offer => {
    const key = [offer.chain, offer.store, normalizeWatchText(offer.title), offer.price].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)).slice(0, max);
}

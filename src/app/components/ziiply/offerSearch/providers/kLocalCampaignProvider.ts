import type { ZiiplyOfferSearchResult } from "../types";

/**
 * Separately licensed/verified K-local campaign feed. Do not reclassify Tjek
 * brochure offers as campaigns. A missing feed must remain visibly empty.
 * Feed JSON: { campaigns: [{ id, title, price, storeId, storeName,
 *   validFrom, validUntil, imageUrl?, category? }] }.
 */
type Campaign = { id: string; title: string; price: number; storeId: string;
  storeName: string; validFrom: string; validUntil: string; imageUrl?: string; category?: string };
export async function fetchKLocalCampaignOffers(
  query: string, selectedStores: Array<{ id: string; name: string }>,
): Promise<ZiiplyOfferSearchResult[]> {
  const endpoint = process.env.K_LOCAL_CAMPAIGN_FEED_URL;
  if (!endpoint || !selectedStores.length) return [];
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid K campaign feed URL");
  const response = await fetch(url.toString(), { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`K campaign feed HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { campaigns?: unknown }).campaigns)) {
    throw new Error("K campaign feed: invalid campaigns array");
  }
  const now = Date.now();
  const normalizedQuery = query.trim().toLocaleLowerCase("fi");
  const all = normalizedQuery === "__ziiply_all_offers__" || !normalizedQuery;
  const stores = new Set(selectedStores.map(s => `${s.id}|${s.name.trim().toLocaleLowerCase("fi")}`));
  return (payload as { campaigns: unknown[] }).campaigns.flatMap((raw): ZiiplyOfferSearchResult[] => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Partial<Campaign>;
    if (typeof item.id !== "string" || typeof item.title !== "string" ||
      typeof item.storeId !== "string" || typeof item.storeName !== "string" ||
      typeof item.price !== "number" || !Number.isFinite(item.price) || item.price <= 0 ||
      typeof item.validFrom !== "string" || typeof item.validUntil !== "string") return [];
    if (!stores.has(`${item.storeId}|${item.storeName.trim().toLocaleLowerCase("fi")}`)) return [];
    const start = Date.parse(item.validFrom), end = Date.parse(item.validUntil);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > now || end < now) return [];
    if (!all && !item.title.toLocaleLowerCase("fi").includes(normalizedQuery)) return [];
    return [{
      id: `k-local-campaign-${item.storeId}-${item.id}`, title: item.title,
      name: item.title, productName: item.title, price: item.price,
      priceText: `${item.price.toFixed(2).replace(".", ",")} €`,
      storeId: item.storeId, storeName: item.storeName, storeLabel: item.storeName,
      imageUrl: item.imageUrl ?? null, category: item.category ?? "",
      validFrom: item.validFrom, validUntil: item.validUntil,
      campaignType: "campaign", source: "k-local-campaign-feed",
    } as unknown as ZiiplyOfferSearchResult];
  });
}

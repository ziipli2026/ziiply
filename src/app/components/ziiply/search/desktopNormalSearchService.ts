/**
 * Shared endpoint adapter for desktop Justiina.
 * Lidl is discovery-only; do not manufacture a store price or EAN.
 * Tokmanni/Spar results are the online assortment, not complete local inventory.
 */
export type DesktopNormalSearchStore = {
  id?: string | number;
  externalId?: string | number;
  storeKey?: string;
  name?: string;
  city?: string;
  address?: string;
  chain?: string;
};
export type DesktopNormalSearchChain = "S" | "K" | "LIDL" | "TOKMANNI" | "EUROSPAR";

export async function fetchDesktopNormalProducts(
  query: string,
  chain: DesktopNormalSearchChain,
  store: DesktopNormalSearchStore,
): Promise<any[]> {
  const term = query.trim();
  if (!term) return [];
  const params = new URLSearchParams({ search: term });
  const storeId = String(store.externalId ?? store.id ?? "");
  let url: string;
  switch (chain) {
    case "S":
      params.set("store", storeId);
      params.set("storeName", String(store.name ?? ""));
      url = "/api/s-products";
      break;
    case "K":
      params.set("store", storeId);
      url = "/api/k-products";
      break;
    case "LIDL":
      params.set("storeName", String(store.name ?? ""));
      params.set("city", String(store.city ?? ""));
      if (store.address) params.set("address", store.address);
      params.set("mode", "research");
      url = "/api/lidl/products";
      break;
    case "TOKMANNI":
    case "EUROSPAR":
      params.set("intent", term);
      url = "/api/tokmanni/products";
      break;
  }
  const response = await fetch(`${url}?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Normal search HTTP ${response.status}`);
  const data = await response.json();
  return Array.isArray(data?.products) ? data.products :
    Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
}

/** Convert API result shapes into the desktop result contract without inventing prices. */
export function normalizeDesktopNormalResults(
  items: any[],
  chain: DesktopNormalSearchChain,
  store: DesktopNormalSearchStore,
  limit = 8,
) {
  return items.slice(0, limit).map((item) => {
    const candidate = item?.price ?? item?.storeItems?.[0]?.price ?? item?.storeItem?.price;
    const numeric = typeof candidate === "number" ? candidate :
      Number(String(candidate ?? "").replace(",", "."));
    const price = Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
    return {
      ...item,
      __chain: chain,
      __store: store.name || chain,
      __price: chain === "LIDL" ? 0 : price,
      __priceVerified: chain !== "LIDL" && price > 0,
      __catalogOnly: chain === "LIDL" || chain === "TOKMANNI" || chain === "EUROSPAR",
    };
  });
}

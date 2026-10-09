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
    const selectedStoreId = String(store.externalId ?? store.id ?? "").trim();
    const storeRows = Array.isArray(item?.storeItems) ? item.storeItems : [];
    const matchingStoreRows = storeRows.filter((row: any) =>
      String(row?.externalId ?? row?.storeId ?? row?.store?.externalId ?? row?.store?.id ?? "").trim() === selectedStoreId
    );
    // Do not borrow another store's price from an unscoped multi-store array.
    const storeRow = matchingStoreRows[0] ?? (storeRows.length === 1 &&
      !String(storeRows[0]?.externalId ?? storeRows[0]?.storeId ?? storeRows[0]?.store?.externalId ?? storeRows[0]?.store?.id ?? "").trim()
      ? storeRows[0] : undefined);
    const singleStoreRow = item?.storeItem;
    const singleStoreRowId = String(singleStoreRow?.externalId ?? singleStoreRow?.storeId ??
      singleStoreRow?.store?.externalId ?? singleStoreRow?.store?.id ?? "").trim();
    const scopedSinglePrice = !singleStoreRowId || singleStoreRowId === selectedStoreId
      ? singleStoreRow?.price : undefined;
    const candidate = item?.price ?? storeRow?.price ?? scopedSinglePrice;
    const numeric = typeof candidate === "number" ? candidate :
      Number(String(candidate ?? "").replace(",", "."));
    const price = Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
    const localPriceVerified = (chain === "S" || chain === "K") && Boolean(String(store.externalId ?? store.id ?? "").trim()) && price > 0;
    return {
      ...item,
      __chain: chain,
      __store: store.name || chain,
      __price: chain === "LIDL" ? 0 : price,
      __priceVerified: localPriceVerified,
      __storeId: String(store.externalId ?? store.id ?? ""),
      __catalogOnly: chain === "LIDL" || chain === "TOKMANNI" || chain === "EUROSPAR",
    };
  });
}

/** Conservative exact-product refresh. Never substitute a similarly named product. */
export async function refreshDesktopCartProductPrice(
  item: Record<string, any>,
  chain: DesktopNormalSearchChain,
  store: DesktopNormalSearchStore,
): Promise<number | null> {
  if (chain === "LIDL" || chain === "TOKMANNI" || chain === "EUROSPAR") return null;
  if (!String(store.externalId ?? store.id ?? "").trim()) return null;
  const ean = String(item.ean ?? item.barcode ?? item.product?.ean ?? item.product?.barcode ?? "").trim();
  const id = String(item.id ?? item.product?.id ?? "").trim();
  if (!ean && !id) return null;
  const term = String(item.title ?? item.name ?? item.productName ?? item.product?.name ?? item.product?.title ?? "").trim();
  if (!term && !ean) return null;
  const matchesIdentity = (p: any) => ean
    ? String(p.ean ?? p.barcode ?? p.product?.ean ?? p.product?.barcode ?? "").trim() === ean
    : String(p.id ?? p.product?.id ?? "").trim() === id;
  const byName = term ? await fetchDesktopNormalProducts(term, chain, store) : [];
  let exact = byName.filter(matchesIdentity);
  if (ean && exact.length === 0) {
    const byEan = await fetchDesktopNormalProducts(ean, chain, store);
    exact = byEan.filter(matchesIdentity);
  }
  if (exact.length !== 1) return null;
  const [verified] = normalizeDesktopNormalResults(exact, chain, store, 1);
  return verified.__priceVerified === true && verified.__catalogOnly !== true ? verified.__price : null;
}

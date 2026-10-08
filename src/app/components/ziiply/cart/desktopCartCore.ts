/** UI-independent cart helpers. Offers and normal-price products keep their source. */
export type DesktopCartSource = "gosta" | "justiina";
export type DesktopCartItem = Record<string, any> & { quantity: number; source: DesktopCartSource };
export function desktopCartIdentity(item: Record<string, any>) {
  const ean = String(item.ean ?? "").trim();
  if (ean) return "ean:" + ean;
  const id = String(item.id ?? item.offerId ?? "").trim();
  if (id) return "id:" + id;
  return "name:" + String(item.title ?? item.name ?? item.productName ?? "").trim().toLowerCase();
}
/** Keep the same EAN from different selected shops as separate cart rows. */
export function desktopCartSameStore(a: Record<string, any>, b: Record<string, any>) {
  const aChain = String(a.__chain ?? a.chain ?? "").toUpperCase();
  const bChain = String(b.__chain ?? b.chain ?? "").toUpperCase();
  const aStore = String(a.__storeId ?? a.storeId ?? "").trim();
  const bStore = String(b.__storeId ?? b.storeId ?? "").trim();
  return aChain === bChain && aStore === bStore;
}
export function appendDesktopCartItem(
  items: DesktopCartItem[], product: Record<string, any>, source: DesktopCartSource,
): DesktopCartItem[] {
  const key = desktopCartIdentity(product);
  if (key === "name:") return items;
  const index = items.findIndex(item => desktopCartIdentity(item) === key && item.source === source && desktopCartSameStore(item, product));
  if (index < 0) return [...items, { ...product, source, quantity: 1 }];
  return items.map((item, i) => i === index ? { ...item, quantity: item.quantity + 1 } : item);
}
export function changeDesktopCartItemQuantity(items: DesktopCartItem[], product: Record<string, any>, delta: number) {
  const key = desktopCartIdentity(product);
  const source = product.source;
  return items.flatMap(item => {
    if (desktopCartIdentity(item) !== key || (source && item.source !== source) || !desktopCartSameStore(item, product)) return [item];
    const quantity = item.quantity + delta;
    return quantity > 0 ? [{ ...item, quantity }] : [];
  });
}

/** Never treat a persisted price as current after reloading or changing store. */
export function restoreDesktopCartWithoutStalePrices(raw: unknown): DesktopCartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is Record<string, any> =>
    Boolean(item) && typeof item === "object" && desktopCartIdentity(item) !== "name:"
  ).map(item => ({
    ...item,
    source: item.source === "justiina" ? "justiina" as const : "gosta" as const,
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    price: null,
    __price: null,
    __priceVerified: false,
    __needsPriceRefresh: true,
  }));
}

/** Only a matching chain AND exact selected store can authorize a stored price. */
export function invalidateDesktopCartPricesForStoreSelection(
  items: DesktopCartItem[],
  selectedStoreKeys: ReadonlySet<string>,
): DesktopCartItem[] {
  return items.map(item => {
    const chain = String(item.__chain ?? item.chain ?? "").toUpperCase();
    const storeId = String(item.__storeId ?? item.storeId ?? "").trim();
    const verified = item.__priceVerified === true && Boolean(chain && storeId);
    if (verified && selectedStoreKeys.has(chain + ":" + storeId)) return item;
    if (item.price == null && item.__price == null && item.__needsPriceRefresh && (!storeId || selectedStoreKeys.has(chain + ":" + storeId))) return item;
    return { ...item, price: null, __price: null, __priceVerified: false, __needsPriceRefresh: true };
  });
}

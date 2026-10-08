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
export function appendDesktopCartItem(
  items: DesktopCartItem[], product: Record<string, any>, source: DesktopCartSource,
): DesktopCartItem[] {
  const key = desktopCartIdentity(product);
  if (key === "name:") return items;
  const index = items.findIndex(item => desktopCartIdentity(item) === key && item.source === source);
  if (index < 0) return [...items, { ...product, source, quantity: 1 }];
  return items.map((item, i) => i === index ? { ...item, quantity: item.quantity + 1 } : item);
}
export function changeDesktopCartItemQuantity(items: DesktopCartItem[], product: Record<string, any>, delta: number) {
  const key = desktopCartIdentity(product);
  const source = product.source;
  return items.flatMap(item => {
    if (desktopCartIdentity(item) !== key || (source && item.source !== source)) return [item];
    const quantity = item.quantity + delta;
    return quantity > 0 ? [{ ...item, quantity }] : [];
  });
}

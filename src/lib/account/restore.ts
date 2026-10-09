import type { GuestSnapshot } from "./guest";
export type CartSurface = "mobile" | "desktop";
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export const RESTORE_BACKUP_KEY = "ziiply-account-restore-backup-v1";
export function prepareCartRestore(snapshot: GuestSnapshot, source: CartSurface, target: CartSurface) {
  const data = snapshot.values[source === "mobile" ? "ziiply-cart-v1" : "ziiply-desktop-current-cart-v1"];
  const raw = Array.isArray(data) ? data : data && typeof data === "object" ? (data as {items?: unknown}).items : undefined;
  if (!Array.isArray(raw) || raw.length > 1000) throw new Error("Valittua koria ei ole tai sen muoto on virheellinen.");
  if (target === "mobile" && raw.length > 8) throw new Error("Mobiilikoriin mahtuu tässä versiossa enintään 8 tuotetta. Koria ei palautettu.");
  const items = raw.map(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Virheellinen tuote.");
    const item = value as Record<string, unknown>;
    const name = item.name || item.title || item.productName;
    const id = typeof item.id === "string" && item.id ? item.id : source === "desktop" ? String(item.ean || item.offerId || (typeof name === "string" && name.trim() ? "memo:" + name.trim().toLowerCase() : "")) : "";
    if (!id || typeof name !== "string" || !name.trim()) throw new Error("Tuotteen tunniste tai nimi puuttuu.");
    const quantity = item.quantity === undefined ? 1 : item.quantity;
    if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0 || quantity > 10000) throw new Error("Virheellinen tuotemäärä.");
    const weight = !!item.ziiplyWeightLabel || !!(item.product as Record<string, unknown> | null)?.ziiplyWeightLabel || id.startsWith("weight-");
    const product = item.product && typeof item.product === "object" && !Array.isArray(item.product) ? item.product as Record<string, unknown> : null;
    const mobileSource = item.source === "offer" ? "offer" : ["search","justiina","normal"].includes(String(item.source)) ? "search" : "manual";
    return {...item, id, name, title:name, quantity, ...(target === "mobile" ? {source:mobileSource,image:item.image || item.pictureUrl || item.imageUrl} : {}), price:target === "mobile" ? 0 : null, unitPrice:null, __price:null,
      ...(product ? {product:{...product,price:0,unitPrice:null,__price:null}} : {}),
      ziiplyPriceFetchedAt:0, ziiplyPriceStoreName:"", ziiplyPriceRefreshPending:!weight, priceNeedsRefresh:!weight};
  });
  return {items, serialized:JSON.stringify(target === "mobile" ? {version:2,savedAt:0,items} : items)};
}
export function restoreActiveCart(store: Store, target: CartSurface, serialized: string, expected: string | null) {
  const key = target === "mobile" ? "ziiply-cart-v1" : "ziiply-desktop-current-cart-v1";
  if (store.getItem(key) !== expected) throw new Error("Paikallinen kori muuttui esikatselun jälkeen. Avaa esikatselu uudelleen.");
  // Backup must succeed before replacing anything. Backup is device-local, never uploaded.
  const related = target === "mobile" ? ["ziiply-comparison-snapshot-v1", "ziiply-shopping-checks-v1"] : [];
  const previous = Object.fromEntries([key,...related].map(name=>[name,store.getItem(name)]));
  store.setItem(RESTORE_BACKUP_KEY, JSON.stringify({version:1,target,previous,savedAt:Date.now()}));
  try {
    for (const name of related) store.removeItem(name);
    store.setItem(key,serialized);
  } catch {
    for (const [name,value] of Object.entries(previous)) {
      try { if(value === null)store.removeItem(name);else store.setItem(name,value); } catch { /* backup remains available */ }
    }
    throw new Error("Palautus epäonnistui. Vanha sisältö säilytettiin varmuuskopiossa.");
  }
}

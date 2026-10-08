/** Store identity adapter for desktop Gösta. UI-independent and side-effect free. */
export type DesktopOfferChain = "S" | "K" | "LIDL" | "TOKMANNI" | "EUROSPAR";
export type DesktopOfferStore = {
  id?: string | number; externalId?: string | number; storeKey?: string;
  name?: string; chain?: string;
};
export function desktopOfferContext(chain: DesktopOfferChain, store: DesktopOfferStore | null | undefined) {
  const id = String(store?.externalId ?? store?.id ?? "").trim();
  const name = String(store?.name ?? "").trim();
  switch (chain) {
    case "S": return { sStoreId: id, sStoreName: name };
    case "K": return { kStoreId: id, kStoreName: name };
    case "LIDL": return { lidlStoreKey: String(store?.storeKey ?? id), lidlStoreName: name || "Lidl" };
    case "TOKMANNI": return { tokmanniStoreId: id, tokmanniStoreName: name || "Tokmanni" };
    case "EUROSPAR": return { eurosparStoreId: id, eurosparStoreName: name || "Eurospar", eurosparStoreChain: store?.chain };
  }
}
export function desktopOfferCacheKey(chain: DesktopOfferChain, store: DesktopOfferStore | null | undefined) {
  const context = desktopOfferContext(chain, store);
  return JSON.stringify([chain, context]);
}

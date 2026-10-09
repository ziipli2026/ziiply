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

/** Identify the offer feed from a selected store without guessing from its display name. */
export function desktopOfferChainFromStoreKind(kind: string, store: DesktopOfferStore | null | undefined): DesktopOfferChain {
  if (kind === "sHyper" || kind === "sLocal") return "S";
  if (kind === "kHyper" || kind === "kLocal") return "K";
  if (kind === "lidl") return "LIDL";
  return String(store?.chain || "").toUpperCase() === "EUROSPAR" ? "EUROSPAR" : "TOKMANNI";
}

/** Do not reuse cached offers from a different store or a different chain. */
export function desktopOfferCacheMatchesStore(
  cachedKey: string,
  chain: DesktopOfferChain,
  store: DesktopOfferStore | null | undefined,
): boolean {
  return cachedKey === desktopOfferCacheKey(chain, store);
}

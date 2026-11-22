import { classifyTokmanniOfferCategory } from "./tokmanniOfferCategory";

// Shared product-type fallback: never use Lidl landing URLs as taxonomy evidence.
// Unresolved offers are omitted from grocery offers, not relabeled "Muut".
export function resolveLidlGroceryCategories<T extends Record<string, any>>(offers: T[]): T[] {
  const nonGrocery = new Set(["Koti & vapaa-aika", "Lemmikit"]);
  return offers.flatMap(offer => {
    const title = String(offer.title || offer.name || offer.productName || "").trim();
    const verified = offer.neonCategoryMatch === "ean" && String(offer.neonDisplayCategory || "") !== "";
    const inferred = classifyTokmanniOfferCategory(title);
    const category = verified ? String(offer.neonDisplayCategory) : inferred !== "Muut" ? inferred : "";
    if (!category || category === "Muut" || nonGrocery.has(category)) return [];
    const source = offer.__sourceOfferSearchResult;
    return [{
      ...offer,
      category, categoryPath: category, mainCategory: category,
      categoryResolution: verified ? "verified-ean" : "product-type",
      ...(source && typeof source === "object" && !Array.isArray(source)
        ? { __sourceOfferSearchResult: { ...source, category, categoryPath: category, mainCategory: category } }
        : {}),
    } as T];
  });
}

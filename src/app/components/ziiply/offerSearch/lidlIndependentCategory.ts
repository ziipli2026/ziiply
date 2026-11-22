import { classifySharedProductCategory, isEverydayOfferCategory } from "./sharedProductCategory";

// Chain-neutral product taxonomy: Neon is optional, not a prerequisite.
// Keep unresolved offers in the result set for diagnostics and later enrichment;
// do not fabricate a "Muut" category or silently delete valid grocery offers.
export function resolveLidlGroceryCategories<T extends Record<string, any>>(offers: T[]): T[] {
  return offers.map(offer => {
    const title = String(offer.title || offer.name || offer.productName || "").trim();
    const verified = offer.neonCategoryMatch === "ean" && Boolean(offer.neonDisplayCategory);
    const inferred = classifySharedProductCategory(title);
    const category = inferred || (verified ? String(offer.neonDisplayCategory) : "");
    const displayCategory = category && isEverydayOfferCategory(category) ? category : "";
    const source = offer.__sourceOfferSearchResult;
    const resolution = inferred ? "shared-product-form" : verified ? "verified-ean" : "unresolved";
    return {
      ...offer,
      category: displayCategory,
      categoryPath: displayCategory,
      mainCategory: displayCategory,
      categoryResolution: resolution,
      groceryEligible: category ? isEverydayOfferCategory(category) : null,
      ...(source && typeof source === "object" && !Array.isArray(source)
        ? { __sourceOfferSearchResult: { ...source, category: displayCategory, categoryPath: displayCategory, mainCategory: displayCategory, categoryResolution: resolution } }
        : {}),
    } as T;
  }).filter(offer => offer.groceryEligible !== false);
}

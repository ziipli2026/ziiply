/** Deterministic quality gate for a parsed Citymarket leaflet. Missing images are blocking quality defects. */
export type CitymarketOfferQuality = {
  total: number; missingNames: number; missingPrices: number; missingCategories: number;
  suspiciousTitles: number; inconsistentUnitPrices: number; missingImages: number;
  blocking: boolean; examples: string[];
};
export function inspectCitymarketOffers(offers: Record<string, unknown>[]): CitymarketOfferQuality {
  const result: CitymarketOfferQuality = {
    total: offers.length, missingNames: 0, missingPrices: 0, missingCategories: 0,
    suspiciousTitles: 0, inconsistentUnitPrices: 0, missingImages: 0, blocking: false, examples: [],
  };
  for (const offer of offers) {
    const title = String(offer.title ?? offer.name ?? "").trim();
    const price = Number(offer.price);
    const discount = Number(offer.discountPercent);
    const category = String(offer.category ?? "").trim();
    const quantity = Number(offer.offerQuantity) || 1;
    const unitPrice = Number(offer.unitPrice);
    const deposit = Number(offer.depositAmount) || 0;
    const problem = (type: keyof Pick<CitymarketOfferQuality, "missingNames"|"missingPrices"|"missingCategories"|"suspiciousTitles"|"inconsistentUnitPrices">) => {
      result[type]++;
      if (result.examples.length < 12) result.examples.push(type + ": " + (title || "(empty)"));
    };
    if (!title) problem("missingNames");
    if (!(price > 0) && !(discount > 0 && discount < 100)) problem("missingPrices");
    if (!category || category === "Muut") problem("missingCategories");
    if (/^(?:tai|ja)\s/i.test(title) || /(?:\s(?:tai|ja)|\/)$/i.test(title) || /^(?:ERIAT|AUHOINEN|6KLASSIKOT)\b/i.test(title)) problem("suspiciousTitles");
    // Only test a single unambiguous mass/volume. Do not guess ranges or pieces.
    const size = title.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\b/i);
    if (price > 0 && unitPrice > 0 && size && !/[–-]\s*\d+/.test(title) && !/\d+\s*kpl\s*\//i.test(title)) {
      const amount = Number(size[1].replace(",", ".")) * (size[2].toLowerCase() === "g" || size[2].toLowerCase() === "ml" ? .001 : 1);
      // A 24-pack is one sellable package containing 24 bottles/cans.
      // Its first volume token is a single container, not the full pack.
      const packMatch = title.match(/\\b(\\d+)\\s*[- ]?pack\\b/i);
      const packCount = packMatch ? Number(packMatch[1]) : 1;
      const expected = (price - deposit) / (amount * quantity * packCount);
      if (amount > 0 && Math.abs(expected - unitPrice) > Math.max(.08, expected * .06)) problem("inconsistentUnitPrices");
    }
    if (!String(offer.imageUrl ?? "").trim() && !String(offer.imageData ?? "").trim()) result.missingImages++;
  }
  result.blocking = result.total === 0 || result.missingNames > 0 || result.missingPrices > 0 ||
    result.missingCategories > 0 || result.missingImages > 0 || result.suspiciousTitles > 0 || result.inconsistentUnitPrices > 0;
  return result;
}

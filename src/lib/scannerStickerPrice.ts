export type StickerPriceState = { ziiplyDiscountPercent?: unknown };
/** Apply to a fresh store quote. getProductPrice returns integer cents. */
export function scannerStickerPrice(item: unknown, regularPrice: number, unit: "cent" | "eur" = "cent") {
  const percent = Number((item as StickerPriceState | null)?.ziiplyDiscountPercent);
  if (!Number.isFinite(regularPrice) || regularPrice <= 0) return { price: 0 };
  if (!Number.isInteger(percent) || percent <= 0 || percent > 90) return { price: regularPrice };
  const regularCents = Math.round(regularPrice * (unit === "eur" ? 100 : 1));
  const discountedCents = Math.round(regularCents * (100 - percent) / 100);
  return {
    price: unit === "eur" ? discountedCents / 100 : discountedCents,
    ziiplyRegularPrice: unit === "eur" ? regularCents / 100 : regularCents,
    ziiplyDiscountPercent: percent,
  };
}

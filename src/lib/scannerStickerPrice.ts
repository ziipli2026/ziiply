export type StickerPriceState = { ziiplyDiscountPercent?: unknown };
/** regularPrice must be a fresh undiscounted store quote, never the cart's discounted price. */
export function scannerStickerPrice(item: unknown, regularPrice: number) {
  const percent = Number((item as StickerPriceState | null)?.ziiplyDiscountPercent);
  if (!Number.isFinite(regularPrice) || regularPrice <= 0) return { price: 0 };
  if (!Number.isInteger(percent) || percent <= 0 || percent > 90) return { price: regularPrice };
  return {
    price: Math.round(regularPrice * (100 - percent)) / 100,
    ziiplyRegularPrice: regularPrice,
    ziiplyDiscountPercent: percent,
  };
}

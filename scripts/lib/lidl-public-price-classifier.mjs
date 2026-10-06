// Conservative classifier for Lidl.fi public product-card price evidence.
// Public website prices remain evidence-only; this only prevents promotions from being mislabeled regular.
export function classifyLidlPublicPriceCard(card) {
  const text = [
    card?.badge, card?.label, card?.title, card?.description,
    card?.availabilityText, card?.priceText, card?.promotionText
  ].filter(Boolean).join(" ").toLowerCase();

  const hasPlus = /lidl\s*plus/.test(text) || card?.isLidlPlus === true;
  const hasEra = /(^|\s)erä(\s|$)/i.test(text) || card?.isLimitedLot === true;
  const hasMultiBuy = /\b\d+\s*kpl\b/.test(text) || /hinta yksittäin/.test(text) ||
    card?.isMultiBuy === true;
  const hasDiscount = /-\s*\d+\s*%/.test(text) || card?.hasStrikethroughPrice === true;
  const hasDatedWindow = /myymälässä\s+\d{1,2}\.\d{1,2}\.\s*-\s*\d{1,2}\.\d{1,2}\./.test(text) ||
    (card?.validFrom && card?.validThrough);

  if (hasPlus) return { priceKind:"lidl_plus", reason:"lidl-plus" };
  if (hasEra || hasMultiBuy || hasDiscount || hasDatedWindow)
    return { priceKind:"offer", reason:hasEra?"limited-lot":hasMultiBuy?"multi-buy":hasDiscount?"discount":"dated-window" };
  return { priceKind:"regular", reason:"no-promotion-marker" };
}

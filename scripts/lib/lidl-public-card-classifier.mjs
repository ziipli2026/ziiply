// Research-only classifier. No live network access and no production import.
// A public card's displayed price is NEVER evidence of a verified checkout regular price.
export function classifyLidlPublicCard(card, dateISO) {
  const labels = String(card.labels ?? "").toLocaleLowerCase("fi");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateISO) ? dateISO : null;
  const start = card.validFrom ?? null;
  const end = card.validThrough ?? null;
  const validDates = [start, end].every(v => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v));
  const memberOnly = /lidl\s*plus/.test(labels);
  const promotion = memberOnly || /erä|superhinta|tarjous|kampanja|\d+\s*kpl|%/.test(labels)
    || Boolean(start || end || card.referencePriceEur != null);
  const active = Boolean(date && validDates && start && end && start <= date && date <= end);
  return {
    kind: memberOnly ? "member-offer" : promotion ? "offer-candidate" : "unverified-display",
    activeOffer: promotion && active,
    future: Boolean(date && start && start > date),
    expired: Boolean(date && end && end < date),
    regularPriceEur: null,
    checkoutPriceVerified: false,
    comparable: false,
    reason: !validDates ? "invalid-validity" : promotion && !(start && end) ? "missing-validity" :
      promotion && !active ? "inactive-offer" : promotion ? "research-offer-only" : "unverified-public-display",
  };
}

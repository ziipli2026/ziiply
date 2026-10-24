/**
 * Strict validation boundary for K-Ruoka N183 offer ingestion.
 * A successful page response or storeId in a request is NOT source proof.
 * This module performs no writes and never upgrades unverified discoveries.
 */
export const N183_STORE_KEY = "k-ruoka k citymarket hyvinkaa";
export const N183_SCOPE = "SELECTED_STORE_WEB_OFFERS";
const norm = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function validateN183Offer(row, now = Date.now()) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  if (String(row.storeId ?? "") !== "N183" || norm(row.storeName) !== "k citymarket hyvinkaa") return null;
  if (String(row.sourceScope ?? row.debug?.sourceScope ?? "") !== N183_SCOPE) return null;
  const id = String(row.offerId ?? "").trim();
  const title = String(row.title ?? row.name ?? "").trim();
  const price = Number(row.price);
  const from = Date.parse(String(row.validFrom ?? ""));
  const until = Date.parse(String(row.validUntil ?? ""));
  if (!id || !title || !Number.isFinite(price) || price <= 0 ||
      !Number.isFinite(from) || !Number.isFinite(until) || from > until ||
      now < from || now > until) return null;
  return { ...row, id: "kruoka-n183-" + id, title, name: title, price,
    storeId: "N183", storeName: "K-Citymarket Hyvinkää",
    sourceScope: N183_SCOPE, debug: { ...row.debug, sourceScope: N183_SCOPE } };
}

export function validateN183Batch(batch, now = Date.now()) {
  if (!batch || batch.verifiedStoreOffers !== true ||
      batch.complete !== true || batch.storeId !== "N183" ||
      norm(batch.storeName) !== "k citymarket hyvinkaa" ||
      !Array.isArray(batch.offers) || batch.offers.length === 0)
    throw new Error("N183 source not independently verified or scan incomplete");
  const accepted = batch.offers.map(row => validateN183Offer(row, now));
  if (accepted.some(row => !row)) throw new Error("N183 batch contains invalid, expired or unscoped offers");
  const ids = new Set(accepted.map(row => row.offerId));
  if (ids.size !== accepted.length) throw new Error("N183 batch contains duplicate offer identifiers");
  return accepted;
}

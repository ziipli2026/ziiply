import { neon } from "@neondatabase/serverless";
import { enrichOfferImage, type OfferImageCandidate } from "./offerImageEnrichment";
import { planImageEnrichment, resolveImageEnrichmentBatch, type OfferImageJob, type OfferImageOutcome } from "./offerImageEnrichmentQueue";

/**
 * Read-only Neon EAN image lookup. No schema creation or writes.
 * Missing DATABASE_URL means no enrichment, never an error for the caller.
 */
export async function lookupKnownEanImages(job: OfferImageJob): Promise<OfferImageCandidate[]> {
  const ean = String(job.offer.ean ?? "").trim();
  if (!process.env.DATABASE_URL) return [];
  const sql = neon(process.env.DATABASE_URL);
  const name = String(job.offer.name ?? "").trim();
  const quantity = String(job.offer.packageSize ?? "").trim();
  // Leaflets often lack EANs. Only consider exact name AND package size,
  // never a fuzzy lookup or an ambiguous multi-product offer.
  const safeName = name.length >= 12 && !/\b(tai|seka|sekä|valikoima|erilaiset|useita|lajitelma)\b/i.test(name);
  const safeQuantity = quantity.length > 0 && !/[–-]\s*\d+\s*(g|kg|ml|l)\b/i.test(quantity);
  if (!/^\d{8,14}$/.test(ean) && !(safeName && safeQuantity)) return [];
  const rows = /^\d{8,14}$/.test(ean)
    ? await sql`
      SELECT ean, name, brand, quantity, image_url AS "imageUrl", source
      FROM ziiply_ean_products
      WHERE ean = ${ean} AND image_url IS NOT NULL AND TRIM(image_url) <> ''
      LIMIT 101
    `
    : await sql`
      SELECT ean, name, brand, quantity, image_url AS "imageUrl", source
      FROM ziiply_ean_products
      WHERE LOWER(TRIM(name)) = LOWER(${name})
        AND LOWER(TRIM(quantity)) = LOWER(${quantity})
        AND image_url IS NOT NULL AND TRIM(image_url) <> ''
      LIMIT 101
    `;
  return normalizeImageBankRows(rows);
}
/** Pure, testable normalization. Reject truncated query results rather than guessing. */
export function normalizeImageBankRows(rows: ReadonlyArray<Record<string, unknown>>): OfferImageCandidate[] {
  if (rows.length > 100) return [];
  return rows.map(row => ({
    ean: String(row.ean ?? ""),
    name: row.name ? String(row.name) : null,
    brand: row.brand ? String(row.brand) : null,
    packageSize: row.quantity ? String(row.quantity) : null,
    imageUrl: row.imageUrl ? String(row.imageUrl) : null,
    source: row.source ? String(row.source) : null,
  }));
}
/** Caller owns scheduling and persistence. This method never modifies source offers. */
export async function enrichOffersFromEanBank(jobs: OfferImageJob[]): Promise<OfferImageOutcome[]> {
  return resolveImageEnrichmentBatch(planImageEnrichment(jobs), lookupKnownEanImages);
}
export function applyVerifiedImage(offer: OfferImageCandidate, candidate: OfferImageCandidate) {
  return enrichOfferImage(offer, [candidate]);
}

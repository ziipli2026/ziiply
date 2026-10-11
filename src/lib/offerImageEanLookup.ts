import { neon } from "@neondatabase/serverless";
import { enrichOfferImage, type OfferImageCandidate } from "./offerImageEnrichment";
import { planImageEnrichment, resolveImageEnrichmentBatch, type OfferImageJob, type OfferImageOutcome } from "./offerImageEnrichmentQueue";

/**
 * Read-only Neon EAN image lookup. No schema creation or writes.
 * Missing DATABASE_URL means no enrichment, never an error for the caller.
 */
export async function lookupKnownEanImages(job: OfferImageJob): Promise<OfferImageCandidate[]> {
  const ean = String(job.offer.ean ?? "").trim();
  if (!/^\d{8,14}$/.test(ean) || !process.env.DATABASE_URL) return [];
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    SELECT ean, name, brand, quantity, image_url AS "imageUrl", source
    FROM ziiply_ean_products
    WHERE ean = ${ean} AND image_url IS NOT NULL AND TRIM(image_url) <> ''
    LIMIT 1
  `;
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

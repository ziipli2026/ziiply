import { neon } from "@neondatabase/serverless";

type Offer = Record<string, unknown>;
const str = (v: unknown, n=180) => String(v ?? "").trim().slice(0,n);
const key = (o: Offer) => [str(o.chain || o.storeType || o.source,60),str(o.publicationId || o.publication || o.sourceUrl || o.source,160),str(o.id || o.offerId || o.productId,160)].join("|");
export async function enrichOfferImagesBestEffort<T extends Offer>(offers: T[]): Promise<T[]> {
  if (!process.env.DATABASE_URL || !offers.length) return offers;
  const missing = offers.filter(o => !str(o.imageUrl) && str(o.imageData, 101).length <= 100 && str(o.id || o.offerId || o.productId));
  if (!missing.length) return offers;
  try {
    const sql = neon(process.env.DATABASE_URL);
    const keys = [...new Set(missing.map(key))];
    const verified = new Map<string,string>();
    // Query every missing offer, not only the first 100 cards in a large leaflet.
    for (let offset = 0; offset < keys.length; offset += 100) {
      const batch = keys.slice(offset, offset + 100);
      const rows = await sql`
        SELECT chain,publication,product_id AS "productId",image_url AS "imageUrl"
        FROM ziiply_offer_image_queue
        WHERE status='ready' AND image_url LIKE 'https://%'
        AND (chain || '|' || publication || '|' || product_id) = ANY(${batch})`;
      for (const row of rows) {
        verified.set([row.chain,row.publication,row.productId].join("|"),String(row.imageUrl));
      }
    }
    return offers.map(o => {
      if (str(o.imageUrl) || str(o.imageData, 101).length > 100) return o;
      const url = verified.get(key(o));
      return url ? {...o,imageUrl:url} : o;
    }) as T[];
  } catch { return offers; }
}

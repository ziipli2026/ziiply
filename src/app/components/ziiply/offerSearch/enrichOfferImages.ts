import { neon } from "@neondatabase/serverless";

type Offer = Record<string, unknown>;
const str = (v: unknown, n=180) => String(v ?? "").trim().slice(0,n);
const key = (o: Offer) => [str(o.chain || o.storeType || o.source,60),str(o.publicationId || o.publication || o.sourceUrl || o.source,160),str(o.id || o.offerId,160)].join("|");
export async function enrichOfferImagesBestEffort<T extends Offer>(offers: T[]): Promise<T[]> {
  if (!process.env.DATABASE_URL || !offers.length) return offers;
  const missing = offers.filter(o => !str(o.imageUrl) && str(o.id || o.offerId));
  if (!missing.length) return offers;
  try {
    const sql = neon(process.env.DATABASE_URL);
    const keys = [...new Set(missing.map(key))].slice(0,100);
    const rows = await sql`
      SELECT chain,publication,product_id AS "productId",image_url AS "imageUrl"
      FROM ziiply_offer_image_queue
      WHERE status='ready' AND image_url LIKE 'https://%'
      AND (chain || '|' || publication || '|' || product_id) = ANY(${keys})`;
    const verified = new Map(rows.map(r => [[r.chain,r.publication,r.productId].join("|"),String(r.imageUrl)]));
    return offers.map(o => {
      if (str(o.imageUrl)) return o;
      const url = verified.get(key(o));
      return url ? {...o,imageUrl:url} : o;
    }) as T[];
  } catch { return offers; }
}

import { neon } from "@neondatabase/serverless";

type Offer = Record<string, unknown>;
const str = (v: unknown, n = 180) => String(v ?? "").trim().slice(0,n);
const ean = (v: unknown) => { const s = str(v,32).replace(/\D/g,""); return /^\d{8,14}$/.test(s) ? s : ""; };

export async function queueMissingOfferImagesBestEffort(offers: Offer[]): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const rows = offers.filter(o => !str(o.imageUrl) && str(o.title || o.name) && str(o.id || o.offerId)).map(o => ({
    chain: str(o.chain || o.storeType || o.source,60),
    publication: str(o.publicationId || o.publication || o.sourceUrl || o.source,160),
    product_id: str(o.id || o.offerId,160),
    ean: ean(o.ean || o.gtin || o.barcode),
    title: str(o.title || o.name,300),
  })).filter(o => o.chain && o.publication && o.product_id);
  if (!rows.length) return;
  const uniqueRows = [...new Map(rows.map(row => [[row.chain,row.publication,row.product_id].join('|'),row])).values()];
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`CREATE TABLE IF NOT EXISTS ziiply_offer_image_queue (
      chain TEXT NOT NULL, publication TEXT NOT NULL, product_id TEXT NOT NULL,
      ean TEXT, title TEXT NOT NULL, image_url TEXT, image_source TEXT,
      status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY(chain, publication, product_id)
    )`;
    for (let offset = 0; offset < uniqueRows.length; offset += 100) {
    const batch = uniqueRows.slice(offset,offset+100);
    await sql`INSERT INTO ziiply_offer_image_queue(chain,publication,product_id,ean,title)
      SELECT chain,publication,product_id,ean,title
      FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb)
      AS r(chain text,publication text,product_id text,ean text,title text)
      ON CONFLICT (chain,publication,product_id) DO UPDATE SET
        ean=COALESCE(NULLIF(EXCLUDED.ean,''),ziiply_offer_image_queue.ean),
        title=EXCLUDED.title,updated_at=now()`;
    }
  } catch (error) {
    console.warn("[offer-image-enrichment] queue:", error instanceof Error ? error.message : "unknown");
  }
}

import { neon } from "@neondatabase/serverless";

type Offer = Record<string, unknown>;
const str = (v: unknown, n = 180) => String(v ?? "").trim().slice(0,n);
const hasImageUrl = (v: unknown) => {
  try {
    const url = new URL(str(v, 1000));
    return url.protocol === "https:" && Boolean(url.hostname)
      && !/^(localhost|127\\.|10\\.|192\\.168\\.|169\\.254\\.)/i.test(url.hostname)
      && !url.hostname.endsWith(".local");
  } catch { return false; }
};
const ean = (v: unknown) => { const s = str(v,32).replace(/\D/g,""); return /^\d{8,14}$/.test(s) ? s : ""; };

export async function queueMissingOfferImagesBestEffort(offers: Offer[]): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const rows = offers.filter(o => !hasImageUrl(o.imageUrl) && str(o.imageData, 101).length <= 100 && str(o.title || o.name) && str(o.id || o.offerId || o.productId)).map(o => ({
    chain: str(o.chain || o.storeType || o.source,60),
    publication: str(o.publicationId || o.publication || o.sourceUrl || o.source,160),
    product_id: str(o.id || o.offerId || o.productId,160),
    ean: ean(o.ean || o.gtin || o.barcode),
    title: str(o.title || o.name,300),
  })).filter(o => o.chain && o.publication && o.product_id);
  if (!rows.length) return;
  // Never queue an image for a card whose text is only an OCR heading.
  // Price/unit-price annotations belong to the offer, not the product identity.
  const looksLikeLeafletAnnotation = (title: string) =>
    /(?:\b\d+[,.]\d{2}\s*\/\s*(?:kg|l)\b|\b\d+\s*%|\btuotteet\s+tasarahalla\b|\bFörvaringslådor\b)/i.test(title);
  const eligibleRows = rows.filter(row => row.ean || !looksLikeLeafletAnnotation(row.title));
  if (!eligibleRows.length) return;
  // Skip obvious multi-product leaflet headings and OCR-merged descriptions.
  // These do not identify a unique SKU and must not acquire a guessed image.
  const ambiguous = (title: string) => {
    const words = title.toLocaleLowerCase("fi").split(/[^a-z0-9åäö]+/).filter(Boolean);
    return ["tai","ja","sekä","valikoima","lajitelma"].some(token => words.includes(token))
      || /(?:\b\d+[,.]?\d*\s*%|\b\d+[,.]\d{2}\s*\/\s*(?:kg|l)\b|tuotteet tasarahalla)/i.test(title);
  };
  const uniqueRows = [...new Map(eligibleRows.filter(row => row.ean || !ambiguous(row.title)).map(row => [[row.chain,row.publication,row.product_id].join('|'),row])).values()];
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
        title=EXCLUDED.title,
        status=CASE WHEN ziiply_offer_image_queue.status='needs_review' AND (EXCLUDED.title IS DISTINCT FROM ziiply_offer_image_queue.title
          OR (NULLIF(EXCLUDED.ean,'') IS NOT NULL
            AND EXCLUDED.ean IS DISTINCT FROM ziiply_offer_image_queue.ean))
          THEN 'pending' ELSE ziiply_offer_image_queue.status END,
        attempts=CASE WHEN ziiply_offer_image_queue.status='needs_review' AND (EXCLUDED.title IS DISTINCT FROM ziiply_offer_image_queue.title
          OR (NULLIF(EXCLUDED.ean,'') IS NOT NULL
            AND EXCLUDED.ean IS DISTINCT FROM ziiply_offer_image_queue.ean))
          THEN 0 ELSE ziiply_offer_image_queue.attempts END,
        next_attempt_at=CASE WHEN ziiply_offer_image_queue.status='needs_review' AND (EXCLUDED.title IS DISTINCT FROM ziiply_offer_image_queue.title
          OR (NULLIF(EXCLUDED.ean,'') IS NOT NULL
            AND EXCLUDED.ean IS DISTINCT FROM ziiply_offer_image_queue.ean))
          THEN now() ELSE ziiply_offer_image_queue.next_attempt_at END,
        last_error=CASE WHEN ziiply_offer_image_queue.status='needs_review' AND (EXCLUDED.title IS DISTINCT FROM ziiply_offer_image_queue.title
          OR (NULLIF(EXCLUDED.ean,'') IS NOT NULL
            AND EXCLUDED.ean IS DISTINCT FROM ziiply_offer_image_queue.ean))
          THEN NULL ELSE ziiply_offer_image_queue.last_error END,
        updated_at=now()`;
    }
  } catch (error) {
    console.warn("[offer-image-enrichment] queue:", error instanceof Error ? error.message : "unknown");
  }
}

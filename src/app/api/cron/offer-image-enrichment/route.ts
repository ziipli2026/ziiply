import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Candidate = { chain: string; publication: string; productId: string; ean?: string; title: string; imageUrl?: string };
const sql = () => neon(process.env.DATABASE_URL!);
const eanOf = (v: unknown) => { const s = String(v ?? "").replace(/\D/g, ""); return /^\d{8,14}$/.test(s) ? s : ""; };
const text = (v: unknown, n = 180) => String(v ?? "").trim().slice(0, n);
const validUrl = (v: unknown) => {
  try { const u = new URL(String(v)); return u.protocol === "https:" && !/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname) && !u.hostname.endsWith(".local") ? u.href.slice(0, 1000) : ""; }
  catch { return ""; }
};
async function schema(db: ReturnType<typeof sql>) {
  await db`CREATE TABLE IF NOT EXISTS ziiply_offer_image_queue (
    chain TEXT NOT NULL, publication TEXT NOT NULL, product_id TEXT NOT NULL,
    ean TEXT, title TEXT NOT NULL, image_url TEXT, image_source TEXT,
    status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY(chain, publication, product_id)
  )`;
}
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}
export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.items) || body.items.length > 500) return NextResponse.json({ ok: false, error: "items array (max 500) required" }, { status: 400 });
  const db = sql(); await schema(db);
  let queued = 0, ready = 0;
  for (const raw of body.items as Candidate[]) {
    const chain = text(raw.chain, 60), publication = text(raw.publication, 160), productId = text(raw.productId, 160), title = text(raw.title, 300);
    if (!chain || !publication || !productId || !title) continue;
    const image = validUrl(raw.imageUrl);
    if (image) {
      await db`INSERT INTO ziiply_offer_image_queue (chain,publication,product_id,ean,title,image_url,image_source,status)
        VALUES (${chain},${publication},${productId},${eanOf(raw.ean)},${title},${image},'publisher','ready')
        ON CONFLICT (chain,publication,product_id) DO UPDATE SET
        title=EXCLUDED.title, image_url=EXCLUDED.image_url, image_source='publisher', status='ready', updated_at=now()`;
      ready++;
    } else {
      await db`INSERT INTO ziiply_offer_image_queue (chain,publication,product_id,ean,title)
        VALUES (${chain},${publication},${productId},${eanOf(raw.ean)},${title})
        ON CONFLICT (chain,publication,product_id) DO UPDATE SET
        title=EXCLUDED.title, ean=COALESCE(NULLIF(EXCLUDED.ean,''),ziiply_offer_image_queue.ean), updated_at=now()`;
      queued++;
    }
  }
  return NextResponse.json({ ok: true, queued, ready });
}
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 503 });
  const db = sql(); await schema(db);
  // Only exact EAN joins are permitted: fuzzy title searches must never auto-publish an image.
  const matches = await db`
    SELECT q.chain,q.publication,q.product_id AS "productId",q.ean,
           p.image_url AS "imageUrl"
    FROM ziiply_offer_image_queue q
    JOIN ziiply_ean_products p ON p.ean=q.ean
    WHERE q.status='pending' AND q.next_attempt_at<=now()
      AND q.ean ~ '^\d{8,14}$' AND p.image_url LIKE 'https://%'
    ORDER BY q.next_attempt_at ASC LIMIT 100`;
  let enriched = 0;
  for (const row of matches) {
    const image = validUrl(row.imageUrl);
    if (!image) continue;
    await db`UPDATE ziiply_offer_image_queue SET image_url=${image},image_source='ean-bank',
      status='ready',attempts=attempts+1,updated_at=now()
      WHERE chain=${row.chain} AND publication=${row.publication} AND product_id=${row.productId}
      AND status='pending'`;
    enriched++;
  }
  const retry = await db`UPDATE ziiply_offer_image_queue SET
    attempts=attempts+1, next_attempt_at=now()+make_interval(hours => LEAST(168, POWER(2, LEAST(attempts,7))::int)),
    updated_at=now() WHERE status='pending' AND next_attempt_at<=now()
    RETURNING product_id`;
  const stats = await db`SELECT status,COUNT(*)::int AS count FROM ziiply_offer_image_queue GROUP BY status`;
  return NextResponse.json({ok:true,enriched,retried:retry.length,stats});
}

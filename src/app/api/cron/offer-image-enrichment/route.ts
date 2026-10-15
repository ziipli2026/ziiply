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
  await db`CREATE TABLE IF NOT EXISTS ziiply_ean_products (ean TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', image_url TEXT)`;
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
  // Backfill staged publications independently of user searches. A bounded
  // sample is scanned each run; existing ready images remain untouched.
  let discovered = 0;
  try {
    const publications = await db`SELECT chain,publication_id,offers
      FROM ziiply_offer_publications
      WHERE valid_until >= CURRENT_DATE - INTERVAL '2 days'
      ORDER BY parsed_at DESC LIMIT 12`;
    for (const publication of publications) {
      const offers = Array.isArray(publication.offers) ? publication.offers : [];
      const candidates = offers.map((raw: unknown,index: number) => {
        const row = raw && typeof raw === "object" ? raw as Record<string,unknown> : {};
        return {
          chain: text(publication.chain,60),
          publication: text(publication.publication_id,160),
          productId: text(row.id || row.offerId || row.productId || `row:${index}`,160),
          title: text(row.title || row.name,300),
          ean: eanOf(row.ean || row.gtin || row.barcode),
          image: validUrl(row.imageUrl),
        };
      }).filter(row => row.title && !row.image);
      const unique = [...new Map(candidates.map(row => [row.productId,row])).values()].slice(0,300);
      for (let offset=0; offset<unique.length; offset+=100) {
        const batch = unique.slice(offset,offset+100).map(row => ({
          chain:row.chain,publication:row.publication,product_id:row.productId,title:row.title,ean:row.ean
        }));
        await db`INSERT INTO ziiply_offer_image_queue(chain,publication,product_id,title,ean)
          SELECT chain,publication,product_id,title,ean
          FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb)
          AS r(chain text,publication text,product_id text,title text,ean text)
          ON CONFLICT(chain,publication,product_id) DO NOTHING`;
        discovered += batch.length;
      }
    }
  } catch (error) {
    console.warn("[offer-image-enrichment] staged backfill skipped",error instanceof Error ? error.message : "unknown");
  }
  // Only exact EAN joins are permitted: fuzzy title searches must never auto-publish an image.
  const matches = await db`
    SELECT q.chain,q.publication,q.product_id AS "productId",q.ean,
           p.image_url AS "imageUrl"
    FROM ziiply_offer_image_queue q
    JOIN ziiply_ean_products p ON p.ean=q.ean
    WHERE q.status='pending' AND q.next_attempt_at<=now()
      AND length(q.ean) BETWEEN 8 AND 14 AND p.image_url LIKE 'https://%'
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
  // No-EAN offers: exact normalized title + a single image candidate only.
  // Do not guess from broad leaflet descriptions or multi-product offers.
  const noEan = await db`SELECT chain,publication,product_id,title
    FROM ziiply_offer_image_queue WHERE status='pending'
    AND (ean IS NULL OR ean='') AND next_attempt_at<=now()
    ORDER BY next_attempt_at LIMIT 100`;
  let titleEnriched = 0, ambiguous = 0;
  const normalize = (v: unknown) => String(v ?? "").toLocaleLowerCase("fi")
    .replace(/(\d)\s+(g|kg|ml|l)\b/g, "$1$2")
    .replace(/[^a-z0-9åäö]+/gi," ").split(" ").filter(Boolean).join(" ").trim();
  const uncertain = (v: string) => {
    const words = normalize(v).split(" ");
    const hasMultipleOfferOptions = ["tai","ja","sekä","eri","valikoima","lajitelma"].some(word => words.includes(word));
    // A slash in package notation such as "2 kpl/140 g" is not a multi-product offer.
    const packageSlash = /\b\d+\s*kpl\s*\/\s*\d+\s*(?:g|kg|ml|l)\b/i.test(v);
    const otherSlash = v.includes("/") && !packageSlash;
    // Leaflet OCR sometimes merges adjacent cards, prices and category headings.
    // Keep these out of automatic matching instead of risking an unrelated image.
    const noisyOfferText = /(?:\b\d+[,.]?\d*\s*%|\b\d+[,.]\d{2}\s*\/\s*(?:kg|l)\b|tuotteet tasarahalla|\bkuivaruoat\b|\bmärkäruoat\b|\bvirvoitusjuomat\b|\bvalikoima\b|\bateriat\s+\d+\s*kk\b)/i.test(v);
    return hasMultipleOfferOptions || otherSlash || noisyOfferText;
  };
  for (const item of noEan) {
    const title = String(item.title || "");
    if (!title || uncertain(title)) { ambiguous++; continue; }
    const words = normalize(title).split(" ");
    const firstWord = words[0];
    if (firstWord.length < 4) { ambiguous++; continue; }
    // Search by both the brand/name token and package amount. Exact full-name
    // verification below still decides whether an image can be published.
    const amount = words.find(word => /^[0-9]+(?:kg|ml|g|l)$/.test(word));
    const normalizedTitle = normalize(title);
    const brandTokens = new Set(["arla","fazer","hk","atria","valio","vaasan","kalaneuvos","kariniemen","pingo"]);
    const titleTokens = normalizedTitle.split(" ");
    const variants = [normalizedTitle];
    const searchTokens = [firstWord];
    if (brandTokens.has(titleTokens[0]) && titleTokens.length > 1) {
      variants.push(titleTokens.slice(1).join(" "));
      if (titleTokens[1].length >= 4) searchTokens.push(titleTokens[1]);
    }
    const matches = await db`SELECT ean,name,image_url FROM ziiply_ean_products
      WHERE image_url LIKE 'https://%'
      AND (
        lower(name) LIKE ${searchTokens[0] + '%'} OR lower(name) LIKE ${'% ' + searchTokens[0] + ' %'}
        OR lower(name) LIKE ${searchTokens[1] ?? '__NO_MATCH__' + '%'}
        OR lower(name) LIKE ${'% ' + (searchTokens[1] ?? '__NO_MATCH__') + ' %'}
      )
      AND (${amount ?? ''} = '' OR regexp_replace(lower(name), '[^a-z0-9åäö]', '', 'g') LIKE ${'%' + (amount ?? '') + '%'})
      LIMIT 1500`;
    const exact = matches.filter(row => {
      const candidate = normalize(row.name);
      const sizeMatches = !amount || candidate.split(" ").includes(amount);
      return variants.includes(candidate) && sizeMatches && validUrl(row.image_url);
    });
    const images = [...new Set(exact.map(row => validUrl(row.image_url)))];
    if (images.length !== 1 || exact.length !== 1) { ambiguous++; continue; }
    await db`UPDATE ziiply_offer_image_queue SET image_url=${images[0]},
      image_source='ean-bank-exact-title',status='ready',updated_at=now()
      WHERE chain=${item.chain} AND publication=${item.publication}
      AND product_id=${item.product_id} AND status='pending'`;
    titleEnriched++;
  }
  const retry = await db`UPDATE ziiply_offer_image_queue SET
    attempts=attempts+1, next_attempt_at=now()+make_interval(hours => LEAST(168, POWER(2, LEAST(attempts,7))::int)),
    updated_at=now() WHERE (chain,publication,product_id) IN (
      SELECT chain,publication,product_id FROM ziiply_offer_image_queue
      WHERE status='pending' AND next_attempt_at<=now()
      ORDER BY next_attempt_at LIMIT 100
    ) RETURNING product_id`;
  const stats = await db`SELECT status,COUNT(*)::int AS count FROM ziiply_offer_image_queue GROUP BY status`;
  const runAt = new Date().toISOString();
  await db`CREATE TABLE IF NOT EXISTS ziiply_offer_image_runs (
    run_at TIMESTAMPTZ PRIMARY KEY, discovered INTEGER NOT NULL,
    enriched INTEGER NOT NULL, retried INTEGER NOT NULL,
    pending INTEGER NOT NULL, ready INTEGER NOT NULL
  )`;
  const pending = Number(stats.find(row => row.status === "pending")?.count ?? 0);
  const ready = Number(stats.find(row => row.status === "ready")?.count ?? 0);
  await db`INSERT INTO ziiply_offer_image_runs(run_at,discovered,enriched,retried,pending,ready)
    VALUES (${runAt}::timestamptz,${discovered},${enriched},${retry.length},${pending},${ready})`;
  return NextResponse.json({ok:true,runAt,discovered,enriched,titleEnriched,ambiguous,retried:retry.length,pending,ready,stats});
}

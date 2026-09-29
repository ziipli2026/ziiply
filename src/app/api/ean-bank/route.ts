import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProductInput = {
  ean?: unknown;
  name?: unknown;
  brand?: unknown;
  quantity?: unknown;
  imageUrl?: unknown;
  category?: unknown;
  source?: unknown;
  aliases?: unknown;
};

function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeEan(value: unknown) {
  const ean = clean(value, 32).replace(/\D/g, "");
  return /^\d{8,14}$/.test(ean) ? ean : "";
}

function aliases(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return Array.from(new Set(value.map((v) => clean(v, 160)).filter(Boolean))).slice(0, 24);
}

async function ensureSchema(sql: ReturnType<typeof db>) {
  await sql`
    CREATE TABLE IF NOT EXISTS ziiply_ean_products (
      ean TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      brand TEXT,
      quantity TEXT,
      image_url TEXT,
      category TEXT,
      source TEXT,
      aliases TEXT[] NOT NULL DEFAULT '{}',
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS ziiply_ean_products_name_idx
    ON ziiply_ean_products USING GIN (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || array_to_string(aliases, ' ')))
  `;
}

export async function GET(request: NextRequest) {
  try {
    const sql = db();
    await ensureSchema(sql);
    const ean = normalizeEan(request.nextUrl.searchParams.get("ean"));
    const q = clean(request.nextUrl.searchParams.get("q"), 160);

    if (ean) {
      const rows = await sql`
        SELECT ean, name, brand, quantity, image_url AS "imageUrl", category, source,
               aliases, first_seen_at AS "firstSeenAt", last_seen_at AS "lastSeenAt",
               updated_at AS "updatedAt"
        FROM ziiply_ean_products
        WHERE ean = ${ean}
        LIMIT 1
      `;
      return NextResponse.json({ ok: true, product: rows[0] ?? null });
    }

    if (q.length >= 2) {
      const like = `%${q}%`;
      const rows = await sql`
        SELECT ean, name, brand, quantity, image_url AS "imageUrl", category, source,
               aliases, last_seen_at AS "lastSeenAt", updated_at AS "updatedAt"
        FROM ziiply_ean_products
        WHERE name ILIKE ${like}
           OR brand ILIKE ${like}
           OR EXISTS (SELECT 1 FROM unnest(aliases) a WHERE a ILIKE ${like})
        ORDER BY last_seen_at DESC
        LIMIT 20
      `;
      return NextResponse.json({ ok: true, products: rows });
    }

    return NextResponse.json({ ok: false, error: "Provide ean or q" }, { status: 400 });
  } catch (error) {
    console.error("EAN bank GET failed", error);
    return NextResponse.json({ ok: false, error: "EAN bank unavailable" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProductInput;
    const ean = normalizeEan(body.ean);
    const name = clean(body.name, 300);
    if (!ean) {
      return NextResponse.json({ ok: false, error: "Valid EAN is required" }, { status: 400 });
    }

    const brand = clean(body.brand, 160) || null;
    const quantity = clean(body.quantity, 120) || null;
    const imageUrl = clean(body.imageUrl, 1000) || null;
    const category = clean(body.category, 160) || null;
    const source = clean(body.source, 120) || null;
    const aliasList = aliases(body.aliases);
    const sql = db();
    await ensureSchema(sql);

    const rows = await sql`
      INSERT INTO ziiply_ean_products (ean, name, brand, quantity, image_url, category, source, aliases)
      VALUES (${ean}, ${name}, ${brand}, ${quantity}, ${imageUrl}, ${category}, ${source}, ${aliasList})
      ON CONFLICT (ean) DO UPDATE SET
        name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE ziiply_ean_products.name END,
        brand = COALESCE(EXCLUDED.brand, ziiply_ean_products.brand),
        quantity = COALESCE(EXCLUDED.quantity, ziiply_ean_products.quantity),
        image_url = COALESCE(EXCLUDED.image_url, ziiply_ean_products.image_url),
        category = COALESCE(EXCLUDED.category, ziiply_ean_products.category),
        source = COALESCE(EXCLUDED.source, ziiply_ean_products.source),
        aliases = ARRAY(SELECT DISTINCT x FROM unnest(ziiply_ean_products.aliases || EXCLUDED.aliases) x),
        last_seen_at = NOW(),
        updated_at = NOW()
      RETURNING ean, name, brand, quantity, image_url AS "imageUrl", category, source,
                aliases, first_seen_at AS "firstSeenAt", last_seen_at AS "lastSeenAt",
                updated_at AS "updatedAt"
    `;
    return NextResponse.json({ ok: true, product: rows[0] });
  } catch (error) {
    console.error("EAN bank POST failed", error);
    return NextResponse.json({ ok: false, error: "EAN bank unavailable" }, { status: 500 });
  }
}

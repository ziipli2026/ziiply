import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

// Experimental, read-only Neon-first search. Never changes existing taxonomy.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") || "").normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 160);
  if (q.length < 2) return NextResponse.json({ ok: false, error: "Query too short" }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 503 });

  const isEan = /^\d{8,14}$/.test(q);
  // Only verified category synonym. Do not infer categories from arbitrary names.
  const categoryPath = /^olut|oluet$/i.test(q) ? "%/oluet/%" : null;
  const contains = "%" + q.replace(/[\\%_]/g, "\\$&") + "%";
  const prefix = q.replace(/[\\%_]/g, "\\$&") + "%";
  const words = q.toLocaleLowerCase("fi-FI").split(" ").filter(Boolean);
  const started = Date.now();

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      WITH candidates AS (
        SELECT ean, name, brand, quantity, image_url, category, source, aliases, last_seen_at,
          CASE
            WHEN ${isEan} AND ean = ${q} THEN 0
            WHEN lower(name) = lower(${q}) THEN 1
            WHEN name ILIKE ${prefix} THEN 2
            WHEN EXISTS (SELECT 1 FROM unnest(aliases) a WHERE lower(a) = lower(${q})) THEN 3
            WHEN name ILIKE ${contains} THEN 4
            WHEN EXISTS (SELECT 1 FROM unnest(aliases) a WHERE a ILIKE ${contains}) THEN 5
            WHEN brand ILIKE ${prefix} THEN 6
            WHEN ${categoryPath}::text IS NOT NULL AND category ILIKE ${categoryPath} THEN 7
            ELSE 8
          END AS relevance
        FROM ziiply_ean_products
        WHERE (${isEan} AND ean = ${q})
          OR name ILIKE ${contains}
          OR brand ILIKE ${contains}
          OR EXISTS (SELECT 1 FROM unnest(aliases) a WHERE a ILIKE ${contains})
          OR (${categoryPath}::text IS NOT NULL AND category ILIKE ${categoryPath})
      )
      SELECT ean, name, brand, quantity, image_url AS "imageUrl",
             category, source, aliases, last_seen_at AS "lastSeenAt", relevance AS rank
      FROM candidates
      ORDER BY relevance, (image_url IS NULL), name, ean
      LIMIT 100
    `;
    return NextResponse.json({
      ok: true, query: q, products: rows, count: rows.length, readOnly: true,
      elapsedMs: Date.now() - started, searchVersion: "neon-relevance-v2",
      categoryExpansion: categoryPath ? "verified-beer-category" : null,
      truncated: rows.length === 100
    });
  } catch (error) {
    console.error("[neon-first-search] query failed", error);
    return NextResponse.json({ ok: false, error: "Search unavailable", searchVersion: "neon-relevance-v2" }, { status: 500 });
  }
}

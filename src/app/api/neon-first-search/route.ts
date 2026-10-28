import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

// Experimental, read-only Neon-first search. Never changes existing taxonomy.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") || "").normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 160);
  if (q.length < 2) return NextResponse.json({ ok: false, error: "Query too short" }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 503 });

  const isEan = /^\d{8,14}$/.test(q);
  // Shared category-aware search for every term, without per-keyword exceptions.
  const contains = "%" + q.replace(/[\\%_]/g, "\\$&") + "%";
  const prefix = q.replace(/[\\%_]/g, "\\$&") + "%";
  const normalizedQuery = q.toLocaleLowerCase("fi-FI");
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const isSingleWord = tokens.length === 1;
  const started = Date.now();

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      WITH candidates AS (
        SELECT ean, name, brand, quantity, image_url, category, source, aliases, last_seen_at,
          lower(regexp_replace(coalesce(category, ''), '[^[:alnum:]]+', ' ', 'g')) AS category_words,
          lower(regexp_replace(coalesce(name, ''), '[^[:alnum:]]+', ' ', 'g')) AS name_words
        FROM ziiply_ean_products
        WHERE (${isEan} AND ean = ${q})
           OR name ILIKE ${contains}
           OR brand ILIKE ${contains}
           OR EXISTS (SELECT 1 FROM unnest(aliases) a WHERE a ILIKE ${contains})
           OR (${isSingleWord} AND lower(regexp_replace(coalesce(category, ''), '[^[:alnum:]]+', ' ', 'g')) ~ ('(^| )' || ${normalizedQuery} || '( |$)'))
      ), ranked AS (
        SELECT *, CASE
          WHEN ${isEan} AND ean = ${q} THEN 0
          WHEN ${isSingleWord} AND category_words ~ ('(^| )' || ${normalizedQuery} || '( |$)') THEN 1
          WHEN name_words ~ ('(^| )' || ${normalizedQuery} || '( |$)') THEN 2
          WHEN lower(name) = ${normalizedQuery} THEN 3
          WHEN name ILIKE ${prefix} THEN 4
          WHEN EXISTS (SELECT 1 FROM unnest(aliases) a WHERE lower(a) = ${normalizedQuery}) THEN 5
          WHEN name ILIKE ${contains} THEN 6
          WHEN EXISTS (SELECT 1 FROM unnest(aliases) a WHERE a ILIKE ${contains}) THEN 7
          WHEN brand ILIKE ${contains} THEN 8
          ELSE 9 END AS relevance
        FROM candidates
      )
      SELECT ean, name, brand, quantity, image_url AS "imageUrl",
             category, source, aliases, last_seen_at AS "lastSeenAt", relevance AS rank
      FROM ranked
      ORDER BY relevance, (image_url IS NULL), name, ean
      LIMIT 100
    `;
    return NextResponse.json({
      ok: true, query: q, products: rows, count: rows.length, readOnly: true,
      elapsedMs: Date.now() - started, searchVersion: "neon-category-aware-v3",
      categoryExpansion: "generic-category-token",
      truncated: rows.length === 100
    });
  } catch (error) {
    console.error("[neon-first-search] query failed", error);
    return NextResponse.json({ ok: false, error: "Search unavailable", searchVersion: "neon-category-aware-v3" }, { status: 500 });
  }
}

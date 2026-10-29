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
  const variants = new Set([normalizedQuery]);
  if (isSingleWord && /^[a-zåäö]{5,}$/u.test(normalizedQuery)) {
    if (/[aä]t$/u.test(normalizedQuery)) variants.add(normalizedQuery.slice(0, -2) + normalizedQuery.at(-2));
    else if (normalizedQuery.endsWith("t")) variants.add(normalizedQuery.slice(0, -1));
  }
  const categoryTermPattern = "(^| )(" + [...variants].join("|") + ")( |$)";
  const variantNamePatterns = [...variants].filter(v => v !== normalizedQuery).map(v => "%" + v + "%");
  const potatoIntent = /^(peruna|perunat)$/i.test(q);
  const potatoLeaf = "%/juurekset/perunat";
  const milkIntent = /^(maito|maidot)$/i.test(q);
  const milkLeaf = "%/maidot-ja-piimat/maidot";
  const milkSpecial = "%/maidot-ja-piimat/erikoismaidot";
  const milkLactose = "%/maidot-ja-piimat/laktoosittomat-ja-vahalaktoosiset-maidot";
  const started = Date.now();

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      WITH candidates AS (
        SELECT ean, name, brand, quantity, image_url, category, source, aliases, last_seen_at,
          lower(regexp_replace(coalesce(category, ''), '[^[:alnum:]]+', ' ', 'g')) AS category_words,
          lower(regexp_replace(coalesce(name, ''), '[^[:alnum:]]+', ' ', 'g')) AS name_words,
          lower(regexp_replace(split_part(coalesce(category, ''), '/', array_length(string_to_array(coalesce(category, ''), '/'), 1)), '[^[:alnum:]]+', ' ', 'g')) AS category_leaf_words
        FROM ziiply_ean_products
        WHERE (${isEan} AND ean = ${q})
           OR name ILIKE ${contains}
           OR brand ILIKE ${contains}
           OR EXISTS (SELECT 1 FROM unnest(aliases) a WHERE a ILIKE ${contains})
           OR (${isSingleWord} AND lower(regexp_replace(coalesce(category, ''), '[^[:alnum:]]+', ' ', 'g')) ~ ${categoryTermPattern})
           OR (${isSingleWord} AND EXISTS (SELECT 1 FROM unnest(${variantNamePatterns}::text[]) pattern WHERE name ILIKE pattern))
      ), ranked AS (
        SELECT *, CASE
          WHEN ${isEan} AND ean = ${q} THEN 0
          WHEN ${milkIntent} AND (category ILIKE ${milkLeaf} OR category ILIKE ${milkLactose}) THEN 1
          WHEN ${milkIntent} AND category ILIKE ${milkSpecial} THEN 2
          WHEN ${milkIntent} AND name_words ~ '(^| )maito( |$)' THEN 3
          WHEN ${milkIntent} AND (name ILIKE '%maitojuoma%' OR name ILIKE '%kevytmaito%' OR name ILIKE '%täysmaito%' OR name ILIKE '%rasvaton maito%') THEN 4
          WHEN ${milkIntent} THEN 20
          WHEN ${potatoIntent} AND category ILIKE ${potatoLeaf} THEN 1
          WHEN ${potatoIntent} AND (name_words ~ '(^| )peruna( |$)' OR name_words ~ '(^| )perunat( |$)') AND (category IS NULL OR category NOT ILIKE 'lemmikit/%') THEN 3
          WHEN ${potatoIntent} THEN 20
          ELSE (
            20
            - CASE WHEN ${isSingleWord} AND category_words ~ ('(^| )' || ${normalizedQuery} || '( |$)') THEN 8 ELSE 0 END
            - CASE WHEN ${isSingleWord} AND category_leaf_words ~ ('(^| )' || ${normalizedQuery} || '( |$)') THEN 3 ELSE 0 END
            - CASE WHEN ${isSingleWord} AND category_leaf_words = ${normalizedQuery} THEN 4 ELSE 0 END
            - CASE WHEN ${isSingleWord} AND lower(trim(coalesce(category, ''))) = ${normalizedQuery} THEN 3 ELSE 0 END
            - CASE WHEN ${isSingleWord} AND category_words ~ ${categoryTermPattern}
                     AND category_words !~ ('(^| )' || ${normalizedQuery} || '( |$)') THEN 2 ELSE 0 END
            - CASE WHEN name_words ~ ('(^| )' || ${normalizedQuery} || '( |$)') THEN 6 ELSE 0 END
            - CASE WHEN lower(name) = ${normalizedQuery} THEN 3 ELSE 0 END
            - CASE WHEN name ILIKE ${prefix} THEN 2 ELSE 0 END
            - CASE WHEN name ILIKE ${contains} THEN 1 ELSE 0 END
            - CASE WHEN ${isSingleWord} AND EXISTS (SELECT 1 FROM unnest(${variantNamePatterns}::text[]) pattern WHERE name ILIKE pattern) THEN 1 ELSE 0 END
            - CASE WHEN EXISTS (SELECT 1 FROM unnest(aliases) a WHERE lower(a) = ${normalizedQuery}) THEN 3 ELSE 0 END
            - CASE WHEN EXISTS (SELECT 1 FROM unnest(aliases) a WHERE a ILIKE ${contains}) THEN 1 ELSE 0 END
            - CASE WHEN brand ILIKE ${contains} THEN 1 ELSE 0 END
          )
 END AS relevance
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
      elapsedMs: Date.now() - started, searchVersion: "neon-category-aware-v10",
      categoryExpansion: "exact-leaf-and-name-category-relevance",
      truncated: rows.length === 100
    });
  } catch (error) {
    console.error("[neon-first-search] query failed", error);
    return NextResponse.json({ ok: false, error: "Search unavailable", searchVersion: "neon-category-aware-v3" }, { status: 500 });
  }
}

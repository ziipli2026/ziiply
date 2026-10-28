import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

// Isolated read-only endpoint for the Neon-first product-search experiment.
// The existing scanner and production search routes are not modified.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 160);
  if (q.length < 2) {
    return NextResponse.json({ ok: false, error: "Query must contain at least 2 characters" }, { status: 400 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 503 });
  }
  try {
    const sql = neon(process.env.DATABASE_URL);
    const prefix = q + "%";
    const contains = "%" + q + "%";
    const rows = await sql`
      SELECT ean, name, brand, quantity, image_url AS "imageUrl",
             category, source, aliases, last_seen_at AS "lastSeenAt",
             CASE
               WHEN lower(name) = lower(${q}) THEN 0
               WHEN name ILIKE ${prefix} THEN 1
               WHEN brand ILIKE ${prefix} THEN 2
               WHEN EXISTS (SELECT 1 FROM unnest(aliases) a WHERE a ILIKE ${prefix}) THEN 3
               WHEN name ILIKE ${contains} THEN 4
               ELSE 5
             END AS rank
      FROM ziiply_ean_products
      WHERE name ILIKE ${contains}
         OR brand ILIKE ${contains}
         OR EXISTS (SELECT 1 FROM unnest(aliases) a WHERE a ILIKE ${contains})
      ORDER BY rank ASC, name ASC, ean ASC
      LIMIT 100
    `;
    return NextResponse.json({ ok: true, query: q, products: rows, count: rows.length, readOnly: true });
  } catch (error) {
    console.error("Neon-first search failed", error);
    return NextResponse.json({ ok: false, error: "Search unavailable" }, { status: 500 });
  }
}

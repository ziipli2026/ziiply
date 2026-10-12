import { NextRequest, NextResponse } from "next/server";
import eurosparFeed from "../../components/ziiply/offerSearch/providers/eurospar-feed.json";

import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedImages = new Set(
  (Array.isArray((eurosparFeed as any)?.offers) ? (eurosparFeed as any).offers : [])
    .map((offer: any) => String(offer?.imageUrl || "").trim())
    .filter(Boolean),
);

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const original = eurosparFeed.offers.find((offer) => offer.id === id);
    if (!original || !process.env.DATABASE_URL) {
      return NextResponse.json({ ok: false, error: "Image not found" }, { status: 404 });
    }
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL);
      const publication = `${eurosparFeed.issue}:image-bank:v1`;
      const rows = await sql`
        SELECT item->>'imageData' AS data,
               item->'imageEvidence'->>'imageSha256' AS sha
        FROM ziiply_offer_publications p, jsonb_array_elements(p.offers) item
        WHERE p.chain = 'EUROSPAR' AND p.publication_id = ${publication}
          AND p.approval_state = 'image-verified'
          AND item->>'id' = ${id} AND item->>'name' = ${original.name}
          AND item->'imageEvidence'->>'pdfSha256' = ${original.sourceEvidence.pdfSha256}
          AND item->>'imageVerified' = 'true' AND item->>'imageMime' = 'image/png'
        LIMIT 1
      `;
      const row = rows[0];
      if (!row || typeof row.data !== "string" || row.data.length > 2000000 ||
          !/^[a-f0-9]{64}$/.test(String(row.sha)) ||
          request.nextUrl.searchParams.get("v") !== row.sha) {
        return NextResponse.json({ ok: false, error: "Image not found" }, { status: 404 });
      }
      const bytes = Buffer.from(row.data, "base64");
      if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ||
          createHash("sha256").update(bytes).digest("hex") !== row.sha) {
        return NextResponse.json({ ok: false, error: "Invalid stored image" }, { status: 502 });
      }
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          "Content-Type": "image/png",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
          ETag: `"${row.sha}"`,
        },
      });
    } catch (error) {
      console.warn("[EUROSPAR] Neon image unavailable", error);
      return NextResponse.json({ ok: false, error: "Image unavailable" }, { status: 503 });
    }
  }
  const source = String(request.nextUrl.searchParams.get("src") || "").trim();
  if (!source || !allowedImages.has(source)) {
    return NextResponse.json({ ok: false, error: "Image not allowed" }, { status: 404 });
  }

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid image URL" }, { status: 400 });
  }
  if (url.protocol !== "https:") {
    return NextResponse.json({ ok: false, error: "Invalid image protocol" }, { status: 400 });
  }

  const upstream = await fetch(url, {
    cache: "force-cache",
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; Ziiply/1.0; +https://ziiply.fi)",
      "Accept-Language": "fi-FI,fi;q=0.9,en;q=0.7",
    },
  });
  if (!upstream.ok) {
    return NextResponse.json({ ok: false, error: "Upstream image unavailable" }, { status: 502 });
  }
  const contentType = upstream.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "Upstream did not return an image" }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

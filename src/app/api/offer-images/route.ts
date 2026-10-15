import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Read-only bridge for offer providers. Images are returned only after the
// enrichment queue has verified an exact EAN or publisher-provided image.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const chain = params.get("chain")?.trim().slice(0, 60);
  const publication = params.get("publication")?.trim().slice(0, 160);
  const ids = [...new Set(params.getAll("productId").map(s => s.trim().slice(0,160)).filter(Boolean))].slice(0,100);
  if (!chain || !publication || !ids.length) {
    return NextResponse.json({ok:false,error:"chain, publication and productId required"},{status:400});
  }
  if (!process.env.DATABASE_URL) return NextResponse.json({ok:false,error:"Database unavailable"},{status:503});
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT product_id AS "productId",image_url AS "imageUrl",image_source AS "source"
      FROM ziiply_offer_image_queue
      WHERE chain=${chain} AND publication=${publication}
      AND product_id = ANY(${ids}) AND status='ready' AND image_url LIKE 'https://%'`;
    return NextResponse.json({ok:true,images:rows},{headers:{"Cache-Control":"public, s-maxage=120, stale-while-revalidate=300"}});
  } catch {
    return NextResponse.json({ok:false,error:"Image registry unavailable"},{status:503});
  }
}

import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ok:false,error:"Database unavailable"},{status:503});
  try {
    const sql = neon(process.env.DATABASE_URL);
    const runs = await sql`SELECT run_at,discovered,enriched,retried,pending,ready
      FROM ziiply_offer_image_runs ORDER BY run_at DESC LIMIT 30`;
    const byChain = await sql`SELECT chain,status,COUNT(*)::int AS count
      FROM ziiply_offer_image_queue GROUP BY chain,status ORDER BY chain,status`;
    const pendingWithoutEan = await sql`SELECT COUNT(*)::int AS count
      FROM ziiply_offer_image_queue WHERE status='pending' AND (ean IS NULL OR ean='')`;
    const orphaned = await sql`SELECT q.chain,q.publication,COUNT(*)::int AS count
      FROM ziiply_offer_image_queue q
      WHERE q.status='pending' AND NOT EXISTS (
        SELECT 1 FROM ziiply_offer_publications p
        WHERE p.chain=q.chain AND p.publication_id=q.publication)
      GROUP BY q.chain,q.publication ORDER BY count DESC LIMIT 30`;
    return NextResponse.json({ok:true,lastRun:runs[0] ?? null,runs,byChain,pendingWithoutEan:Number(pendingWithoutEan[0]?.count ?? 0),orphaned},
      {headers:{"Cache-Control":"no-store"}});
  } catch {
    return NextResponse.json({ok:false,error:"No enrichment run data yet or database unavailable"},{status:503});
  }
}

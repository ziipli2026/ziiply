import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const name = String(request.nextUrl.searchParams.get("storeName") ?? "").trim();
  if (name.length > 100 || !/^K-Citymarket\s+[^<>/\\]{2,}$/i.test(name)) {
    return NextResponse.json({ error: "Invalid store" }, { status: 400 });
  }
  if (!process.env.DATABASE_URL) return NextResponse.json({ fresh: false });
  const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT updated_at FROM public.ziiply_kcitymarket_tjek_snapshots WHERE store_key = ${key} AND updated_at > NOW() - INTERVAL '3 minutes' AND jsonb_array_length(offers) > 0 LIMIT 1`;
    return NextResponse.json({ fresh: rows.length > 0 });
  } catch {
    return NextResponse.json({ fresh: false });
  }
}

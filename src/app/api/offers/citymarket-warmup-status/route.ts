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
    const rows = await sql`SELECT store_key, updated_at, jsonb_array_length(offers) AS offer_count FROM public.ziiply_kcitymarket_tjek_snapshots WHERE store_key IN (${key}, ${"k ruoka " + key}) ORDER BY updated_at DESC`;
    return NextResponse.json({ fresh: rows.some(row => String(row.store_key) === key && Number(row.offer_count) > 0 && Date.now() - new Date(String(row.updated_at)).getTime() < 3 * 60 * 1000), sources: rows.map(row => ({ source: String(row.store_key).startsWith("k ruoka ") ? "k-ruoka" : "tjek", count: Number(row.offer_count), updatedAt: row.updated_at })) });
  } catch {
    return NextResponse.json({ fresh: false });
  }
}

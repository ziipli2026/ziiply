import { after, NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { refreshKCitymarketSelectedStoreSnapshot } from "@/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider";

export const runtime = "nodejs";
export const maxDuration = 300;

// Existing collector, triggered when a Citymarket is selected. Do not block Gösta.
const inFlight = new Set<string>();
const recentAttempts = new Map<string, number>();
const MIN_RETRY_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  let name = "";
  try {
    const body = await request.json();
    name = String(body?.storeName ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (name.length > 100 || !/^K-Citymarket\s+[^<>/\\]{2,}$/i.test(name)) {
    return NextResponse.json({ ok: false, error: "Invalid K-Citymarket selection" }, { status: 400 });
  }
  const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "Campaign storage unavailable" }, { status: 503 });
  }
  if (inFlight.has(key)) return NextResponse.json({ ok: true, status: "running" });
  const now = Date.now();
  if (now - (recentAttempts.get(key) ?? 0) < MIN_RETRY_MS) {
    return NextResponse.json({ ok: true, status: "recently-requested" });
  }
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT updated_at FROM public.ziiply_kcitymarket_tjek_snapshots WHERE store_key = ${key} AND updated_at > NOW() - INTERVAL '15 minutes' LIMIT 1`;
    if (rows.length) return NextResponse.json({ ok: true, status: "fresh" });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Campaign freshness check failed" }, { status: 503 });
  }
  inFlight.add(key);
  recentAttempts.set(key, now);
  after(async () => {
    try {
      await refreshKCitymarketSelectedStoreSnapshot(name);
    } catch (error) {
      console.warn("[Gösta Citymarket selection refresh]", name, error);
    } finally {
      inFlight.delete(key);
    }
  });
  return NextResponse.json({ ok: true, status: "scheduled" });
}

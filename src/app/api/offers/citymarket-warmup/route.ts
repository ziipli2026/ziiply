import { after, NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { refreshKCitymarketSelectedStoreSnapshot } from "@/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider";

export const runtime = "nodejs";
export const maxDuration = 300;

// Existing collector, triggered when a Citymarket is selected. Do not block Gösta.
const inFlight = new Set<string>();
const recentAttempts = new Map<string, number>();
const recentFailures = new Map<string, string>();
const MIN_RETRY_MS = 15 * 60 * 1000;
const FAILURE_RETRY_MS = 60 * 1000;

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
  if (now - (recentAttempts.get(key) ?? 0) < (recentFailures.has(key) ? FAILURE_RETRY_MS : MIN_RETRY_MS)) {
    return NextResponse.json({ ok: true, status: "recently-requested" });
  }
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT updated_at FROM public.ziiply_kcitymarket_tjek_snapshots WHERE store_key = ${key} AND updated_at > NOW() - INTERVAL '15 minutes' AND jsonb_array_length(offers) > 0 LIMIT 1`;
    if (rows.length) return NextResponse.json({ ok: true, status: "fresh" });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Campaign freshness check failed" }, { status: 503 });
  }
  inFlight.add(key);
  recentAttempts.set(key, now);
  console.info("[Gösta Citymarket warmup] scheduled", { storeName: name, key });
  after(async () => {
    const startedAt = Date.now();
    console.info("[Gösta Citymarket warmup] started", { storeName: name, key });
    try {
      const offers = await refreshKCitymarketSelectedStoreSnapshot(name);
      recentFailures.delete(key);
      console.info("[Gösta Citymarket warmup] published", { storeName: name, key, count: offers.length, elapsedMs: Date.now() - startedAt });
    } catch (error) {
      recentFailures.set(key, error instanceof Error ? error.message : String(error));
      recentAttempts.set(key, Date.now());
      console.error("[Gösta Citymarket warmup] failed", { storeName: name, key, elapsedMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) });
    } finally {
      inFlight.delete(key);
    }
  });
  return NextResponse.json({ ok: true, status: "scheduled" });
}

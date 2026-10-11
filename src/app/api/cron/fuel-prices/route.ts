import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";
const HOURS = new Set([6, 10, 15, 20]);
const localHour = () => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Helsinki", hour: "2-digit", hourCycle: "h23" }).format(new Date()));

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const hour = localHour();
  if (!HOURS.has(hour)) return NextResponse.json({ ok: true, skipped: true, localHour: hour });
  const endpoint = process.env.ZIIPLY_FUEL_IMPORT_URL;
  const connection = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!endpoint || !connection) return NextResponse.json({ ok: false, error: "Fuel import provider or database not configured" }, { status: 503 });
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") throw new Error("HTTPS import endpoint required");
    const headers: Record<string,string> = { accept: "application/json" };
    if (process.env.ZIIPLY_FUEL_IMPORT_TOKEN) headers.authorization = `Bearer ${process.env.ZIIPLY_FUEL_IMPORT_TOKEN}`;
    const response = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw new Error(`Import source HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload?.observations)) throw new Error("Expected observations array");
    const sql = neon(connection);
    let imported = 0, rejected = 0;
    for (const row of payload.observations.slice(0, 20000)) {
      const id = Number(row.stationId);
      const type = String(row.fuelType || "").toLowerCase();
      const fuel = type === "95e10" ? "95" : type === "98e5" || type === "98e05" ? "98" : type;
      const price = Number(row.price);
      const timestamp = new Date(row.observedAt);
      if (!Number.isSafeInteger(id) || id <= 0 || !["95","98","diesel"].includes(fuel) || !Number.isFinite(price) || price <= 0 || price > 5 || !Number.isFinite(timestamp.getTime()) || timestamp.getTime() > Date.now() + 600000) { rejected++; continue; }
      const matches = await sql`SELECT source FROM ziiply_fuel_stations WHERE source='tankkaus.com' AND source_station_id=${id} AND lower(coalesce(chain,'')) NOT LIKE '%teboil%' AND lower(coalesce(name,'')) NOT LIKE '%teboil%' LIMIT 1`;
      if (!matches.length) { rejected++; continue; }
      const existing = await sql`SELECT 1 FROM ziiply_fuel_price_observations WHERE source='tankkaus.com' AND source_station_id=${id} AND fuel_type=${fuel} AND observed_at=${timestamp.toISOString()} LIMIT 1`;
      if (existing.length) continue;
      await sql`INSERT INTO ziiply_fuel_price_observations (source,source_station_id,fuel_type,price_eur_per_litre,observed_at) VALUES ('tankkaus.com',${id},${fuel},${price},${timestamp.toISOString()})`;
      imported++;
    }
    return NextResponse.json({ ok: true, imported, rejected, received: payload.observations.length, localHour: hour });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 502 });
  }
}

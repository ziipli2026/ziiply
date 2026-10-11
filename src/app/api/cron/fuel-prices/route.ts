import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { collectNational, persistNational, TEST_BRANCH } from "../../../../../scripts/lib/tankkaus-national.mjs";
import { fuelRefreshDue } from "../../../../../scripts/lib/fuel-refresh-schedule.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!fuelRefreshDue()) return NextResponse.json({ ok: true, skipped: true, timeZone: "Europe/Helsinki" });
  const connection = process.env.TANKKAUS_TEST_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connection || !process.env.TANKKAUS_API_TOKEN) {
    return NextResponse.json({ ok: false, error: "Fuel collector credentials missing" }, { status: 503 });
  }
  try {
    const sql = neon(connection);
    const identity = await sql`SELECT current_setting('neon.branch_id',true) AS branch_id`;
    if (identity[0]?.branch_id !== TEST_BRANCH) {
      return NextResponse.json({ ok: false, error: "Fuel writes are enabled only for the approved Neon test branch" }, { status: 503 });
    }
    const batch = await collectNational({ token: process.env.TANKKAUS_API_TOKEN });
    const saved = await persistNational(sql, batch);
    return NextResponse.json({ ok: true, ...batch.report, ...saved, timeZone: "Europe/Helsinki" });
  } catch {
    return NextResponse.json({ ok: false, error: "Fuel collection failed; incomplete batches are not imported" }, { status: 502 });
  }
}

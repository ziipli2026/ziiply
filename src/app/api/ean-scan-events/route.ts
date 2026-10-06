import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const schema = `
  CREATE TABLE IF NOT EXISTS ziiply_ean_scan_event_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ean TEXT,
    chain TEXT,
    store_id TEXT,
    outcome TEXT NOT NULL,
    message TEXT,
    source TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb
  );
  CREATE INDEX IF NOT EXISTS ziiply_ean_scan_event_log_created_idx
    ON ziiply_ean_scan_event_log (created_at DESC, id DESC);
  CREATE INDEX IF NOT EXISTS ziiply_ean_scan_event_log_outcome_idx
    ON ziiply_ean_scan_event_log (outcome, created_at DESC);
`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ean = typeof body?.ean === "string" ? body.ean.replace(/\D/g, "").slice(0, 20) : null;
    const chain = typeof body?.chain === "string" ? body.chain.slice(0, 80) : null;
    const storeId = typeof body?.storeId === "string" ? body.storeId.slice(0, 120) : null;
    const outcome = typeof body?.outcome === "string" ? body.outcome.slice(0, 80) : "";
    const message = typeof body?.message === "string" ? body.message.slice(0, 240) : null;
    const source = typeof body?.source === "string" ? body.source.slice(0, 80) : "scanner";
    if (!outcome) return NextResponse.json({ ok: false, error: "outcome puuttuu" }, { status: 400 });
    const sql = neon(process.env.DATABASE_URL!);
    await sql.query(schema);
    await sql`INSERT INTO ziiply_ean_scan_event_log (ean,chain,store_id,outcome,message,source,details)
      VALUES (${ean},${chain},${storeId},${outcome},${message},${source},${JSON.stringify(body?.details ?? {})})`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

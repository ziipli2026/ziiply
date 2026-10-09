import { AccountBodyError, readAccountJson } from "@/lib/account/body";
import { isolatedAccountDatabase } from "@/lib/account/database";
import { neon } from "@neondatabase/serverless";
import { getAccountAuth } from "@/lib/account/auth";
import { accountLabEnabled } from "@/lib/account/config";
import { validateGuestSnapshot } from "@/lib/account/guest";
export async function POST(request: Request) {
  if (!accountLabEnabled()) return new Response(null, { status: 404 });
  // Same-origin POST plus server-side session. Guest IDs never grant authorization.
  const origin = process.env.ZIIPLY_ACCOUNT_ORIGIN;
  if (!origin || request.headers.get("origin") !== origin) return new Response(null, { status: 403 });
  try {
    const { data: session } = await getAccountAuth().getSession();
    if (!session?.user) return new Response(null, { status: 401 });
    const url = isolatedAccountDatabase(process.env);
    // Dedicated development connection only: never fall back to product DATABASE_URL.
    const raw = await readAccountJson(request);
    let snapshot;
    try { snapshot = validateGuestSnapshot(raw); } catch { return new Response(null, { status: 400 }); }
    const sql = neon(url);
    // Immutable, deduplicated import. No automatic merge or overwrite of existing baskets.
    const rows = await sql`INSERT INTO ziiply_accounts.guest_imports (user_id, snapshot)
      VALUES (${session.user.id}, ${JSON.stringify(snapshot)}::jsonb)
      ON CONFLICT (user_id, snapshot_hash) DO UPDATE SET user_id = EXCLUDED.user_id
      RETURNING id`;
    return Response.json({ id: rows[0].id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AccountBodyError) return new Response(null, { status: error.status });
    return Response.json({ error: "Account import unavailable" }, { status: 503 });
  }
}

export async function GET() {
  if (!accountLabEnabled()) return new Response(null, { status: 404 });
  try {
    const { data: session } = await getAccountAuth().getSession();
    if (!session?.user) return new Response(null, { status: 401 });
    const sql = neon(isolatedAccountDatabase(process.env));
    const rows = await sql`SELECT id, snapshot, created_at FROM ziiply_accounts.guest_imports
      WHERE user_id = ${session.user.id} ORDER BY id DESC LIMIT 20`;
    return Response.json({ imports: rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Account imports unavailable" }, { status: 503 });
  }
}

import { isolatedAccountDatabase } from "@/lib/account/database";
import { neon } from "@neondatabase/serverless";
import { getAccountAuth } from "@/lib/account/auth";
import { accountLabEnabled } from "@/lib/account/config";
import { validateGuestSnapshot } from "@/lib/account/guest";
export async function POST(request: Request) {
  if (!accountLabEnabled()) return new Response(null, { status: 404 });
  // Same-origin POST plus server-side session. Guest IDs never grant authorization.
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  try {
    const { data: session } = await getAccountAuth().getSession();
    if (!session?.user) return new Response(null, { status: 401 });
    const url = isolatedAccountDatabase(process.env);
    // Dedicated development connection only: never fall back to product DATABASE_URL.
    if (!request.body) return new Response(null, { status: 400 });
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 256_000) { await reader.cancel(); return new Response(null, { status: 413 }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const raw = new TextDecoder().decode(bytes);
    let snapshot;
    try { snapshot = validateGuestSnapshot(JSON.parse(raw)); } catch { return new Response(null, { status: 400 }); }
    const sql = neon(url);
    // Immutable, deduplicated import. No automatic merge or overwrite of existing baskets.
    const rows = await sql`INSERT INTO ziiply_accounts.guest_imports (user_id, snapshot)
      VALUES (${session.user.id}, ${JSON.stringify(snapshot)}::jsonb)
      ON CONFLICT (user_id, snapshot_hash) DO UPDATE SET user_id = EXCLUDED.user_id
      RETURNING id`;
    return Response.json({ id: rows[0].id }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Account import unavailable" }, { status: 503 });
  }
}

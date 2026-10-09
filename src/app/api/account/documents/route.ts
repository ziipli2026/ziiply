import { neon } from "@neondatabase/serverless";
import { isolatedAccountDatabase } from "@/lib/account/database";
import { getAccountAuth } from "@/lib/account/auth";
import { accountLabEnabled } from "@/lib/account/config";
import { AccountBodyError, readAccountJson } from "@/lib/account/body";
import { DOCUMENT_ID_PATTERN, validateDocumentWrite } from "@/lib/account/document";
const noStore = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  if (!accountLabEnabled()) return new Response(null, { status: 404 });
  try {
    const { data: session } = await getAccountAuth().getSession();
    if (!session?.user) return new Response(null, { status: 401 });
    const id = new URL(request.url).searchParams.get("id");
    if (id && !DOCUMENT_ID_PATTERN.test(id)) return new Response(null, { status: 400 });
    const sql = neon(isolatedAccountDatabase(process.env));
    if (id) {
      const rows = await sql`SELECT id, revision, snapshot, updated_at AS "updatedAt" FROM ziiply_accounts.documents WHERE user_id=${session.user.id} AND id=${id}::uuid`;
      return rows[0] ? Response.json({ document: rows[0] }, { headers: noStore }) : new Response(null, { status: 404 });
    }
    const rows = await sql`SELECT id, revision, snapshot, updated_at AS "updatedAt" FROM ziiply_accounts.documents WHERE user_id=${session.user.id} ORDER BY updated_at DESC, id LIMIT 20`;
    return Response.json({ documents: rows }, { headers: noStore });
  } catch { return Response.json({ error: "Account documents unavailable" }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!accountLabEnabled()) return new Response(null, { status: 404 });
  if (!process.env.ZIIPLY_ACCOUNT_ORIGIN || request.headers.get("origin") !== process.env.ZIIPLY_ACCOUNT_ORIGIN) return new Response(null, { status: 403 });
  try {
    const { data: session } = await getAccountAuth().getSession();
    if (!session?.user) return new Response(null, { status: 401 });
    const raw = await readAccountJson(request);
    let input;
    try { input = validateDocumentWrite(raw); } catch { return new Response(null, { status: 400 }); }
    const sql = neon(isolatedAccountDatabase(process.env));
    const rows = await sql`SELECT ziiply_accounts.save_document(${session.user.id},${input.id}::uuid,${input.mutationId}::uuid,${input.expectedRevision}::integer,${JSON.stringify(input.snapshot)}::jsonb) AS result`;
    const result = rows[0].result;
    const status = result.outcome === "saved" ? 200 : result.outcome === "too_large" ? 413 : 409;
    return Response.json(result, { status, headers: noStore });
  } catch (error) {
    if (error instanceof AccountBodyError) return new Response(null, { status: error.status });
    return Response.json({ error: "Account document save unavailable" }, { status: 503 });
  }
}

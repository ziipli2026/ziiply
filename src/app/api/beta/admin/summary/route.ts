import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { hashBetaToken } from "../../../../../lib/ziiplyBetaAuthTokens.mjs";
import { BETA_COOKIE_NAME } from "../../../../../lib/ziiplyBetaSessionSecurity.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
export async function GET(request: NextRequest) {
  // Fail closed: an explicitly configured admin account is required.
  const adminEmail = process.env.ZIIPLY_BETA_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || !process.env.DATABASE_URL) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  const token = request.cookies.get(BETA_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  let hash: string;
  try { hash = hashBetaToken(token); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore }); }
  const sql = neon(process.env.DATABASE_URL);
  const authorized = await sql`
    SELECT 1 FROM public.ziiply_beta_sessions s
    JOIN public.ziiply_beta_users u ON u.id = s.user_id
    JOIN public.ziiply_beta_applications a ON a.id = u.application_id
    WHERE s.token_hash = ${hash} AND s.revoked_at IS NULL AND s.expires_at > now()
      AND u.disabled_at IS NULL AND a.status = 'active'
      AND lower(a.email) = ${adminEmail} LIMIT 1`;
  if (!authorized.length) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  const counts = await sql`
    SELECT status, count(*)::integer AS count FROM public.ziiply_beta_applications
    GROUP BY status ORDER BY status`;
  return NextResponse.json({ ok: true, counts }, { headers: noStore });
}

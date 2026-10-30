import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { BETA_COOKIE_NAME } from "../../../../../lib/ziiplyBetaSessionSecurity.mjs";
import { hashBetaToken } from "../../../../../lib/ziiplyBetaAuthTokens.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: NextRequest) {
  const token = request.cookies.get(BETA_COOKIE_NAME)?.value;
  if (!token || !process.env.DATABASE_URL) return NextResponse.json({ authenticated: false }, { headers });
  let hash: string;
  try { hash = hashBetaToken(token); } catch { return NextResponse.json({ authenticated: false }, { headers }); }
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    SELECT s.expires_at FROM public.ziiply_beta_sessions s
    JOIN public.ziiply_beta_users u ON u.id = s.user_id
    JOIN public.ziiply_beta_applications a ON a.id = u.application_id
    WHERE s.token_hash = ${hash} AND s.revoked_at IS NULL
      AND s.expires_at > now() AND u.disabled_at IS NULL
      AND a.status IN ('invited','active') LIMIT 1`;
  return NextResponse.json({ authenticated: rows.length > 0 }, { headers });
}

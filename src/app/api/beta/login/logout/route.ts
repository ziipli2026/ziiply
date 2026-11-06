import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { BETA_COOKIE_NAME, betaCookieOptions } from "../../../../../lib/ziiplyBetaSessionSecurity.mjs";
import { hashBetaToken } from "../../../../../lib/ziiplyBetaAuthTokens.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!process.env.ZIIPLY_PUBLIC_ORIGIN || origin !== process.env.ZIIPLY_PUBLIC_ORIGIN)
    return NextResponse.json({ ok: false }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const token = request.cookies.get(BETA_COOKIE_NAME)?.value;
  if (token && process.env.DATABASE_URL) {
    let hash: string | null = null;
    try { hash = hashBetaToken(token); } catch { /* invalid cookie */ }
    if (hash) {
      const sql = neon(process.env.DATABASE_URL);
      try {
        await sql`UPDATE public.ziiply_beta_sessions SET revoked_at = now()
          WHERE token_hash = ${hash} AND revoked_at IS NULL`;
      } catch {
        // Clear the browser cookie even if the database cannot revoke the server session.
        // Do not report successful server-side revocation in this case.
        const response = NextResponse.json({ ok: false, code: "SESSION_REVOCATION_FAILED" }, { status: 503, headers: { "Cache-Control": "no-store" } });
        response.cookies.set(BETA_COOKIE_NAME, "", { ...betaCookieOptions(0), sameSite: "lax" as const, maxAge: 0 });
        return response;
      }
    }
  }
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(BETA_COOKIE_NAME, "", { ...betaCookieOptions(0), sameSite: "lax" as const, maxAge: 0 });
  return response;
}

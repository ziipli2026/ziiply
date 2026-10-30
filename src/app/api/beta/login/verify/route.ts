import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { createBetaToken, hashBetaToken, BETA_SESSION_TTL_MS } from "../../../../../lib/ziiplyBetaAuthTokens.mjs";
import { BETA_COOKIE_NAME, betaCookieOptions } from "../../../../../lib/ziiplyBetaSessionSecurity.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  const expected = process.env.ZIIPLY_PUBLIC_ORIGIN;
  if (!expected || request.headers.get("origin") !== expected)
    return NextResponse.json({ ok: false, error: "Origin not allowed" }, { status: 403, headers: noStore });
  if (process.env.ZIIPLY_BETA_LOGIN_ENABLED !== "true" ||
      process.env.ZIIPLY_BETA_RATE_LIMIT_READY !== "true" ||
      !process.env.DATABASE_URL)
    return NextResponse.json({ ok: false, code: "BETA_LOGIN_TEST_NOT_READY" }, { status: 503, headers: noStore });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false }, { status: 400, headers: noStore }); }
  const token = typeof body === "object" && body !== null && "token" in body ? String(body.token) : "";
  let tokenHash: string;
  try { tokenHash = hashBetaToken(token); } catch {
    return NextResponse.json({ ok: false, code: "INVALID_LINK" }, { status: 400, headers: noStore });
  }
  const sql = neon(process.env.DATABASE_URL);
  // One SQL statement consumes the challenge once and creates the session atomically.
  const sessionToken = createBetaToken();
  const sessionHash = hashBetaToken(sessionToken);
  const sessionExpiry = new Date(Date.now() + BETA_SESSION_TTL_MS).toISOString();
  const result = await sql`
    WITH consumed AS (
      UPDATE public.ziiply_beta_login_challenges c
      SET consumed_at = now()
      FROM public.ziiply_beta_applications a
      WHERE c.application_id = a.id
        AND c.token_hash = ${tokenHash}
        AND c.consumed_at IS NULL
        AND c.expires_at > now()
        AND a.status IN ('invited', 'active')
      RETURNING c.application_id
    ), beta_user AS (
      INSERT INTO public.ziiply_beta_users (application_id, email_verified_at)
      SELECT application_id, now() FROM consumed
      ON CONFLICT (application_id)
      DO UPDATE SET email_verified_at = EXCLUDED.email_verified_at
      RETURNING id, disabled_at
    )
    INSERT INTO public.ziiply_beta_sessions (user_id, token_hash, expires_at)
    SELECT id, ${sessionHash}, ${sessionExpiry} FROM beta_user WHERE disabled_at IS NULL
    RETURNING id
  `;
  if (!result.length)
    return NextResponse.json({ ok: false, code: "INVALID_OR_EXPIRED_LINK" }, { status: 400, headers: noStore });
  const response = NextResponse.json({ ok: true }, { headers: noStore });
  response.cookies.set(BETA_COOKIE_NAME, sessionToken,  { ...betaCookieOptions(), sameSite: "lax" as const });
  return response;
}

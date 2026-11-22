import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { hashBetaToken } from "../../../../lib/ziiplyBetaAuthTokens.mjs";
import { BETA_COOKIE_NAME } from "../../../../lib/ziiplyBetaSessionSecurity.mjs";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  const token = request.cookies.get(BETA_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let tokenHash: string;
  try {
    tokenHash = hashBetaToken(token);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const payload = await request.json().catch(() => null);
  const message = typeof payload?.message === "string" ? payload.message.trim() : "";
  if (!message || message.length > 4000 || message.includes("\0")) {
    return NextResponse.json({ error: "invalid_message" }, { status: 400 });
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  try {
    const sql = neon(databaseUrl);
    const rows = await sql`
      INSERT INTO public.ziiply_beta_feedback (user_id, message)
      SELECT u.id, ${message}
      FROM public.ziiply_beta_sessions s
      JOIN public.ziiply_beta_users u ON u.id = s.user_id
      JOIN public.ziiply_beta_applications a ON a.id = u.application_id
      WHERE s.token_hash = ${tokenHash}
        AND s.revoked_at IS NULL AND s.expires_at > now()
        AND u.disabled_at IS NULL AND a.status IN ('invited', 'active')
      LIMIT 1
      RETURNING id
    `;
    if (!rows.length) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ saved: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

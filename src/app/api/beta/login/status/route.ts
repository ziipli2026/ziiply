import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Test-only status: does not reveal accounts, credentials or database contents.
export async function GET() {
  const configured = Boolean(
    process.env.ZIIPLY_PUBLIC_ORIGIN &&
    process.env.DATABASE_URL &&
    process.env.RESEND_API_KEY &&
    process.env.ZIIPLY_BETA_MAIL_FROM
  );
  const enabled = process.env.ZIIPLY_BETA_LOGIN_ENABLED === "true";
  const rateLimitReady = process.env.ZIIPLY_BETA_RATE_LIMIT_READY === "true";
  return NextResponse.json({
    ok: true,
    buildReady: true,
    emailTestReady: configured && enabled && rateLimitReady,
    loginFlowComplete: false,
    reason: "Verification callback and server-side session creation are not yet implemented"
  }, { headers: { "Cache-Control": "no-store" } });
}

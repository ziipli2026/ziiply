import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Test-only status: does not reveal accounts, credentials or database contents.
export async function GET() {
  const configured = Boolean(
    process.env.ZIIPLY_PUBLIC_ORIGIN &&
    process.env.DATABASE_URL &&
    process.env.ZIIPLY_SMTP_HOST &&
    process.env.ZIIPLY_SMTP_USER &&
    process.env.ZIIPLY_SMTP_PASSWORD &&
    process.env.ZIIPLY_BETA_RATE_LIMIT_SECRET &&
    process.env.ZIIPLY_BETA_MAIL_FROM
  );
  const enabled = process.env.ZIIPLY_BETA_LOGIN_ENABLED === "true";
  const rateLimitReady = process.env.ZIIPLY_BETA_RATE_LIMIT_READY === "true";
  return NextResponse.json({
    ok: true,
    buildReady: true,
    emailTestReady: configured && enabled && rateLimitReady,
    loginFlowComplete: true,
    reason: configured && enabled && rateLimitReady ? "ready" : "SMTP, database or beta login activation not configured"
  }, { headers: { "Cache-Control": "no-store" } });
}

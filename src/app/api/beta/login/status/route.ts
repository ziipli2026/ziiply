import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Test-only status: does not reveal accounts, credentials or database contents.
export async function GET() {
  const required = ["ZIIPLY_PUBLIC_ORIGIN", "DATABASE_URL", "ZIIPLY_SMTP_HOST", "ZIIPLY_SMTP_USER", "ZIIPLY_SMTP_PASSWORD", "ZIIPLY_BETA_RATE_LIMIT_SECRET", "ZIIPLY_BETA_MAIL_FROM"] as const;
  const missing = required.filter(key => !process.env[key]);
  const configured = missing.length === 0;
  const enabled = process.env.ZIIPLY_BETA_LOGIN_ENABLED === "true";
  const rateLimitReady = process.env.ZIIPLY_BETA_RATE_LIMIT_READY === "true";
  return NextResponse.json({
    ok: true,
    buildReady: true,
    emailTestReady: configured && enabled && rateLimitReady,
    missingConfigurationKeys: missing,
    activation: { loginEnabled: enabled, rateLimitReady },
    loginFlowComplete: false, // Build success alone is not an end-to-end authenticated login test.
    reason: configured && enabled && rateLimitReady ? "ready" : "SMTP, database or beta login activation not configured"
  }, { headers: { "Cache-Control": "no-store" } });
}

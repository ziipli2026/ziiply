import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const origin = process.env.ZIIPLY_PUBLIC_ORIGIN;
  const required = [
    "DATABASE_URL", "ZIIPLY_SMTP_HOST", "ZIIPLY_SMTP_USER",
    "ZIIPLY_SMTP_PASSWORD", "ZIIPLY_BETA_MAIL_FROM",
    "ZIIPLY_BETA_RATE_LIMIT_SECRET", "ZIIPLY_PUBLIC_ORIGIN"
  ];
  const missing = required.filter(key => !process.env[key]);
  const flagsReady = process.env.ZIIPLY_BETA_LOGIN_ENABLED === "true" &&
    process.env.ZIIPLY_BETA_RATE_LIMIT_READY === "true";
  return NextResponse.json({
    ready: missing.length === 0 && flagsReady,
    missing,
    flagsReady,
    originConfigured: Boolean(origin),
    gateEnabled: process.env.ZIIPLY_BETA_APP_GATE === "true"
  }, { headers: { "Cache-Control": "no-store" } });
}

import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Public readiness endpoint: never expose credential names, values, or deployment configuration.
export async function GET() {
  const required = [
    "DATABASE_URL", "ZIIPLY_SMTP_HOST", "ZIIPLY_SMTP_USER",
    "ZIIPLY_SMTP_PASSWORD", "ZIIPLY_BETA_MAIL_FROM",
    "ZIIPLY_BETA_RATE_LIMIT_SECRET", "ZIIPLY_PUBLIC_ORIGIN"
  ];
  const configured = required.every(key => Boolean(process.env[key]));
  const enabled = process.env.ZIIPLY_BETA_LOGIN_ENABLED === "true" &&
    process.env.ZIIPLY_BETA_RATE_LIMIT_READY === "true";
  return NextResponse.json({ ready: configured && enabled }, {
    headers: { "Cache-Control": "no-store" }
  });
}

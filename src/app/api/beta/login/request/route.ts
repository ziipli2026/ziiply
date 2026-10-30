import { NextResponse } from "next/server";
import { createBetaToken, hashBetaToken, BETA_LOGIN_TTL_MS } from "../../../../../lib/ziiplyBetaAuthTokens.mjs";
import { neon } from "@neondatabase/serverless";
import { createHmac } from "node:crypto";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const generic = () => NextResponse.json({ ok: true, message: "Jos osoite on hyväksytyssä beetarekisterissä, saat kirjautumislinkin." }, { headers: noStore });
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.ZIIPLY_PUBLIC_ORIGIN;
  if (!expected || !origin || origin !== expected)
    return NextResponse.json({ ok: false, error: "Origin not allowed" }, { status: 403, headers: noStore });
  // Stay disabled until shared rate limiting and schema verification are completed.
  if (process.env.ZIIPLY_BETA_LOGIN_ENABLED !== "true" || process.env.ZIIPLY_BETA_RATE_LIMIT_READY !== "true")
    return NextResponse.json({ ok: false, code: "BETA_LOGIN_TEST_NOT_READY" }, { status: 503, headers: noStore });
  const config = [process.env.DATABASE_URL, process.env.ZIIPLY_SMTP_HOST, process.env.ZIIPLY_SMTP_USER, process.env.ZIIPLY_SMTP_PASSWORD, process.env.ZIIPLY_BETA_MAIL_FROM];
  if (config.some(value => !value))
    return NextResponse.json({ ok: false, code: "BETA_LOGIN_NOT_CONFIGURED" }, { status: 503, headers: noStore });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false }, { status: 400, headers: noStore }); }
  const email = typeof body === "object" && body !== null && "email" in body ? String(body.email).trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ ok: false, error: "Virheellinen sähköpostiosoite" }, { status: 400, headers: noStore });
  const sql = neon(process.env.DATABASE_URL!);
  // Only invited or active beta applications are eligible; never expose membership.
  const applications = await sql`SELECT id FROM public.ziiply_beta_applications
    WHERE lower(email) = ${email} AND status IN ('invited','active') LIMIT 1`;
  if (!applications.length) return generic();
  // Per-account throttling is database-backed and shared across all Vercel instances.
  const secret = process.env.ZIIPLY_BETA_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32)
    return NextResponse.json({ ok: false, code: "BETA_LOGIN_NOT_CONFIGURED" }, { status: 503, headers: noStore });
  const emailHash = createHmac("sha256", secret).update(email).digest("hex");
  const allowed = await sql`
    WITH lock AS (
      SELECT pg_advisory_xact_lock(hashtext(${emailHash})) AS acquired
    ), recent AS (
      SELECT count(*)::integer AS attempts
      FROM public.ziiply_beta_login_attempts, lock
      WHERE email_hash = ${emailHash} AND created_at > now() - interval '1 hour'
    ), inserted AS (
      INSERT INTO public.ziiply_beta_login_attempts (email_hash, ip_hash)
      SELECT ${emailHash}, ${emailHash} FROM recent WHERE attempts < 3
      RETURNING id
    ) SELECT id FROM inserted`;
  if (!allowed.length) return generic();
  const token = createBetaToken();
  const tokenHash = hashBetaToken(token);
  const expires = new Date(Date.now() + BETA_LOGIN_TTL_MS).toISOString();
  await sql`INSERT INTO public.ziiply_beta_login_challenges
    (application_id, token_hash, expires_at)
    VALUES (${applications[0].id}, ${tokenHash}, ${expires})`;
  const url = new URL("/beta/kirjaudu/vahvista", expected);
  url.searchParams.set("token", token);
  // Existing Zoner mailbox over authenticated TLS SMTP.
  const { sendBetaLoginEmail } = await import("../../../../../lib/ziiplyBetaSmtp.mjs");
  try {
    await sendBetaLoginEmail({ to: email, loginUrl: url.toString() });
  } catch (error) {
    console.error("[beta-login] SMTP delivery failed", { code: error instanceof Error && "code" in error ? String(error.code) : "unknown" });
    return NextResponse.json({ ok: false, code: "EMAIL_DELIVERY_FAILED" }, { status: 503, headers: noStore });
  }
  return generic();
}

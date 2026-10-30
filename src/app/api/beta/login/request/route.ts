import { NextResponse } from "next/server";
import { createBetaToken, hashBetaToken, BETA_LOGIN_TTL_MS } from "../../../../lib/ziiplyBetaAuthTokens.mjs";
import { neon } from "@neondatabase/serverless";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const generic = () => NextResponse.json({ ok: true, message: "Jos osoite on hyväksytyssä beetarekisterissä, saat kirjautumislinkin." }, { headers: noStore });
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.ZIIPLY_PUBLIC_ORIGIN;
  if (!expected || !origin || origin !== expected)
    return NextResponse.json({ ok: false, error: "Origin not allowed" }, { status: 403, headers: noStore });
  // Stay disabled until shared rate limiting and schema verification are completed.\n  if (process.env.ZIIPLY_BETA_LOGIN_ENABLED !== "true" || process.env.ZIIPLY_BETA_RATE_LIMIT_READY !== "true")\n    return NextResponse.json({ ok: false, code: "BETA_LOGIN_TEST_NOT_READY" }, { status: 503, headers: noStore });\n  const config = [process.env.DATABASE_URL, process.env.RESEND_API_KEY, process.env.ZIIPLY_BETA_MAIL_FROM];
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
  const token = createBetaToken();
  const tokenHash = hashBetaToken(token);
  const expires = new Date(Date.now() + BETA_LOGIN_TTL_MS).toISOString();
  await sql`INSERT INTO public.ziiply_beta_login_challenges
    (application_id, token_hash, expires_at)
    VALUES (${applications[0].id}, ${tokenHash}, ${expires})`;
  const url = new URL("/beta/kirjaudu/vahvista", expected);
  url.searchParams.set("token", token);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.ZIIPLY_BETA_MAIL_FROM,
      to: [email],
      subject: "Ziiply – beetakirjautuminen",
      text: `Kirjaudu Ziiplyyn tästä linkistä (voimassa 15 minuuttia):\n\n${url.toString()}\n\nJos et pyytänyt linkkiä, voit jättää viestin huomiotta.`
    })
  });
  if (!response.ok) return NextResponse.json({ ok: false, code: "EMAIL_DELIVERY_FAILED" }, { status: 503, headers: noStore });
  return generic();
}

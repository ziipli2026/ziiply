import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { createBetaToken, hashBetaToken } from "../../../../../../lib/ziiplyBetaAuthTokens.mjs";
import { createHmac } from "node:crypto";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: NextRequest) {
  const origin = process.env.ZIIPLY_PUBLIC_ORIGIN;
  if (!origin || request.headers.get("origin") !== origin) return NextResponse.json({ok:false}, {status:403,headers});
  if (!process.env.DATABASE_URL || !process.env.ZIIPLY_BETA_RATE_LIMIT_SECRET || !process.env.ZIIPLY_BETA_ADMIN_EMAIL || process.env.ZIIPLY_BETA_LOGIN_ENABLED !== "true") return NextResponse.json({ok:false}, {status:503,headers});
  let body: {email?:string};
  try { body = await request.json(); } catch { return NextResponse.json({ok:false},{status:400,headers}); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const generic = () => NextResponse.json({ok:true,message:"Jos osoite on ylläpitäjän osoite, kirjautumislinkki lähetetään."},{headers});
  if (email !== process.env.ZIIPLY_BETA_ADMIN_EMAIL.trim().toLowerCase()) return generic();
  const sql = neon(process.env.DATABASE_URL);
  const emailHash = createHmac("sha256",process.env.ZIIPLY_BETA_RATE_LIMIT_SECRET).update("admin:"+email).digest("hex");
  const allowed = await sql`
    WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${emailHash}))),
    recent AS (SELECT count(*)::int AS n FROM public.ziiply_beta_login_attempts, lock WHERE email_hash=${emailHash} AND created_at > now()-interval '1 hour'),
    inserted AS (INSERT INTO public.ziiply_beta_login_attempts(email_hash,ip_hash) SELECT ${emailHash},${emailHash} FROM recent WHERE n < 3 RETURNING id)
    SELECT id FROM inserted`;
  if (!allowed.length) return NextResponse.json({ok:false,code:"RATE_LIMITED"},{status:429,headers});
  const token = createBetaToken();
  const hash = hashBetaToken(token);
  const expires = new Date(Date.now()+15*60*1000).toISOString();
  await sql`INSERT INTO public.ziiply_beta_admin_tokens(token_hash,purpose,expires_at) VALUES(${hash},'login',${expires})`;
  const url = new URL("/beta/hallinta/vahvista",origin);
  url.searchParams.set("token",token);
  const {sendBetaLoginEmail} = await import("../../../../../../lib/ziiplyBetaSmtp.mjs");
  try { await sendBetaLoginEmail({to:email,loginUrl:url.toString()}); }
  catch { await sql`DELETE FROM public.ziiply_beta_login_attempts WHERE id=${allowed[0].id}`; return NextResponse.json({ok:false,code:"EMAIL_DELIVERY_FAILED"},{status:503,headers}); }
  return generic();
}

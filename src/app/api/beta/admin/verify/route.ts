import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { createBetaToken, hashBetaToken } from "../../../../../lib/ziiplyBetaAuthTokens.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const origin=new URL(request.url).origin;
  if (request.headers.get("origin")!==origin || !process.env.DATABASE_URL) return NextResponse.json({ok:false},{status:403});
  let body: {token?:string};
  try {body=await request.json();} catch {return NextResponse.json({ok:false},{status:400});}
  let hash:string;
  try {hash=hashBetaToken(body.token||"");} catch {return NextResponse.json({ok:false},{status:400});}
  const sql=neon(process.env.DATABASE_URL);
  const session=createBetaToken(),sessionHash=hashBetaToken(session);
  const expires=new Date(Date.now()+7*24*60*60*1000).toISOString();
  const rows=await sql`
    WITH consumed AS (
      UPDATE public.ziiply_beta_admin_tokens SET consumed_at=now()
      WHERE token_hash=${hash} AND purpose='login' AND consumed_at IS NULL AND expires_at>now()
      RETURNING id
    )
    INSERT INTO public.ziiply_beta_admin_tokens(token_hash,purpose,expires_at)
    SELECT ${sessionHash},'session',${expires} FROM consumed RETURNING id`;
  if (!rows.length) return NextResponse.json({ok:false,code:"INVALID_LINK"},{status:400});
  const response=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  response.cookies.set("__Host-ziiply_beta_admin",session,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:7*24*60*60});
  return response;
}

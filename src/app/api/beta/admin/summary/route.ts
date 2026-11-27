import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { hashBetaToken } from "../../../../../lib/ziiplyBetaAuthTokens.mjs";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function GET(request:NextRequest) {
 if (!process.env.DATABASE_URL || !process.env.ZIIPLY_BETA_ADMIN_EMAIL) return NextResponse.json({error:"Forbidden"},{status:403,headers});
 const token=request.cookies.get("__Host-ziiply_beta_admin")?.value;
 let hash:string;
 try {hash=hashBetaToken(token||"");} catch {return NextResponse.json({error:"Forbidden"},{status:403,headers});}
 const sql=neon(process.env.DATABASE_URL);
 const valid=await sql`SELECT id FROM public.ziiply_beta_admin_tokens WHERE token_hash=${hash} AND purpose='session' AND revoked_at IS NULL AND expires_at>now() LIMIT 1`;
 if (!valid.length) return NextResponse.json({error:"Forbidden"},{status:403,headers});
 const counts=await sql`SELECT status,count(*)::integer AS count FROM public.ziiply_beta_applications GROUP BY status ORDER BY status`;
 return NextResponse.json({ok:true,counts},{headers});
}

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { createBetaToken,hashBetaToken,BETA_LOGIN_TTL_MS } from "../../../../../lib/ziiplyBetaAuthTokens.mjs";
const headers={"Cache-Control":"no-store"};
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest) {
 if(request.headers.get("origin")!==process.env.ZIIPLY_PUBLIC_ORIGIN || !process.env.DATABASE_URL || !process.env.ZIIPLY_BETA_ADMIN_EMAIL) return NextResponse.json({error:"Forbidden"},{status:403,headers});
 let sessionHash:string;
 try{sessionHash=hashBetaToken(request.cookies.get("__Host-ziiply_beta_admin")?.value||"");}catch{return NextResponse.json({error:"Forbidden"},{status:403,headers});}
 const sql=neon(process.env.DATABASE_URL);
 const auth=await sql`SELECT 1 FROM public.ziiply_beta_admin_tokens WHERE token_hash=${sessionHash} AND purpose='session' AND revoked_at IS NULL AND expires_at>now() LIMIT 1`;
 if(!auth.length)return NextResponse.json({error:"Forbidden"},{status:403,headers});
 let body:{id?:string};
 try{body=await request.json();}catch{return NextResponse.json({error:"Invalid body"},{status:400,headers});}
 if(!/^\d+$/.test(body.id||""))return NextResponse.json({error:"Invalid id"},{status:400,headers});
 const id=body.id!;
 const applicants=await sql`SELECT email,status FROM public.ziiply_beta_applications WHERE id=${id}::bigint AND status IN ('registered','waitlist') LIMIT 1`;
 if(!applicants.length)return NextResponse.json({error:"Not eligible"},{status:409,headers});
 const token=createBetaToken(),hash=hashBetaToken(token),expires=new Date(Date.now()+BETA_LOGIN_TTL_MS).toISOString();
 const origin=process.env.ZIIPLY_PUBLIC_ORIGIN!;
 const url=new URL("/beta/kirjaudu/vahvista",origin);url.searchParams.set("token",token);
 // Issue a one-time challenge before sending; only mark invited after SMTP accepts the message.
 await sql`INSERT INTO public.ziiply_beta_login_challenges(application_id,token_hash,expires_at) VALUES(${id}::bigint,${hash},${expires})`;
 const {sendBetaLoginEmail}=await import("../../../../../lib/ziiplyBetaSmtp.mjs");
 try{await sendBetaLoginEmail({to:applicants[0].email,loginUrl:url.toString()});}
 catch{return NextResponse.json({error:"Email delivery failed"},{status:503,headers});}
 await sql`UPDATE public.ziiply_beta_applications SET status='invited',invited_at=COALESCE(invited_at,now()),updated_at=now() WHERE id=${id}::bigint AND status IN ('registered','waitlist')`;
 return NextResponse.json({ok:true},{headers});
}

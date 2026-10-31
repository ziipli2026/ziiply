import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { hashBetaToken } from "../../../../../lib/ziiplyBetaAuthTokens.mjs";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
async function authorized(request:NextRequest) {
 if(!process.env.DATABASE_URL || !process.env.ZIIPLY_BETA_ADMIN_EMAIL) return false;
 let hash:string;
 try {hash=hashBetaToken(request.cookies.get("__Host-ziiply_beta_admin")?.value||"");}catch{return false;}
 const sql=neon(process.env.DATABASE_URL);
 const valid=await sql`SELECT 1 FROM public.ziiply_beta_admin_tokens WHERE token_hash=${hash} AND purpose='session' AND revoked_at IS NULL AND expires_at>now() LIMIT 1`;
 return valid.length>0;
}
export async function GET(request:NextRequest) {
 if(!await authorized(request)) return NextResponse.json({error:"Forbidden"},{status:403,headers});
 const sql=neon(process.env.DATABASE_URL!);
 const rows=await sql`SELECT id::text AS id,email,municipality,profile_key,status,created_at,invited_at
 FROM public.ziiply_beta_applications ORDER BY created_at DESC,id DESC LIMIT 400`;
 return NextResponse.json({applications:rows},{headers});
}
export async function PATCH(request:NextRequest) {
 if(request.headers.get("origin")!==process.env.ZIIPLY_PUBLIC_ORIGIN || !await authorized(request))
   return NextResponse.json({error:"Forbidden"},{status:403,headers});
 let body:{id?:string,status?:string};
 try {body=await request.json();}catch{return NextResponse.json({error:"Invalid body"},{status:400,headers});}
 if(!/^\d+$/.test(body.id||"") || !["invited","active","withdrawn"].includes(body.status||""))
   return NextResponse.json({error:"Invalid input"},{status:400,headers});
 const sql=neon(process.env.DATABASE_URL!);
 const id=body.id!,status=body.status!;
 // Do not resurrect withdrawn/rejected users via the admin interface.
 const rows=await sql`UPDATE public.ziiply_beta_applications
 SET status=${status}, updated_at=now(),
 invited_at=CASE WHEN ${status} IN ('invited','active') THEN COALESCE(invited_at,now()) ELSE invited_at END
 WHERE id=${id}::bigint AND status IN ('registered','waitlist','invited','active')
 RETURNING id::text AS id,status`;
 if(!rows.length) return NextResponse.json({error:"Not found or unavailable"},{status:409,headers});
 if(status==="withdrawn") {
   await sql`UPDATE public.ziiply_beta_sessions SET revoked_at=now()
     WHERE revoked_at IS NULL AND user_id IN
     (SELECT id FROM public.ziiply_beta_users WHERE application_id=${id}::bigint)`;
 }
 return NextResponse.json({ok:true,application:rows[0]},{headers});
}

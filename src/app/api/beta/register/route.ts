import {NextRequest,NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
 if(!process.env.ZIIPLY_PUBLIC_ORIGIN || req.headers.get("origin")!==process.env.ZIIPLY_PUBLIC_ORIGIN || !process.env.DATABASE_URL)return NextResponse.json({ok:false},{status:403});
 let body:{email?:string;municipality?:string;consent?:boolean};
 try{body=await req.json();}catch{return NextResponse.json({ok:false},{status:400});}
 const email=String(body.email||"").trim().toLowerCase(),municipality=String(body.municipality||"").trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!municipality||municipality.length>100||body.consent!==true)return NextResponse.json({ok:false,error:"Täytä tiedot ja hyväksy tietojen käsittely."},{status:400});
 const sql=neon(process.env.DATABASE_URL);
 await sql`INSERT INTO public.ziiply_beta_applications(id,email,municipality,profile_key,privacy_consent_at,status)
 SELECT COALESCE(MAX(id),0)+1,${email},${municipality},'ordinary',now(),'registered'
 FROM public.ziiply_beta_applications
 ON CONFLICT DO NOTHING`;
 return NextResponse.json({ok:true,message:"Ilmoittautuminen vastaanotettu. Ylläpitäjä voi nyt lähettää kutsun."},{headers:{"Cache-Control":"no-store"}});
}

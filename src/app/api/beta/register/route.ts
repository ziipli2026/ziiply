import {NextRequest,NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
 const origin=req.headers.get("origin");
 if(!origin || origin!==new URL(req.url).origin || !process.env.DATABASE_URL)return NextResponse.json({ok:false,error:"Pyyntöä ei hyväksytty."},{status:403});
 let body:{email?:string;municipality?:string;consent?:boolean};
 try{body=await req.json();}catch{return NextResponse.json({ok:false,error:"Virheelliset tiedot."},{status:400});}
 const email=String(body.email||"").trim().toLowerCase(); const municipality=String(body.municipality||"").trim().slice(0,100);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||body.consent!==true)return NextResponse.json({ok:false,error:"Anna sähköposti ja hyväksy tietojen käsittely."},{status:400});
 try{
 const sql=neon(process.env.DATABASE_URL);
 await sql`INSERT INTO public.ziiply_beta_applications(id,email,municipality,profile_key,privacy_consent_at,status)
 VALUES (nextval('public.ziiply_beta_application_id_seq'),${email},${municipality},'ordinary',now(),'registered')
 ON CONFLICT DO NOTHING`;
 return NextResponse.json({ok:true,message:"Ilmoittautuminen vastaanotettu. Ylläpitäjä voi lähettää kutsun."},{headers:{"Cache-Control":"no-store"}});
 }catch(e){console.error("Beta registration failed",e);return NextResponse.json({ok:false,error:"Tallennus epäonnistui. Yritä uudelleen."},{status:500});}
}

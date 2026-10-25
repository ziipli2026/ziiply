import {NextRequest,NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const origin="https://ziiply.fi";
const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type","Vary":"Origin"};
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:cors});
export async function OPTIONS(req:NextRequest){return new Response(null,{status:req.headers.get("origin")===origin?204:403,headers:cors});}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(req:NextRequest){
 if(req.headers.get("origin")!==origin)return reply({error:"Virheellinen lähetyslähde."},403);
 if(Number(req.headers.get("content-length")||0)>17000000)return reply({error:"Lähetys on liian suuri."},413);
 try{
 const body=await req.json();
 if(body.action==="scan"){
  const image=body.image;
  if(typeof image!=="string"||image.length>16000000||!/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(image))return reply({error:"Valitse JPG-, PNG- tai WebP-kuva (enintään noin 11 Mt)."},400);
  const key=process.env.OPENAI_API_KEY;
  if(!key)return reply({error:"Kuvanlukua ei ole vielä otettu käyttöön palvelimella."},503);
  const response=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.RECIPE_VISION_MODEL||"gpt-4o-mini",temperature:0,response_format:{type:"json_object"},messages:[{role:"system",content:"Extract a photographed cooking recipe as JSON: {title:string,ingredients:string,instructions:string}. Preserve exact Finnish quantities and wording. Ingredients must be newline-separated. Mark unreadable text [?]; do not invent."},{role:"user",content:[{type:"text",text:"Lue resepti kuvasta. Poimi nimi, ainekset ja valmistusohje."},{type:"image_url",image_url:{url:image,detail:"high"}}]}]}),signal:AbortSignal.timeout(45000)});
  if(!response.ok)return reply({error:"Kuvanlukupalvelu ei vastannut ("+response.status+")."},502);
  const data=await response.json();const parsed=JSON.parse(data.choices?.[0]?.message?.content||"{}");
  return reply({title:String(parsed.title||"").slice(0,200),ingredients:String(parsed.ingredients||"").slice(0,12000),instructions:String(parsed.instructions||"").slice(0,12000)});
 }
 if(body.action!=="submit")return reply({error:"Tuntematon toiminto."},400);
 const {id,contributorId}=body;const title=String(body.title||"").trim(),ingredients=String(body.ingredients||"").trim(),instructions=String(body.instructions||"").trim();const servings=body.servings==null?null:Number(body.servings);
 if(!uuid.test(id)||!uuid.test(contributorId)||title.length<2||title.length>200||ingredients.length<5||ingredients.length>12000||instructions.length>12000||!["camera","upload","manual"].includes(body.sourceMethod)||servings!==null&&(!Number.isInteger(servings)||servings<1||servings>100))return reply({error:"Tarkista reseptin tiedot."},400);
 const connection=process.env.DATABASE_URL||process.env.POSTGRES_URL;
 if(!connection)return reply({error:"Reseptikirjaston tietokantayhteys puuttuu."},503);
 const sql=neon(connection);
 // Atomic contributor limit: serialize writes by contributor using a transaction-level advisory lock.
 const result=await sql.transaction([
 sql`SELECT pg_advisory_xact_lock(hashtextextended(${contributorId},0))`,
 sql`SELECT COUNT(*)::int AS count FROM ziiply_acme_recipe_submissions WHERE contributor_id=${contributorId}::uuid`
 ]);
 if(Number(result[1]?.[0]?.count)>=2)return reply({error:"Olet jo lähettänyt kaksi reseptiä. Kiitos osallistumisesta!"},409);
 const rows=await sql`INSERT INTO ziiply_acme_recipe_submissions(id,contributor_id,title,ingredients,instructions,servings,source_method) VALUES(${id}::uuid,${contributorId}::uuid,${title},${ingredients},${instructions},${servings},${body.sourceMethod}) ON CONFLICT(id) DO NOTHING RETURNING id`;
 return reply({ok:true,status:"pending_review",saved:rows.length===1});
 }catch(e){console.error("public recipes",e instanceof Error?e.message:"unknown");return reply({error:"Tallennus epäonnistui. Yritä uudelleen."},503);}
}

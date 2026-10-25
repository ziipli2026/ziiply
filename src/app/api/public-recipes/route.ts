import {NextRequest,NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const origin="https://ziiply.fi";
const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type","Vary":"Origin"};
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:cors});
export async function OPTIONS(req:NextRequest){return new Response(null,{status:req.headers.get("origin")===origin?204:403,headers:cors});}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Conservative deterministic gate: ambiguous recipes remain pending for human review.
function assessRecipe(title:string,ingredients:string,instructions:string,servings:number|null){
 const lines=ingredients.split(/\n/).map(x=>x.trim()).filter(Boolean);
 const amount=/^(?:\d+(?:[.,]\d+)?|[¼½¾⅓⅔]|\d+\s*\/\s*\d+)\s*(?:kg|g|mg|l|dl|cl|ml|tl|rkl|kpl|pkt|pss|purkki|purkkia|kananmuna|kananmunaa|sipuli|sipulia|valkosipulinkynsi|valkosipulinkynttä)\b/i;
 const measured=lines.filter(x=>amount.test(x));
 const uncertain=/\[\?\]|\b(?:epäselvä|lukukelvoton|arvaus|tuntematon)\b/i;
 const unsafe=/\b(?:juo\s+pesuainetta|syö\s+raakaa\s+kanaa|syö\s+raakaa\s+jauhelihaa)\b/i;
 const ad=/https?:\/\/|www\.|@\w+|\b(?:osta nyt|tilaa tästä|alennuskoodi)\b/i;
 const reasons:string[]=[];
 if(lines.length<2||measured.length<2)reasons.push("Raaka-aineiden määrät ovat puutteellisia");
 if(instructions.trim().length<35||!/[.!?]/.test(instructions))reasons.push("Valmistusohje on puutteellinen");
 if(servings===null)reasons.push("Annosmäärä puuttuu");
 if(uncertain.test(title+" "+ingredients+" "+instructions))reasons.push("Kuvanluvussa tai tekstissä on epäselvyyksiä");
 if(unsafe.test(ingredients+" "+instructions))reasons.push("Mahdollisesti vaarallinen ohje");
 if(ad.test(title+" "+ingredients+" "+instructions))reasons.push("Mahdollinen mainos tai linkki");
 return reasons;
}
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
 const {id,contributorId}=body;const title=String(body.title||"").trim(),ingredients=String(body.ingredients||"").trim().replace(/\\b1 kananmunaa\\b/gi,"1 kananmuna"),instructions=String(body.instructions||"").trim();const titleServings=title.match(/\\b(?:kahdelle|kolmelle|neljälle|viidelle|kuudelle)\\b/i);const inferred=titleServings?({kahdelle:2,kolmelle:3,neljälle:4,viidelle:5,kuudelle:6} as Record<string,number>)[titleServings[0].toLowerCase()]:null;const servings=body.servings==null?inferred:Number(body.servings);
 if(!uuid.test(id)||!uuid.test(contributorId)||title.length<2||title.length>200||ingredients.length<5||ingredients.length>12000||instructions.length>12000||!["camera","upload","manual"].includes(body.sourceMethod)||servings!==null&&(!Number.isInteger(servings)||servings<1||servings>100))return reply({error:"Tarkista reseptin tiedot."},400);
 const connection=process.env.DATABASE_URL||process.env.POSTGRES_URL;
 if(!connection)return reply({error:"Reseptikirjaston tietokantayhteys puuttuu."},503);
 const sql=neon(connection);
 const duplicate=await sql`SELECT id FROM ziiply_acme_recipe_submissions WHERE lower(regexp_replace(title,'[^[:alnum:]]','','g'))=lower(regexp_replace(${title},'[^[:alnum:]]','','g')) AND lower(regexp_replace(ingredients,'\\s+','','g'))=lower(regexp_replace(${ingredients},'\\s+','','g')) LIMIT 1`;
 const reasons=assessRecipe(title,ingredients,instructions,servings);
 if(duplicate.length)reasons.push("Mahdollinen kaksoiskappale");
 const status=reasons.length?"pending_review":"approved";
 const reviewReason=reasons.length?reasons.join("; "):"Automaattisesti hyväksytty: ainekset, määrät, annokset ja ohje tarkistettu";
 const rows=await sql`INSERT INTO ziiply_acme_recipe_submissions(id,contributor_id,title,ingredients,instructions,servings,source_method,status,reviewed_at,review_reason)
 SELECT ${id}::uuid,${contributorId}::uuid,${title},${ingredients},${instructions},${servings},${body.sourceMethod},${status},CASE WHEN ${status}='approved' THEN now() ELSE NULL END,${reviewReason}
 WHERE (SELECT COUNT(*) FROM ziiply_acme_recipe_submissions WHERE contributor_id=${contributorId}::uuid)<2
 ON CONFLICT(id) DO NOTHING RETURNING id`;
 if(rows.length===0)return reply({error:"Kaksi reseptiä on jo lähetetty tai lähetys on jo tallennettu."},409);
 return reply({ok:true,status,saved:rows.length===1});
 }catch(e){console.error("public recipes",e instanceof Error?e.message:"unknown");return reply({error:"Tallennus epäonnistui. Yritä uudelleen."},503);}
}

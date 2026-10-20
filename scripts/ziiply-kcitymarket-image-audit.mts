import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL secret missing");
const sql=neon(process.env.DATABASE_URL);
const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const rows=await sql`
 SELECT publication_id,offers FROM public.ziiply_offer_publications
 WHERE chain='K-Citymarket' AND approval_state='approved'
 AND valid_from <= ${today}::date AND valid_until >= ${today}::date
 ORDER BY parsed_at DESC LIMIT 1`;
if(rows.length!==1)throw Error("No approved active K-Citymarket publication");
const publication=rows[0];
const offers=publication.offers as Array<Record<string,unknown>>;
if(!Array.isArray(offers)||!offers.length)throw Error("Empty offers");
const failures:string[]=[];
const urls=new Map<string,{url:string,fragments:Set<string>}>();
for(const [i,offer] of offers.entries()){
 const title=String(offer.title??"offer "+i);
 const raw=String(offer.imageUrl??"").trim();
 if(!raw){failures.push(title+": missing image URL");continue;}
 let url:URL;
 try{url=new URL(raw,"https://ziiply.vercel.app");}catch{failures.push(title+": invalid image URL");continue;}
 if(url.protocol!=="https:"){failures.push(title+": non-HTTPS image URL");continue;}
 const fragment=decodeURIComponent(url.hash.slice(1));
 url.hash="";
 const key=url.pathname.startsWith("/citymarket-leaflets/") ? url.pathname : url.toString();
 const record=urls.get(key)??{url:key,fragments:new Set<string>()};
 if(fragment)record.fragments.add(fragment);
 urls.set(key,record);
}
const entries=[...urls.values()];
let next=0;
const checked:Array<{url:string;status:number;type:string;fragments:number}>=[];
async function worker(){
 while(next<entries.length){
  const item=entries[next++];
  try{
   const local=item.url.startsWith("/citymarket-leaflets/");
   if(local){
    const file=resolve("public","."+item.url);
    if(!file.startsWith(resolve("public/citymarket-leaflets")+"/"))throw Error("Unsafe asset path");
    const body=await readFile(file,"utf8");
    if(!/<svg\b/i.test(body))throw Error("Invalid local SVG");
    for(const fragment of item.fragments){
     if(!body.includes('id="'+fragment+'"')&&!body.includes("id=\'"+fragment+"\'"))throw Error("Missing SVG symbol #"+fragment);
    }
    checked.push({url:item.url,status:200,type:"image/svg+xml (repository asset)",fragments:item.fragments.size});
    continue;
   }
   const response=await fetch(item.url,{signal:AbortSignal.timeout(15000),headers:{"User-Agent":"Ziiply-image-audit/1.0","Accept":"image/*,*/*"}});
   const type=response.headers.get("content-type")??"";
   if(!response.ok){failures.push(item.url+": HTTP "+response.status);continue;}
   const data=await response.arrayBuffer();
   if(data.byteLength<20){failures.push(item.url+": empty/too small");continue;}
   const svg=type.includes("svg")||item.url.toLowerCase().endsWith(".svg");
   if(svg){
    const body=new TextDecoder().decode(data);
    if(!/<svg\b/i.test(body))failures.push(item.url+": invalid SVG");
    for(const fragment of item.fragments){
     const escaped=fragment.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
     if(!new RegExp('\\bid=["\\\']'+escaped+'["\\\']').test(body))
       failures.push(item.url+"#"+fragment+": missing SVG symbol");
    }
   }else if(!type.startsWith("image/")){
    failures.push(item.url+": unexpected content-type "+type);
   }
   checked.push({url:item.url,status:response.status,type,fragments:item.fragments.size});
  }catch(error){failures.push(item.url+": "+String(error));}
 }
}
await Promise.all(Array.from({length:Math.min(5,entries.length)},()=>worker()));
const summary={publicationId:publication.publication_id,offers:offers.length,urls:entries.length,checked:checked.length,failures:failures.length};
console.log("IMAGE_AUDIT",JSON.stringify(summary));
for(const failure of failures)console.error("IMAGE_AUDIT_FAIL",failure);
if(failures.length)process.exitCode=1;

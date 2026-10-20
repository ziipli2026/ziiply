import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

if(!process.env.DATABASE_URL)throw Error("DATABASE_URL missing");
const sql=neon(process.env.DATABASE_URL);
const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const rows=await sql`SELECT publication_id,offers FROM public.ziiply_offer_publications WHERE chain='K-Citymarket' AND approval_state='approved' AND valid_from<=${today}::date AND valid_until>=${today}::date ORDER BY parsed_at DESC LIMIT 1`;
if(rows.length!==1)throw Error("Active approved K-Citymarket publication missing");
const offers=rows[0].offers as Array<{title?:string,imageUrl?:string}>;
if(!Array.isArray(offers)||!offers.length)throw Error("No offers");
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
const errors:string[]=[];
let verified=0;
try{
 await page.goto("https://example.com",{waitUntil:"domcontentloaded"});
 // Verify browser image decoding and rendering with the same public assets the app serves.
 // Local sprite paths are supplied through a same-origin test route: no changes to production.
 await page.route("https://ziiply.vercel.app/citymarket-leaflets/**",async route=>{
   const u=new URL(route.request().url());
   const path=resolve("public","."+u.pathname);
   if(!path.startsWith(resolve("public/citymarket-leaflets")+"/"))return route.fulfill({status:403});
   try{
     const body=await readFile(path);
     await route.fulfill({status:200,contentType:"image/svg+xml",body});
   }catch{await route.fulfill({status:404});}
 });
 await page.goto("https://ziiply.vercel.app/citymarket-leaflets/image-check",{waitUntil:"domcontentloaded"}).catch(()=>{});
 await page.setContent('<html><body style="margin:0"></body></html>');
 for(const [i,offer] of offers.entries()){
   const raw=String(offer.imageUrl??"").trim();
   if(!raw){errors.push("Offer "+i+": missing URL");continue;}
   let src=raw;
   if(raw.startsWith("/citymarket-leaflets/")||raw.startsWith("https://ziiply.fi/citymarket-leaflets/")){
     const u=new URL(raw,"https://ziiply.vercel.app");
     src="https://ziiply.vercel.app"+u.pathname+u.hash;
   }
   try{
     const result=await page.evaluate(async src=>{
       const img=document.createElement("img");img.src=src;img.style.cssText="width:160px;height:160px;object-fit:contain";
       document.body.appendChild(img);
       try{await Promise.race([img.decode(),new Promise((_,reject)=>setTimeout(()=>reject(Error("timeout")),10000))]);}
       catch(e){img.remove();return {ok:false,reason:String(e)};}
       const ok=img.naturalWidth>0&&img.naturalHeight>0;
       const info={ok,width:img.naturalWidth,height:img.naturalHeight};
       img.remove();return info;
     },src);
     if(!result.ok)errors.push("Offer "+i+" "+String(offer.title??"")+": "+JSON.stringify(result)+" "+src);
     else verified++;
   }catch(e){errors.push("Offer "+i+": "+String(e));}
 }
}finally{await browser.close();}
console.log("BROWSER_IMAGE_AUDIT",JSON.stringify({publicationId:rows[0].publication_id,offers:offers.length,decoded:verified,failures:errors.length,mode:"browser-decode-with-local-SVG-route"}));
for(const e of errors)console.error("BROWSER_IMAGE_FAIL",e);
if(errors.length)process.exitCode=1;

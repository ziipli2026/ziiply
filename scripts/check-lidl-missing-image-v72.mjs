#!/usr/bin/env node
/** Mass research-only verification of Lidl FI product-page images.
 * Reads the audit queue; never substitutes generic or guessed images.
 */
import fs from "node:fs";
const audit=JSON.parse(fs.readFileSync("data/lidl/official-product-image-price-audit-2026-10-04.json","utf8"));
const targets=audit.records.filter(row=>row.lidlProductId==="10038313");
let failed=false, confirmed=0, unavailable=0;
for(const target of targets){
  try{
    const response=await fetch(target.officialUrl,{headers:{accept:"text/html","user-agent":"ZiiplyLidlResearch/1.0"},redirect:"follow",signal:AbortSignal.timeout(15000)});
    const html=await response.text();
    const tag=(key)=>(html.match(/<meta\\b[^>]*>/gi)||[]).find(t=>new RegExp('(?:property|name)\\s*=\\s*["\\x27]'+key+'["\\x27]','i').test(t))?.match(/content\\s*=\\s*(["'])(.*?)\\1/i)?.[2]??null;
    const title=tag("og:title"),rawImage=tag("og:image");
    const canonical=(html.match(/<link\\b[^>]*>/gi)||[]).find(t=>/rel\\s*=\\s*["']canonical["']/i.test(t))?.match(/href\\s*=\\s*(["'])(.*?)\\1/i)?.[2]??null;
    const canonicalPath=canonical?new URL(canonical,response.url).pathname:"";
    const image=rawImage?new URL(rawImage,response.url):null;
    const allowed=image?.protocol==="https:"&&["imgproxy-retcat.assets.schwarz","lidl.fi"].includes(image.hostname);
    const identity=response.ok&&canonicalPath.endsWith("/p"+target.lidlProductId);
    const candidate=identity&&allowed&&!/(?:placeholder|default|logo|social-share)/i.test(image.pathname)?image.href:null;
    if(candidate) confirmed++; else unavailable++;
    console.log(JSON.stringify({id:target.lidlProductId,label:target.name,httpStatus:response.status,canonical,title,imageCandidate:candidate,identityConfirmed:identity,verifiedImage:Boolean(candidate),priceEur:null}));
  }catch(error){
    unavailable++;
    console.log(JSON.stringify({id:target.lidlProductId,label:target.name,httpStatus:null,imageCandidate:null,identityConfirmed:false,verifiedImage:false,error:String(error?.message||error)}));
  }
}
console.error(JSON.stringify({targets:targets.length,confirmed,unavailable}));
if(failed) process.exitCode=1;

/* Targeted category-payload fallback for Solevita p10038313 (product page is currently 404). */
{
 const targetId="10038313", categoryUrl="https://www.lidl.fi/h/juomat/h10071022";
 try{
  const response=await fetch(categoryUrl,{headers:{accept:"text/html","accept-language":"fi-FI,fi;q=0.9","user-agent":"ZiiplyLidlResearch/1.0"},signal:AbortSignal.timeout(20000)});
  const html=await response.text(), match=html.match(/<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if(match){
   const data=JSON.parse(match[1]), deref=v=>typeof v==="number"&&Number.isInteger(v)&&v>=0&&v<data.length?data[v]:v;
   const expand=(v,d=0)=>d>4?v:typeof v==="number"&&Number.isInteger(v)&&v>=0&&v<data.length?expand(data[v],d+1):Array.isArray(v)?v.map(x=>expand(x,d+1)):v&&typeof v==="object"?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,expand(x,d+1)])):v;
   for(const value of data){
    if(!value||typeof value!=="object"||Array.isArray(value)||!("gridBoxData" in value))continue;
    const raw=deref(value.gridBoxData); if(!raw||typeof raw!=="object"||Array.isArray(raw))continue;
    if(String(deref(raw.productId))!==targetId)continue;
    const product=expand(raw), serialized=JSON.stringify(product);
    const imageUrls=[...new Set(serialized.match(/https:\/\/[^"\\\s]+/g)||[])].filter(x=>/(?:imgproxy|image|media|asset|\.png|\.jpe?g|\.webp)/i.test(x));
    console.log(JSON.stringify({probe:"category-nuxt",id:targetId,httpStatus:response.status,found:true,product,imageUrls}));
    break;
   }
  } else console.log(JSON.stringify({probe:"category-nuxt",id:targetId,httpStatus:response.status,found:false,error:"NUXT_DATA missing"}));
 }catch(error){console.log(JSON.stringify({probe:"category-nuxt",id:targetId,found:false,error:String(error?.message||error)}));}
}

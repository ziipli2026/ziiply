#!/usr/bin/env node
/** Mass research-only verification of Lidl FI product-page images.
 * Reads the audit queue; never substitutes generic or guessed images.
 */
import fs from "node:fs";
const audit=JSON.parse(fs.readFileSync("data/lidl/official-product-image-price-audit-2026-10-04.json","utf8"));
const targets=audit.records.filter(row=>row.lidlProductId&&row.officialUrl&&!row.imageUrl);
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

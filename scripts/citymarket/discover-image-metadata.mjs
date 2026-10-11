import fs from "node:fs";
const source = JSON.parse(fs.readFileSync("scripts/citymarket/41lv-image-source-candidates.json","utf8"));
const results = [];
const attr = (tag,name) => { const m=tag.match(new RegExp("\\b"+name+"\\s*=\\s*([\\\"'])(.*?)\\1","i")); return m?.[2] ?? null; };
for(const candidate of source.candidates){
  const pages=[candidate.url,candidate.manufacturerUrl,candidate.imageEvidenceUrl,...(candidate.additionalProductEvidenceUrls??[])].filter(Boolean);
  for(const page of [...new Set(pages)]){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
    try{
      const response=await fetch(page,{signal:controller.signal,headers:{accept:"text/html"}});
      const type=response.headers.get("content-type")??"";
      if(!response.ok || !type.includes("text/html")){results.push({offerId:candidate.offerId,page,httpStatus:response.status,status:"unavailable-or-not-html"});continue;}
      const html=(await response.text()).slice(0,1500000);
      const meta=[...html.matchAll(/<meta\b[^>]*>/gi)].map(x=>x[0]);
      const images=meta.filter(tag=>["og:image","twitter:image"].includes((attr(tag,"property")??attr(tag,"name")??"").toLowerCase())).map(tag=>attr(tag,"content")).filter(Boolean).map(url=>{try{const resolved=new URL(url,page);return resolved.protocol==="https:"?resolved.href:null}catch{return null}}).filter(Boolean);
      results.push({offerId:candidate.offerId,page,httpStatus:response.status,status:images.length?"metadata-image-found":"no-metadata-image",imageCandidates:[...new Set(images)],approved:false});
    }catch(error){results.push({offerId:candidate.offerId,page,status:"fetch-failed",error:String(error),approved:false})}
    finally{clearTimeout(timer)}
  }
}
fs.writeFileSync("citymarket-image-discovery.json",JSON.stringify({notice:"Metadata links only. Verify identity, image content and usage rights before approval.",results},null,2)+"\n");
console.log("Checked "+results.length+" product pages for image metadata; no images approved.");

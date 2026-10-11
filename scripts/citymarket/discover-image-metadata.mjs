import fs from "node:fs";
const source = JSON.parse(fs.readFileSync("scripts/citymarket/41lv-image-source-candidates.json","utf8"));
const results = [];
const MAX_HTML_BYTES = 1500000;
const attr = (tag,name) => { const m=tag.match(new RegExp("\\b"+name+"\\s*=\\s*([\\\"'])(.*?)\\1","i")); return m?.[2] ?? null; };
for(const candidate of source.candidates){
  const pages=[candidate.url,candidate.manufacturerUrl,candidate.imageEvidenceUrl,...(candidate.additionalProductEvidenceUrls??[])].filter(Boolean);
  for(const page of [...new Set(pages)]){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
    try{
      const response=await fetch(page,{signal:controller.signal,headers:{accept:"text/html"}});
      const type=response.headers.get("content-type")??"";
      if(!response.ok || !type.includes("text/html")){results.push({offerId:candidate.offerId,page,httpStatus:response.status,status:"unavailable-or-not-html"});continue;}
      const reader=response.body?.getReader();
      if(!reader){results.push({offerId:candidate.offerId,page,status:"empty-response",approved:false});continue;}
      const chunks=[];let total=0;let truncated=false;
      while(true){
        const {done,value}=await reader.read();if(done)break;
        const remaining=MAX_HTML_BYTES-total;
        if(value.byteLength>remaining){chunks.push(value.subarray(0,remaining));total+=remaining;truncated=true;await reader.cancel();break;}
        chunks.push(value);total+=value.byteLength;
        if(total===MAX_HTML_BYTES){truncated=true;await reader.cancel();break;}
      }
      const html=new TextDecoder().decode(Buffer.concat(chunks.map(chunk=>Buffer.from(chunk))));
      const meta=[...html.matchAll(/<meta\b[^>]*>/gi)].map(x=>x[0]);
      const images=meta.filter(tag=>["og:image","twitter:image"].includes((attr(tag,"property")??attr(tag,"name")??"").toLowerCase())).map(tag=>attr(tag,"content")).filter(Boolean).map(url=>{try{const resolved=new URL(url,page);return resolved.protocol==="https:"?resolved.href:null}catch{return null}}).filter(Boolean);
      // Product JSON-LD often has the actual packshot when social metadata is generic.
      const ldImages=[];
      for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
        if(!/^(?:application\/ld\+json)(?:\s*;.*)?$/i.test(attr(match[1],"type")??""))continue;
        try{
          const root=JSON.parse(match[2]);
          const nodes=Array.isArray(root)?root:[root];
          const walk=(node)=>{
            if(!node || typeof node!=="object")return;
            if(Array.isArray(node)){node.forEach(walk);return;}
            const types=[].concat(node["@type"]??[]).map(String);
            if(types.some(type=>type.toLowerCase()==="product")){
              for(const item of [].concat(node.image??[])){
                const raw=typeof item==="string"?item:item?.url??item?.contentUrl;
                if(typeof raw!=="string")continue;
                try{const url=new URL(raw,page);if(url.protocol==="https:")ldImages.push(url.href);}catch{}
              }
            }
            for(const key of ["@graph","mainEntity","mainEntityOfPage","hasPart","itemListElement"]){if(node[key])walk(node[key]);}
          };
          nodes.forEach(walk);
        }catch{}
      }
      const relevant = [...images,...ldImages].filter(url => !/logo|placeholder|default-image|favicon|social-share/i.test(new URL(url).pathname));
      const identityEvidence = { expectedEan:candidate.ean, eanPresentInHtml:html.includes(candidate.ean), structuredProductImageCount:ldImages.length };
      // A social preview is not sufficient proof that the packshot matches the EAN.
      const reviewRequired = true;
      results.push({offerId:candidate.offerId,page,httpStatus:response.status,status:relevant.length?"metadata-image-found":"no-product-image-metadata",imageCandidates:[...new Set(relevant)],htmlTruncated:truncated,jsonLdProductImageCount:ldImages.length,identityEvidence,reviewRequired,excludedGenericImageCount:images.filter(url=>!relevant.includes(url)).length,approved:false});
    }catch(error){results.push({offerId:candidate.offerId,page,status:"fetch-failed",error:String(error),approved:false})}
    finally{clearTimeout(timer)}
  }
}
fs.writeFileSync("citymarket-image-discovery.json",JSON.stringify({notice:"Metadata links only. Verify identity, image content and usage rights before approval.",results},null,2)+"\n");
console.log("Checked "+results.length+" product pages for image metadata; no images approved.");

#!/usr/bin/env node
import {writeFileSync} from "node:fs";

const SOURCE="https://www.tokmanni.fi/tarjouslehti";
const response=await fetch(SOURCE,{headers:{accept:"text/html,application/xhtml+xml","accept-language":"fi-FI,fi;q=0.9","user-agent":"Ziiply/1.0"},signal:AbortSignal.timeout(20000)});
if(!response.ok)throw new Error("Tokmanni leaflet hub HTTP "+response.status);
const html=await response.text();
const decode=s=>String(s??"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");
const strip=s=>decode(String(s??"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim());
const anchors=[...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m=>({href:decode(m[1]),text:strip(m[2])}));
const urls=[...html.matchAll(/https?:\\?\/\\?\/[^"'<>\s]+/gi)].map(m=>decode(m[0].replace(/\\\//g,"/")));
const iframeTags=[...html.matchAll(/<iframe\b[^>]*>/gi)].map(m=>m[0]);
const iframeDetails=iframeTags.map(tag=>{
  const src=decode(tag.match(/\bsrc=["']([^"']+)["']/i)?.[1]||"");
  const title=decode(tag.match(/\btitle=["']([^"']+)["']/i)?.[1]||"");
  return {src,title};
}).filter(x=>x.src);
const evidence=[...anchors.map(x=>x.href),...urls,...iframeDetails.map(x=>x.src)].filter(Boolean);
const text=strip(html);
const labels={eurospar:/\bEUROSPAR\b/i.test(text),ruokasanomat:/\bRuokasanomat\b/i.test(text),tarjoussanomat:/\bTarjoussanomat\b/i.test(text)};
const candidateUrls=[...new Set(evidence.filter(x=>/eurospar|ruokasanomat|tarjous|leaflet|catalog|publication|viewer|tjek|incito/i.test(x)))];
const publicationFrames=iframeDetails.filter(x=>/eurospar|ruokasanomat|tarjoussanomat/i.test(x.title+" "+x.src));
const classifiedFrames={
  eurospar:publicationFrames.filter(x=>/eurospar/i.test(x.title+" "+x.src)),
  ruokasanomat:publicationFrames.filter(x=>/ruokasanomat/i.test(x.title+" "+x.src)),
  tarjoussanomat:publicationFrames.filter(x=>/tarjoussanomat/i.test(x.title+" "+x.src)),
};
const frameProbes=[];
for(const [kind,frames] of Object.entries(classifiedFrames)){
  for(const frame of frames.slice(0,2)){
    try{
      const frameUrl=new URL(frame.src,SOURCE).href;
      const r=await fetch(frameUrl,{headers:{accept:"text/html,application/xhtml+xml","accept-language":"fi-FI,fi;q=0.9","user-agent":"Ziiply/1.0"},redirect:"follow",signal:AbortSignal.timeout(20000)});
      const body=await r.text();
      const discovered=[...new Set([...body.matchAll(/https?:\\?\/\\?\/[^"'<>\\s]+/gi)].map(m=>decode(m[0].replace(/\\\//g,"/"))).filter(x=>/publication|catalog|leaflet|viewer|api|json|tjek|incito/i.test(x)))].slice(0,50);
      const markers={
        hasJson:/application\/json|\.json(?:[?"'])/i.test(body),
        hasApi:/\/api\//i.test(body),
        hasPublication:/publication/i.test(body),
        hasTjek:/tjek/i.test(body),
        hasIncito:/incito/i.test(body),
      };
      const scriptSources=[...new Set([...body.matchAll(/<script\\b[^>]*src=["\x27]([^"\x27]+)["\x27]/gi)].map(m=>new URL(decode(m[1]),r.url).href))].slice(0,30);\n      frameProbes.push({kind,frameUrl,finalUrl:r.url,http:r.status,bytes:body.length,markers,discovered,scriptSources});
    }catch(error){
      frameProbes.push({kind,frameUrl:frame.src,error:String(error)});
    }
  }
}
const backendCandidates=[];
for(const probe of frameProbes.filter(x=>x.kind==="eurospar"&&Array.isArray(x.scriptSources))){
  for(const scriptUrl of probe.scriptSources.slice(0,10)){
    try{
      const r=await fetch(scriptUrl,{headers:{"user-agent":"Ziiply/1.0"},signal:AbortSignal.timeout(15000)});
      if(!r.ok)continue;
      const js=await r.text();
      const hits=[...new Set([...js.matchAll(/https?:\\?\/\\?\/[^"'<>\s]+/gi)].map(m=>decode(m[0].replace(/\\\//g,"/"))).filter(x=>/publication|catalog|leaflet|viewer|api|json|tjek|incito/i.test(x)))].slice(0,50);
      if(hits.length)backendCandidates.push({scriptUrl,hits});
    }catch{}
  }
}
const normalizedBackendUrls=[...new Set(backendCandidates.flatMap(x=>x.hits||[]))];
const backendSummary={
  total:normalizedBackendUrls.length,
  api:normalizedBackendUrls.filter(x=>/\/api\/|api\./i.test(x)).length,
  publication:normalizedBackendUrls.filter(x=>/publication/i.test(x)).length,
  catalog:normalizedBackendUrls.filter(x=>/catalog/i.test(x)).length,
  json:normalizedBackendUrls.filter(x=>/\.json(?:[?#]|$)/i.test(x)).length,
  tjek:normalizedBackendUrls.filter(x=>/tjek/i.test(x)).length,
  incito:normalizedBackendUrls.filter(x=>/incito/i.test(x)).length,
};
const report={checkedAt:new Date().toISOString(),source:SOURCE,http:response.status,labels,candidateUrls,publicationFrames,classifiedFrames,frameProbes,backendCandidates,backendSummary};
writeFileSync("tokmanni-leaflet-discovery.json",JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(!labels.eurospar||!labels.ruokasanomat){console.error("Expected EUROSPAR/Ruokasanomat labels missing from official leaflet hub");process.exitCode=1;}
if(publicationFrames.length===0){console.error("No identifiable publication iframe sources found");process.exitCode=1;}
if(classifiedFrames.eurospar.length===0||classifiedFrames.ruokasanomat.length===0){console.error("EUROSPAR or Ruokasanomat iframe could not be classified");process.exitCode=1;}
const eurosparProbe=frameProbes.find(x=>x.kind==="eurospar"&&x.http>=200&&x.http<400);
if(!eurosparProbe){console.error("EUROSPAR iframe source could not be fetched");process.exitCode=1;}
if(eurosparProbe&&eurosparProbe.bytes<500){console.error("EUROSPAR iframe response unexpectedly small");process.exitCode=1;}

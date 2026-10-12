#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";

const FEED="src/app/components/ziiply/offerSearch/providers/eurospar-feed.json";
const HUB="https://www.tokmanni.fi/tarjouslehti";
const oldFeed=JSON.parse(readFileSync(FEED,"utf8"));
const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());

const response=await fetch(HUB,{headers:{accept:"text/html,application/xhtml+xml","accept-language":"fi-FI,fi;q=0.9","user-agent":"Ziiply/1.0"},signal:AbortSignal.timeout(20000)});
if(!response.ok) throw new Error("Tokmanni leaflet hub HTTP "+response.status);
const html=await response.text();

const iframeMatches=[...html.matchAll(/<iframe\b[^>]*src=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]);
const eurosparFrame=iframeMatches.find(x=>/eurospar/i.test(x))??null;
const frameResponse=eurosparFrame?await fetch(new URL(eurosparFrame,HUB),{headers:{"user-agent":"Ziiply/1.0"},signal:AbortSignal.timeout(20000)}):null;
const frameHtml=frameResponse?.ok?await frameResponse.text():"";
function decodeHtml(s){return s.replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));}
function stripTags(s){return decodeHtml(s.replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g," ")).replace(/\r/g,"").replace(/[ \t]+/g," ").replace(/\n[ \t]+/g,"\n").trim();}
function isoDate(d,m,y){return String(y).padStart(4,"0")+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0");}

const imageUrls=[...new Set([...frameHtml.matchAll(/"(?:normalImage|zoomImage|image)(?:Url|Path)"\\s*:\\s*"([^"]+)"/gi)].map(m=>m[1]).filter(x=>/^https?:/i.test(x)))].slice(0,30);
const seoEscaped=frameHtml.match(/\\\\\"seoPageText\\\\\"\s*:\s*\\\\\"([\\s\\S]*?)\\\\\"\s*,\\\\\"metaDescription/i)?.[1]??"";
const seoRaw=seoEscaped || (frameHtml.match(/["']seoPageText["']\s*:\s*["']([\s\S]*?)["']\s*[,}]/i)?.[1] ?? frameHtml.match(/seoPageText[^>]*>([\s\S]*?)<\//i)?.[1] ?? "");
const seoText=stripTags(seoRaw.replace(/\\\\n/g,"\n").replace(/\\\\u003[cC]/g,"<").replace(/\\\\u003[eE]/g,">").replace(/\\\\\"/g,'"').replace(/\\\\\\\\/g,"\\"));
// Use the same PDF download route as the publisher's iPaper viewer.
// Flat SEO text has no reliable spatial price ownership.
const paperUrl=frameHtml.match(/"paperCompleteUrl"\s*:\s*"([^"]+)"/)?.[1];
if(!paperUrl) throw new Error("Publisher PDF download origin missing");
const downloadUrl=new URL("GetPDF.ashx",paperUrl);
if(downloadUrl.protocol!=="https:" || downloadUrl.hostname!=="tarjoussanomat.tokmanni.fi") throw new Error("Unexpected EUROSPAR PDF origin");
const pdfResponse=await fetch(downloadUrl,{method:"POST",body:new URLSearchParams({pageNumbers:""}),redirect:"follow",signal:AbortSignal.timeout(60000)});
if(!pdfResponse.ok) throw new Error("EUROSPAR PDF HTTP "+pdfResponse.status);
const pdf=Buffer.from(await pdfResponse.arrayBuffer());
if(pdf.length>32*1024*1024 || pdf.subarray(0,5).toString()!=="%PDF-") throw new Error("Invalid publisher PDF");
const folder=mkdtempSync(join(tmpdir(),"eurospar-pdf-"));
let parsed;
try{
 const filename=join(folder,"leaflet.pdf");writeFileSync(filename,pdf);
 const result=spawnSync("python",["scripts/eurospar-pdf-parser.py",filename],{encoding:"utf8",timeout:60000,maxBuffer:8*1024*1024});
 if(result.status!==0) throw new Error("EUROSPAR spatial PDF parse failed: "+result.stderr);
 parsed=JSON.parse(result.stdout);
}finally{rmSync(folder,{recursive:true,force:true});}
const {issue,validity,stores:storeNames,offers:parsedOffers}=parsed;
const seoIssue=seoText.match(/\b(\d{1,2}\/\d{2})\b/)?.[0];
if(seoIssue && seoIssue!==issue) throw new Error("Publisher HTML/PDF issue mismatch");
const storeHits=storeNames.filter(x=>seoText.toLocaleLowerCase("fi").includes(x.toLocaleLowerCase("fi")));
const priceTokens=[...seoText.matchAll(/\b\d{1,3}[,.]\d{2}\b/g)].map(m=>m[0]);
const normalizeOfferName=s=>String(s??"").toLocaleLowerCase("fi-FI").replace(/[^a-z0-9åäö]+/gi," ").trim();
const previousImagesByName=new Map((Array.isArray(oldFeed?.offers)?oldFeed.offers:[]).filter(x=>x?.imageUrl).map(x=>[normalizeOfferName(x.name),x.imageUrl]));
if(issue&&String(oldFeed?.issue??"")===issue){
  for(const offer of parsedOffers){
    const preserved=previousImagesByName.get(normalizeOfferName(offer.name));
    if(preserved) offer.imageUrl=preserved;
  }
}
const parseErrors=parsedOffers.filter(x=>!x.name||x.name.length<5||!(x.offerPrice>0)||x.offerPrice>100||!x.validFrom||!x.validTo);
const uniqueNames=new Set(parsedOffers.map(x=>x.name));
const validityCurrentOrFuture=Boolean(validity?.to && validity.to>=today);
const previousIssue=String(oldFeed?.issue??"");
const previousOfferCount=Array.isArray(oldFeed?.offers)?oldFeed.offers.length:0;
const sameIssue=Boolean(issue&&previousIssue&&issue===previousIssue);
const minimumOfferCount=sameIssue
  ? previousOfferCount
  : previousOfferCount>0
    ? Math.max(5,Math.ceil(previousOfferCount*0.85))
    : 5;
const coverageHealthy=parsedOffers.length>=minimumOfferCount;

// Images are only safe to publish when they are attached to the matching offer.
// Publication-level image assets discovered above are diagnostics only: never
// assign them to offer rows by array position.
const parsedImageCount=parsedOffers.filter(x=>Boolean(x.imageUrl)).length;
const previousImageCount=Array.isArray(oldFeed?.offers)
  ? oldFeed.offers.filter(x=>Boolean(x?.imageUrl)).length
  : 0;
const imageCoverageHealthy=previousImageCount===0 || parsedImageCount>=previousImageCount;




const candidate={
  schemaVersion:1,
  generatedAt:new Date().toISOString(),
  dateFi:today,
  source:{hub:HUB,frame:eurosparFrame,http:frameResponse?.status??null},
  previous:{issue:String(oldFeed?.issue??""),from:String(oldFeed?.validity?.from??""),to:String(oldFeed?.validity?.to??""),offers:Array.isArray(oldFeed?.offers)?oldFeed.offers.length:0},
  discovery:{
    hubHttp:response.status,
    frameFound:Boolean(eurosparFrame),
    frameBytes:frameHtml.length,
    hasPrice:/\b\d+[,.]\d{2}\b/.test(frameHtml),
    hasValidity:/\b\d{1,2}[.\/]\d{1,2}[.\/]?(?:20\d{2})?\b/.test(frameHtml),
    jsonUrls:[...new Set([...frameHtml.matchAll(/https?:[^"'\\s<>]+\.json(?:\?[^"'\\s<>]*)?/gi)].map(m=>m[0]))].slice(0,20),
    priceSamples:[...frameHtml.matchAll(/.{0,100}\b\d+[,.]\d{2}\b.{0,160}/gi)].map(m=>m[0].replace(/\s+/g," ").trim()).slice(0,20),
    dateSamples:[...frameHtml.matchAll(/.{0,100}\b\d{1,2}[.\/]\d{1,2}[.\/]?(?:20\d{2})?\b.{0,160}/gi)].map(m=>m[0].replace(/\s+/g," ").trim()).slice(0,20),
    imageUrls,
    scriptSources:[...frameHtml.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]).slice(0,30),
    dataAttributes:[...frameHtml.matchAll(/\bdata-[a-z0-9_-]+=["']([^"']{1,300})["']/gi)].map(m=>m[0]).slice(0,40)
  },
  validation:{
    previousIssue,
    previousOfferCount,
    sameIssue,
    minimumOfferCount,
    parsedOfferCount:parsedOffers.length,
    coverageHealthy,
    uniqueNames:uniqueNames.size,
    parseErrors:parseErrors.length
  },
  ready:Boolean(issue&&validity&&validityCurrentOrFuture&&priceTokens.length>=5&&storeHits.length>=1&&coverageHealthy&&uniqueNames.size===parsedOffers.length&&parseErrors.length===0),
  reason:parseErrors.length===0&&coverageHealthy&&uniqueNames.size===parsedOffers.length&&validityCurrentOrFuture
    ?"EUROSPAR publication parsed with healthy coverage; candidate can be promoted after validation."
    :"EUROSPAR publication found but coverage or row validation failed; keep existing feed fail-closed."
};

if(candidate.ready){
  const generated={schemaVersion:1,issue,validity,stores:storeNames,healthy:true,offers:parsedOffers};
  writeFileSync("eurospar-feed.generated.json",JSON.stringify(generated,null,2)+"\n");
}else{
  console.error("EUROSPAR candidate not promoted: "+candidate.reason);
}
writeFileSync("eurospar-feed-candidate.json",JSON.stringify(candidate,null,2));
console.log(JSON.stringify(candidate,null,2));

if(!candidate.discovery.frameFound||candidate.source.http!==200){
  console.error("EUROSPAR publication frame missing or unhealthy.");
  process.exitCode=1;
}

#!/usr/bin/env node
import {readFileSync,writeFileSync} from "node:fs";

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
const issue=seoText.match(/\b(\d{1,2})\/(\d{2})\b/)?.[0]??null;
const validityMatch=seoText.match(/\b(\d{1,2})[.]\s*[–-]\s*(\d{1,2})[.](\d{1,2})[.](20\d{2})\b/);
const validity=validityMatch?{from:isoDate(validityMatch[1],validityMatch[3],validityMatch[4]),to:isoDate(validityMatch[2],validityMatch[3],validityMatch[4])}:null;
const priceTokens=[...seoText.matchAll(/\b\d{1,3}[,.]\d{2}\b/g)].map(m=>m[0]);
const storeHits=["Iisalmi","Joensuu","Järvenpää","Masku","Tornio","Ylöjärvi"].filter(x=>seoText.toLocaleLowerCase("fi").includes(x.toLocaleLowerCase("fi")));


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
  ready:Boolean(issue&&validity&&priceTokens.length>=5&&storeHits.length>=1),
  reason:issue&&validity&&priceTokens.length>=5?"EUROSPAR publication metadata parsed; offer row parser pending validation.":"EUROSPAR viewer found but publication metadata is not yet sufficiently validated; keep existing feed fail-closed."
};

writeFileSync("eurospar-feed-candidate.json",JSON.stringify(candidate,null,2));
console.log(JSON.stringify(candidate,null,2));

if(!candidate.discovery.frameFound||candidate.source.http!==200){
  console.error("EUROSPAR publication frame missing or unhealthy.");
  process.exitCode=1;
}

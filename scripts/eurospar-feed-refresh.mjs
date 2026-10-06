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
    scriptSources:[...frameHtml.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]).slice(0,30),
    dataAttributes:[...frameHtml.matchAll(/\bdata-[a-z0-9_-]+=["']([^"']{1,300})["']/gi)].map(m=>m[0]).slice(0,40)
  },
  ready:false,
  reason:"EUROSPAR viewer shell found but no validated offer payload parser is available yet; keep existing feed fail-closed."
};

writeFileSync("eurospar-feed-candidate.json",JSON.stringify(candidate,null,2));
console.log(JSON.stringify(candidate,null,2));

if(!candidate.discovery.frameFound||candidate.source.http!==200){
  console.error("EUROSPAR publication frame missing or unhealthy.");
  process.exitCode=1;
}

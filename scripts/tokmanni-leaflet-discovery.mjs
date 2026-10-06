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
const iframe=[...html.matchAll(/<iframe\b[^>]*src=["']([^"']+)["']/gi)].map(m=>decode(m[1]));
const evidence=[...anchors.map(x=>x.href),...urls,...iframe].filter(Boolean);
const text=strip(html);
const labels={eurospar:/\bEUROSPAR\b/i.test(text),ruokasanomat:/\bRuokasanomat\b/i.test(text),tarjoussanomat:/\bTarjoussanomat\b/i.test(text)};
const candidateUrls=[...new Set(evidence.filter(x=>/eurospar|ruokasanomat|tarjous|leaflet|catalog|publication|viewer|tjek|incito/i.test(x)))];
const report={checkedAt:new Date().toISOString(),source:SOURCE,http:response.status,labels,candidateUrls};
writeFileSync("tokmanni-leaflet-discovery.json",JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(!labels.eurospar||!labels.ruokasanomat){console.error("Expected EUROSPAR/Ruokasanomat labels missing from official leaflet hub");process.exitCode=1;}

#!/usr/bin/env node
import {readFileSync,writeFileSync} from "node:fs";

const feed=JSON.parse(readFileSync("src/app/components/ziiply/offerSearch/providers/eurospar-feed.json","utf8"));
const now=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const from=String(feed?.validity?.from??"");
const to=String(feed?.validity?.to??"");
const ageDays=to ? Math.floor((Date.parse(now+"T12:00:00Z")-Date.parse(to+"T12:00:00Z"))/86400000) : null;\nconst eurospar={
  issue:String(feed?.issue??""),
  from,to,
  healthy:feed?.healthy===true,
  offers:Array.isArray(feed?.offers)?feed.offers.length:0,
  stores:Array.isArray(feed?.stores)?feed.stores.length:0,
  active:Boolean(from&&to&&from<=now&&now<=to),\n  ageDays,\n  refreshRequired:Boolean(!to||to<now),
};

const url=new URL("https://www.tokmanni.fi/viikkotarjoukset/elintarvikkeet-ja-elainruoka");
const response=await fetch(url,{headers:{accept:"text/html,application/xhtml+xml","accept-language":"fi-FI,fi;q=0.9","user-agent":"Ziiply/1.0"},signal:AbortSignal.timeout(20000)});
if(!response.ok)throw new Error("Tokmanni weekly offers HTTP "+response.status);
const html=await response.text();
const text=html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ");
const totalMatch=text.match(/(?:Tuotteet\s+\d+\s*[-–]\s*\d+\s*\/\s*|)(\d+)\s+tuotetta/i);
const total=totalMatch?Number(totalMatch[1]):null;
const cards=(html.match(/<li\b[^>]*class=["'][^"']*product-item[^"']*["'][^>]*>/gi)||[]).length;
const expectedFirstPage=Math.min(total??40,40);\nconst tokmanni={http:response.status,total,cards,expectedFirstPage,source:url.href,healthy:response.ok&&Number.isFinite(total)&&total>0&&cards>=expectedFirstPage};

const report={checkedAt:new Date().toISOString(),dateFi:now,eurospar,tokmanni};
writeFileSync("tokmanni-spar-offer-freshness.json",JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

if(!tokmanni.healthy)process.exitCode=1;
if(!eurospar.healthy||eurospar.offers===0||!eurospar.active){
  console.error("EUROSPAR bundled offer feed is missing, empty or expired; refresh required.");
  process.exitCode=1;
}

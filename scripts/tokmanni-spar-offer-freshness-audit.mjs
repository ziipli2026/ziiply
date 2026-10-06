#!/usr/bin/env node
import {readFileSync,writeFileSync} from "node:fs";

const feed=JSON.parse(readFileSync("src/app/components/ziiply/offerSearch/providers/eurospar-feed.json","utf8"));
const now=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const from=String(feed?.validity?.from??"");
const to=String(feed?.validity?.to??"");
const ageDays=to ? Math.floor((Date.parse(now+"T12:00:00Z")-Date.parse(to+"T12:00:00Z"))/86400000) : null;
const eurospar={
  issue:String(feed?.issue??""),
  from,
  to,
  healthy:feed?.healthy===true,
  offers:Array.isArray(feed?.offers)?feed.offers.length:0,
  stores:Array.isArray(feed?.stores)?feed.stores.length:0,
  active:Boolean(from&&to&&from<=now&&now<=to),
  ageDays,
  refreshRequired:Boolean(!to||to<now),
};

const url=new URL("https://www.tokmanni.fi/viikkotarjoukset/elintarvikkeet-ja-elainruoka");
const response=await fetch(url,{headers:{accept:"text/html,application/xhtml+xml","accept-language":"fi-FI,fi;q=0.9","user-agent":"Ziiply/1.0"},signal:AbortSignal.timeout(20000)});
if(!response.ok)throw new Error("Tokmanni weekly offers HTTP "+response.status);
const html=await response.text();
const text=html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ");
const totalMatch=text.match(/(?:Tuotteet\s+\d+\s*[-–]\s*\d+\s*\/\s*|)(\d+)\s+tuotetta/i);
const total=totalMatch?Number(totalMatch[1]):null;
const cards=(html.match(/<li\b[^>]*class=["'][^"']*product-item[^"']*["'][^>]*>/gi)||[]).length;
const expectedFirstPage=Math.min(total??40,40);
let page2=null;
if(Number.isFinite(total)&&total>40){
  const page2Url=new URL(url);
  page2Url.searchParams.set("p","2");
  const r2=await fetch(page2Url,{headers:{accept:"text/html,application/xhtml+xml","accept-language":"fi-FI,fi;q=0.9","user-agent":"Ziiply/1.0"},signal:AbortSignal.timeout(20000)});
  const h2=r2.ok?await r2.text():"";
  const cardPattern=/<li\b[^>]*class=["'][^"']*product-item[^"']*["'][^>]*>[\s\S]*?<\/li>/gi;
  const firstCards=html.match(cardPattern)||[];
  const secondCards=h2.match(cardPattern)||[];
  const normalize=s=>s.replace(/\s+/g," ").trim().slice(0,500);
  const firstFingerprints=new Set(firstCards.slice(0,40).map(normalize));
  const secondFingerprints=secondCards.slice(0,40).map(normalize);
  const distinct=secondFingerprints.length>0&&secondFingerprints.some(x=>!firstFingerprints.has(x));
  page2={http:r2.status,cards:secondCards.length,distinct,source:page2Url.href,healthy:r2.ok&&secondCards.length>0&&distinct};
}
const tokmanni={http:response.status,total,cards,expectedFirstPage,page2,source:url.href,healthy:response.ok&&Number.isFinite(total)&&total>0&&cards>=expectedFirstPage&&(!page2||page2.healthy)};

const report={checkedAt:new Date().toISOString(),dateFi:now,eurospar,tokmanni};
writeFileSync("tokmanni-spar-offer-freshness.json",JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

if(!tokmanni.healthy)process.exitCode=1;
if(!eurospar.healthy||eurospar.offers===0||!eurospar.active){
  console.error("EUROSPAR bundled offer feed is missing, empty or expired; refresh required.");
  process.exitCode=1;
}

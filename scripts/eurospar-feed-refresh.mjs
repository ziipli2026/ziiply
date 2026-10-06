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
const offerText=seoText.replace(/\s+/g," ").trim();
const productStarts=[...offerText.matchAll(/(?=(ATRIA|VALIO|BILLYS|TAMSIN|MAKEA|KELTAINEN|SNELLMAN|MAATILAN PARHAAT|HERKKUTILAN|POROKYLÄN|HK BURGERI|MUNKKIMIEHET|PIZZADONITSI|FLORA|FAZER|OULULAINEN|SAARIOINEN|EMMA)\b)/gi)].map(m=>m.index);
const offerSegments=productStarts.map((s,i)=>offerText.slice(s,productStarts[i+1]??offerText.length).trim()).filter(x=>x.length>10&&/\d+[,.]\d{2}/.test(x));
const storeHits=["Iisalmi","Joensuu","Järvenpää","Masku","Tornio","Ylöjärvi"].filter(x=>seoText.toLocaleLowerCase("fi").includes(x.toLocaleLowerCase("fi")));
const storeNames=["Iisalmi","Joensuu","Järvenpää","Masku","Tornio","Ylöjärvi"];
const toPrice=(whole,dec)=>Number((String(whole)+"."+String(dec).padStart(2,"0")).replace(",", "."));
function parseOfferSegment(segment,index){
  const s=segment.replace(/\s+/g," ").trim();
  const normalMatch=s.match(/Norm\.\s*(\d{1,2}[,.]\d{2})(?:\s*[–-]\s*(\d{1,2}[,.]\d{2}))?(?:\s*\/\s*(kpl|pkt|kg))?/i);
  const unitMatch=s.match(/\((\d{1,3}[,.]\d{2})(?:\s*[–-]\s*(\d{1,3}[,.]\d{2}))?\s*\/\s*(kg|l|kpl)\)/i);
  const multi=[...s.matchAll(/(\d+)\s+(kpl|pkt|ps|rs|rasia|pussi|kilo)\s+(\d{1,2})\s+(\d{2})(?:\s*-\s*(\d{1,2})\s*%)?/gi)].at(-1);
  const single=[...s.matchAll(/(?:^|\s)(\d{1,2})\s+(\d{2})\s+(kpl|pkt|ps|rs|rasia|pussi|kilo)(?:\s|$)/gi)].at(-1);
  const compact=[...s.matchAll(/(?:^|\s)(\d{1,2}[,.]\d{2})\s+(kpl|pkt|ps|rs|rasia|pussi|kilo)(?:\s|$)/gi)].at(-1);
  let offerPrice=null,multiUnit=null;
  if(multi){offerPrice=toPrice(multi[3],multi[4]);multiUnit={quantity:Number(multi[1]),unit:multi[2].toLowerCase()};}
  else if(single){offerPrice=toPrice(single[1],single[2]);}
  else if(compact){offerPrice=Number(compact[1].replace(",", "."));}
  const discountMatch=s.match(/(?:^|\s)-\s*(\d{1,2})\s*%/);
  const discount=discountMatch?Number(discountMatch[1]):null;
  const size=s.match(/\b(\d+(?:[.,]\d+)?\s*(?:g|kg)|n\.\s*\d+(?:[.,]\d+)?\s*kg|\d+(?:[.,]\d+)?\s*[–-]\s*\d+(?:[.,]\d+)?\s*(?:g|kg))\b/i)?.[1]??null;
  const firstPrice=s.match(/^(.+?)(?:\s+\(\d+[,.]\d{2}(?:\s*[–-]\s*\d+[,.]\d{2})?\s*\/\s*(?:kg|l|kpl)\)|\s+Norm\.)/i);
  const title=(firstPrice?.[1]??s).replace(/^EUROSPAR\s+41\/26\s+/i,"").trim();
  const unitPrice=unitMatch?unitMatch[1]+(unitMatch[2]?("-"+unitMatch[2]):""):null;
  const unitPriceUnit=unitMatch?.[3]??null;
  const normal=normalMatch?normalMatch[1]+(normalMatch[2]?("-"+normalMatch[2]):""):null;
  const category=/salaatti|luumu|kiivi|hevi/i.test(title)?"Hevi":/jogurtti|raejuusto|juustoraaste|juustoviipale/i.test(title)?"Maitotuotteet":/leike|jauheliha|reisikoipi|burgeri/i.test(title)?"Liha & makkarat":/ruis|pikkueväs|munkki|donitsi/i.test(title)?"Leipomo":/pizz|mikroateria/i.test(title)?"Valmisruoka":"Muut";
  return {name:title.toLocaleLowerCase("fi-FI"),category,size,packCount:null,unitPrice,unitPriceUnit,normalPrice:normal,normalUnit:normalMatch?.[3]??null,discountPercent:discount,restriction:null,offerPrice,multiUnit,eans:[],identityStatus:"leaflet-only",identityReason:"EUROSPAR fresh-food catalog identity is not exposed by Tokmanni web/Klevu; do not infer EAN",id:"eurospar:"+issue+":1:"+(index+1),chain:"EUROSPAR",storeType:"EUROSPAR",source:"EUROSPAR tarjouslehti",priceBasis:multiUnit?"multi-buy-total":"single-unit",issue,validFrom:validity?.from??null,validTo:validity?.to??null,stores:storeNames,page:1};
}
const parsedOffers=offerSegments.map(parseOfferSegment);
const parseErrors=parsedOffers.filter(x=>!x.name||x.name.length<5||!(x.offerPrice>0)||x.offerPrice>100||!x.validFrom||!x.validTo);
const uniqueNames=new Set(parsedOffers.map(x=>x.name));
const validityCurrentOrFuture=Boolean(validity?.to && validity.to>=today);



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

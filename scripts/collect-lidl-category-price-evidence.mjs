#!/usr/bin/env node
/**
 * Research-only Lidl category price evidence collector.
 * Reads official public category pages in bulk and emits observations.
 * Never promotes campaign/display prices to verified checkout or regular prices.
 */
const urls=process.argv.slice(2).filter(x=>/^https:\/\/www\.lidl\.fi\/h\//.test(x));
if(!urls.length) throw new Error("Pass one or more official Lidl category URLs");
const clean=s=>String(s??"").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
const eur=s=>{const m=String(s??"").match(/(\d+[,.]\d{1,2})\s*€/);return m?Number(m[1].replace(",",".")):null};
const isoDate=s=>{const m=String(s??"").match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:null};
const out=[];
for(const source of urls){
 const res=await fetch(source,{headers:{"user-agent":"ZiiplyLidlResearch/1.0",accept:"text/html"},signal:AbortSignal.timeout(15000)});
 if(!res.ok) throw new Error(`${res.status} ${source}`);
 const html=await res.text();
 // Lidl category payload contains rendered product-card text. Split conservatively at product-card-ish price markers;
 // keep raw evidence so parser changes remain auditable.
 const text=clean(html);
 const chunks=text.split(/(?=Myymälässä\s+\d{1,2}\.\d{1,2}\.)/i);
 for(const chunk of chunks){
   const validity=chunk.match(/Myymälässä\s+(\d{1,2}\.\d{1,2}\.?(?:\d{4})?)\s*-\s*(\d{1,2}\.\d{1,2}\.?(?:\d{4})?)/i);
   if(!validity) continue;
   const price=eur(chunk);
   if(price==null) continue;
   out.push({
     source, observedAt:new Date().toISOString(), researchOnly:true,
     displayedPriceEur:price,
     isLidlPlus:/Lidl Plus/i.test(chunk),
     isMultiBuy:/\b\d+\s*KPL\b/i.test(chunk),
     validFromRaw:validity[1], validThroughRaw:validity[2],
     evidenceText:chunk.slice(Math.max(0,chunk.length-900)),
     priceVerified:false, checkoutPriceVerified:false, regularPriceVerified:false
   });
 }
}
process.stdout.write(JSON.stringify({sourceType:"lidl.fi-category-public",researchOnly:true,count:out.length,records:out},null,2)+"\n");

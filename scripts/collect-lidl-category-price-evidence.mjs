#!/usr/bin/env node
/**
 * Research-only Lidl public price evidence collector.
 * Reads official public category and campaign pages in bulk.
 * Never promotes display/campaign prices to verified checkout or regular prices.
 */
const urls=process.argv.slice(2).filter(x=>/^https:\/\/www\.lidl\.fi\/(?:h|c)\//.test(x));
if(!urls.length) throw new Error("Pass one or more official Lidl category/campaign URLs");

const clean=s=>String(s??"").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
const decode=s=>clean(String(s??"").replace(/\\u002F/g,"/").replace(/\\u0026/g,"&").replace(/\\u003C/g,"<").replace(/\\u003E/g,">").replace(/\\u0022/g,'"'));
const eur=s=>{const m=String(s??"").match(/(\d+[,.]\d{1,2})\s*€/);return m?Number(m[1].replace(",",".")):null};
const parseFiDate=(raw,observedAt)=>{
  const m=String(raw??"").match(/(\d{1,2})\.(\d{1,2})\.?(\d{4})?/);
  if(!m) return null;
  const year=m[3]?Number(m[3]):new Date(observedAt).getUTCFullYear();
  return `${year}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
};
const temporalStatus=(fromIso,throughIso,observedAt,kind)=>{
  if(kind==="continuous-listing") return "continuous";
  if(!fromIso||!throughIso) return "unknown";
  const day=new Date(observedAt).toISOString().slice(0,10);
  return day<fromIso?"future":day>throughIso?"past":"current";
};
const identity=s=>clean(s).toLowerCase().replace(/\b(?:myymälässä|lidl plus -äpillä)\b.*$/i,"").slice(-240);
const raw=[];

for(const source of urls){
  const observedAt=new Date().toISOString();
  const res=await fetch(source,{headers:{"user-agent":"ZiiplyLidlResearch/1.0",accept:"text/html"},signal:AbortSignal.timeout(15000)});
  if(!res.ok) throw new Error(`${res.status} ${source}`);
  const text=decode(await res.text());

  const dated=[...text.matchAll(/Myymälässä\s+(\d{1,2}\.\d{1,2}\.?(?:\d{4})?)\s*-\s*(\d{1,2}\.\d{1,2}\.?(?:\d{4})?)/gi)];
  for(const m of dated){
    const before=text.slice(Math.max(0,m.index-1100),m.index);
    const prices=[...before.matchAll(/(\d+[,.]\d{1,2})\s*€/g)];
    if(!prices.length) continue;
    const price=Number(prices.at(-1)[1].replace(",","."));
    const fromIso=parseFiDate(m[1],observedAt), throughIso=parseFiDate(m[2],observedAt);
    const evidenceText=text.slice(Math.max(0,m.index-900),Math.min(text.length,m.index+m[0].length+80));
    raw.push({
      source,observedAt,researchOnly:true,displayedPriceEur:price,
      isLidlPlus:/Lidl Plus/i.test(evidenceText),
      isMultiBuy:/\b\d+\s*KPL\b/i.test(evidenceText),
      validFromRaw:m[1],validThroughRaw:m[2],validFrom:fromIso,validThrough:throughIso,
      availabilityKind:"dated-campaign",
      temporalStatus:temporalStatus(fromIso,throughIso,observedAt,"dated-campaign"),
      evidenceText,
      priceVerified:false,checkoutPriceVerified:false,regularPriceVerified:false
    });
  }
}

const seen=new Set();
const records=raw.filter(r=>{
  const key=[identity(r.evidenceText),r.displayedPriceEur,r.validFrom,r.validThrough,r.availabilityKind].join("|");
  if(seen.has(key)) return false;
  seen.add(key); return true;
});
process.stdout.write(JSON.stringify({
  sourceType:"lidl.fi-public",researchOnly:true,
  count:records.length,rawCount:raw.length,deduplicated:raw.length-records.length,
  statusCounts:records.reduce((a,r)=>(a[r.temporalStatus]=(a[r.temporalStatus]||0)+1,a),{}),
  records
},null,2)+"\n");

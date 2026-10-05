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
const structuredProducts=html=>{
  const marker='__NUXT_DATA__';
  const start=html.indexOf(marker);
  if(start<0) return [];
  const open=html.indexOf('>',start), close=html.indexOf('</script>',open);
  if(open<0||close<0) return [];
  let data; try{data=JSON.parse(html.slice(open+1,close))}catch{return []}
  const deref=v=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<data.length?data[v]:null;
  const out=[];
  for(const value of data){
    if(!value||typeof value!=='object'||Array.isArray(value)||!('gridBoxData' in value)) continue;
    const p=deref(value.gridBoxData);
    if(!p||typeof p!=='object'||Array.isArray(p)) continue;
    const ians=deref(p.ians);
    const priceRaw=deref(p.price);
    const priceObj=priceRaw&&typeof priceRaw==='object'&&!Array.isArray(priceRaw)?priceRaw:{};
    const baseRaw=deref(priceObj.basePrice);
    const baseObj=baseRaw&&typeof baseRaw==='object'&&!Array.isArray(baseRaw)?baseRaw:{};
    out.push({
      lidlProductId:deref(p.productId)??null,
      ian:Array.isArray(ians)?ians.map(deref).filter(Boolean):[],
      name:deref(p.fullTitle)??null,
      canonicalPath:deref(p.canonicalPath)??null,
      displayedPriceEur:typeof deref(priceObj.price)==='number'?deref(priceObj.price):null,
      unitPriceText:deref(baseObj.text)??null
    });
  }
  return out;
};
const packageSizeFrom=(name,unitPriceText)=>{
  const text=clean(name);
  const m=text.match(/\b(\d+(?:[,.]\d+)?)\s*(kg|g|l|ml|cl)\b/i);
  return m?{value:Number(m[1].replace(',','.')),unit:m[2].toLowerCase(),raw:m[0]}:null;
};
const OFFICIAL_CATEGORY_IDS=["10071012","10095752","10071050","10095761","10096086","10096095","10096110","10071020","10096153","10071049","10096205","10071022","10096287","10071024","10095753","10095754","10095755","10095758","10096075","10096076","10096077","10096096","10096098","10096100"];
const collectOfficialApi=async()=>{
  const out=[],errors=[];
  for(const id of OFFICIAL_CATEGORY_IDS){
    try{
      const p=new URLSearchParams({assortment:"FI",locale:"fi_FI",version:"v2.1.0",fetchsize:"60",offset:"0","category.id":id});
      const r=await fetch("https://www.lidl.fi/q/api/search?"+p,{headers:{accept:"*/*","accept-language":"fi-FI,fi;q=0.9"},signal:AbortSignal.timeout(15000)});
      if(!r.ok) throw new Error("HTTP "+r.status);
      const j=await r.json();
      for(const x of Array.isArray(j.items)?j.items:[]){
        const d=x?.gridbox?.data||{},price=d?.price?.price,base=d?.basePrice?.text??null;
        if(!d.productId||!d.fullTitle||typeof price!=="number") continue;
        out.push({categoryId:id,lidlProductId:String(d.productId),ian:Array.isArray(d.ians)?d.ians.filter(Boolean):[],name:String(d.fullTitle),displayedPriceEur:price,unitPriceText:base,canonicalPath:d.canonicalPath??null,gs1Attributes:d.gs1Attributes??null});
      }
    }catch(e){errors.push({categoryId:id,error:String(e)})}
  }
  return {out,errors};
};
const raw=[];
const observedAt=new Date().toISOString();
const api=await collectOfficialApi();
for(const product of api.out){
  raw.push({source:"https://www.lidl.fi/q/api/search?category.id="+product.categoryId,observedAt,researchOnly:true,
    lidlProductId:product.lidlProductId,ian:product.ian,productName:product.name,productUrl:product.canonicalPath?new URL(product.canonicalPath,"https://www.lidl.fi").href:null,
    displayedPriceEur:product.displayedPriceEur,unitPriceText:product.unitPriceText,packageSize:packageSizeFrom(product.name,null),gs1Attributes:product.gs1Attributes,
    productMatchConfidence:"official-category-api",isLidlPlus:null,isMultiBuy:null,validFromRaw:null,validThroughRaw:null,validFrom:null,validThrough:null,
    availabilityKind:"continuous-api",temporalStatus:"continuous",evidenceText:clean([product.name,product.displayedPriceEur+" €",product.unitPriceText].filter(Boolean).join(" ")),
    priceVerified:false,checkoutPriceVerified:false,regularPriceVerified:false});
}

for(const source of urls){
  const observedAt=new Date().toISOString();
  const res=await fetch(source,{headers:{"user-agent":"ZiiplyLidlResearch/1.0",accept:"text/html"},signal:AbortSignal.timeout(15000)});
  if(!res.ok) throw new Error(`${res.status} ${source}`);
  const html=await res.text();
  const products=structuredProducts(html);
  const text=decode(html);

  if(source.includes('/h/')){
    for(const product of products){
      if(product.displayedPriceEur==null) continue;
      raw.push({
        source,observedAt,researchOnly:true,
        lidlProductId:product.lidlProductId,ian:product.ian,productName:product.name,
        productUrl:product.canonicalPath?new URL(String(product.canonicalPath),source).href:null,
        displayedPriceEur:product.displayedPriceEur,unitPriceText:product.unitPriceText,packageSize:packageSizeFrom(product.name,product.unitPriceText),
        isLidlPlus:false,isMultiBuy:false,
        validFromRaw:null,validThroughRaw:null,validFrom:null,validThrough:null,
        availabilityKind:'continuous-listing',temporalStatus:'continuous',
        evidenceText:clean([product.name,product.displayedPriceEur+' €',product.unitPriceText].filter(Boolean).join(' ')),
        priceVerified:false,checkoutPriceVerified:false,regularPriceVerified:false
      });
    }
  }

  const dated=[...text.matchAll(/Myymälässä\s+(\d{1,2}\.\d{1,2}\.?(?:\d{4})?)\s*-\s*(\d{1,2}\.\d{1,2}\.?(?:\d{4})?)/gi)];
  for(const m of dated){
    const before=text.slice(Math.max(0,m.index-1100),m.index);
    const prices=[...before.matchAll(/(\d+[,.]\d{1,2})\s*€/g)];
    if(!prices.length) continue;
    const price=Number(prices.at(-1)[1].replace(",","."));
    const fromIso=parseFiDate(m[1],observedAt), throughIso=parseFiDate(m[2],observedAt);
    const evidenceText=text.slice(Math.max(0,m.index-900),Math.min(text.length,m.index+m[0].length+80));
    const normalizedEvidence=clean(evidenceText).toLowerCase();
    const product=products.find(p=>p.name&&normalizedEvidence.includes(clean(p.name).toLowerCase()))??null;
    const exactNameMatches=products.filter(p=>p.name&&normalizedEvidence.includes(clean(p.name).toLowerCase()));
    const matchConfidence=product?(exactNameMatches.length===1?'exact-name':'ambiguous-name'):'unmatched';
    raw.push({
      source,observedAt,researchOnly:true,
      lidlProductId:product?.lidlProductId??null,ian:product?.ian??[],productName:product?.name??null,
      productUrl:product?.canonicalPath?new URL(String(product.canonicalPath),source).href:null,
      displayedPriceEur:price,unitPriceText:product?.unitPriceText??null,packageSize:packageSizeFrom(product?.name,product?.unitPriceText),
      productMatchConfidence:matchConfidence,
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

const priority=r=>r.productMatchConfidence==="official-category-api"?3:r.availabilityKind==="continuous-listing"?2:1;
const byKey=new Map();
for(const r of raw){
  const stableIdentity=r.lidlProductId||r.productUrl||identity(r.evidenceText);
  const continuous=r.availabilityKind==="continuous-listing"||r.availabilityKind==="continuous-api";
  const key=continuous&&r.lidlProductId
    ? ["continuous-product",r.lidlProductId].join("|")
    : [stableIdentity,r.displayedPriceEur,r.validFrom,r.validThrough,r.availabilityKind].join("|");
  const prev=byKey.get(key);
  if(!prev||priority(r)>priority(prev)) byKey.set(key,r);
}
const records=[...byKey.values()];
const strongRecords=records.filter(r=>r.availabilityKind==='continuous-listing'||r.availabilityKind==='continuous-api'||r.productMatchConfidence==='exact-name');
const reviewQueue=records.filter(r=>r.availabilityKind==='dated-campaign'&&r.productMatchConfidence!=='exact-name');
process.stdout.write(JSON.stringify({
  sourceType:"lidl.fi-public",researchOnly:true,
  count:strongRecords.length,totalCount:records.length,strongCount:strongRecords.length,reviewCount:reviewQueue.length,rawCount:raw.length,deduplicated:raw.length-records.length,
  statusCounts:records.reduce((a,r)=>(a[r.temporalStatus]=(a[r.temporalStatus]||0)+1,a),{}),
  matchCounts:records.reduce((a,r)=>{const k=r.productMatchConfidence||"structured-continuous";a[k]=(a[k]||0)+1;return a},{}),
  records:strongRecords,
  reviewQueue
},null,2)+"\n");

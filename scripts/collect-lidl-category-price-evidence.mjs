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
  const text=clean([name,unitPriceText].filter(Boolean).join(' '));
  const m=text.match(/\b(\d+(?:[,.]\d+)?)\s*(kg|g|l|ml|cl)\b/i);
  return m?{value:Number(m[1].replace(',','.')),unit:m[2].toLowerCase(),raw:m[0]}:null;
};
const productLinks=html=>[...new Set([...html.replace(/\\u002F/g,'/').replace(/\\\//g,'/').matchAll(/\/p\/[a-z0-9åäö_-]+\/p\d{5,}/gi)].map(m=>m[0]))];
const jsonLdProducts=html=>{
  const out=[];
  for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    let root; try{root=JSON.parse(m[1])}catch{continue}
    const visit=v=>{
      if(!v||typeof v!=='object') return;
      if(Array.isArray(v)){v.forEach(visit);return}
      const types=Array.isArray(v['@type'])?v['@type']:[v['@type']];
      if(types.includes('Product')) out.push(v);
      if(v['@graph']) visit(v['@graph']);
      if(v.itemListElement) visit(v.itemListElement);
      if(v.item) visit(v.item);
    }; visit(root);
  }
  return out;
};
const raw=[];

for(const source of urls){
  const observedAt=new Date().toISOString();
  const res=await fetch(source,{headers:{"user-agent":"ZiiplyLidlResearch/1.0",accept:"text/html"},signal:AbortSignal.timeout(15000)});
  if(!res.ok) throw new Error(`${res.status} ${source}`);
  const html=await res.text();
  const products=structuredProducts(html);
  const text=decode(html);

  if(source.includes('/c/')){
    const links=productLinks(html).slice(0,120);
    const pages=await Promise.allSettled(links.map(async path=>{
      const url=new URL(path,source).href;
      const r=await fetch(url,{headers:{"user-agent":"ZiiplyLidlResearch/1.0",accept:"text/html"},signal:AbortSignal.timeout(15000)});
      if(!r.ok) throw new Error(String(r.status));
      return {url,html:await r.text()};
    }));
    for(const page of pages){
      if(page.status!=='fulfilled') continue;
      for(const p of jsonLdProducts(page.value.html)){
        const offers=Array.isArray(p.offers)?p.offers:p.offers?[p.offers]:[];
        for(const offer of offers){
          const price=Number(offer?.price??offer?.priceSpecification?.price);
          const from=String(offer?.validFrom??offer?.priceSpecification?.validFrom??'').slice(0,10);
          const through=String(offer?.validThrough??offer?.priceValidUntil??offer?.priceSpecification?.validThrough??'').slice(0,10);
          if(!p.name||!Number.isFinite(price)||price<=0||!/^20\d\d-/.test(from)||!/^20\d\d-/.test(through)) continue;
          const id=String(page.value.url).match(/\/p(\d{5,})/i)?.[1]??null;
          raw.push({
            source:page.value.url,observedAt,researchOnly:true,lidlProductId:id,ian:[],productName:String(p.name),productUrl:page.value.url,
            displayedPriceEur:price,unitPriceText:null,packageSize:packageSizeFrom(p.name,null),productMatchConfidence:'structured-product-page',
            isLidlPlus:false,isMultiBuy:/\b\d+\s*kpl\b/i.test(String(p.name)),validFromRaw:null,validThroughRaw:null,validFrom:from,validThrough:through,
            availabilityKind:'dated-campaign',temporalStatus:temporalStatus(from,through,observedAt,'dated-campaign'),
            evidenceText:clean([p.name,price+' €'].join(' ')),priceVerified:false,checkoutPriceVerified:false,regularPriceVerified:false
          });
        }
      }
    }
  }

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

const seen=new Set();
const records=raw.filter(r=>{
  const stableIdentity=r.lidlProductId||r.productUrl||identity(r.evidenceText);
  const key=[stableIdentity,r.displayedPriceEur,r.validFrom,r.validThrough,r.availabilityKind].join("|");
  if(seen.has(key)) return false;
  seen.add(key); return true;
});
const strongRecords=records.filter(r=>r.availabilityKind==='continuous-listing'||r.productMatchConfidence==='exact-name');
const reviewQueue=records.filter(r=>r.availabilityKind==='dated-campaign'&&r.productMatchConfidence!=='exact-name');
process.stdout.write(JSON.stringify({
  sourceType:"lidl.fi-public",researchOnly:true,
  count:records.length,strongCount:strongRecords.length,reviewCount:reviewQueue.length,rawCount:raw.length,deduplicated:raw.length-records.length,
  statusCounts:records.reduce((a,r)=>(a[r.temporalStatus]=(a[r.temporalStatus]||0)+1,a),{}),
  matchCounts:records.reduce((a,r)=>{const k=r.productMatchConfidence||"structured-continuous";a[k]=(a[k]||0)+1;return a},{}),
  records:strongRecords,
  reviewQueue
},null,2)+"\n");

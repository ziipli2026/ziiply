import { parseKCitymarketSpatialLeaflet } from "./kCitymarketSpatialParser.js";

// ============================================================================
// ZIIPLY K-CITYMARKET PROVIDER V13
// Revision: V13-KCITYMARKET-UNITPRICE-INFERENCE
// Date: 2026-09-21
//
// - Keeps V12 compact-price parser and route V20 diagnostics intact.
// - Adds conservative package-size + unit-price inference for K-Citymarket flipbook rows.
// - Examples: 130–170 g + 10,53–13,77/kg => 1,79; 200–280 g + 16,04–22,45/kg => 4,49.
// - Rejects ambiguous flattened rows containing multiple package-size or unit-price specifications.
// - Inferred offers are merged with V12 offers and deduplicated; existing K-Market/K-Supermarket code is untouched.
// ============================================================================

export type CitymarketOffer = {
  id: string;
  title: string;
  price: number;
  normalPrice?: number | null;
  unitPrice?: number | null;
  unit?: string | null;
  packageSize?: string | null;
  plussa?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  category?: string | null;
  chain: "K";
  storeType: "K-Citymarket";
  source: "K-Citymarket tarjouslehti";
  sourceUrl: string;
};

const ENTRY = "https://kcm-lehdet.k-ruoka.fi/tarjouslehti";
const clean=(s:string)=>String(s??"").replace(/\u00a0/g," ").replace(/[ \t]+/g," ").trim();
const money=(s:string)=>Number(String(s).replace(",","."));
const abs=(href:string,base:string)=>{try{return new URL(href,base).href}catch{return null}};

async function html(url:string){
  const r=await fetch(url,{redirect:"follow",headers:{"accept":"text/html,application/xhtml+xml","user-agent":"Ziiply/1.0"}});
  if(!r.ok) throw new Error(`K-Citymarket HTTP ${r.status}: ${url}`);
  return {url:r.url,text:await r.text()};
}
function decodeEntities(src:string){
  const named:Record<string,string>={
    nbsp:" ",amp:"&",euro:"€",quot:'"',apos:"'",lt:"<",gt:">",
    auml:"ä",Auml:"Ä",ouml:"ö",Ouml:"Ö",aring:"å",Aring:"Å"
  };
  return src
    .replace(/&([A-Za-z]+);/g,(all,n)=>named[n]??all)
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
}
function textOf(src:string){
  return clean(
    decodeEntities(
      src.replace(/<script[\s\S]*?<\/script>/gi," ")
        .replace(/<style[\s\S]*?<\/style>/gi," ")
        .replace(/<br\s*\/?\s*>/gi,"\n")
        .replace(/<\/(?:p|div|li|span|h[1-6])>/gi,"\n")
        .replace(/<[^>]+>/g," ")
    )
  ).replace(/ ?\n ?/g,"\n");
}
function category(t:string){
  const s=t.toLowerCase();
  if(/kahvi|espresso|tee\b/.test(s)) return "Kahvi & tee";
  if(/maito|juusto|jogur|rahka|kerma|voi\b|raejuusto|viili|piim/.test(s)) return "Maitotuotteet";
  if(/mehu|limon|virvoitus|energiajuoma|vitamiinijuoma|urheilujuoma|kivennäisves|vichy|cola|juoma|vesi\b/.test(s)) return "Juomat";
  if(/kana|broiler|nauta|sika|porsas|jauheliha|makkara|nakki|pekoni|kinkku|liha/.test(s)) return "Liha & makkarat";
  if(/kala|lohi|silakka|tonnikala|kirjolohi|seiti|katkarapu/.test(s)) return "Kala";
  if(/omena|banaani|tomaatti|kurkku|salaatti|paprika|peruna|sipuli|porkkana|mango|satsuma|marja|hedelm|vihann/.test(s)) return "Hevi";
  if(/jäätel|pakaste/.test(s)) return "Pakasteet";
  if(/leipä|sämpyl|pull|croissant|patonki|karjalanpiirakka|ruisleip/.test(s)) return "Leipomo";
  if(/pizza|ateria|keitto|valmisruoka|wrap|caesar|taco-salaat/.test(s)) return "Valmisruoka";
  if(/pasta|riisi|jauho|hiutale|muro|mysli|säilyke|kastike|öljy|mauste|tortilla/.test(s)) return "Kuivatuotteet";
  if(/suklaa|kark|makeis|keksi|chips|sips|perunalastu|lakrit|salmiak|purukum/.test(s)) return "Makeiset & keksit";
  if(/koira|kissa|lemmik/.test(s)) return "Lemmikit";
  if(/pesu|puhdist|astianpes|pyykin|wc-paper|talouspaper|nenäliina|näsdukar/.test(s)) return "Kodinhoito";
  if(/shampoo|saippua|deodor|hammastahna|hammasharja|vaihtoharja|oral-b|herbina|kosmeti/.test(s)) return "Hygienia & kosmetiikka";
  if(/calluna|ljung|orkidea|krysanteemi|kukka|kasvi|kenkä|nilkkuri|maihari|takki|housut|vaate|kalenteri|muki|lakana|pyyhe/.test(s)) return "Koti & vapaa-aika";
  return "Muut";
}
function isNoiseLine(line:string){
  const s=clean(line);
  return !s ||
    /view full version|k-citymarket tarjouslehti|katso resepti|appanvändare/i.test(s) ||
    /^(plus(sa)?|etu|erä|voimassa|rajoitus|normaali|lahjoitus|\/tuote|p\.\s*\d+)$/i.test(s) ||
    /^(sis\.?\s*pantit|ilman plussa-korttia|normaalihinta)/i.test(s);
}
function isFalsePriceContext(lines:string[],i:number,raw:string){
  const line=lines[i].toLowerCase();
  const around=lines.slice(Math.max(0,i-1),Math.min(lines.length,i+2)).join(" ").toLowerCase();
  const value=money(raw);

  // V3-debugissa nämä olivat systemaattisesti pakkaus/pantti/lahjoitus-osumia.
  if(/%|pant|\/\s*(kg|l|kpl)\b/.test(line)) return true;
  if(/\b\d+(?:[,.]\d+)?\s*(kg|g|l|ml|cl|dl|kpl|pkt|pss|tlk|pl|rl)\b/.test(line)) return true;
  if(/\blahjoitus\b/.test(around) && value < 1) return true;

  // 0,10–0,50 € oli nykyisessä lehdessä toistuvasti väärä osuma.
  // Varsinainen tarjous hyväksytään alle eurolla vain jos rivillä on selvä €/kpl-hintamerkintä.
  if(value < 1 && !/€|eur|\b(?:kpl|pkt|pss|tlk|pari)\b/i.test(line)) return true;
  return false;
}
function compactPriceCandidatesV12(line:string):number[]{
  const x=clean(line);
  const out:number[]=[];

  // Flipbook price glyphs are commonly rendered as 3 digits: 099 -> 0.99, 449 -> 4.49.
  // Require either a leading zero OR a plausible euro/cents shape. Exclude common page/layout
  // fragments and long grouped numeric strings unless the line is purely price-like.
  if(!/^(?:\d{3})(?:\s+\d{2,3})*$/.test(x)) return out;

  const tokens=x.split(/\s+/);
  for(const token of tokens){
    if(!/^\d{3}$/.test(token)) continue;
    if(/^20\d$/.test(token)) continue; // e.g. stray 201 from page layout
    const n=Number(token);
    const value=n/100;
    if(value>=0.09 && value<=99.99) out.push(value);
  }
  return out;
}

function extractOfferPricesV10(lines:string[],i:number):number[]{
  const line=lines[i];
  const out:number[]=[];

  // Normal decimal prices.
  for(const m of line.matchAll(/(?<!\d)(\d{1,3}[,.]\d{2})(?!\d)/g)){
    if(isFalsePriceContext(lines,i,m[1])) continue;
    const value=money(m[1]);
    if(Number.isFinite(value)&&value>=0.05&&value<1000) out.push(value);
  }

  // Explicit integer euro price.
  for(const m of line.matchAll(/(?<!\d)(\d{1,3})\s*(?:€|eur)\b/gi)){
    const value=money(m[1]);
    if(Number.isFinite(value)&&value>=1&&value<1000) out.push(value);
  }

  // Flipbook compact visual price.
  out.push(...compactPriceCandidatesV12(line));

  return [...new Set(out)];
}

function productTitleV12(lines:string[],priceIndex:number){
  const junk=/^(?:kpl|pkt|ps|rs|pari|tuotteet|kaikki|basic html version|view full version|table of contents)$/i;
  const candidates=lines.slice(Math.max(0,priceIndex-8),priceIndex)
    .map(clean)
    .filter(x=>/[A-Za-zÅÄÖåäö]/.test(x))
    .filter(x=>!isNoiseLine(x))
    .filter(x=>!junk.test(x))
    .filter(x=>!/^[-–]?\d+%/.test(x))
    .filter(x=>!/^ilman plussa-korttia/i.test(x))
    .filter(x=>!/^katso (?:resepti|lisää)/i.test(x))
    .filter(x=>!/\b(?:lahjoitus|voimassa)\b/i.test(x));

  for(let j=candidates.length-1;j>=0;j--){
    const x=candidates[j];
    if(/\b\d+(?:[,.]\d+)?\s*(?:kg|g|l|ml|cl|dl|kpl|pkt|ps|rs|pss|tlk)\b/i.test(x) ||
       /[A-ZÅÄÖ]{3,}/.test(x)){
      return x;
    }
  }
  return candidates.at(-1) ?? "";
}


function allSizeSpecsV13(s:string){
  const out:Array<{min:number;max:number;unit:string;raw:string}>=[];
  const re=/(\d+(?:[,.]\d+)?)\s*(?:[–-]\s*(\d+(?:[,.]\d+)?)\s*)?(kg|g|l|ml|cl|dl)\b/gi;
  for(const m of s.matchAll(re)){
    const a=money(m[1]);
    const b=m[2]?money(m[2]):a;
    const unit=m[3].toLowerCase();
    const factor:Record<string,number>={kg:1,g:0.001,l:1,ml:0.001,cl:0.01,dl:0.1};
    out.push({min:a*factor[unit],max:b*factor[unit],unit,raw:m[0]});
  }
  return out;
}

function allUnitPriceSpecsV13(s:string){
  const out:Array<{min:number;max:number;unit:"kg"|"l";raw:string}>=[];
  const re=/(\d+[,.]\d{1,2})\s*(?:[–-]\s*(\d+[,.]\d{1,2})\s*)?\/\s*(kg|l)\b/gi;
  for(const m of s.matchAll(re)){
    const a=money(m[1]);
    out.push({min:a,max:m[2]?money(m[2]):a,unit:m[3].toLowerCase() as "kg"|"l",raw:m[0]});
  }
  return out;
}

function inferPriceV13(
  size:{min:number;max:number;unit:string},
  up:{min:number;max:number;unit:"kg"|"l"}
){
  const sizeKind=/^(kg|g)$/.test(size.unit)?"kg":"l";
  if(sizeKind!==up.unit) return null;

  const vals=[
    size.min*up.min,
    size.min*up.max,
    size.max*up.min,
    size.max*up.max
  ].map(v=>Math.round(v*100)/100).filter(v=>v>=0.05&&v<1000);

  if(!vals.length) return null;

  let best:{price:number;hits:number}|null=null;
  for(const v of vals){
    const hits=vals.filter(x=>Math.abs(x-v)<=0.02).length;
    if(!best||hits>best.hits) best={price:v,hits};
  }

  // Ranged package + ranged unit price should normally cross at the actual offer price.
  // Fixed package/fixed unit price has four identical products and is also safe.
  return best&&best.hits>=2?best.price:null;
}

function productishV13(s:string){
  const x=clean(s);
  return x.length>=5 &&
    /[A-Za-zÅÄÖåäö]/.test(x) &&
    /\d/.test(x) &&
    !isNoiseLine(x) &&
    !/^ilman plussa-korttia/i.test(x) &&
    !/^hinnat voimassa/i.test(x) &&
    !/\bsis\.?\s*pant/i.test(x);
}

function inferredOffersV13(lines:string[],url:string):CitymarketOffer[]{
  const out:CitymarketOffer[]=[];

  for(let i=0;i<lines.length;i++){
    const title=clean(lines[i]);
    if(!productishV13(title)) continue;

    // Flattened flipbook HTML sometimes joins two separate product blocks onto one line.
    // Never infer a price from such an ambiguous row.
    const sizes=allSizeSpecsV13(title);
    const inlineUps=allUnitPriceSpecsV13(title);
    if(sizes.length!==1 || inlineUps.length>1) continue;

    let up=inlineUps[0]??null;

    // If the unit price is not on the product row, only inspect the immediately adjacent
    // rows. Wider windows caused cross-pairing between neighbouring offers in diagnostics.
    if(!up){
      const nearby:Array<{distance:number;spec:ReturnType<typeof allUnitPriceSpecsV13>[number]}>=[];
      for(const d of [1,2]){
        for(const j of [i+d,i-d]){
          if(j<0||j>=lines.length) continue;
          const specs=allUnitPriceSpecsV13(lines[j]);
          if(specs.length===1) nearby.push({distance:d,spec:specs[0]});
        }
      }
      nearby.sort((a,b)=>a.distance-b.distance);
      if(nearby.length && (nearby.length===1 || nearby[0].distance<nearby[1].distance)) up=nearby[0].spec;
    }
    if(!up) continue;

    const price=inferPriceV13(sizes[0],up);
    if(price==null) continue;

    const w=lines.slice(Math.max(0,i-2),Math.min(lines.length,i+3)).join(" ");
    const valid=w.match(/(\d{1,2}\.\d{1,2}\.)\s*[–-]\s*(\d{1,2}\.\d{1,2}\.)/);
    const norm=w.match(/(?:norm(?:aalihinta)?|ilman\s+plussa-korttia)\s*(\d+[,.]\d{1,2})/i);

    out.push({
      id:`kcm:v13:${url}:${i}:${title.toLowerCase()}:${price}`,
      title,
      price,
      normalPrice:norm?money(norm[1]):null,
      unitPrice:up.min===up.max?up.min:null,
      unit:up.unit,
      packageSize:sizes[0].raw,
      plussa:/plussa/i.test(w),
      validFrom:valid?.[1]??null,
      validTo:valid?.[2]??null,
      category:category(title),
      chain:"K",
      storeType:"K-Citymarket",
      source:"K-Citymarket tarjouslehti",
      sourceUrl:url
    });
  }
  return out;
}

function parsePage(html:string,url:string):CitymarketOffer[]{
  const lines=textOf(html).split(/\n+/).map(clean).filter(Boolean);
  const out:CitymarketOffer[]=[];

  for(let i=0;i<lines.length;i++){
    const prices=extractOfferPricesV10(lines,i);
    if(!prices.length) continue;

    const title=productTitleV12(lines,i);
    if(title.length<3||isNoiseLine(title)) continue;

    const w=lines.slice(Math.max(0,i-3),Math.min(lines.length,i+4)).join(" ");
    const valid=w.match(/(\d{1,2}\.\d{1,2}\.)\s*[–-]\s*(\d{1,2}\.\d{1,2}\.)/);
    const up=w.match(/(\d+[,.]\d{1,2})\s*(?:€\s*)?\/\s*(kg|l|kpl)/i);
    const size=title.match(/\b(?:\d+\s*x\s*)?\d+(?:[,.]\d+)?\s*(kg|g|l|ml|cl|dl|kpl|pkt|ps|rs|pss|tlk)\b/i);
    const norm=w.match(/(?:norm(?:aalihinta)?|ilman\s+plussa-korttia)\s*(\d+[,.]\d{1,2})/i);

    // Multiple compact prices on one visual line usually correspond to multiple nearby offers.
    // We cannot safely assign all of them to different products from flattened HTML.
    // Keep the first price for a single title; diagnostics retain the source line.
    const price=prices[0];

    out.push({
      id:`kcm:${url}:${i}:${title.toLowerCase()}:${price}`,
      title,price,
      normalPrice:norm?money(norm[1]):null,
      unitPrice:up?money(up[1]):null,
      unit:up?.[2]?.toLowerCase()??null,
      packageSize:size?.[0]??null,
      plussa:/plussa/i.test(w),
      validFrom:valid?.[1]??null,
      validTo:valid?.[2]??null,
      category:category(title),
      chain:"K",storeType:"K-Citymarket",
      source:"K-Citymarket tarjouslehti",sourceUrl:url
    });
  }
  return out;
}


export type KCitymarketHtmlDebugV8 = {
  leafletUrl?: string;
  basicIndexUrl?: string;
  maxPage?: number;
  samples: Array<{page:number;url:string;htmlLength:number;textLines:string[];tagSamples:string[]}>;
};
let citymarketHtmlDebugV8:KCitymarketHtmlDebugV8={samples:[]};
export function getKCitymarketHtmlDebugV8(){ return citymarketHtmlDebugV8; }

function debugTagSamplesV8(src:string){
  const out:string[]=[];
  for(const m of src.matchAll(/<(div|span|p|td|li|a)\b([^>]*)>([\s\S]*?)<\/\1>/gi)){
    const t=clean(decodeEntities(m[3].replace(/<[^>]+>/g," ")));
    if(t) out.push(`<${m[1]}${clean(m[2]).slice(0,180)}> ${t.slice(0,220)}`);
    if(out.length>=80) break;
  }
  return out;
}

function pageNumber(url:string){
  const m=url.match(/page(\d+)\.html/i);
  return m?Number(m[1]):1;
}

export async function fetchKCitymarketOffers():Promise<CitymarketOffer[]>{
  const parsed=await parseKCitymarketSpatialLeaflet(ENTRY);
  const leafletUrl=String(parsed?.leaflet||ENTRY);
  const rows=Array.isArray(parsed?.rows)?parsed.rows:[];

  citymarketHtmlDebugV8={
    leafletUrl,
    basicIndexUrl:undefined,
    maxPage:Math.max(0,...rows.map((r:any)=>Number(r?.page)||0)),
    samples:[]
  };

  const offers:CitymarketOffer[]=[];
  for(const row of rows){
    const resolved=row?.spatialResolved;
    if(!resolved || resolved.displayOnlyUnitPrice) continue;

    const price=Number(resolved.value);
    if(!Number.isFinite(price) || price<=0) continue;

    const title=clean(row?.title||"");
    if(!title || isNoiseLine(title)) continue;

    const normalMin=Number(row?.normal?.min);
    const unitMin=Number(row?.unitPrice?.min);
    const unitMax=Number(row?.unitPrice?.max);
    const unitPrice=
      Number.isFinite(unitMin) && Number.isFinite(unitMax) && Math.abs(unitMin-unitMax)<0.001
        ? unitMin
        : null;

    offers.push({
      id:`kcm:spatial:${row?.page??0}:${title.toLowerCase()}:${price}`,
      title,
      price,
      normalPrice:Number.isFinite(normalMin)?normalMin:null,
      unitPrice,
      unit:row?.unitPrice?.raw?.match(/\/(kg|l)\b/i)?.[1]?.toLowerCase()??resolved?.unit??null,
      packageSize:row?.package?.raw??null,
      plussa:/plussa/i.test((row?.nearby||[]).map((x:any)=>x?.text||x?.raw||"").join(" ")),
      validFrom:null,
      validTo:null,
      category:category(title),
      chain:"K",
      storeType:"K-Citymarket",
      source:"K-Citymarket tarjouslehti",
      sourceUrl:leafletUrl
    });
  }

  const seen=new Set<string>();
  return offers.filter(o=>{
    const key=`${o.title.toLowerCase()}|${o.price}|${o.packageSize??""}`;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default fetchKCitymarketOffers;

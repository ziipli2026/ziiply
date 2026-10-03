import { unstable_cache } from "next/cache";
import { neon } from "@neondatabase/serverless";
import { parseKCitymarketSpatialLeaflet } from "./kCitymarketSpatialParser.js";

// ============================================================================
// ZIIPLY K-CITYMARKET PROVIDER V14
// Revision: V14-KCITYMARKET-SPATIAL-METADATA-PRESERVATION
// Date: 2026-09-23
//
// - Uses the general-purpose spatial leaflet parser as the authority for resolved offer blocks.
// - Preserves resolved multi-buy quantity/unit and parser resolution metadata for downstream use.
// - Removes the provider-level sanity/expectedSingle ratio rejection added after spatial parsing:
//   that gate could discard valid multi-buy totals already proven by leaflet geometry.
// - Does not hard-code products, prices, page numbers or the current leaflet.
// - Existing K-Market/K-Supermarket code is untouched.
// ============================================================================

export type CitymarketOffer = {
  id: string;
  title: string;
  price: number;
  normalPrice?: number | null;
  unitPrice?: number | null;
  unit?: string | null;
  packageSize?: string | null;
  offerQuantity?: number | null;
  offerUnit?: string | null;
  resolutionSource?: string | null;
  resolutionSanity?: string | null;
  plussa?: boolean;
  benefitText?: string;
  campaignType?: "offer" | "campaign";
  imageUrl?: string;
  ean?: string;
  validFrom?: string | null;
  validTo?: string | null;
  category?: string | null;
  chain: "K";
  storeType: "K-Citymarket";
  source: "K-Citymarket tarjouslehti";
  sourceUrl: string;
};

let nationalPhotoMatchAudit: {matched:number;exact:number;similar:number;ambiguous:number;unmatched:number;examples:Array<{leaflet:string;size:string;tjekCandidates:string[]}>}|null=null;
export function getKCitymarketNationalPhotoMatchAudit(){return nationalPhotoMatchAudit;}
const ENTRY = "https://kcm-lehdet.k-ruoka.fi/tarjouslehti";
const AV_ENTRY = "https://kcm-lehdet.k-ruoka.fi/arkilehti.html";
const LV_ENTRY = "https://kcm-lehdet.k-ruoka.fi/loppuviikon_tarjouslehdet/lvtarjouslehti.html";
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
export function category(t:string){
  const s=clean(t).toLowerCase().replace(/\s+/g," ");

  // Explicit non-food types precede generic matches (e.g. pussilakanasetti contains "kana").
  if(/pussilakana|lakanasetti|kylpypyyhe|käsipyyhe|putkivarsi|talvikeng|ulkoilukeng|saappaat|kengät|valaisin|pöytävalaisin|reppuklipsi|verenpainemittari|pölynimuri|pölypuss|rikkasetti|ruusukimppu|terttuneilikka|erika|lankaköynnös/.test(s)) return "Koti & vapaa-aika";
  if(/konetiskitablet|astianpesutablet|\\bfairy\\b/.test(s)) return "Kodinhoito";
  if(/kangasnaamio|kasvonaamio/.test(s)) return "Hygienia & kosmetiikka";
  if(/katkarav|jättikatkarav/.test(s)) return "Kala";
  if(/kypsät.*(?:peruna|lohko)|parisiinperuna|pikkuperuna/.test(s)) return "Valmisruoka";
  // K-Citymarket classification is authoritative downstream. Match non-food
  // appliances and other product-specific classes before generic food words.
  if(/voileipägrilli|leivänpaahdin|kahvinkeitin|vedenkeitin|sähkögrilli/.test(s)) return "Koti & vapaa-aika";
  if(/suklaa|noblesse|remix|makeis|kark|keksi|suolakeksi|perunalastu|sips|chips|pretzel|lakrit|salmiak|purukum|godispås|patuk|tikkari|crunchy bites/.test(s)) return "Makeiset & keksit";
  if(/leipä|näkkileip|näkkileiv|näkkäri|sämpyl|pull|croissant|patonki|patongi|karjalanpiirakka|ruisleip|rieska|rinkeli|puikula|reissumies/.test(s)) return "Leipomo";
  // Frozen vegetables must win over the generic "keitto" prepared-food match.
  if(/keittojuures|pinaattikeitto/.test(s)) return "Pakasteet";
  if(/koira|kissa|lemmik|possunkorva|kissanhiekka/.test(s)) return "Lemmikit";
  if(/pizza|ateria|keitto|keitot|valmisruoka|wrap|caesar|taco-salaat|kiissel|välipala|lihis/.test(s)) return "Valmisruoka";
  if(/kana|kananpoika|broiler|nauta|sika|porsaa|porsas|jauheliha|makkara|nakki|pekoni|kinkku|kokoliha|leikkele|fileepih|fileesuikale|liha/.test(s)) return "Liha & makkarat";
  if(/kala|lohi|silakka|tonnikala|kirjolohi|seiti|katkarapu/.test(s)) return "Kala";
  if(/maito|juusto|jogur|rahka|kerma|voi\b|margariin|raejuusto|viili|piim|kefir|vanukas|vanukka|mousse|grana padano|creme fraiche|crème fraiche|smetana/.test(s)) return "Maitotuotteet";
  if(/kahvi|espresso|tee\b/.test(s)) return "Kahvi & tee";
  if(/pinaatti|rucola|avokado/.test(s)) return "Hevi";
  // Shelf-stable fruit pieces/slices packed in juice are preserves, not beverages.
  // This must run before the generic "mehu" beverage match (e.g. "mehussa").
  if(/(?:viipale|palat).*(?:mehussa|siirapissa)/.test(s)) return "Kuivatuotteet";
  if(/mehu|limon|virvoitus|energiajuoma|vitamiinijuoma|urheilujuoma|kivennäisves|vichy|cola|hard seltzer|seltzer|radler|olut|oluet|riesling|blanco|tinto|juoma|vesi\b/.test(s)) return "Juomat";
  if(/jäätel|tuut|multipack|pakaste|palko\+/.test(s)) return "Pakasteet";
  if(/pasta|riisi|jauho|hiutale|muro|mysli|säilyke|kastike|ketsupp|hiiva|ruokaöljy|mauste|tortilla/.test(s)) return "Kuivatuotteet";
  if(/omena|banaani|tomaatti|kurkku|salaatti|pinaatti|rucola|paprika|peruna\b|sipuli|porkkana|mango|satsuma|vadelma|mansikka|marja|hedelm|vihann/.test(s)) return "Hevi";
  if(/wc-paper|talouspaper|nenäliina|näsdukar|astianpes|pyykin|pyykkietikka|biojätekassi|jätekassi|roskapussi|puhdistussuih|puhdistusaine|pesuaine/.test(s)) return "Kodinhoito";
  if(/shampoo|suihkugeeli|saippua|deodor|hammastahna|hammasharja|vaihtoharja|oral-b|herbina|kosmeti|meikkivoide|meikki|seerumi|tiiviste|hyaluroni|huulivoi/.test(s)) return "Hygienia & kosmetiikka";
  if(/kertakäyttökäsine|asentajankäsine|käsine/.test(s)) return "Koti & vapaa-aika";
  if(/calluna|ljung|orkidea|krysanteemi|kukka|kasvi|kenkä|nilkkuri|maihari|takki|housut|vaate|kalenteri|muki|lakana|pyyhe|kerä|lanka|asuste/.test(s)) return "Koti & vapaa-aika";
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

function extractKCitymarketValidityV16(text:unknown){
  const source=clean(String(text??""));
  const match=source.match(/(?:voimassa[^0-9]{0,24})?(\d{1,2})\.(?:\s*(\d{1,2})\.)?\s*[–-]\s*(\d{1,2})\.(\d{1,2})\.(\d{4})?/i);
  if(!match) return null;
  const startDay=Number(match[1]);
  const startMonth=Number(match[2]||match[4]);
  const endDay=Number(match[3]);
  const endMonth=Number(match[4]);
  if(!startDay||!startMonth||!endDay||!endMonth) return null;
  if(startDay<1||startDay>31||endDay<1||endDay>31||startMonth<1||startMonth>12||endMonth<1||endMonth>12) return null;
  return {from:`${startDay}.${startMonth}.`,to:`${endDay}.${endMonth}.`};
}

async function fetchKCitymarketOffersFresh(entry=ENTRY):Promise<CitymarketOffer[]>{
  const parsed=await parseKCitymarketSpatialLeaflet(entry);
  const leafletUrl=String(parsed?.leaflet||ENTRY);
  const rows:any[]=Array.isArray(parsed?.rows)?parsed.rows:[];
  const allLeafletText=rows.flatMap((row:any)=>Array.isArray(row?.nearby)?row.nearby:[]).join(" | ");
  const leafletValidity=extractKCitymarketValidityV16(allLeafletText);

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
    const offerQuantity=resolved?.quantity!=null&&Number.isFinite(Number(resolved.quantity))?Number(resolved.quantity):null;
    // The leaflet's normal price is a single-item price, while resolved.value is
    // the total for multi-buy offers (e.g. 3 kpl / 4 €). Keep both prices on
    // the same basis so UI comparisons and strike-through prices are meaningful.
    const normalPriceCandidate=Number.isFinite(normalMin)
      ? Number((normalMin*(offerQuantity&&offerQuantity>1?offerQuantity:1)).toFixed(2))
      : null;
    // A neighbouring card's normal price can occasionally leak into flattened
    // leaflet HTML. A genuine normal price must be strictly above the offer
    // transaction price on the same quantity basis.
    const normalPrice=normalPriceCandidate!=null && normalPriceCandidate>price
      ? normalPriceCandidate
      : null;
    const unitMin=Number(row?.unitPrice?.min);
    const unitMax=Number(row?.unitPrice?.max);
    const unitPrice=
      Number.isFinite(unitMin) && Number.isFinite(unitMax) && Math.abs(unitMin-unitMax)<0.001
        ? unitMin
        : null;

    // Classify only from the offer's own nearby leaflet text. Never infer an EAN
    // or product image from a broad leaflet heading or a similarly named SKU.
    const nearbyText=(row?.nearby||[]).map((x:any)=>typeof x==="string"?x:String(x?.text||x?.raw||"")).join(" ");
    const benefitText=/mobiilietu/i.test(nearbyText)?"Mobiilietu":/plussa(?:-etu|-kortilla)?/i.test(nearbyText)?"Plussa-etu":/erä/i.test(nearbyText)?"Erä":"";
    const campaignType: "offer" | "campaign" = /kampanja|kaikki .*?(?:tuotteet|vaatteet)|-\\d+\\s*%/i.test(title) && !/\\b\\d+(?:[,.]\\d+)?\\s*(?:g|kg|ml|l)\\b/i.test(title) ? "campaign" : "offer";
    offers.push({
      id:`kcm:spatial:${row?.page??0}:${title.toLowerCase()}:${price}`,
      title,
      price,
      normalPrice,
      unitPrice,
      unit:row?.unitPrice?.raw?.match(/\/(kg|l)\b/i)?.[1]?.toLowerCase()??resolved?.unit??null,
      packageSize:row?.package?.raw??null,
      offerQuantity,
      offerUnit:resolved?.unit?String(resolved.unit).toUpperCase():null,
      resolutionSource:resolved?.source?String(resolved.source):null,
      resolutionSanity:resolved?.sanity?String(resolved.sanity):null,
      plussa:/plussa/i.test(nearbyText),
      benefitText,
      campaignType,
      validFrom:extractKCitymarketValidityV16((row?.nearby||[]).join(" | "))?.from??leafletValidity?.from??null,
      validTo:extractKCitymarketValidityV16((row?.nearby||[]).join(" | "))?.to??leafletValidity?.to??null,
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


type KCitymarketPeriodKind = "AV" | "LV";
type KCitymarketPeriod = { key:string; kind:KCitymarketPeriodKind; week:number; startDate:string };
function formatKCitymarketDateV15(iso:string){
  const [,m,d]=String(iso||"").match(/^(\d{4})-(\d{2})-(\d{2})$/)||[];
  return m&&d?`${Number(d)}.${Number(m)}.`:"";
}
function kCitymarketDefaultValidityV15(period:KCitymarketPeriod){
  const days=period.kind==="AV"?2:3;
  return {from:formatKCitymarketDateV15(period.startDate),to:formatKCitymarketDateV15(shiftIsoDate(period.startDate,days))};
}
type KCitymarketCachedPayload = { period:KCitymarketPeriod; offers:CitymarketOffer[]; debug:KCitymarketHtmlDebugV8; cachedAt:string };

function helsinkiClock(now=new Date()){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(now);
  const get=(type:Intl.DateTimeFormatPartTypes)=>parts.find(part=>part.type===type)?.value||"";
  return {date:get("year")+"-"+get("month")+"-"+get("day"),weekday:get("weekday"),hour:Number(get("hour")),minute:Number(get("minute"))};
}
function shiftIsoDate(date:string,days:number){
  const [y,m,d]=date.split("-").map(Number);
  return new Date(Date.UTC(y,m-1,d+days,12)).toISOString().slice(0,10);
}
function isoWeekForDate(date:string){
  const [y,m,d]=date.split("-").map(Number);
  const value=new Date(Date.UTC(y,m-1,d,12));
  const weekday=value.getUTCDay()||7;
  value.setUTCDate(value.getUTCDate()+4-weekday);
  const yearStart=new Date(Date.UTC(value.getUTCFullYear(),0,1,12));
  return Math.ceil((((value.getTime()-yearStart.getTime())/86400000)+1)/7);
}
function periodFromStart(startDate:string,kind:KCitymarketPeriodKind):KCitymarketPeriod{
  const week=isoWeekForDate(startDate);
  return {key:startDate+"-W"+week+"-"+kind,kind,week,startDate};
}
export function getActiveKCitymarketPeriod(now=new Date()):KCitymarketPeriod{
  const clock=helsinkiClock(now);
  const index:Record<string,number>={Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6};
  const day=index[clock.weekday]??0;
  if(day<=2) return periodFromStart(shiftIsoDate(clock.date,-day),"AV");
  return periodFromStart(shiftIsoDate(clock.date,3-day),"LV");
}
function getNextKCitymarketPeriod(now=new Date()):KCitymarketPeriod|null{
  const clock=helsinkiClock(now);
  if(clock.hour<15) return null;
  if(clock.weekday==="Wed") return periodFromStart(shiftIsoDate(clock.date,1),"LV");
  if(clock.weekday==="Sun") return periodFromStart(shiftIsoDate(clock.date,1),"AV");
  return null;
}
function leafletMatchesPeriod(url:string,period:KCitymarketPeriod){
  return String(url||"").toUpperCase().includes("_"+period.week+period.kind+"_KCM");
}
const getCachedKCitymarketPeriod=unstable_cache(
  async(period:KCitymarketPeriod):Promise<KCitymarketCachedPayload>=>{
    const periodEntry=period.kind==="AV"?AV_ENTRY:LV_ENTRY;
    const offers=await fetchKCitymarketOffersFresh(periodEntry);
    const debug=citymarketHtmlDebugV8;
    const leafletUrl=String(debug?.leafletUrl||offers[0]?.sourceUrl||"");
    if(!leafletMatchesPeriod(leafletUrl,period)) throw new Error('K-Citymarket leaflet "'+(leafletUrl||"(missing)")+'" does not match requested '+period.key);
    if(!offers.length) throw new Error("K-Citymarket "+period.key+" parsed zero offers");
    return {period,offers,debug,cachedAt:new Date().toISOString()};
  },
  ["ziiply-kcitymarket-offers-v4-parser-20261001-titleclean"],
  {revalidate:false},
);
async function readCachedPeriod(period:KCitymarketPeriod){
  const payload=await getCachedKCitymarketPeriod(period);
  citymarketHtmlDebugV8=payload.debug;
  return payload;
}
export async function warmKCitymarketOfferCache(now=new Date()){
  const active=getActiveKCitymarketPeriod(now);
  const next=getNextKCitymarketPeriod(now);
  const result:{active:{period:string;offers:number;cachedAt:string}|null;next:{period:string;offers:number;cachedAt:string}|null;errors:string[]}={active:null,next:null,errors:[]};
  try{
    const payload=await readCachedPeriod(active);
    result.active={period:payload.period.key,offers:payload.offers.length,cachedAt:payload.cachedAt};
  }catch(error){
    result.errors.push("active "+active.key+": "+(error instanceof Error?error.message:String(error)));
  }
  if(next){
    try{
      const payload=await readCachedPeriod(next);
      result.next={period:payload.period.key,offers:payload.offers.length,cachedAt:payload.cachedAt};
    }catch(error){
      result.errors.push("next "+next.key+": "+(error instanceof Error?error.message:String(error)));
    }
  }
  return result;
}
// Only exact, unambiguous EAN-bank matches are enriched. Multi-variant leaflet
// headings must never inherit an arbitrary barcode or product photo.
async function enrichCitymarketFromEanBank(offers:CitymarketOffer[]):Promise<CitymarketOffer[]>{
  if(!process.env.DATABASE_URL || !offers.length) return offers;
  try{
    const sql=neon(process.env.DATABASE_URL);
    const rows=await sql`SELECT ean,name,quantity,image_url FROM ziiply_ean_products WHERE image_url IS NOT NULL AND image_url <> '' ORDER BY updated_at DESC LIMIT 25000`;
    if(!rows.length)console.warn("[K-Citymarket] EAN bank contains no usable image rows");
    const norm=(value:unknown)=>String(value??"").toLocaleLowerCase("fi-FI").replace(/[^a-z0-9åäö]+/g," ").trim().replace(/\s+/g," ");
    // Do not silently exclude older catalogue images merely because the EAN bank has grown.
    const index=new Map<string,typeof rows>();
    const byProductName=new Map<string,typeof rows>();
    // Leaflet headlines and bank names commonly differ only by package notation.
    // Keep both indexes and require a unique EAN and matching package when available.
    const size=(value:unknown)=>String(value??"").toLowerCase().match(/\b\d+(?:[,.]\d+)?\s*(?:kg|g|ml|cl|dl|l|kpl|pkt|pss)\b/i)?.[0]?.replace(/\s+/g,"").replace(",",".")||"";
    const nameOnly=(value:unknown)=>norm(String(value??"").replace(/\b\d+(?:[,.]\d+)?\s*(?:kg|g|ml|cl|dl|l|kpl|pkt|pss)\b/gi," "));
    for(const row of rows){
      const keys=new Set([norm(row.name),norm([row.name,row.quantity].filter(Boolean).join(" "))]);
      for(const key of keys){
        if(!key)continue;
        const group=index.get(key)||[];
        group.push(row);
        index.set(key,group);
      }
      const plain=nameOnly(row.name);
      if(plain){
        const group=byProductName.get(plain)||[];
        group.push(row);
        byProductName.set(plain,group);
      }
    }
    const stats={total:offers.length,bankRows:rows.length,matched:0,ambiguous:0,missing:0,invalidImage:0,groupOffer:0};
    const enriched=offers.map(offer=>{
      // Require a single exact title match and matching package size when
      // the leaflet provides one. Never guess EAN for a group/range offer.
      if(/\b(?:valikoima|lajitelma|eri makuja|kaikki|tai|\d+\s*[–-]\s*\d+\s*(?:g|ml))\b/i.test(offer.title)){stats.groupOffer++;return offer;}
      const direct=index.get(norm(offer.title))||[];
      const offerSize=size(offer.packageSize)||size(offer.title);
      const candidates=direct.length?direct:(byProductName.get(nameOnly(offer.title))||[]).filter(row=>!offerSize || (size(row.quantity)||size(row.name))===offerSize);
      const matches=[...new Map(candidates.map(row=>[String(row.ean),row])).values()];
      if(matches.length!==1){if(matches.length>1)stats.ambiguous++;else stats.missing++;return offer;}
      const row=matches[0];
      const bankSize=size(row.quantity)||size(row.name);
      if(offerSize && bankSize!==offerSize)return offer;
      const ean=String(row.ean??"");
      const imageUrl=String(row.image_url??"");
      if(!/^\d{8,14}$/.test(ean)||!/^https:\/\//i.test(imageUrl)){stats.invalidImage++;return offer;}
      stats.matched++;
      return {...offer,ean,imageUrl};
    });
    console.info("[K-Citymarket] national image enrichment",stats);
    return enriched;
  }catch(error){
    console.warn("[K-Citymarket] optional EAN image enrichment unavailable",error);
    return offers;
  }
}

export async function fetchKCitymarketOffers():Promise<CitymarketOffer[]>{
  const active=getActiveKCitymarketPeriod();

  // The Wednesday/Sunday background warm-up parses the next leaflet after
  // 15:00 Europe/Helsinki. Once that period becomes active, serve the exact
  // validated cached parse instead of re-resolving the generic ENTRY URL.
  // If warm-up failed (publication late / parser regression), fall back to a
  // fresh parse so the request still has a recovery path.
  let offers:CitymarketOffer[];
  try{
    const payload=await readCachedPeriod(active);
    offers=payload.offers;
  }catch(error){
    console.warn("[K-Citymarket] active period cache unavailable, parsing fresh",active.key,error);
    const periodEntry=active.kind==="AV"?AV_ENTRY:LV_ENTRY;
    offers=await fetchKCitymarketOffersFresh(periodEntry);
    // Never leak the other half-week leaflet through a redirecting entry URL.
    // The cache path already validates the period; the recovery path must obey
    // the exact same invariant.
    const freshLeafletUrl=String(citymarketHtmlDebugV8?.leafletUrl||offers[0]?.sourceUrl||"");
    if(!leafletMatchesPeriod(freshLeafletUrl,active)){
      throw new Error('K-Citymarket fallback leaflet "'+(freshLeafletUrl||"(missing)")+'" does not match active '+active.key);
    }
  }

  const fallback=kCitymarketDefaultValidityV15(active);
  const dated=offers.map(offer=>({...offer,validFrom:offer.validFrom??fallback.from,validTo:offer.validTo??fallback.to}));
  const enriched=await enrichCitymarketFromEanBank(dated);
  // The authoritative K-Ruoka parser retains all prices and offer metadata.
  // Tjek is an optional image-only fallback, with unique exact-name matches.
  if(enriched.every(offer=>!!offer.imageUrl))return enriched;
  try{
    const {fetchKCitymarketNationalTjekImages}=await import("./kCitymarketLocalTjekProvider");
    const photos=await fetchKCitymarketNationalTjekImages();
    // The leaflet PDF occasionally exposes UTF-8 bytes as Latin-1 text.
    const repair=(value:unknown)=>{
      let raw=String(value??"").replace(/â€“|â€”/g,"-").replace(/â€™/g,"'");
      if(/[ÃÂ]/.test(raw)){
        try{
          const bytes=Uint8Array.from(raw,character=>character.charCodeAt(0));
          const decoded=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
          raw=decoded;
        }catch{
          raw=raw.replace(/Ã„/g,"Ä").replace(/Ã¤/g,"ä").replace(/Ã–/g,"Ö").replace(/Ã¶/g,"ö").replace(/Ã…/g,"Å").replace(/Ã¥/g,"å");
        }
      }
      return raw;
    };
    const norm=(value:unknown)=>repair(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
    const packageMatch=(value:string)=>norm(value).match(/\b\d+(?:[,.]\d+)?\s*(?:kg|g|ml|cl|dl|l)\b/i)?.[0]?.replace(/\s+/g,"").replace(",",".")||"";
    const stop=new Set(["suomi","peru","kolombia","marokko","espanja","ruotsi","tai","kpl","kg","alkaen","valikoima","lajitelmat","lajitelma"]);
    const tokens=(value:string)=>{
      const cleaned=repair(value).replace(/\([^)]*\/\s*(?:kg|l)[^)]*\)/gi," ").replace(/\([^)]*\)/g," ").replace(/\b\d+(?:[,.]\d+)?\s*(?:kg|g|ml|cl|dl|l|kpl)\b/gi," ");
      return new Set(norm(cleaned).split(" ").filter(word=>word.length>=4&&!stop.has(word)));
    };
    let matched=0,exact=0,similar=0,ambiguous=0,unmatched=0;
    const result=enriched.map(offer=>{
      if(offer.imageUrl)return offer;
      const title=norm(offer.title);
      let url=photos.get(title);
      if(url)exact++;
      if(!url){
        const wanted=tokens(offer.title);
        const wantedSize=packageMatch(offer.packageSize||offer.title);
        if(wanted.size>=2){
          const candidates=[...photos.entries()].filter(([name])=>{
            const foundSize=packageMatch(name);
            if(wantedSize && foundSize && foundSize!==wantedSize)return false;
            const found=tokens(name);
            const common=[...wanted].filter(word=>found.has(word)).length;
            // Brand prefixes are fine; a full name match is safest.
            // For long PDF descriptions, require at least two shared distinctive words
            // and a strong overlap with the shorter Tjek title.
            const complete=common===wanted.size && found.size<=wanted.size+2;
            const descriptive=common>=2 && common>=Math.ceil(Math.min(wanted.size,found.size)*0.8) &&
              found.size<=wanted.size+2 && wanted.size<=found.size+5;
            return complete||descriptive;
          });
          const unique=[...new Set(candidates.map(([,image])=>image))];
          if(unique.length===1){url=unique[0];similar++;}
          else if(unique.length>1)ambiguous++;
        }
      }
      if(!url){unmatched++;return offer;}
      matched++;
      return {...offer,imageUrl:url};
    });
    nationalPhotoMatchAudit={
      matched,exact,similar,ambiguous,unmatched,
      examples:result.filter(offer=>!offer.imageUrl).slice(0,12).map(offer=>{
        const wanted=tokens(offer.title);
        const candidates=[...photos.keys()].map(name=>({
          name,common:[...wanted].filter(word=>tokens(name).has(word)).length,
        })).filter(item=>item.common>=1).sort((a,b)=>b.common-a.common).slice(0,3);
        return {leaflet:offer.title,size:offer.packageSize||"",tjekCandidates:candidates.map(item=>item.name)};
      }),
    };
    console.info("[K-Citymarket] national Tjek image-only enrichment",{total:result.length,tjekImages:photos.size,matched,exact,similar,ambiguous,unmatched});
    return result;
  }catch(error){
    console.warn("[K-Citymarket] optional national Tjek image enrichment unavailable",error);
    return enriched;
  }
}
export default fetchKCitymarketOffers;

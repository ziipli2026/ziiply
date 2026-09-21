// ============================================================================
// ZIIPLY K-CITYMARKET PROVIDER V10
// Revision: V10-KCITYMARKET-COMPACT-PRICE-PARSER
// Date: 2026-09-21
//
// - Tunnistaa flipbook basic-html:n pilkuton hinnan esitystapa:
//   099 -> 0,99; 449 -> 4,49; 495 -> 4,95; 280 -> 2,80.
// - Tunnistaa myös samalla rivillä olevat compact-price tokenit.
// - Tuotenimi ankkuroidaan lähimpään tuotemäiseen riviin ennen hintaa.
// - Page2/page3 HTML-debug säilyy.
// - Route V20 ja core V178 eivät muutu.
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
function compactPriceCandidatesV10(line:string):number[]{
  const s=clean(line);
  const out:number[]=[];

  // Basic HTML prints many visual prices without comma:
  // 099 => 0,99 ; 449 => 4,49 ; 495 => 4,95 ; 280 => 2,80.
  // A line such as "49 99 79" contains several visually separate price fragments.
  if(/^(?:\d{3})(?:\s+\d{2,3})*$/.test(s)){
    for(const token of s.split(/\s+/)){
      if(!/^\d{3}$/.test(token)) continue;
      const n=Number(token);
      const value=n/100;
      if(value>=0.05 && value<100) out.push(value);
    }
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
  out.push(...compactPriceCandidatesV10(line));

  return [...new Set(out)];
}

function titleCandidate(lines:string[],priceIndex:number){
  const prior=lines.slice(Math.max(0,priceIndex-7),priceIndex)
    .map(clean)
    .filter(x=>/[A-Za-zÅÄÖåäö]/.test(x))
    .filter(x=>!isNoiseLine(x))
    .filter(x=>!/^(\d+[,.]\d{2}|[-–]?\d+%)/.test(x))
    .filter(x=>!/^(sis\.?\s*pantit|ilman plussa-korttia|normaalihinta)/i.test(x));
  return prior.slice(-2).join(" ").replace(/\s+/g," ").trim();
}
function productTitleV10(lines:string[],priceIndex:number){
  const candidates=lines.slice(Math.max(0,priceIndex-9),priceIndex)
    .map(clean)
    .filter(x=>/[A-Za-zÅÄÖåäö]/.test(x))
    .filter(x=>!isNoiseLine(x))
    .filter(x=>!/^[-–]?\d+%/.test(x))
    .filter(x=>!/^ilman plussa-korttia/i.test(x))
    .filter(x=>!/^katso (?:resepti|lisää)/i.test(x));

  // Prefer a product-description line: uppercase product text and/or package size.
  for(let j=candidates.length-1;j>=0;j--){
    const x=candidates[j];
    if(/\b\d+(?:[,.]\d+)?\s*(?:kg|g|l|ml|cl|dl|kpl|pkt|ps|rs|pss|tlk)\b/i.test(x) ||
       /[A-ZÅÄÖ]{3,}/.test(x)){
      return x;
    }
  }
  return candidates.at(-1) ?? "";
}

function parsePage(html:string,url:string):CitymarketOffer[]{
  const lines=textOf(html).split(/\n+/).map(clean).filter(Boolean);
  const out:CitymarketOffer[]=[];

  for(let i=0;i<lines.length;i++){
    const prices=extractOfferPricesV10(lines,i);
    if(!prices.length) continue;

    const title=productTitleV10(lines,i);
    if(title.length<3||isNoiseLine(title)) continue;

    const w=lines.slice(Math.max(0,i-7),Math.min(lines.length,i+8)).join(" ");
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

function debugTagSamplesV8(src:string){
  const out:string[]=[];
  for(const m of src.matchAll(/<(div|span|p|td|li|a)\b([^>]*)>([\s\S]*?)<\/\1>/gi)){
    const text=clean(decodeEntities(m[3].replace(/<[^>]+>/g," ")));
    if(!text) continue;
    out.push(`<${m[1]}${clean(m[2]).slice(0,180)}> ${text.slice(0,220)}`);
    if(out.length>=80) break;
  }
  return out;
}

export default fetchKCitymarketOffers;

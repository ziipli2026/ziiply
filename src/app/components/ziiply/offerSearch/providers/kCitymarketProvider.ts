// ============================================================================
// ZIIPLY K-CITYMARKET PROVIDER V8\n// Revision: V8-KCITYMARKET-PAGE2-PAGE3-HTML-DIAGNOSTIC\n// Date: 2026-09-21\n// V6 parser + page2/page3 raw structure diagnostic.\n// ============================================================================\n
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
function extractOfferPrice(lines:string[],i:number):number|null{
  const line=lines[i];
  const matches=[...line.matchAll(/(?<!\d)(\d{1,3}[,.]\d{2})(?!\d)/g)];
  for(const m of matches){
    if(isFalsePriceContext(lines,i,m[1])) continue;
    const value=money(m[1]);
    if(Number.isFinite(value)&&value>=0.05&&value<1000) return value;
  }
  return null;
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
function parsePage(html:string,url:string):CitymarketOffer[]{
  const lines=textOf(html).split(/\n+/).map(clean).filter(Boolean);
  const out:CitymarketOffer[]=[];
  for(let i=0;i<lines.length;i++){
    const price=extractOfferPrice(lines,i);
    if(price==null) continue;
    const title=titleCandidate(lines,i);
    if(title.length<3||isNoiseLine(title)) continue;

    const w=lines.slice(Math.max(0,i-6),Math.min(lines.length,i+7)).join(" ");
    const valid=w.match(/(\d{1,2}\.\d{1,2}\.)\s*[–-]\s*(\d{1,2}\.\d{1,2}\.)/);
    const up=w.match(/(\d+[,.]\d{1,2})\s*(?:€\s*)?\/\s*(kg|l|kpl)/i);
    const size=w.match(/\b(?:\d+\s*x\s*)?\d+(?:[,.]\d+)?\s*(kg|g|l|ml|cl|kpl|pkt|pss|tlk|pl|rl)\b/i);
    const norm=w.match(/(?:norm(?:aalihinta)?|ilman\s+plussa-korttia)\s*(\d+[,.]\d{1,2})/i);

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

function pageNumber(url:string){
  const m=url.match(/page(\d+)\.html/i);
  return m?Number(m[1]):1;
}

export async function fetchKCitymarketOffers():Promise<CitymarketOffer[]>{
  const entry=await html(ENTRY);
  let leaflet=entry.url;
  const direct=entry.text.match(/https?:\/\/kcm-tarjouslehdet\.k-ruoka\.fi\/[^"'<>\s]+\/index\.html/i)?.[0];
  const href=entry.text.match(/href=["']([^"']*kcm-tarjouslehdet\.k-ruoka\.fi[^"']*)["']/i)?.[1];
  const refresh=entry.text.match(/url\s*=\s*([^"'<>\s]+)/i)?.[1];
  if(direct) leaflet=direct; else if(href) leaflet=abs(href,entry.url)??leaflet; else if(refresh) leaflet=abs(refresh,entry.url)??leaflet;
  const leaf=await html(leaflet);
  let basic=leaf.text.match(/href=["']([^"']*files\/basic-html\/index\.html[^"']*)["']/i)?.[1];
  basic=basic?(abs(basic,leaf.url) ?? undefined):leaf.url.replace(/\/index\.html(?:\?.*)?$/i,"/files/basic-html/index.html");
  if(!basic) throw new Error("K-Citymarket basic-html URL not found");
  const index=await html(basic);
  const urls=new Set<string>([index.url]);
  let maxPage=1;
  for(const m of index.text.matchAll(/href=["']([^"']*page(\d+)\.html[^"']*)["']/gi)){
    const u=abs(m[1],index.url);
    if(u) urls.add(u);
    maxPage=Math.max(maxPage,Number(m[2])||1);
  }

  // Basic HTML -lehti ilmoittaa sivut indexissä. Täydennä mahdolliset
  // välistä puuttuvat linkit samaan hakemistoon, jotta esim. 18-sivuinen
  // lehti luetaan varmasti sivuilta 1...18.
  const baseDir=index.url.replace(/index\.html(?:\?.*)?$/i,"");
  for(let n=2;n<=maxPage;n++) urls.add(`${baseDir}page${n}.html`);

  const ordered=[...urls].sort((a,b)=>pageNumber(a)-pageNumber(b));
  citymarketHtmlDebugV8={leafletUrl:leaf.url,basicIndexUrl:index.url,maxPage,samples:[]};
  const pages=await Promise.all(ordered.map(async u=>{
    const p=await html(u);
    const pn=pageNumber(p.url);
    if(pn===2||pn===3) citymarketHtmlDebugV8.samples.push({
      page:pn,url:p.url,htmlLength:p.text.length,
      textLines:textOf(p.text).split(/\n+/).map(clean).filter(Boolean).slice(0,220),
      tagSamples:debugTagSamplesV8(p.text)
    });
    return parsePage(p.text,p.url);
  }));
  citymarketHtmlDebugV8.samples.sort((a,b)=>a.page-b.page);

  const seen=new Set<string>();
  return pages.flat().filter(o=>{
    const k=`${o.title.toLowerCase()}|${o.price}|${o.packageSize??""}`;
    if(seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}



export type KCitymarketHtmlDebugV8 = {
  leafletUrl?: string;
  basicIndexUrl?: string;
  maxPage?: number;
  samples: Array<{page:number;url:string;htmlLength:number;textLines:string[];tagSamples:string[]}>;
};
let citymarketHtmlDebugV8: KCitymarketHtmlDebugV8 = { samples: [] };
export function getKCitymarketHtmlDebugV8(){ return citymarketHtmlDebugV8; }
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

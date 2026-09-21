// ============================================================================
// ZIIPLY K-CITYMARKET PROVIDER V5
// Revision: V5-KCITYMARKET-DUPLICATE-DECLARATION-FIX
// Date: 2026-09-21
//
// Muutos V4:ään:
// - Korjaa build-virheen: decodeEntities oli V4-tiedostossa kahdesti.
// - Säilyttää V4:n positioned HTML -parserin muuttamatta sen toimintalogiikkaa.
// - Ei muuta route V19:ää eikä core V178:aa.
//
// V4:n parserimuutokset:
// - Parseroi basic-html-sivujen positioidut teksti-elementit (left/top) rakenteena.
// - Ryhmittelee elementit riveiksi pystysijainnin perusteella.
// - Hinta hyväksytään vain hintamaisesta omasta elementistä, ei pakkauskoosta,
//   yksikköhinnasta, pantista, prosentista tai leipätekstin sisältä.
// - Tuotenimi haetaan hinnan läheisistä rakenteellisista riveistä.
// - Kaikkien leafletin pageN.html-sivujen luku säilyy.
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
function plainHtml(src:string){
  return clean(decodeEntities(src.replace(/<[^>]+>/g," ")));
}
type PositionedText={text:string;left:number;top:number;width:number;height:number;fontSize:number};
function cssNumber(style:string,key:string){
  const m=style.match(new RegExp(`${key}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px`,"i"));
  return m?Number(m[1]):NaN;
}
function positionedTexts(html:string):PositionedText[]{
  const out:PositionedText[]=[];
  const re=/<(?:span|div|p)\b([^>]*)>([\s\S]*?)<\/(?:span|div|p)>/gi;
  for(const m of html.matchAll(re)){
    const attrs=m[1]||"";
    const style=(attrs.match(/\bstyle=["']([^"']*)["']/i)?.[1]||"");
    const left=cssNumber(style,"left"), top=cssNumber(style,"top");
    if(!Number.isFinite(left)||!Number.isFinite(top)) continue;
    const text=plainHtml(m[2]);
    if(!text) continue;
    out.push({
      text,left,top,
      width:cssNumber(style,"width"),
      height:cssNumber(style,"height"),
      fontSize:cssNumber(style,"font-size")
    });
  }
  return out.sort((a,b)=>a.top-b.top||a.left-b.left);
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
  if(/pasta|riisi|jauho|hiutale|muro|mysli|säilyke|sailyke|kastike|öljy|oljy|mauste|tortilla/.test(s)) return "Kuivatuotteet";
  if(/suklaa|kark|makeis|keksi|chips|sips|perunalastu|lakrit|salmiak|purukum/.test(s)) return "Makeiset & keksit";
  if(/koira|kissa|lemmik/.test(s)) return "Lemmikit";
  if(/pesu|puhdist|astianpes|pyykin|wc-paper|talouspaper|nenäliina|näsdukar/.test(s)) return "Kodinhoito";
  if(/shampoo|saippua|deodor|hammastahna|hammasharja|vaihtoharja|oral-b|herbina|kosmeti/.test(s)) return "Hygienia & kosmetiikka";
  if(/calluna|ljung|orkidea|krysanteemi|kukka|kasvi|kenkä|nilkkuri|maihari|takki|housut|vaate|paristo|kalenteri|muki|lakana|pyyhe/.test(s)) return "Koti & vapaa-aika";
  return "Muut";
}
function noiseText(s:string){
  const t=clean(s);
  return !t ||
    /view full version|k-citymarket tarjouslehti|katso resepti|appanvändare/i.test(t) ||
    /^(plus(sa)?|etu|erä|voimassa|rajoitus|normaali|lahjoitus|\/tuote|p\.\s*\d+)$/i.test(t) ||
    /^(sis\.?\s*pantit|ilman plussa-korttia|normaalihinta)/i.test(t);
}
function standalonePrice(text:string):number|null{
  let t=clean(text).replace(/\s*€\s*$/,"").trim();
  if(/%|\/\s*(kg|l|kpl)\b|pant|kg|ml|cl|dl|tlk|pkt|pss|kpl|rl\b/i.test(t)) return null;
  // hyväksy vain elementti, joka on käytännössä pelkkä tarjoushinta
  const m=t.match(/^(?:nyt\s*)?(\d{1,3}(?:[,.]\d{1,2})?)$/i);
  if(!m) return null;
  const v=money(m[1]);
  return Number.isFinite(v)&&v>=0.05&&v<1000?v:null;
}
function xDistance(a:PositionedText,b:PositionedText){
  const aw=Number.isFinite(a.width)?a.width:0, bw=Number.isFinite(b.width)?b.width:0;
  const ac=a.left+aw/2, bc=b.left+bw/2;
  return Math.abs(ac-bc);
}
function parsePage(html:string,url:string):CitymarketOffer[]{
  const els=positionedTexts(html);
  // Jos julkaisu ei käytä positioituja span/div-elementtejä, älä palaa vanhaan
  // epäluotettavaan "lähin numero" -parseriin.
  if(!els.length) return [];

  const out:CitymarketOffer[]=[];
  for(let i=0;i<els.length;i++){
    const price=standalonePrice(els[i].text);
    if(price==null) continue;
    const pe=els[i];

    const candidates=els.filter((e,j)=>{
      if(j===i||noiseText(e.text)||standalonePrice(e.text)!=null) return false;
      if(!/[A-Za-zÅÄÖåäö]/.test(e.text)) return false;
      const dy=pe.top-e.top;
      if(dy<0||dy>150) return false;
      return xDistance(pe,e)<240;
    }).sort((a,b)=>{
      const ad=(pe.top-a.top)+xDistance(pe,a)*0.25;
      const bd=(pe.top-b.top)+xDistance(pe,b)*0.25;
      return ad-bd;
    });

    const titleParts=candidates.slice(0,3)
      .sort((a,b)=>a.top-b.top||a.left-b.left)
      .map(e=>clean(e.text))
      .filter(t=>!/\b(?:normaalihinta|ilman plussa|sis\. pantit)\b/i.test(t));
    const title=clean(titleParts.join(" "));
    if(title.length<3||noiseText(title)) continue;

    const nearby=els.filter(e=>Math.abs(e.top-pe.top)<180&&xDistance(pe,e)<280).map(e=>e.text).join(" ");
    const up=nearby.match(/(\d+[,.]\d{1,2})\s*(?:€\s*)?\/\s*(kg|l|kpl)/i);
    const size=nearby.match(/\b(?:\d+\s*x\s*)?\d+(?:[,.]\d+)?\s*(kg|g|l|ml|cl|kpl|pkt|pss|tlk|pl|rl)\b/i);
    const norm=nearby.match(/(?:norm(?:aalihinta)?|ilman\s+plussa-korttia)\s*(\d+[,.]\d{1,2})/i);
    const valid=nearby.match(/(\d{1,2}\.\d{1,2}\.)\s*[–-]\s*(\d{1,2}\.\d{1,2}\.)/);

    out.push({
      id:`kcm:${url}:${i}:${title.toLowerCase()}:${price}`,
      title,price,
      normalPrice:norm?money(norm[1]):null,
      unitPrice:up?money(up[1]):null,
      unit:up?.[2]?.toLowerCase()??null,
      packageSize:size?.[0]??null,
      plussa:/plussa/i.test(nearby),
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
  const pages=await Promise.all(ordered.map(async u=>{
    const p=await html(u);
    return parsePage(p.text,p.url);
  }));

  const seen=new Set<string>();
  return pages.flat().filter(o=>{
    const k=`${o.title.toLowerCase()}|${o.price}|${o.packageSize??""}`;
    if(seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export default fetchKCitymarketOffers;

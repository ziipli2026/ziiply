// ZIIPLY K-CITYMARKET PROVIDER V1
// Separate provider: public K-Citymarket leaflet -> basic-html -> Ziiply offer candidates.
// No kr-api and no Playwright.

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
function textOf(src:string){
  return src.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<br\s*\/?\s*>/gi,"\n").replace(/<\/(?:p|div|li|span)>/gi,"\n").replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&euro;/gi,"€")
    .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/[ \t]+/g," ").replace(/\n\s*\n+/g,"\n").trim();
}
function category(t:string){
  const s=t.toLowerCase();
  if(/maito|juusto|jogur|rahka|kerma/.test(s)) return "Maitotuotteet";
  if(/kahvi|tee|mehu|limon|juoma|olut|vesi/.test(s)) return "Juomat";
  if(/kana|broiler|nauta|sika|jauheliha|makkara/.test(s)) return "Liha & makkarat";
  if(/kala|lohi|silakka|tonnikala/.test(s)) return "Kala";
  if(/omena|banaani|tomaatti|kurkku|salaatti|paprika|peruna|hedelm|vihann/.test(s)) return "Hevi";
  if(/jäätel|pakaste/.test(s)) return "Pakasteet";
  if(/leipä|sämpyl|pull|croissant/.test(s)) return "Leipomo";
  if(/suklaa|kark|makeis|keksi|chips|sips|perunalastu/.test(s)) return "Makeiset & keksit";
  if(/pesu|puhdist|astianpes|pyykin/.test(s)) return "Kodinhoito";
  if(/shampoo|saippua|deodor|hammastahna/.test(s)) return "Hygienia & kosmetiikka";
  return "Muut";
}
function parsePage(text:string,url:string):CitymarketOffer[]{
  const ls=text.split(/\n+/).map(clean).filter(Boolean), out:CitymarketOffer[]=[];
  for(let i=0;i<ls.length;i++){
    const pm=ls[i].match(/(?<!\d)(\d{1,3}[,.]\d{2})(?!\d)/); if(!pm) continue;
    if(/\/(kg|l|kpl)/i.test(ls[i])&&!/€/.test(ls[i])) continue;
    const prior=ls.slice(Math.max(0,i-5),i).filter(x=>/[A-Za-zÅÄÖåäö]/.test(x)&&!/^(PLUSSA|ETU|ERÄ|VOIMASSA|RAJOITUS|NORMAALI|K-CITYMARKET)/i.test(x));
    const title=prior.slice(-2).join(" ").trim(); if(title.length<3) continue;
    const w=ls.slice(Math.max(0,i-5),Math.min(ls.length,i+6)).join(" ");
    const valid=w.match(/(\d{1,2}\.\d{1,2}\.)\s*[–-]\s*(\d{1,2}\.\d{1,2}\.)/);
    const up=w.match(/(\d+[,.]\d{1,2})\s*(?:€\s*)?\/(kg|l|kpl)/i);
    const size=w.match(/\b(?:\d+\s*x\s*)?\d+(?:[,.]\d+)?\s*(kg|g|l|ml|cl|kpl|pkt|pss)\b/i);
    const norm=w.match(/norm(?:aalihinta)?\s*(\d+[,.]\d{2})/i);
    const price=money(pm[1]);
    const id=`kcm:${url}:${i}:${title.toLowerCase()}:${price}`;
    out.push({id,title,price,normalPrice:norm?money(norm[1]):null,unitPrice:up?money(up[1]):null,unit:up?.[2]?.toLowerCase()??null,
      packageSize:size?.[0]??null,plussa:/plussa/i.test(w),validFrom:valid?.[1]??null,validTo:valid?.[2]??null,
      category:category(title),chain:"K",storeType:"K-Citymarket",source:"K-Citymarket tarjouslehti",sourceUrl:url});
  }
  return out;
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
  basic=basic?abs(basic,leaf.url):leaf.url.replace(/\/index\.html(?:\?.*)?$/i,"/files/basic-html/index.html");
  if(!basic) throw new Error("K-Citymarket basic-html URL not found");
  const index=await html(basic);
  const urls=new Set<string>([index.url]);
  for(const m of index.text.matchAll(/href=["']([^"']*page\d+\.html[^"']*)["']/gi)){const u=abs(m[1],index.url);if(u)urls.add(u)}
  const pages=await Promise.all([...urls].map(async u=>{const p=await html(u);return parsePage(textOf(p.text),p.url)}));
  const seen=new Set<string>();
  return pages.flat().filter(o=>{const k=`${o.title.toLowerCase()}|${o.price}|${o.packageSize??""}`;if(seen.has(k))return false;seen.add(k);return true});
}

export default fetchKCitymarketOffers;

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TESTS = [
  ["2000638800001","6388","Bruno mandariini Nadorcott"],
  ["2000612500002","6125","Pirkka suomalainen jäävuorisalaatti"],
  ["2000818700008","8187","Pirkka banaani"],
  ["2000686300003","6863","Pirkka luomu Reilun kaupan banaani"],
  ["2000503600002","5036","Chiquita banaani"],
  ["2000329500005","3295","Sipuli peltokuivattu"],
  ["2000607600007","6076","Paprika punainen"],
  ["2000621500000","6215","Paprika punainen Suomi"],
  ["2000600200006","6002","Chilipaprika punainen"],
  ["2000632400009","6324","Paprika keltainen Suomi"],
  ["2000680900001","6809","Peruna sopiv. kiinteä"],
  ["2000645300006","6453","Uuniperuna irto"],
  ["2000635300009","6353","Peruna Siikli"],
  ["2000681200001","6812","Peruna jauhoinen harjattu"],
  ["2000637200000","6372","Annabelle peruna kiinteä"],
  ["2000642900001","6429","Nicola peruna kiinteä"],
  ["2000797000007","7970","Pirkka Royal Gala irto"],
  ["2000512100005","5121","Omena Idared"],
  ["2000797100004","7971","Pirkka Golden Delicious"],
  ["2000515700004","5157","Omena Aroma/Amorosa Suomi"],
  ["2000797300008","7973","Pirkka Granny Smith"],
  ["2000807800009","8078","Pirkka Gala luomu"],
  ["2000517400001","5174","Omena Pink Lady"],
  ["2000556600004","5566","Omena Suomi muu"],
].map(([ean,plu,expected])=>({ean,plu,expected}));

function links(html:string, pattern:RegExp) {
  return [...new Set([...html.matchAll(/href=["']([^"']+)["']/gi)].map(m=>m[1]).filter(h=>pattern.test(h)))].slice(0,10);
}

async function get(url:string) {
  try {
    const r=await fetch(url,{cache:"no-store",redirect:"follow",headers:{Accept:"text/html","User-Agent":"Ziiply identity coverage diagnostic/1.0"}});
    return {status:r.status,ok:r.ok,url:r.url,html:await r.text()};
  } catch(e) { return {status:0,ok:false,url,error:e instanceof Error?e.message:String(e),html:""}; }
}

export async function GET() {
  const results=[];
  for (const t of TESTS) {
    const k=await get(`https://kalori.info/haku?q=${encodeURIComponent(t.ean)}`);
    const h=await get(`https://haukka.io/haku?q=${encodeURIComponent(t.ean)}`);
    const kaloriLinks=links(k.html,/\/kalorit\//i).filter(x=>x.includes(t.ean));
    const haukkaLinks=links(h.html,/\/tarjous\//i);
    const haukkaExact=h.html.includes(t.ean);
    results.push({
      ...t,
      kalori:{status:k.status,found:kaloriLinks.length>0,links:kaloriLinks},
      haukka:{status:h.status,containsEan:haukkaExact,links:haukkaExact?haukkaLinks:[]},
      foundEither:kaloriLinks.length>0||haukkaExact,
    });
  }
  return NextResponse.json({
    diagnostic:"Kalori + Haukka canonical EAN coverage probe only; no scanner/resolver changes",
    counts:{
      total:results.length,
      kalori:results.filter(x=>x.kalori.found).length,
      haukka:results.filter(x=>x.haukka.containsEan).length,
      either:results.filter(x=>x.foundEither).length,
    },
    results,
  });
}

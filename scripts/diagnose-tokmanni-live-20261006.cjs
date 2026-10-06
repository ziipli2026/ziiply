const URL0 = "https://www.tokmanni.fi/viikkotarjoukset/elintarvikkeet-ja-elainruoka";
const clean = v => String(v ?? "").replace(/\u00a0/g," ").replace(/[ \t]+/g," ").trim();
const decodeEntities = src => src
  .replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&euro;/gi,"€")
  .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
const textOf = src => clean(decodeEntities(src
  .replace(/<script[\s\S]*?<\/script>/gi," ")
  .replace(/<style[\s\S]*?<\/style>/gi," ")
  .replace(/<br\s*\/?\s*>/gi,"\n")
  .replace(/<[^>]+>/g," "))).replace(/\s+/g," ").trim();

function rawProductBlocks(html) {
  return html.split(/<li\b[^>]*class=["'][^"']*product-item[^"']*["'][^>]*>/i).slice(1);
}
function productBlocks(html) {
  return rawProductBlocks(html)
    .filter(part => /product-item-link|product-item-name/i.test(part))
    .filter(part => /Tarjoushinta|Klubitarjous|Normaalihinta|\d+\s*kpl\s*\//i.test(textOf(part)));
}
function advertisedTotal(html) {
  const m=textOf(html).match(/(?:Tuotteet\s+\d+\s*[-–]\s*\d+\s*\/\s*|)(\d+)\s+tuotetta/i);
  return m ? Number(m[1]) : null;
}
function first(block, patterns) {
  for (const re of patterns) { const m=block.match(re); if(m?.[1]) return textOf(m[1]); }
  return "";
}
function parsed(block) {
  const name=first(block,[
    /class=["'][^"']*product-item-link[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,
    /class=["'][^"']*product-item-name[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i,
  ]);
  const t=textOf(block);
  const multi=t.match(/(\d+)\s*kpl\s*\/\s*(\d+(?:[,.]\d{1,2})?)\s*€/i);
  const offer=t.match(/(?:Tarjoushinta|Klubitarjous!)\s*(\d+(?:[,.]\d{1,2})?)/i);
  return {name, hasMulti:!!multi, multi:multi?.[0]||"", offer:offer?.[1]||"", sample:t.slice(0,240)};
}
(async()=>{
  let totalRaw=0,totalOffer=0,totalNamed=0;
  for(let page=1;page<=5;page++){
    const u=new URL(URL0); if(page>1) u.searchParams.set("p",String(page));
    const res=await fetch(u,{redirect:"follow",headers:{accept:"text/html,application/xhtml+xml","accept-language":"fi-FI,fi;q=0.9","user-agent":"Ziiply/1.0"}});
    const html=await res.text();
    const raw=rawProductBlocks(html), offers=productBlocks(html), examples=offers.slice(0,5).map(parsed);
    const named=offers.filter(x=>parsed(x).name).length;
    totalRaw+=raw.length; totalOffer+=offers.length; totalNamed+=named;
    console.log(JSON.stringify({page,status:res.status,bytes:html.length,advertised:page===1?advertisedTotal(html):null,rawCards:raw.length,offerCards:offers.length,namedOfferCards:named,hasProductItem:/product-item/i.test(html),hasTarjoushinta:/Tarjoushinta/i.test(textOf(html)),hasKpl:/\d+\s*kpl\s*\//i.test(textOf(html)),examples},null,2));
  }
  console.log("TOTALS",JSON.stringify({totalRaw,totalOffer,totalNamed}));
  if(totalRaw===0) process.exitCode=2;
})();
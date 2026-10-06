const URL0="https://www.tokmanni.fi/viikkotarjoukset/elintarvikkeet-ja-elainruoka";
const clean=v=>String(v??"").replace(/\u00a0/g," ").replace(/[ \t]+/g," ").trim();
const decodeEntities=src=>src.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&euro;/gi,"€").replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
const textOf=src=>clean(decodeEntities(src.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<br\s*\/?\s*>/gi,"\n").replace(/<[^>]+>/g," "))).replace(/\s+/g," ").trim();
const norm=v=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const price=v=>{const m=String(v??"").replace(/\s/g,"").match(/(\d+(?:[.,]\d{1,2})?)/);return m?Number(m[1].replace(",",".")):null};
const blocks=html=>html.split(/<li\b[^>]*class=["'][^"']*product-item[^"']*["'][^>]*>/i).slice(1).filter(p=>/product-item-link|product-item-name/i.test(p)).filter(p=>/Tarjoushinta|Klubitarjous|Normaalihinta|\d+\s*kpl\s*\//i.test(textOf(p)));
const first=(b,ps)=>{for(const re of ps){const m=b.match(re);if(m?.[1])return textOf(m[1])}return""};
function mapBlock(block){
 const name=first(block,[/class=["'][^"']*product-item-link[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,/class=["'][^"']*product-item-name[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i]); if(!name)return null;
 const t=textOf(block);
 const multi=t.match(/(\d+)\s*kpl\s*\/\s*(\d+\s*(?:[,.]\s*\d{1,2})?)\s*€/i);
 const total=multi?price(multi[2]):null;
 const offer=t.match(/(?:Tarjoushinta|Klubitarjous!)\s*(\d+\s*(?:[,.]\s*\d{1,2})?)/i);
 const normal=t.match(/Normaalihinta\s*(\d+\s*(?:[,.]\s*\d{1,2})?)/i);
 const vals=Array.from(block.matchAll(/<(?:span|span[^>]*)[^>]*class=["'][^"']*(?:price-wrapper|price)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)).map(m=>price(textOf(m[1]||""))).filter(v=>v!=null);
 const ordinary=multi?vals.find(v=>Math.abs(v-total)>0.0001)??null:null;
 const op=total??price(offer?.[1]); if(op==null)return null;
 return {name,price:op,normalPrice:price(normal?.[1])??ordinary,qty:multi?Number(multi[1]):null};
}
(async()=>{let all=[];for(let p=1;p<=5;p++){const u=new URL(URL0);if(p>1)u.searchParams.set("p",p);const res=await fetch(u,{headers:{accept:"text/html,application/xhtml+xml","accept-language":"fi-FI,fi;q=0.9","user-agent":"Ziiply/1.0"}});const html=await res.text();const bs=blocks(html), mapped=bs.map(mapBlock), ok=mapped.filter(Boolean);console.log("PAGE",p,{blocks:bs.length,mapped:ok.length,rejected:mapped.length-ok.length,rejectedSamples:bs.filter((_,i)=>!mapped[i]).slice(0,3).map(textOf)});all.push(...ok)}
const seen=new Set(),ded=all.filter(x=>{const k=[norm(x.name),x.price,x.normalPrice,x.qty].join("|");if(seen.has(k))return false;seen.add(k);return true});console.log("FINAL",{mapped:all.length,deduped:ded.length});console.log("SAMPLES",ded.slice(0,10)); if(ded.length<180)process.exitCode=3;})();
// trigger workflow

// Diagnostic only: run with node scripts/diagnose-kcitymarket-40lv.mjs
// No production changes. Requires access to the public leaflet host.
import { parseKCitymarketSpatialLeaflet } from "../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParser.js";
const entry="https://kcm-lehdet.k-ruoka.fi/loppuviikon_tarjouslehdet/lvtarjouslehti.html";
const parsed=await parseKCitymarketSpatialLeaflet(entry);
const pageOneUrl=new URL("files/basic-html/index.html",parsed.leaflet).href;
const pageOneHtml=await (await fetch(pageOneUrl)).text();
const pre=pageOneHtml.match(/<pre[^>]*><code>([\\s\\S]*?)<\\/code><\\/pre>/i)?.[1]||"";
console.log("PAGE 1 RAW RELEVANT LINES:",pre.split(/\\r?\\n/).map((line,i)=>({i,line:line.trim()})).filter(x=>/LATZ|ANNOSPUSSI|11|90|LOHI|VILJAPORSAAN|ULKOFILEE|KG|PKT|S6 99/i.test(x.line)));
if(!/_40LV_KCM/i.test(String(parsed.leaflet))) throw new Error("Wrong leaflet: "+parsed.leaflet);
const groups=[
  {key:"Latz",pattern:/latz|annospussilajitelm/i,price:11.90},
  {key:"Kokonainen lohi",pattern:/kokonainen.*lohi|lohi.*kokonainen/i,price:7.99},
  {key:"HK ulkofilee",pattern:/viljaporsaan|ulkofilee/i,price:6.99},
];
console.log("Leaflet:",parsed.leaflet,"parsed rows:",parsed.rows.length);
console.log("PAGE 1 TITLES:",parsed.rows.filter(r=>r.page===1).map(r=>({title:r.title,price:r.spatialResolved?.value,source:r.spatialResolved?.source})));
for(const row of parsed.rows.filter(r=>r.page===1 && /LOHI|ULKOFILEE/i.test(r.title))){
 console.log("PAGE1 SPATIAL FOCUS",JSON.stringify({title:row.title,anchor:row.debugAnchor,packageAnchor:row.debugPackageRowAnchor,bestTitleRow:row.debugBestTitleRow,prices:row.spatialPriceBoxes,candidates:row.spatialCandidates,groups:row.spatialGroups,nearbyBoxes:(row.debugNearbyBoxes||[]).filter(b=>/^(?:7|99|6|S6|KG|LOHI|ULKOFILEE)$/i.test(String(b.text).trim()))},null,2));
}
const first=await fetch(new URL("files/basic-html/index.html",parsed.leaflet));
const firstHtml=await first.text();
const p1=firstHtml.match(/<pre[^>]*><code>([\\s\\S]*?)<\\/code><\\/pre>/i)?.[1]||firstHtml;
console.log("PAGE1 RAW LINES",p1.split(/\\r?\\n/).map((line,i)=>({i,line:line.trim()})).filter(x=>/LATZ|ANNOSPUSSI|44\\s*[x×]|11\\s*90|LOHI|ULKOFILEE|S6\\s*99|KG/i.test(x.line)).slice(0,45));
let failed=false;
for(const g of groups){
 const hits=parsed.rows.filter(r=>g.pattern.test(String(r.title||"")));
 const diagnostic=hits.map(r=>({page:r.page,title:r.title,package:r.package,unitPrice:r.unitPrice,normal:r.normal,spatialResolved:r.spatialResolved,nearby:r.nearby,debugNearbyBoxes:r.debugNearbyBoxes,spatialPriceBoxes:r.spatialPriceBoxes?.slice(0,25)}));
 console.log("\n"+g.key+": "+hits.length+" candidate(s)\n"+JSON.stringify(diagnostic,null,2));
 const valid=hits.some(r=>Math.abs(Number(r.spatialResolved?.value)-g.price)<.011&&!r.spatialResolved?.displayOnlyUnitPrice);
 if(!valid){failed=true;console.error("NOT RESOLVED:",g.key,"expected:",g.price);}
}
if(failed)process.exitCode=1;

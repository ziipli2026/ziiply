// Diagnostic only: run with node scripts/diagnose-kcitymarket-40lv.mjs
// No production changes. Requires access to the public leaflet host.
import { parseKCitymarketSpatialLeaflet } from "../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParser.js";
const entry="https://kcm-lehdet.k-ruoka.fi/loppuviikon_tarjouslehdet/lvtarjouslehti.html";
const parsed=await parseKCitymarketSpatialLeaflet(entry);
if(!/_40LV_KCM/i.test(String(parsed.leaflet))) throw new Error("Wrong leaflet: "+parsed.leaflet);
const groups=[
  {key:"Latz",pattern:/latz|annospussilajitelm/i,price:11.90},
  {key:"Kokonainen lohi",pattern:/kokonainen.*lohi|lohi.*kokonainen/i,price:7.99},
  {key:"HK ulkofilee",pattern:/viljaporsaan|ulkofilee/i,price:6.99},
];
console.log("Leaflet:",parsed.leaflet,"parsed rows:",parsed.rows.length);\nconsole.log("PAGE 1 TITLES:",parsed.rows.filter(r=>r.page===1).map(r=>({title:r.title,price:r.spatialResolved?.value,source:r.spatialResolved?.source})));
let failed=false;
for(const g of groups){
 const hits=parsed.rows.filter(r=>g.pattern.test(String(r.title||"")));
 const diagnostic=hits.map(r=>({page:r.page,title:r.title,package:r.package,unitPrice:r.unitPrice,normal:r.normal,spatialResolved:r.spatialResolved,nearby:r.nearby,debugNearbyBoxes:r.debugNearbyBoxes,spatialPriceBoxes:r.spatialPriceBoxes?.slice(0,25)}));
 console.log("\n"+g.key+": "+hits.length+" candidate(s)\n"+JSON.stringify(diagnostic,null,2));
 const valid=hits.some(r=>Math.abs(Number(r.spatialResolved?.value)-g.price)<.011&&!r.spatialResolved?.displayOnlyUnitPrice);
 if(!valid){failed=true;console.error("NOT RESOLVED:",g.key,"expected:",g.price);}
}
if(failed)process.exitCode=1;

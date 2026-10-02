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
console.log("Leaflet:",parsed.leaflet,"parsed rows:",parsed.rows.length);
let failed=false;
for(const g of groups){
 const hits=parsed.rows.filter(r=>g.pattern.test(String(r.title||"")+" "+(r.nearby||[]).join(" ")));
 const diagnostic=hits.map(r=>({page:r.page,title:r.title,package:r.package,unitPrice:r.unitPrice,normal:r.normal,spatialResolved:r.spatialResolved,nearby:r.nearby}));
 console.log("\n"+g.key+": "+hits.length+" candidate(s)\n"+JSON.stringify(diagnostic,null,2));
 const valid=hits.some(r=>Math.abs(Number(r.spatialResolved?.value)-g.price)<.011&&!r.spatialResolved?.displayOnlyUnitPrice);
 if(!valid){failed=true;console.error("NOT RESOLVED:",g.key,"expected:",g.price);}
}
if(failed)process.exitCode=1;

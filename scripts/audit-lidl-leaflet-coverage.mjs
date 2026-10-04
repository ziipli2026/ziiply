/** Compare photographed Lidl leaflet reference with an exported Gösta Lidl DBG JSON.
 * Research-only: never publishes offers, prices, stock, images or invented barcodes.
 * Usage: node scripts/audit-lidl-leaflet-coverage.mjs path/to/lidl-debug.json
 */
import fs from "node:fs";
import {fileURLToPath} from "node:url";
const fixturePath=fileURLToPath(new URL("../data/lidl/hyvinkaa-paper-leaflet-w40-2026.fixture.json",import.meta.url));
const fixture=JSON.parse(fs.readFileSync(fixturePath,"utf8"));
const debugPath=process.argv[2];
if(!debugPath){console.error("Usage: node scripts/audit-lidl-leaflet-coverage.mjs <gosta-lidl-debug.json>");process.exit(2);}
const debug=JSON.parse(fs.readFileSync(debugPath,"utf8"));
if(debug.selectedOfferChain!=="L") {console.error("Expected Lidl DBG export (selectedOfferChain=L)");process.exit(2);}
const rows=Array.isArray(debug.rawItems)?debug.rawItems:[];
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const aliases={"hk-burger":["burgeri"],"solevita-orange":["appelsiin taysmehu","appelsiinitaysmehu"]};
const output=fixture.records.map(r=>{
 const terms=[norm(r.name),...(aliases[r.id]||[])];
 const hits=rows.filter(x=>terms.some(t=>t&&(norm(x.title||x.name).includes(t)||t.includes(norm(x.title||x.name))&&norm(x.title||x.name).length>=6)));
 return {id:r.id,leaflet:r.name,validFrom:r.validFrom,validThrough:r.validThrough,printedPriceEur:r.printedPriceEur,priceBasis:r.priceBasis,requiredQuantity:r.requiredQuantity,eligibility:r.eligibility,status:hits.length?"CANDIDATE_VERIFY_PRICE_AND_CONDITIONS":"MISSING_FROM_DEBUG",candidates:hits.map(x=>({name:x.title||x.name,price:x.price,hasImage:Boolean(x.imageUrl||x.image),source:x.__sourceOfferSearchResult?.source||x.source}))};
});
console.log(JSON.stringify({debugStore:debug.selectedStoreName,debugCount:rows.length,referenceCount:fixture.records.length,missing:output.filter(x=>x.status==="MISSING_FROM_DEBUG").length,candidates:output.filter(x=>x.status!=="MISSING_FROM_DEBUG").length,records:output},null,2));

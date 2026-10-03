// Isolated read-only diagnostic for Hämeenmaa Prisma price-banner coverage.
// Run: node --experimental-strip-types scripts/diagnose-hameenmaa-prisma.mts
// Never writes prices into the offer cache or production.
import { fetchSKaupatNormalProductsV220 } from "../src/app/components/ziiply/offerSearch/providers/skaupatProvider";
const store = "Prisma Hämeenlinna";
const cases = [
  { label:"Snellman Maatiaispossun maustettu uunifilee", query:"Snellman uunifilee", ean:"2396257900001", expected:6.99, unit:"KG" },
  { label:"Naapurin Maalaiskanan kanapuikko 300 g", query:"Naapurin Maalaiskanan kanapuikko", ean:"6405857316207", expected:4.49, unit:"PKT" },
  { label:"Xtra päärynärasia 1 kg", query:"Xtra päärynärasia", ean:null, expected:0.99, unit:"PKT" },
];
let failed = false;
for (const item of cases) {
  try {
    const rows = await fetchSKaupatNormalProductsV220(item.query,store);
    const matches = rows.filter(r => item.ean ? String(r.ean||"")===item.ean : /pääryn/i.test(r.name));
    console.log(JSON.stringify({store,label:item.label,expected:item.expected,unit:item.unit,rawResultCount:rows.length,matches:matches.map(r=>({name:r.name,ean:r.ean,price:r.price,comparisonPrice:r.comparisonPrice,comparisonPriceUnit:r.comparisonPriceUnit}))}));
    if(!matches.length) { failed=true; console.error("NOT FOUND in store normal product query:",item.label); }
  } catch(error) { failed=true; console.error("QUERY FAILED",item.label,String(error)); }
}
if(failed) process.exitCode=1;

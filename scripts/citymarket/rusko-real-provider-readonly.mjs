// Read-only execution of the real checked-out Citymarket local provider.
// Only its category classifier import is stubbed; offer fetching/filtering is unchanged.
import fs from "node:fs";
import ts from "typescript";
const path="src/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider.ts";
let source=fs.readFileSync(path,"utf8");
if(!source.includes('import { category as classifyCitymarketCategory } from "./kCitymarketProvider";')) throw Error("Provider import changed: stop rather than silently alter behavior");
source=source.replace('import { category as classifyCitymarketCategory } from "./kCitymarketProvider";','const classifyCitymarketCategory = () => "AUDIT_ONLY";');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
new Function("module","exports","require",js)(mod,mod.exports,()=>{throw Error("Unexpected import in provider")});
const offers=await mod.exports.fetchKCitymarketSelectedStoreOffers("K-Citymarket Oulu Rusko");
const ids=offers.map(o=>String(o.offerId??""));
const duplicates=ids.length-new Set(ids).size;
const summary={status:"OK",store:"K-Citymarket Oulu Rusko",providerReturned:offers.length,uniqueOfferIds:new Set(ids).size,duplicates,nonPositivePrices:offers.filter(o=>!(Number(o.price)>0)).length,missingValidity:offers.filter(o=>!o.validFrom||!o.validUntil).length,sample:offers.slice(0,8).map(o=>({id:o.offerId,title:o.title,price:o.price}))};
console.log("ACTUAL_LOCAL_PROVIDER_AUDIT",JSON.stringify(summary));
if(!offers.length||duplicates||summary.nonPositivePrices||summary.missingValidity)process.exitCode=1;

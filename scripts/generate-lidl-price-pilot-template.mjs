import catalog from "../data/lidl/official-grocery-candidates-v44-2026-10-01.json" with {type:"json"};
import { writeFileSync } from "node:fs";
// Existing catalog IDs only; website display prices and unverified EANs are NEVER copied.
const excluded = new Set(catalog.quarantinedProductIds.map(String));
const candidates = catalog.records.filter(row => row.lidlProductId && !excluded.has(String(row.lidlProductId)));
// Fixed cross-category pilot; indices refer to the immutable v44 research snapshot.
// Each selected item must still be physically checked for pack size and regular-price eligibility.
const pilotGroups = {
 dairyAndAlternatives:[0,3,38,40,72],
 meatAndFish:[7,11,14,31,82],
 produce:[10,16,17,18,88],
 pantryAndFrozen:[8,9,42,53,63],
 beveragesAndTreats:[2,12,73,76,113]
};
const selectedIndices=Object.values(pilotGroups).flat();
if(new Set(selectedIndices).size!==25) throw new Error("Duplicate pilot selection");
const sample=selectedIndices.map(index=>{
 const row=catalog.records[index];
 if(!row||excluded.has(String(row.lidlProductId))) throw new Error("Pilot candidate missing or quarantined: "+index);
 return row;
});
const columns=["lidlProductId","name","variant","physicalStoreName","physicalStoreAddress","storeId","observedCode","observedCodeOrigin","scannedEanVerified","priceBasis","shelfPriceEur","shelfObservedAt","shelfPhotoReference","scanGoDisplayedPriceEur","receiptUnitPriceEur","receiptTimestamp","receiptEvidenceReference","validThrough","isLidlPlus","isPromotion","isMultiBuy","permissionToUseEvidence"];
const quote=value=>'"'+String(value??"").replaceAll('"','""')+'"';
const rows=[columns,...sample.map(item=>columns.map(col=>["lidlProductId","name","variant"].includes(col)?item[col]??"":""))];
const output=rows.map(row=>row.map(quote).join(",")).join("\n")+"\n";
if (sample.length!==25) throw new Error("Insufficient unquarantined catalog records");
const target=process.argv[2];
if (target) writeFileSync(target,output,"utf8"); else process.stdout.write(output);

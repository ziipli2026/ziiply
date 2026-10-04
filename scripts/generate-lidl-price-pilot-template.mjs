import catalog from "../data/lidl/official-grocery-candidates-v44-2026-10-01.json" with {type:"json"};
import { writeFileSync } from "node:fs";
// Existing catalog IDs only; website display prices and unverified EANs are NEVER copied.
const excluded = new Set(catalog.quarantinedProductIds.map(String));
const candidates = catalog.records.filter(row => row.lidlProductId && !excluded.has(String(row.lidlProductId)));
const sample = candidates.slice(0,25);
const columns=["lidlProductId","name","variant","physicalStoreName","physicalStoreAddress","storeId","scannedEanVerified","priceBasis","shelfPriceEur","shelfObservedAt","shelfPhotoReference","scanGoDisplayedPriceEur","receiptUnitPriceEur","receiptTimestamp","receiptEvidenceReference","validThrough","isLidlPlus","isPromotion","isMultiBuy","permissionToUseEvidence"];
const quote=value=>'"'+String(value??"").replaceAll('"','""')+'"';
const rows=[columns,...sample.map(item=>columns.map(col=>["lidlProductId","name","variant"].includes(col)?item[col]??"":""))];
const output=rows.map(row=>row.map(quote).join(",")).join("\n")+"\n";
if (sample.length!==25) throw new Error("Insufficient unquarantined catalog records");
const target=process.argv[2];
if (target) writeFileSync(target,output,"utf8"); else process.stdout.write(output);

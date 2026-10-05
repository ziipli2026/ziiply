import {readFileSync,writeFileSync} from "node:fs";
import catalog from "../data/lidl/official-grocery-candidates-v44-2026-10-01.json" with {type:"json"};
import {processLidlPilotCsv} from "./lib/lidl-pilot-csv-intake.mjs";

const [csvPath,storeId,time,outPath]=process.argv.slice(2);
if(!csvPath||!storeId||!outPath){console.error("Usage: node scripts/export-lidl-pilot-verified-prices.mjs <local-csv> <store-id> <ISO-time> <output-json>");process.exit(2);}
const at=new Date(time);if(!Number.isFinite(at.getTime()))throw new Error("Invalid ISO-time");
const excluded=new Set(catalog.quarantinedProductIds.map(String));
const ids=catalog.records.map(x=>String(x.lidlProductId)).filter(x=>!excluded.has(x));
const result=processLidlPilotCsv(readFileSync(csvPath,"utf8"),ids,storeId,at);
const output={schemaVersion:1,generatedAt:at.toISOString(),storeId,source:"consented-lidl-pilot-receipt-evidence",warning:"Contains only structurally accepted verified-price candidates. Authenticate receipt references and permission before merging into persistent bank. Do not commit raw receipt/CSV data.",records:result.prices};
writeFileSync(outPath,JSON.stringify(output,null,2)+"\n");
console.log(JSON.stringify({written:outPath,accepted:result.prices.length,rejected:result.rejected.length}));

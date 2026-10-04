import {readFileSync} from "node:fs";
import catalog from "../data/lidl/official-grocery-candidates-v44-2026-10-01.json" with {type:"json"};
import {processLidlPilotCsv} from "./lib/lidl-pilot-csv-intake.mjs";
// Usage: node scripts/run-lidl-pilot-intake.mjs <local-csv-path> <store-id> [ISO-observation-time]
// This tool only reports validation status; it never publishes or prints receipt references/prices.
const [path,storeId,time]=process.argv.slice(2);
if(!path||!storeId){console.error("Usage: node scripts/run-lidl-pilot-intake.mjs <local-csv-path> <store-id> [ISO-time]");process.exitCode=2;}
else {
 try {
  const at=time?new Date(time):new Date();
  if(!Number.isFinite(at.getTime()))throw new Error("Invalid ISO-time");
  const excluded=new Set(catalog.quarantinedProductIds.map(String));
  const ids=catalog.records.map(x=>String(x.lidlProductId)).filter(x=>!excluded.has(x));
  const result=processLidlPilotCsv(readFileSync(path,"utf8"),ids,storeId,at);
  const reasons=Object.fromEntries([...new Set(result.rejected.map(x=>x.reason))].sort().map(reason=>[reason,result.rejected.filter(x=>x.reason===reason).length]));
  process.stdout.write(JSON.stringify({status:result.status,storeId:result.storeId,inputCount:result.inputCount,acceptedProductCount:result.acceptedCount,rejectedObservationCount:result.rejectedCount,rejectionReasons:reasons},null,2)+"\n");
 }catch(error){console.error("Lidl pilot intake failed:",error.message);process.exitCode=1;}
}

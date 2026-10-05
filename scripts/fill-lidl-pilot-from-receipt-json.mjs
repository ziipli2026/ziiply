import {readFileSync} from "node:fs";
import {PILOT_COLUMNS,parseLidlPilotCsv} from "./lib/lidl-pilot-csv-reader.mjs";

// Convenience only: hydrate an existing generated pilot template.
// The normal intake remains the sole validator and publishing gate.
const [templatePath,observationsPath]=process.argv.slice(2);
if(!templatePath||!observationsPath){
 console.error("Usage: node scripts/fill-lidl-pilot-from-receipt-json.mjs <pilot-template.csv> <receipt-observations.json>");
 process.exitCode=2;
}else try{
 const csv=readFileSync(templatePath,"utf8");
 const rows=parseLidlPilotCsv(csv);
 const input=JSON.parse(readFileSync(observationsPath,"utf8"));
 if(!Array.isArray(input))throw new Error("Receipt observations must be a JSON array");
 const byId=new Map(rows.map(row=>[row.lidlProductId,row]));
 for(const observation of input){
  if(!observation||typeof observation!=="object"||Array.isArray(observation))throw new Error("Invalid receipt observation");
  const id=String(observation.lidlProductId??"");
  const row=byId.get(id);
  if(!row)throw new Error("Unknown pilot lidlProductId: "+id);
  const allowed=new Set(["lidlProductId","observedCode","observedCodeOrigin","scannedEanVerified","priceBasis","shelfPriceEur","shelfObservedAt","shelfPhotoReference","receiptUnitPriceEur","receiptTimestamp","receiptEvidenceReference","isLidlPlus","isPromotion","isMultiBuy","permissionToUseEvidence"]);
  for(const key of Object.keys(observation))if(!allowed.has(key))throw new Error("Unsupported receipt observation field: "+key);
  for(const [key,value] of Object.entries(observation))if(key!=="lidlProductId")row[key]=String(value??"");
 }
 const quote=value=>'"'+String(value??"").replaceAll('"','""')+'"';
 process.stdout.write([PILOT_COLUMNS,...rows.map(row=>PILOT_COLUMNS.map(key=>row[key]))].map(row=>row.map(quote).join(",")).join("\n")+"\n");
}catch(error){console.error("Lidl pilot receipt fill failed:",error.message);process.exitCode=1;}

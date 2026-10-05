import {execFileSync} from "node:child_process";
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from "node:fs";
import {join} from "node:path";

// Safe convenience pipeline: receipt observations -> generated 21-column CSV -> existing research-only intake.
// No production write, no receipt evidence or prices are emitted by this command.
const [observationsPath,storeId,storeName,storeAddress,time]=process.argv.slice(2);
if(!observationsPath||!storeId||!storeName||!storeAddress){
 console.error("Usage: node scripts/run-lidl-receipt-pilot.mjs <receipt-observations.json> <store-id> <store-name> <store-address> [ISO-time]");
 process.exitCode=2;
}else try{
 const dir=mkdtempSync(join(process.cwd(),".lidl-receipt-pilot-"));
 const template=join(dir,"pilot-template.csv");
 const filled=join(dir,"pilot-filled.csv");
 try{
  execFileSync(process.execPath,["scripts/generate-lidl-price-pilot-template.mjs",template,storeId,storeName,storeAddress],{stdio:"inherit"});
  const output=execFileSync(process.execPath,["scripts/fill-lidl-pilot-from-receipt-json.mjs",template,observationsPath],{encoding:"utf8"});
  writeFileSync(filled,output,"utf8");
  const intakeArgs=["scripts/run-lidl-pilot-intake.mjs",filled,storeId];
  if(time) intakeArgs.push(time);
  const result=execFileSync(process.execPath,intakeArgs,{encoding:"utf8"});
  process.stdout.write(result);
 } finally {
  rmSync(dir,{recursive:true,force:true});
 }
}catch(error){
 const detail=error?.stderr?.toString?.().trim();
 console.error("Lidl receipt pilot pipeline failed:",detail||error.message);
 process.exitCode=1;
}

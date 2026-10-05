import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const dir=mkdtempSync(join(tmpdir(),"ziiply-lidl-receipt-import-"));
const script=fileURLToPath(new URL("./import-lidl-pilot-receipts-to-bank.mjs",import.meta.url));
const header="lidlProductId,name,variant,physicalStoreName,physicalStoreAddress,storeId,observedCode,observedCodeOrigin,scannedEanVerified,priceBasis,shelfPriceEur,shelfObservedAt,shelfPhotoReference,scanGoDisplayedPriceEur,receiptUnitPriceEur,receiptTimestamp,receiptEvidenceReference,isLidlPlus,isPromotion,isMultiBuy,permissionToUseEvidence";
const bankSeed={schemaVersion:1,source:"test",policy:{},records:[]};
function run(name,row){
 const csv=join(dir,name+".csv"),bank=join(dir,name+".json");
 writeFileSync(csv,header+"\n"+row+"\n");writeFileSync(bank,JSON.stringify(bankSeed));
 const r=spawnSync(process.execPath,[script,csv,"FI0218","2026-10-05T09:00:00Z",bank],{encoding:"utf8"});
 return {r,bank:JSON.parse(readFileSync(bank,"utf8"))};
}
try{
 const valid=run("valid","10033976,Test,,,Testikatu 1,FI0218,1234567890123,packaging,,unit,1.99,2026-10-05T08:25:00Z,SHELF-TEST-1,,1.99,2026-10-05T08:30:00Z,RECEIPT-TEST-1,false,false,false,true");
 assert.equal(valid.r.status,0,valid.r.stderr);
 assert.equal(valid.bank.records.length,1);
 assert.equal(valid.bank.records[0].storeId,"FI0218");
 assert.equal(valid.bank.records[0].regularPriceEur,1.99);
 const promo=run("promo","10033976,Test,,,Testikatu 1,FI0218,1234567890123,packaging,,unit,1.49,2026-10-05T08:25:00Z,SHELF-TEST-2,,1.49,2026-10-05T08:30:00Z,RECEIPT-TEST-2,false,true,false,true");
 assert.equal(promo.r.status,1);
 assert.equal(promo.bank.records.length,0);
 console.log("PASS: one-step Lidl receipt import writes only fully accepted rows and leaves bank untouched on rejection");
}finally{rmSync(dir,{recursive:true,force:true});}

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const dir=mkdtempSync(join(tmpdir(),"ziiply-lidl-receipt-import-"));
const script=fileURLToPath(new URL("./import-lidl-pilot-receipts-to-bank.mjs",import.meta.url));
const header="lidlProductId,productName,category,packageSize,storeId,observedCode,observedCodeOrigin,verifiedEan,shelfPriceEur,scanGoPriceEur,receiptUnitPriceEur,receiptTimestamp,receiptEvidenceReference,priceBasis,isLidlPlus,isPromotion,isMultiBuy,permissionToUseEvidence,notes,reviewer,reviewedAt";
const bankSeed={schemaVersion:1,source:"test",policy:{},records:[]};
function run(name,row){
 const csv=join(dir,name+".csv"),bank=join(dir,name+".json");
 writeFileSync(csv,header+"\n"+row+"\n");writeFileSync(bank,JSON.stringify(bankSeed));
 const r=spawnSync(process.execPath,[script,csv,"FI0218","2026-10-05T09:00:00Z",bank],{encoding:"utf8"});
 return {r,bank:JSON.parse(readFileSync(bank,"utf8"))};
}
try{
 const valid=run("valid","10033976,Test,,,,FI0218,1234567890123,packaging,,1.99,,1.99,2026-10-05T08:30:00Z,RECEIPT-TEST-1,unit,false,false,false,true,,,");
 assert.equal(valid.r.status,0,valid.r.stderr);
 assert.equal(valid.bank.records.length,1);
 assert.equal(valid.bank.records[0].storeId,"FI0218");
 assert.equal(valid.bank.records[0].regularPriceEur,1.99);
 const promo=run("promo","10033976,Test,,,,FI0218,1234567890123,packaging,,1.49,,1.49,2026-10-05T08:30:00Z,RECEIPT-TEST-2,unit,false,true,false,true,,,");
 assert.equal(promo.r.status,1);
 assert.equal(promo.bank.records.length,0);
 console.log("PASS: one-step Lidl receipt import writes only fully accepted rows and leaves bank untouched on rejection");
}finally{rmSync(dir,{recursive:true,force:true});}

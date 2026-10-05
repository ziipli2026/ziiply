import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const dir=mkdtempSync(join(tmpdir(),"lidl-receipt-fill-"));
try{
 const template=join(dir,"pilot.csv"),json=join(dir,"receipt.json"),filled=join(dir,"filled.csv");
 execFileSync(process.execPath,["scripts/generate-lidl-price-pilot-template.mjs",template,"FI0218","Lidl Hyvinkää","Kankurinkatu 4"]);
 const csv=execFileSync(process.execPath,["scripts/generate-lidl-price-pilot-template.mjs","","FI0218","Lidl Hyvinkää","Kankurinkatu 4"],{encoding:"utf8"});
 const id=csv.split("\n")[1].match(/^"(\d+)"/)[1];
 writeFileSync(json,JSON.stringify([{lidlProductId:id,observedCode:"12345678",observedCodeOrigin:"packaging",scannedEanVerified:false,priceBasis:"unit",receiptUnitPriceEur:"1.29",receiptTimestamp:"2026-10-05T10:00:00+03:00",receiptEvidenceReference:"local-receipt-1",isLidlPlus:false,isPromotion:false,isMultiBuy:false,permissionToUseEvidence:true}]));
 const output=execFileSync(process.execPath,["scripts/fill-lidl-pilot-from-receipt-json.mjs",template,json],{encoding:"utf8"});
 writeFileSync(filled,output);
 const result=JSON.parse(execFileSync(process.execPath,["scripts/run-lidl-pilot-intake.mjs",filled,"FI0218","2026-10-05T10:30:00+03:00"],{encoding:"utf8"}));
 assert.equal(result.structurallyAcceptedCandidateCount,1);
 assert.equal(result.rejectedObservationCount,24);
 assert.equal(result.publishablePriceCount,0);
 assert.equal(JSON.stringify(result).includes("local-receipt-1"),false);
 writeFileSync(json,JSON.stringify([{lidlProductId:"999999999999",receiptUnitPriceEur:"1.29"}]));
 assert.throws(()=>execFileSync(process.execPath,["scripts/fill-lidl-pilot-from-receipt-json.mjs",template,json],{stdio:"pipe"}),error=>String(error.stderr).includes("Unknown pilot lidlProductId"));
 console.log("PASS: receipt JSON helper hydrates only known pilot rows and still passes through research-only intake");
}finally{rmSync(dir,{recursive:true,force:true});}

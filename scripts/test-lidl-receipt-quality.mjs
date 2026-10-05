import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";

const dir=mkdtempSync(join(tmpdir(),"lidl-quality-"));
try{
 const obs=join(dir,"obs.json"),batch=join(dir,"batch.json");
 writeFileSync(obs,JSON.stringify([{lidlProductId:"10037642",observedCode:"6430081490041",scannedEanVerified:true,priceBasis:"unit",receiptUnitPriceEur:9.99,receiptEvidenceReference:"PRIVATE",isLidlPlus:false,isPromotion:false,isMultiBuy:false,permissionToUseEvidence:true}]));
 writeFileSync(batch,JSON.stringify([{observationsPath:obs,storeId:"FI0218",storeName:"Lidl Hyvinkää",storeAddress:"Kankurinkatu 4"}]));
 const out=JSON.parse(execFileSync(process.execPath,["scripts/analyze-lidl-receipt-batch.mjs",batch],{encoding:"utf8"}));
 assert.equal(out.status,"research-only-not-published");
 assert.equal(out.totalObservationCount,1);
 assert.equal(out.knownCatalogObservationCount,1);
 assert.equal(out.qualityFlags.verifiedObservedCode,1);
 assert.equal(out.safety.publishablePriceCount,0);
 assert.equal(JSON.stringify(out).includes("9.99"),false);
 assert.equal(JSON.stringify(out).includes("PRIVATE"),false);
 console.log("PASS: Lidl quality analysis is category-aware and sanitized");
}finally{rmSync(dir,{recursive:true,force:true});}

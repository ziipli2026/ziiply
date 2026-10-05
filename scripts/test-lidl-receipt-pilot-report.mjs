import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";

const dir=mkdtempSync(join(tmpdir(),"lidl-report-"));
try{
 const input=join(dir,"result.json");
 writeFileSync(input,JSON.stringify({
  status:"research-only-not-published",storeId:"FI0218",inputCount:25,
  structurallyAcceptedCandidateCount:7,rejectedObservationCount:18,publishablePriceCount:0,
  rejectionReasons:{"stale-or-future":2,"permission-not-confirmed":3,"unknown-product":1}
 }));
 const out=JSON.parse(execFileSync(process.execPath,["scripts/report-lidl-receipt-pilot.mjs",input],{encoding:"utf8"}));
 assert.equal(out.structurallyAcceptedCandidateCount,7);
 assert.deepEqual(Object.keys(out.rejectionReasons),["permission-not-confirmed","stale-or-future","unknown-product"]);
 assert.equal(out.safety.researchOnly,true);
 assert.equal(out.safety.publishablePriceCountIsZero,true);
 assert.equal(out.safety.containsReceiptEvidence,false);
 assert.equal(out.safety.containsReceiptPrices,false);
 console.log("PASS: receipt pilot report is deterministic and sanitized");
}finally{rmSync(dir,{recursive:true,force:true});}

import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const dir=mkdtempSync(join(tmpdir(),"lidl-pilot-"));
try {
 const path=join(dir,"pilot.csv");
 const csv=execFileSync(process.execPath,["scripts/generate-lidl-price-pilot-template.mjs"],{encoding:"utf8"});
 writeFileSync(path,csv);
 const result=JSON.parse(execFileSync(process.execPath,["scripts/run-lidl-pilot-intake.mjs",path,"TEST-STORE","2026-10-04T12:00:00Z"],{encoding:"utf8"}));
 assert.equal(result.status,"research-only-not-published");
 assert.equal(result.inputCount,25);
 assert.equal(result.structurallyAcceptedCandidateCount,0);
 assert.equal(result.rejectedObservationCount,25);
 assert.equal(result.externallyVerifiedEvidenceCount,0);
 assert.equal(result.publishablePriceCount,0);
 assert.equal(result.rejectionReasons["permission-not-confirmed"],25);
 assert.equal(JSON.stringify(result).includes("receiptEvidenceReference"),false);
 assert.equal(JSON.stringify(result).includes("regularPriceEur"),false);
 console.log("PASS: local pilot CLI validates 25 rows without printing receipt details or prices");
}finally{rmSync(dir,{recursive:true,force:true});}

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
 const lines=csv.trimEnd().split("\n");
 const columns=lines[0].match(/"(?:[^"]|"")*"/g).map(x=>x.slice(1,-1));
 const values=lines[1].match(/"(?:[^"]|"")*"/g).map(x=>x.slice(1,-1).replaceAll('""','"'));
 values[columns.indexOf("storeId")]="WRONG-STORE";
 lines[1]=values.map(x=>'"'+x.replaceAll('"','""')+'"').join(",");
 writeFileSync(path,lines.join("\n")+"\n");
 let mismatchFailed=false;
 try{execFileSync(process.execPath,["scripts/run-lidl-pilot-intake.mjs",path,"TEST-STORE","2026-10-04T12:00:00Z"],{encoding:"utf8",stdio:"pipe"});}
 catch(error){mismatchFailed=error.status===1&&String(error.stderr).includes("CSV storeId mismatch: selected TEST-STORE; found WRONG-STORE");}
 assert.equal(mismatchFailed,true);
 console.log("PASS: local pilot CLI validates 25 rows, hides receipt details/prices, and fails closed on store mismatch");
}finally{rmSync(dir,{recursive:true,force:true});}

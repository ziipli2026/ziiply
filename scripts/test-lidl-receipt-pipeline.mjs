import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

const dir=mkdtempSync(join(tmpdir(),"lidl-receipt-pipeline-"));
try{
 const json=join(dir,"receipt.json");
 const output=execFileSync(process.execPath,["scripts/generate-lidl-price-pilot-template.mjs","", "FI0218","Lidl Hyvinkää","Kankurinkatu 4"],{encoding:"utf8"});
 const id=output.split("\n")[1].match(/^"(\d+)"/)[1];
 writeFileSync(json,JSON.stringify([{lidlProductId:id,receiptUnitPriceEur:"1.29",receiptTimestamp:"2026-10-05T10:00:00+03:00",receiptEvidenceReference:"local-only",permissionToUseEvidence:true}]));
 const result=JSON.parse(execFileSync(process.execPath,["scripts/run-lidl-receipt-pilot.mjs",json,"FI0218","Lidl Hyvinkää","Kankurinkatu 4","2026-10-05T10:30:00+03:00"],{encoding:"utf8"}));
 assert.equal(result.status,"research-only-not-published");
 assert.equal(result.publishablePriceCount,0);
 assert.equal(result.structurallyAcceptedCandidateCount,1);
 assert.equal(JSON.stringify(result).includes("1.29"),false);
 assert.equal(JSON.stringify(result).includes("local-only"),false);
 console.log("PASS: one-command receipt pipeline remains research-only and emits sanitized intake output");
}finally{rmSync(dir,{recursive:true,force:true});}

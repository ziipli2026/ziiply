import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";

const dir=mkdtempSync(join(tmpdir(),"lidl-batch-"));
try{
 const obs=join(dir,"obs.json");
 const batch=join(dir,"batch.json");
 const template=join(dir,"template.csv");
 execFileSync(process.execPath,["scripts/generate-lidl-price-pilot-template.mjs",template,"FI0218","Lidl Hyvinkää","Kankurinkatu 4"],{encoding:"utf8"});
 const firstDataLine=readFileSync(template,"utf8").trim().split("\n")[1];
 const id=firstDataLine.slice(1,firstDataLine.indexOf("\"",1));
 writeFileSync(obs,JSON.stringify([{lidlProductId:id,priceBasis:"unit",receiptUnitPriceEur:1.29,receiptTimestamp:"2026-10-05T10:00:00+03:00",receiptEvidenceReference:"secret-evidence",isLidlPlus:false,isPromotion:false,isMultiBuy:false,permissionToUseEvidence:true}]));
 writeFileSync(batch,JSON.stringify([{observationsPath:obs,storeId:"FI0218",storeName:"Lidl Hyvinkää",storeAddress:"Kankurinkatu 4",observationTime:"2026-10-05T10:30:00+03:00"}]));
 const out=JSON.parse(execFileSync(process.execPath,["scripts/run-lidl-receipt-batch.mjs",batch],{encoding:"utf8"}));
 assert.equal(out.status,"research-only-not-published");
 assert.equal(out.batchCount,1);
 assert.equal(out.publishablePriceCount,0);
 assert.equal(JSON.stringify(out).includes("1.29"),false);
 assert.equal(JSON.stringify(out).includes("secret-evidence"),false);
 console.log("PASS: receipt batch remains research-only and sanitized");
}finally{rmSync(dir,{recursive:true,force:true});}

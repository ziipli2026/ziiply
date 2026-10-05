import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";

const [batchPath]=process.argv.slice(2);
if(!batchPath){console.error("Usage: node scripts/run-lidl-receipt-pilot-batch.mjs <batch.json>");process.exitCode=2;}
else try{
 const batch=JSON.parse(readFileSync(batchPath,"utf8"));
 if(!Array.isArray(batch)||!batch.length)throw new Error("Batch must be a non-empty JSON array");
 const run=cmd=>JSON.parse(execFileSync(process.execPath,cmd,{encoding:"utf8"}));
 const intake=run(["scripts/run-lidl-receipt-batch.mjs",batchPath]);
 const quality=run(["scripts/analyze-lidl-receipt-batch.mjs",batchPath]);
 if(intake.status!=="research-only-not-published"||quality.status!=="research-only-not-published")throw new Error("Unexpected non-research-only status");
 const combined={
  status:"research-only-not-published",
  batchCount:intake.batchCount,
  intake:{
   inputCount:intake.inputCount,
   structurallyAcceptedCandidateCount:intake.structurallyAcceptedCandidateCount,
   rejectedObservationCount:intake.rejectedObservationCount,
   rejectionReasons:intake.rejectionReasons
  },
  quality:{
   totalObservationCount:quality.totalObservationCount,
   knownCatalogObservationCount:quality.knownCatalogObservationCount,
   categoryCounts:quality.categoryCounts,
   qualityFlags:quality.qualityFlags
  },
  safety:{
   publishablePriceCount:0,
   containsReceiptPrices:false,
   containsReceiptEvidence:false
  }
 };
 process.stdout.write(JSON.stringify(combined,null,2)+"\n");
}catch(error){console.error("Lidl receipt pilot batch failed:",error?.stderr?.toString?.().trim()||error.message);process.exitCode=1;}

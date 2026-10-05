import {readFileSync} from "node:fs";

const [inputPath]=process.argv.slice(2);
if(!inputPath){
 console.error("Usage: node scripts/report-lidl-receipt-pilot.mjs <intake-result.json>");
 process.exitCode=2;
}else try{
 const result=JSON.parse(readFileSync(inputPath,"utf8"));
 const rejectionReasons=result.rejectionReasons && typeof result.rejectionReasons==="object" ? result.rejectionReasons : {};
 const accepted=Number(result.structurallyAcceptedCandidateCount||0);
 const rejected=Number(result.rejectedObservationCount||0);
 const total=Number(result.inputCount||accepted+rejected);
 const report={
  status:result.status,
  storeId:result.storeId,
  inputCount:total,
  structurallyAcceptedCandidateCount:accepted,
  rejectedObservationCount:rejected,
  publishablePriceCount:Number(result.publishablePriceCount||0),
  rejectionReasons:Object.fromEntries(Object.entries(rejectionReasons).sort(([a],[b])=>a.localeCompare(b))),
  safety:{
   researchOnly:result.status==="research-only-not-published",
   publishablePriceCountIsZero:Number(result.publishablePriceCount||0)===0,
   containsReceiptEvidence:false,
   containsReceiptPrices:false
  }
 };
 process.stdout.write(JSON.stringify(report,null,2)+"\n");
}catch(error){
 console.error("Lidl receipt pilot report failed:",error.message);
 process.exitCode=1;
}

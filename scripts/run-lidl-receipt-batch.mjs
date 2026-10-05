import {execFileSync} from "node:child_process";
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from "node:fs";
import {join} from "node:path";

const [batchPath]=process.argv.slice(2);
if(!batchPath){
 console.error("Usage: node scripts/run-lidl-receipt-batch.mjs <batch.json>");
 process.exitCode=2;
}else try{
 const input=JSON.parse(readFileSync(batchPath,"utf8"));
 if(!Array.isArray(input)||!input.length) throw new Error("Batch must be a non-empty JSON array");
 const dir=mkdtempSync(join(process.cwd(),".lidl-receipt-batch-"));
 const results=[];
 try{
  input.forEach((job,index)=>{
   if(!job||typeof job!=="object"||Array.isArray(job)) throw new Error("Invalid batch item "+index);
   const {observationsPath,storeId,storeName,storeAddress,observationTime}=job;
   if(!observationsPath||!storeId||!storeName||!storeAddress) throw new Error("Missing batch metadata at index "+index);
   const args=["scripts/run-lidl-receipt-pilot.mjs",observationsPath,storeId,storeName,storeAddress];
   if(observationTime) args.push(observationTime);
   const raw=execFileSync(process.execPath,args,{encoding:"utf8"});
   results.push(JSON.parse(raw));
  });
 } finally { rmSync(dir,{recursive:true,force:true}); }
 const summary={
  status:results.every(x=>x.status==="research-only-not-published")?"research-only-not-published":"unexpected-status",
  batchCount:results.length,
  inputCount:results.reduce((n,x)=>n+Number(x.inputCount||0),0),
  structurallyAcceptedCandidateCount:results.reduce((n,x)=>n+Number(x.structurallyAcceptedCandidateCount||0),0),
  rejectedObservationCount:results.reduce((n,x)=>n+Number(x.rejectedObservationCount||0),0),
  publishablePriceCount:0,
  rejectionReasons:{}
 };
 for(const x of results) for(const [reason,count] of Object.entries(x.rejectionReasons||{}))
  summary.rejectionReasons[reason]=(summary.rejectionReasons[reason]||0)+Number(count||0);
 summary.rejectionReasons=Object.fromEntries(Object.entries(summary.rejectionReasons).sort(([a],[b])=>a.localeCompare(b)));
 process.stdout.write(JSON.stringify(summary,null,2)+"\n");
}catch(error){
 console.error("Lidl receipt batch failed:",error?.stderr?.toString?.().trim()||error.message);
 process.exitCode=1;
}

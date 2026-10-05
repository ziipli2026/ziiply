import {readFileSync} from "node:fs";
import catalog from "../data/lidl/official-grocery-candidates-v44-2026-10-01.json" with {type:"json"};

const [batchPath]=process.argv.slice(2);
if(!batchPath){console.error("Usage: node scripts/analyze-lidl-receipt-batch.mjs <batch.json>");process.exitCode=2;}
else try{
 const batch=JSON.parse(readFileSync(batchPath,"utf8"));
 if(!Array.isArray(batch)||!batch.length)throw new Error("Batch must be a non-empty JSON array");
 const byId=new Map(catalog.records.map(x=>[String(x.lidlProductId),x]));
 const quarantined=new Set(catalog.quarantinedProductIds.map(String));
 const categories={};
 const flags={unknownProduct:0,quarantinedProduct:0,missingObservationCode:0,unverifiedObservedCode:0,verifiedObservedCode:0,nonUnitPriceBasis:0,promotion:0,multiBuy:0,lidlPlus:0,permissionMissing:0};
 let total=0,known=0;
 for(const job of batch){
  if(!job||typeof job!=="object"||Array.isArray(job))throw new Error("Invalid batch item");
  if(!job.observationsPath)throw new Error("Missing observationsPath");
  const observations=JSON.parse(readFileSync(job.observationsPath,"utf8"));
  if(!Array.isArray(observations))throw new Error("Receipt observations must be an array");
  for(const o of observations){
   if(!o||typeof o!=="object"||Array.isArray(o))throw new Error("Invalid observation");
   const id=String(o.lidlProductId??""); total++;
   const item=byId.get(id);
   if(!item){flags.unknownProduct++;continue;}
   known++;
   if(quarantined.has(id)){flags.quarantinedProduct++;continue;}
   const category=item.researchCategory||"uncategorized";
   categories[category]=(categories[category]||0)+1;
   if(!String(o.observedCode??"").trim())flags.missingObservationCode++;
   else if(o.scannedEanVerified===true||o.scannedEanVerified==="true")flags.verifiedObservedCode++;
   else flags.unverifiedObservedCode++;
   if(String(o.priceBasis??"").trim() && o.priceBasis!=="unit")flags.nonUnitPriceBasis++;
   if(o.isPromotion===true||o.isPromotion==="true")flags.promotion++;
   if(o.isMultiBuy===true||o.isMultiBuy==="true")flags.multiBuy++;
   if(o.isLidlPlus===true||o.isLidlPlus==="true")flags.lidlPlus++;
   if(!(o.permissionToUseEvidence===true||o.permissionToUseEvidence==="true"))flags.permissionMissing++;
  }
 }
 const categoryRows=Object.entries(categories).sort((a,b)=>b[1]-a[1]).map(([category,count])=>({category,count}));
 const report={
  status:"research-only-not-published",
  batchCount:batch.length,totalObservationCount:total,knownCatalogObservationCount:known,
  categoryCounts:categoryRows,
  qualityFlags:flags,
  safety:{publishablePriceCount:0,containsReceiptPrices:false,containsReceiptEvidence:false}
 };
 process.stdout.write(JSON.stringify(report,null,2)+"\n");
}catch(error){console.error("Lidl receipt quality analysis failed:",error.message);process.exitCode=1;}

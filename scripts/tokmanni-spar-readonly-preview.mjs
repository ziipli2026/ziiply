#!/usr/bin/env node
// Read-only preview of a future classification index. Never modifies Neon or runtime routes.
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
const data=JSON.parse(readFileSync("tokmanni-spar-merged-classification.json","utf8"));
const triage=JSON.parse(readFileSync("tokmanni-spar-muut-triage.json","utf8"));
const byEan=new Map();
for(const item of data.items){
 const ean=String(item.ean||"");
 assert.match(ean,/^[0-9]{8,14}$/);
 assert(!byEan.has(ean),`Duplicate EAN ${ean}`);
 const existingApproved=item.classificationEvidence==="existing Ziiply category"&&item.productClass==="daily";
 byEan.set(ean,{ean,name:item.name||"",source:item.source||"",providerCategory:item.providerCategory||"",existingCategory:item.existingCategory||"",proposedCategory:item.suggestedCategory||"",auditClass:item.productClass,previewStatus:existingApproved?"existing_category_candidate":"review_required",grocerySearchEnabled:false,barcodeRecognized:true});
}
const summary={total:byEan.size,existingCategoryCandidates:0,reviewRequired:0,grocerySearchEnabled:0,barcodeRecognized:0,triageProposals:triage.summary.proposals,triageDepartmentStore:triage.summary.departmentStore,triageUnresolved:triage.summary.unresolved,neonWrites:0};
for(const x of byEan.values()){if(x.previewStatus==="existing_category_candidate")summary.existingCategoryCandidates++;else summary.reviewRequired++;if(x.grocerySearchEnabled)summary.grocerySearchEnabled++;if(x.barcodeRecognized)summary.barcodeRecognized++;}
assert.equal(summary.total,data.summary.uniqueEans);
assert.equal(summary.grocerySearchEnabled,0);
assert.equal(summary.neonWrites,0);
writeFileSync("tokmanni-spar-readonly-preview.json",JSON.stringify({summary,notice:"Audit simulation only. Existing category is a candidate, not independently approved. No production filter or DB writes.",items:[...byEan.values()]},null,2));
console.log(JSON.stringify(summary));

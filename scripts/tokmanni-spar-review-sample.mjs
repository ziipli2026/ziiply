#!/usr/bin/env node
// Deterministic human-review sample; never approves classifications.
import {readFileSync,writeFileSync} from "node:fs";
const merged=JSON.parse(readFileSync("tokmanni-spar-merged-classification.json","utf8"));
const triage=JSON.parse(readFileSync("tokmanni-spar-muut-triage.json","utf8"));
const preview=JSON.parse(readFileSync("tokmanni-spar-readonly-preview.json","utf8"));
const index=new Map(merged.items.map(x=>[x.ean,x]));
const groups=[
 ["existing_category_candidate",preview.items.filter(x=>x.previewStatus==="existing_category_candidate")],
 ["daily_review",preview.items.filter(x=>x.auditClass==="daily"&&x.previewStatus==="review_required")],
 ["department_store_review",preview.items.filter(x=>x.auditClass==="department_store")],
 ["general_review",preview.items.filter(x=>x.auditClass==="review")],
 ["muut_grocery_proposal",triage.proposals],
 ["muut_department_proposal",triage.departmentStore],
 ["muut_unresolved",triage.unresolved]
];
const rows=[];
for(const [group,items] of groups){
 const sorted=[...items].sort((a,b)=>String(a.ean).localeCompare(String(b.ean)));
 const selected=sorted.length<=20?sorted:Array.from({length:20},(_,i)=>sorted[Math.floor(i*(sorted.length-1)/19)]);
 for(const item of selected){
  const original=index.get(item.ean)||{};
  rows.push({group,ean:item.ean,name:item.name||original.name||"",existingCategory:original.existingCategory||"",providerCategory:original.providerCategory||"",suggestedCategory:item.proposedCategory||original.suggestedCategory||"",auditClass:original.productClass||"",manualDecision:"",reviewNotes:""});
 }
}
const cols=["group","ean","name","existingCategory","providerCategory","suggestedCategory","auditClass","manualDecision","reviewNotes"];
const csv=v=>'"'+String(v??"").replaceAll('"','""')+'"';
writeFileSync("tokmanni-spar-manual-review-sample.csv",[cols.join(","),...rows.map(x=>cols.map(c=>csv(x[c])).join(","))].join("\n")+"\n");
console.log(JSON.stringify({sampleRows:rows.length,groups:groups.map(([name,items])=>({name,total:items.length,sampled:Math.min(items.length,20)})),neonWrites:0,autoApproved:0}));

#!/usr/bin/env node
// Read-only export: approved EAN classifications for the SPAR Justiina search.
// Requires an explicit reviewed approval list; proposed classes never become approved automatically.
import {readFileSync,writeFileSync} from "node:fs";
const merged=JSON.parse(readFileSync(process.argv[2]||"tokmanni-spar-merged-classification.json","utf8")).items;
const approvals=JSON.parse(readFileSync(process.argv[3]||"tokmanni-spar-reviewed-approvals.json","utf8"));
if(!Array.isArray(approvals.items))throw Error("Expected reviewed approvals.items array");
const source=new Map(merged.map(x=>[String(x.ean),x]));
const allowed=new Set(["daily","department_store"]);
const output=new Map();
for(const row of approvals.items){
 const ean=String(row.ean??"");
 const original=source.get(ean);
 if(!/^[0-9]{8,14}$/.test(ean)||!original)throw Error("Invalid approval EAN or missing from merged audit: "+ean);
 if(row.classificationStatus!=="approved"||!allowed.has(row.productClass))throw Error("Unapproved or invalid class: "+ean);
 if(row.productClass==="daily"&&!String(row.ziiplyCategory||"").trim())throw Error("Daily EAN needs Ziiply category: "+ean);
 if(output.has(ean))throw Error("Duplicate approval: "+ean);
 output.set(ean,{ean,productClass:row.productClass,ziiplyCategory:row.productClass==="daily"?row.ziiplyCategory:"",classificationStatus:"approved",classificationEvidence:String(row.classificationEvidence||"reviewed approval")});
}
const items=[...output.values()].sort((a,b)=>a.ean.localeCompare(b.ean));
writeFileSync(process.argv[4]||"tokmanni-spar-approved-index.json",JSON.stringify({schemaVersion:1,source:"reviewed-approvals",neonWrites:0,items},null,2));
console.log(JSON.stringify({approved:items.length,daily:items.filter(x=>x.productClass==="daily").length,department_store:items.filter(x=>x.productClass==="department_store").length,neonWrites:0}));

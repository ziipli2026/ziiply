#!/usr/bin/env node
// Deterministic read-only normalized index; proposals are NEVER approved automatically.
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
const input=JSON.parse(readFileSync(process.argv[2]||"tokmanni-spar-merged-classification.json","utf8"));
const valid=new Set(["daily","department_store","review"]);
const items=input.items.map(row=>{
 const ean=String(row.ean??"").trim();
 assert.match(ean,/^[0-9]{8,14}$/,"invalid EAN");
 assert(valid.has(row.productClass),"invalid class "+ean);
 const ziiplyCategory=row.productClass==="daily"?String(row.suggestedCategory||"").trim():"";
 // Historical category or provider suggestion is evidence, not an approval decision.
 return {ean,name:String(row.name||""),brand:String(row.brand||""),providerCategory:String(row.providerCategory||""),existingCategory:String(row.existingCategory||""),productClass:row.productClass,ziiplyCategory,classificationStatus:"proposed",classificationEvidence:String(row.classificationEvidence||""),grocerySearchDecision:row.productClass==="department_store"?"exclude_candidate":row.productClass==="daily"?"include_candidate":"review_required"};
}).sort((a,b)=>a.ean.localeCompare(b.ean));
assert.equal(new Set(items.map(x=>x.ean)).size,items.length,"duplicate EAN");
assert.equal(items.length,input.summary.uniqueEans,"EAN conservation");
const counts=Object.fromEntries(["daily","department_store","review"].map(c=>[c,items.filter(x=>x.productClass===c).length]));
assert.deepEqual(counts,Object.fromEntries(["daily","department_store","review"].map(c=>[c,input.summary[c]])),"class conservation");
const output={schemaVersion:1,classificationStatus:"proposed",neonWrites:0,autoApproved:0,summary:{uniqueEans:items.length,...counts},items};
writeFileSync("tokmanni-spar-normalized-ean-preview.json",JSON.stringify(output,null,2));
console.log(JSON.stringify(output.summary));

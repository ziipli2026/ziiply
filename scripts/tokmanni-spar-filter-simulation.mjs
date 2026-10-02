#!/usr/bin/env node
// Simulate a future search visibility policy against audit artifacts. No live API or DB calls.
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
const merged=JSON.parse(readFileSync("tokmanni-spar-merged-classification.json","utf8"));
const index=new Map(merged.items.map(x=>[String(x.ean),x]));
const policy=(ean,mode="observe")=>{
 const x=index.get(String(ean));
 if(!x)return {visible:true,reason:"unknown_preserved",scanner:true};
 if(mode==="observe")return {visible:true,reason:"shadow_only",scanner:true};
 // Proposed strict mode: historical verified daily status must be reviewed separately.
 if(x.productClass==="department_store")return {visible:false,reason:"department_store",scanner:true};
 if(x.productClass==="review")return {visible:true,reason:"review_preserved",scanner:true};
 return {visible:true,reason:"daily_candidate",scanner:true};
};
const counts={total:index.size,daily:0,department_store:0,review:0,shadowHidden:0,strictHidden:0,scannerLost:0,unknownPreserved:false,neonWrites:0};
for(const x of index.values()){
 counts[x.productClass]++;
 const shadow=policy(x.ean),strict=policy(x.ean,"strict");
 if(!shadow.visible)counts.shadowHidden++;
 if(!strict.visible)counts.strictHidden++;
 if(!strict.scanner)counts.scannerLost++;
}
const unknown=policy("9999999999999","strict");counts.unknownPreserved=unknown.visible&&unknown.scanner;
assert.equal(counts.total,merged.summary.uniqueEans);
assert.equal(counts.shadowHidden,0);assert.equal(counts.strictHidden,counts.department_store);
assert.equal(counts.scannerLost,0);assert(counts.unknownPreserved);
const fixtures=[
 ["known daily",merged.items.find(x=>x.productClass==="daily")?.ean,true],
 ["known department store",merged.items.find(x=>x.productClass==="department_store")?.ean,false],
 ["review",merged.items.find(x=>x.productClass==="review")?.ean,true],
 ["new unknown","9999999999999",true]
];
for(const [name,ean,expected] of fixtures){assert(ean,`Missing fixture: ${name}`);assert.equal(policy(ean,"strict").visible,expected,name);}
writeFileSync("tokmanni-spar-filter-simulation.json",JSON.stringify({counts,fixtures:fixtures.map(([name,ean])=>({name,ean,shadow:policy(ean),proposedStrict:policy(ean,"strict")})),notice:"Offline audit simulation, not active filtering. Unknown/review retained pending business approval."},null,2));
console.log(JSON.stringify(counts));

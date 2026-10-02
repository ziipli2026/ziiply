#!/usr/bin/env node
// Compare representative name searches against the audit snapshot, offline only.
import {readFileSync,writeFileSync} from "node:fs";
const data=JSON.parse(readFileSync("tokmanni-spar-merged-classification.json","utf8"));
const terms=["maito","kahvi","kissa","pesuaine","mehu","lamppu","matto","sokeroimaton","lannoite","suklaa"];
const report=terms.map(term=>{
 const hits=data.items.filter(x=>String(x.name||"").toLocaleLowerCase("fi-FI").includes(term));
 const excluded=hits.filter(x=>x.productClass==="department_store");
 return {term,matched:hits.length,shadowVisible:hits.length,proposedVisible:hits.length-excluded.length,proposedExcluded:excluded.length,excludedExamples:excluded.slice(0,8).map(x=>({ean:x.ean,name:x.name,providerCategory:x.providerCategory||x.category||""}))};
});
writeFileSync("tokmanni-spar-search-diff-preview.json",JSON.stringify({source:"offline merged EAN audit snapshot; NOT live Klevu result ranking",terms:report,neonWrites:0},null,2));
console.log(JSON.stringify(report.map(({term,matched,proposedExcluded})=>({term,matched,proposedExcluded}))));

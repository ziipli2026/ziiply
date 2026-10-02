#!/usr/bin/env node
// Audit-only regression checks: no API calls, database writes or deployment.
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
const merged=JSON.parse(readFileSync("tokmanni-spar-merged-classification.json","utf8"));
const triage=JSON.parse(readFileSync("tokmanni-spar-muut-triage.json","utf8"));
const quality=JSON.parse(readFileSync("tokmanni-spar-quality-gate.json","utf8"));
const route=readFileSync("src/app/api/tokmanni/products/route.ts","utf8");
const checks=[];
function check(label,fn){try{fn();checks.push({label,ok:true});}catch(e){checks.push({label,ok:false,error:String(e)});}}
check("merged EAN uniqueness",()=>assert.equal(new Set(merged.items.map(x=>x.ean)).size,merged.items.length));
check("class count conservation",()=>assert.equal(merged.summary.daily+merged.summary.department_store+merged.summary.review,merged.summary.uniqueEans));
check("all records have explicit class",()=>assert(merged.items.every(x=>["daily","department_store","review"].includes(x.productClass))));
check("review is not automatically approved",()=>assert.equal(triage.summary.autoApproved,0));
check("audit does not write Neon",()=>{assert.equal(merged.summary.neonWrites,0);assert.equal(triage.summary.neonWrites,0);});
check("quality gate passed",()=>assert.equal(quality.ok,true));
check("normal-price preference retained",()=>{assert.match(route,/oldPrice > salePrice/);assert.match(route,/normalMarker/);});
check("Klevu and HTML fallback retained",()=>{assert.match(route,/fetchKlevuProducts\(search\)/);assert.match(route,/fetchHtmlFallbackProducts\(search\)/);});
check("EAN observation retained",()=>assert.match(route,/observeEanProductsBestEffort/));
check("no production classification wired by audit",()=>assert.doesNotMatch(route,/tokmanni-spar-merged-classification|tokmanni-spar-muut-triage/));
const report={ok:checks.every(x=>x.ok),checks,scope:"audit-only static and artifact regressions; not a live mobile test",neonWrites:0};
writeFileSync("tokmanni-spar-regression-report.json",JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
if(!report.ok)process.exitCode=1;

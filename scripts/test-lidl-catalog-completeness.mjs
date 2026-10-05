import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
const r=JSON.parse(execFileSync(process.execPath,["scripts/audit-lidl-catalog-completeness.mjs"],{encoding:"utf8"}));
assert.deepEqual(r,{total:226,hasLidlProductId:226,hasIan:226,hasName:226,hasVariant:11,hasPublicPrice:110,hasUnitPriceText:27,hasEan:0,hasCanonicalPath:105,hasCategoryReview:101,hasResearchCategory:101,hasPricingUnit:101});
console.log("PASS: Lidl catalog completeness baseline is explicit");

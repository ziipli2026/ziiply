#!/usr/bin/env node
import assert from "node:assert/strict";
import {writeFileSync,unlinkSync} from "node:fs";
import {execFileSync} from "node:child_process";
const p="/tmp/lidl-reclass-test.json";
writeFileSync(p,JSON.stringify({records:[
 {lidlProductId:"1",priceKind:"offer",priceClassificationReason:"dated-window",productMatchConfidence:"exact-name",displayedPriceEur:2,observedAt:"2026-10-06"},
 {lidlProductId:"2",priceKind:"regular",priceClassificationReason:"no-promotion-marker",productMatchConfidence:"official-category-api",displayedPriceEur:3,observedAt:"2026-10-06"},
 {lidlProductId:"3",priceKind:"lidl_plus",priceClassificationReason:"lidl-plus",productMatchConfidence:"ambiguous-name",displayedPriceEur:4,observedAt:"2026-10-06"}
]}));
const out=JSON.parse(execFileSync(process.execPath,["scripts/build-lidl-price-reclassification-plan.mjs",p],{encoding:"utf8"}));
unlinkSync(p);
assert.equal(out.count,1);
assert.equal(out.changes[0].lidlProductId,"1");
assert.equal(out.changes[0].priceKind,"offer");
console.log(JSON.stringify({suite:"Lidl reclassification planner",passed:3,failed:0}));

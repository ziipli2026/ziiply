#!/usr/bin/env node
import assert from "node:assert/strict";
import {writeFileSync,unlinkSync} from "node:fs";
import {execFileSync} from "node:child_process";
const c="/tmp/lidl-ean-plan-c.json",l="/tmp/lidl-ean-plan-l.json";
writeFileSync(l,JSON.stringify([{lidlProductId:"100",ean:"6412345678901"}]));
writeFileSync(c,JSON.stringify({records:[
 {lidlProductId:"100",displayedPriceEur:1.99,priceKind:"regular",temporalStatus:"continuous",observedAt:"2026-10-06T08:00:00Z",freshUntil:"2026-10-13T08:00:00Z"},
 {lidlProductId:"999",displayedPriceEur:2.99,priceKind:"regular",temporalStatus:"continuous",observedAt:"2026-10-06T08:00:00Z",freshUntil:"2026-10-13T08:00:00Z"},
 {lidlProductId:"100",displayedPriceEur:0.99,priceKind:"offer",temporalStatus:"future",observedAt:"2026-10-06T08:00:00Z",freshUntil:"2026-10-11T23:59:59Z"}
]}));
const out=JSON.parse(execFileSync(process.execPath,["scripts/build-lidl-ean-price-plan.mjs",c,l],{encoding:"utf8"}));
unlinkSync(c);unlinkSync(l);
assert.equal(out.count,1);
assert.equal(out.rows[0].ean,"6412345678901");
assert.equal(out.rows[0].priceKind,"regular");
console.log(JSON.stringify({suite:"Lidl exact EAN price plan",passed:3,failed:0}));

import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
const result=JSON.parse(execFileSync(process.execPath,["scripts/audit-lidl-ean-price-coverage.mjs"],{encoding:"utf8"}));
assert.equal(result.pricedCount,110);
assert.equal(result.withEanCount,0);
assert.equal(result.withoutEanCount,110);
assert.equal(result.verifiedComparableCount,0);
console.log("PASS: Lidl public prices have no verified EAN linkage yet");

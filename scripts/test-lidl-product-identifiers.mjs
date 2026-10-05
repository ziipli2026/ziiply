import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
const result=JSON.parse(execFileSync(process.execPath,["scripts/audit-lidl-product-identifiers.mjs"],{encoding:"utf8"}));
assert.equal(result.total,226);
assert.equal(result.withLidlProductId,226);
assert.equal(result.withEan,0);
assert.equal(result.withBrand,0);
assert.equal(result.eanReadyForMatching,0);
console.log("PASS: Lidl catalog uses Lidl product IDs only; no EAN/brand inference");

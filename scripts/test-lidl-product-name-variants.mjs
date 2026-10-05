import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
const result=JSON.parse(execFileSync(process.execPath,["scripts/audit-lidl-product-name-variants.mjs"],{encoding:"utf8"}));
assert.equal(result.total,226);
assert.ok(result.duplicateNameGroups>0);
assert.ok(result.explicitPackSignals>0);
assert.ok(result.multiUnitSignals>0);
console.log("PASS: Lidl product name variants are audited before enrichment");

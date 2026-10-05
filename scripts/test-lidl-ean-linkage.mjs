import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
const result=JSON.parse(execFileSync(process.execPath,["scripts/audit-lidl-ean-linkage.mjs"],{encoding:"utf8"}));
assert.equal(result.verifiedEvidenceEanCount,4);
assert.equal(result.exactUnambiguousMatches,0);
assert.equal(result.importableMatches,0);
console.log("PASS: no historical Lidl IAN/EAN evidence is imported without a current packaging match");

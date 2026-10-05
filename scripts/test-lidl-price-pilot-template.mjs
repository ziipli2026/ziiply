import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const csv=execFileSync(process.execPath,["scripts/generate-lidl-price-pilot-template.mjs"],{encoding:"utf8"});
const lines=csv.trimEnd().split("\n");
assert.equal(lines.length,26);
const headers=lines[0].split(",");
for (const field of ["lidlProductId","observedCode","observedCodeOrigin","scannedEanVerified","receiptUnitPriceEur","receiptEvidenceReference","permissionToUseEvidence"]) assert.ok(headers.includes('"'+field+'"'));
for (const line of lines.slice(1)) {
 const fields=line.match(/"(?:[^"]|"")*"/g);
 assert.equal(fields.length,22);
 assert.match(fields[0],/^"\d+"$/);
 for (let i=3;i<fields.length;i++) assert.equal(fields[i],'""');
}
console.log("PASS: 25 real catalog candidates, all observation, barcode provenance, price and EAN cells blank");

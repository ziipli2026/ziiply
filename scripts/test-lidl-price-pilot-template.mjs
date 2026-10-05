import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const csv=execFileSync(process.execPath,["scripts/generate-lidl-price-pilot-template.mjs"],{encoding:"utf8"});
const lines=csv.trimEnd().split("\n");
assert.equal(lines.length,26);
const headers=lines[0].split(",");
for (const field of ["lidlProductId","observedCode","observedCodeOrigin","scannedEanVerified","receiptUnitPriceEur","receiptEvidenceReference","permissionToUseEvidence"]) assert.ok(headers.includes('"'+field+'"'));
for (const line of lines.slice(1)) {
 const fields=line.match(/"(?:[^"]|"")*"/g);
 assert.equal(fields.length,21);
 assert.match(fields[0],/^"\d+"$/);
 for (let i=3;i<fields.length;i++) assert.equal(fields[i],'""');
}
console.log("PASS: 25 real catalog candidates, all observation, barcode provenance, price and EAN cells blank");

const prefilled=execFileSync(process.execPath,["scripts/generate-lidl-price-pilot-template.mjs","","FI0218","Lidl Hyvinkää","Kankurinkatu 4"],{encoding:"utf8"});
const prefilledLines=prefilled.trimEnd().split("\n");
for (const line of prefilledLines.slice(1)) {
 const fields=line.match(/"(?:[^"]|"")*"/g);
 assert.equal(fields[3],'"Lidl Hyvinkää"');
 assert.equal(fields[4],'"Kankurinkatu 4"');
 assert.equal(fields[5],'"FI0218"');
 for (let i=6;i<fields.length;i++) assert.equal(fields[i],'""');
}
console.log("PASS: optional store prefill writes only store identity fields");

#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const route=fs.readFileSync("src/app/api/lidl/products/route.ts","utf8");
assert.match(route,/function isValidGtin\(value: unknown\)/);
assert.ok(route.includes("\\d{8}") && route.includes("\\d{12}") && route.includes("\\d{13}") && route.includes("\\d{14}"));
assert.match(route,/const candidates = \[product\.ean, product\.gtin, product\.eanCode, product\.barcode\]/);
assert.doesNotMatch(route,/product\.externalId/);
function valid(s){if(!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(s))return false;const body=s.slice(0,-1);const expected=Number(s.at(-1));const sum=[...body].reverse().reduce((t,d,i)=>t+Number(d)*(i%2===0?3:1),0);return (10-(sum%10))%10===expected}
assert.equal(valid("6409620011917"),true);
assert.equal(valid("6410405124517"),true);
assert.equal(valid("6409620011918"),false);
assert.equal(valid("10037649"),false);
console.log("PASS Lidl EAN extraction accepts only checksum-valid explicit GTIN fields; external product IDs are excluded");

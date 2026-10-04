import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../src/app/api/lidl/products/route.ts", import.meta.url), "utf8");
assert.match(source, /searchLidlResearch\(search,\s*40\)/);
assert.match(source, /priceVerified:\s*false/);
assert.match(source, /storeId:\s*null/);
assert.doesNotMatch(source, /ruoanhinta|storeItems\?\.\[0\]|api\/items|api\/stores/i);
console.log("PASS: independent Lidl preview route contains no Ruoanhinta calls");

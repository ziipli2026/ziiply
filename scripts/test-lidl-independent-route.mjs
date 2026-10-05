import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../src/app/api/lidl/products/route.ts", import.meta.url), "utf8");
const researchSource = readFileSync(new URL("../src/lib/lidlResearchSearch.ts", import.meta.url), "utf8");
assert.match(source, /searchLidlResearch\(search,\s*40,\s*storeId\)/);
assert.match(source, /priceVerified:\s*items\.some\(item => item\.priceVerified === true\)/);
assert.doesNotMatch(source, /getVerifiedLidlStorePrice/);
assert.match(source, /storeId:\s*storeId \|\| null/);
assert.doesNotMatch(source, /ruoanhinta|storeItems\?\.\[0\]|api\/items|api\/stores/i);
assert.match(researchSource, /observedPriceSource:.*lidl-fi-public-observation/);
assert.match(researchSource, /observedPriceComparable:false/);

console.log("PASS: independent Lidl preview route uses only research catalog plus verified store-price adapter");

#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync("src/app/api/tokmanni/products/route.ts", "utf8");
assert.match(source, /if \(!\/\^\\d\+\(\?:\[\.,\]\\d\{1,2\}\)\?\$\/\.test\(raw\)\) return 0/);
assert.match(source, /const ean = "";/);
assert.doesNotMatch(source, /const ean = clean\(item\?\.sku\)/);
assert.doesNotMatch(source, /const ean = eanFromProductUrl\(productUrl\)/);
assert.match(source, /const discounted = salePrice > 0/);
assert.match(source, /const price = discounted \?/);
assert.match(source, /filterSparHumanFoodIntent\(items, intent\)/);
console.log("Tokmanni/SPAR normal price and unverified EAN safety: PASS");

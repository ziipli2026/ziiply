#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync("src/app/api/tokmanni/products/route.ts", "utf8");
assert(source.includes('if (!/^\\d+(?:[.,]\\d{1,2})?$/.test(raw)) return 0;'));
assert(source.includes('Number.isFinite(price) && price > 0'));
assert(source.includes('const ean = "";'));
assert(!source.includes('const ean = clean(item?.sku)'));
assert(!source.includes('const ean = eanFromProductUrl(productUrl)'));
assert(source.includes('const discounted = salePrice > 0'));
assert(source.includes('? Math.max(oldPrice, basePrice)'));
assert(source.includes('if (salePrice > 0 && !oldPrice && !basePrice && !currentPrice) return null;'));
assert(source.includes('filterSparHumanFoodIntent(items, intent)'));
console.log("Tokmanni/SPAR normal price and unverified EAN safety: PASS");

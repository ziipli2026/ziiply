#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const route=readFileSync("src/app/api/tokmanni/products/route.ts","utf8");
assert.match(route,/import\s*\{\s*filterSparHumanFoodIntent\s*\}\s*from\s*["']@\/lib\/sparGroceryIntent["']/);
assert.match(route,/filterSparMilkQuery\s*\(\s*filterSparHumanFoodIntent\s*\(\s*items\s*,\s*intent\s*\)\s*,\s*intent\s*\)/);
assert.match(route,/filterApprovedSparMilkCategory\s*\(/);
assert.match(route,/filterApprovedSparGroceryItems\s*\(/);
assert.match(route,/applyApprovedSparCategories\s*\(/);
assert.match(route,/const intent = String\(searchParams\.get\("intent"\) \|\| search\)/);
console.log("PASS: production SPAR API wires grocery intent filtering before milk and reviewed-EAN filters");

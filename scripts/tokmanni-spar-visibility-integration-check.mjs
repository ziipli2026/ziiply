#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const helper=readFileSync("src/lib/sparVisibility.ts","utf8");
const route=readFileSync("src/app/api/tokmanni/products/route.ts","utf8");
assert.match(helper,/SPAR_VISIBILITY_ENABLED = false/);
assert.match(helper,/if \(!enabled\) return items/);
assert.match(helper,/!== "department_store"/);
assert.match(route,/applySparVisibility\(items, new Map\(\), SPAR_VISIBILITY_ENABLED\)/);
assert.match(route,/observeEanProductsBestEffort/);
assert(route.indexOf("observeEanProductsBestEffort(")<route.indexOf("const visibleItems = applySparVisibility("));
console.log("SPAR visibility integration static checks passed (feature disabled; no classification data connected)");

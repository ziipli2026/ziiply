import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../src/app/api/lidl/products/route.ts", import.meta.url), "utf8");

const start = page.indexOf("async function fetchLidlProductsV760");
const end = page.indexOf("async function fetchTokmanniProductsV761", start);
assert.ok(start >= 0 && end > start, "Lidl normal-search client function must exist");
const client = page.slice(start, end);

assert.match(client, /storeId:\s*String\(store\.id \|\| store\.externalId \|\| ""\)/);
assert.match(client, /\/api\/lidl\/products\?\$\{params\.toString\(\)\}/);
assert.match(route, /searchParams\.get\("storeId"\)/);
assert.match(route, /searchLidlResearch\(search,\s*40,\s*storeId\)/);
assert.doesNotMatch(client, /lidlStoreKey=/);

console.log("PASS: Justiina forwards selected Lidl storeKey as storeId to verified normal-price search");

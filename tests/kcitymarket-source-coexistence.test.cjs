const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const file = fs.readFileSync(path.join(__dirname,"../src/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider.ts"),"utf8");
test("K-Ruoka and Tjek are additive, not competing fallbacks",()=>{
  assert.match(file,/return \[\.\.\.primary, \.\.\.fallback\]\.map\(normalizeTjekPackagePrice\)/);
  assert.match(file,/String\(row\.storeId \?\? ""\) === "N183"/);
  assert.match(file,/String\(row\.storeId \?\? ""\) === "fe95rtb"/);
});
test("K-Ruoka and Tjek snapshots have distinct store keys",()=>{
  assert.match(file,/readPublishedSnapshot\("k-ruoka k citymarket hyvinkaa"\)/);
  assert.match(file,/readPublishedSnapshot\(key\)/);
});

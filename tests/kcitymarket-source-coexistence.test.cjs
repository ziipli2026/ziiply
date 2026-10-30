const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const file = fs.readFileSync(path.join(__dirname,"../src/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider.ts"),"utf8");
test("K-Ruoka and Tjek are additive, not competing fallbacks",()=>{
  assert.match(file,/const tjekRows = live\.length \? live : fallback/);
  assert.match(file,/return \[\.\.\.primary, \.\.\.tjekRows\]\.map\(normalizeTjekPackagePrice\)/);
  assert.match(file,/String\(row\.storeId \?\? ""\) === "N183"/);
  assert.match(file,/String\(row\.storeId \?\? ""\) === "fe95rtb"/);
});
test("K-Ruoka and Tjek snapshots have distinct store keys",()=>{
  assert.match(file,/readPublishedSnapshot\("k-ruoka k citymarket hyvinkaa"\)/);
  assert.match(file,/const fallbackKey = isHyvinkaa \? "k citymarket hyvinkaa" : key/);
  assert.match(file,/readPublishedSnapshot\(fallbackKey\)/);
});

test("Tjek updater rejects K-Ruoka snapshot key before any refresh",()=>{
  assert.match(file,/if \(key\.startsWith\("k ruoka "\)\) throw new Error\("Tjek refresh cannot write a K-Ruoka snapshot key"\)/);
});

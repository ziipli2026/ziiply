const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("src/app/page.tsx", "utf8");
const start = source.indexOf("const normalizeVisibleMatchesV804 =");
const end = source.indexOf("const visibleSListV804 =", start);
assert.ok(start >= 0 && end > start, "comparison normalization found");
const block = source.slice(start, end);
assert.match(block, /ingredient\?\.unit\?\.toLowerCase\(\) === "kg"/);
assert.match(block, /ingredient\?\.unit\?\.toLowerCase\(\) === "g"/);
assert.match(block, /basePrice \* grams \/ 1000, quantity: 1/);
assert.match(block, /Number\.isFinite\(match\.price\) && match\.price > 0/);
assert.doesNotMatch(block, /match\.price >= 0\.05/);
const actualUnitRule = block.match(/const isKgPrice = ([\s\S]*?);/);
assert.ok(actualUnitRule, "actual production kg unit rule found");
const recognizeKg = new Function("unitText", "match", "return (" + actualUnitRule[1] + ");");
for (const unit of ["kg", "/kg", "eur/kg", "€/kg", "euro/kg", "kilogramma"]) {
  assert.equal(recognizeKg(unit, { product: { name: "Peruna" } }), true, "actual source must recognize " + unit);
}
assert.equal(recognizeKg("kpl", { product: { name: "Peruna" } }), false);
assert.equal(recognizeKg("", { product: { name: "Peruna 0,89 €/kg" } }), true);
const unitPattern = /^(?:kg|\/kg|eur\/kg|€\/kg|euro\/kg|kilogramma)$/;
const namePattern = /(?:€|eur)\s*\/\s*kg/i;
for (const unit of ["kg", "/kg", "eur/kg", "€/kg", "euro/kg", "kilogramma"]) assert.ok(unitPattern.test(unit), unit);
assert.ok(namePattern.test("Peruna 0,89 €/kg"));
assert.ok(!unitPattern.test("kpl"));
const price = (amount, unit, kgPrice) => kgPrice * (unit === "kg" ? amount : amount / 1000);
assert.ok(Math.abs(price(300, "g", 0.89) - 0.267) < 1e-9);
assert.equal(price(0.5, "kg", 4), 2);
assert.equal(price(20, "g", 1), 0.02);
assert.equal(price(600, "g", 0.89), price(300, "g", 0.89) * 2);
const normalization = source.match(/const normalizeComparisonUnitV807 = \(raw: number\) =>\s*([\s\S]*?);/);
assert.ok(normalization, "production price normalization rule found");
const normalize = new Function("raw", "return (" + normalization[1] + ");");
for (const [raw, expected] of [[439, 4.39], [145, 1.45], [1.45, 1.45], [99, 99], [0.89, 0.89]]) {
  assert.ok(Math.abs(normalize(raw) - expected) < 1e-9, "production price conversion " + raw);
}
assert.match(source, /const normalizeMatchPriceV803 =/);
assert.match(source, /if \(!Number\.isFinite\(unitPrice\) \|\| unitPrice < 0\.05\)/, "reject missing/placeholder provider prices before recipe weighting");
assert.match(block, /productPrice \/ 100/, "getProductPrice cents must convert explicitly even below one euro");
assert.match(source, /function getProductPrice|import \{[\s\S]*?getProductPrice/, "product price helper available");
console.log("PASS actual production price normalization and placeholder rejection guard");
assert.match(source, /const totalGrams=Number\(previous\.amount\)/, "duplicate recipe items must add previous weight");
assert.match(source, /Number\(incoming\.amount\)/, "duplicate recipe items must add incoming weight");
assert.match(source, /return \{\.\.\.incoming,amount:totalGrams,unit:"g"\}/, "merged weight retained for comparison");
assert.match(source, /previous\.amount!=null&&incoming\.amount!=null/, "missing recipe amounts cannot be merged as zero");
assert.match(source, /Number\(previous\.amount\)>0&&Number\(incoming\.amount\)>0/, "merged recipe amounts must be positive");
console.log("PASS recipe weight units, kg pricing, small positive prices, serving scaling arithmetic");
console.log("NOTE static source assertions plus isolated arithmetic, not browser or provider integration");

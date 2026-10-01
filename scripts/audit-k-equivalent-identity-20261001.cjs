// Isolated K comparison diagnostic. Uses real compiled ziiplyCore matcher.
// No provider requests, production behavior changes or store-selection mutations.
const assert = require("node:assert/strict");
const core = require("../.tmp-k-equivalent/ziiplyCore.js");
const pick = core.pickBestKProduct;
const source = "Kivikylän Huiluntuhti grillimakkara 400 g";
const ean = "6406300000261";
const product = (name, code, price = 3.49) => ({name, ean:code, price});
const scenarios = [
  ["exact EAN survives name differences", [product("Kivikylän Huiluntuhti 400 g", ean)], ean],
  ["wrong 375g variant rejected", [product("Kivikylän Huiluntuhti grillimakkara 375 g","1111111111111")], null],
  ["unrelated makkarapihvi rejected", [product("Kivikylän Huiluntuhti makkarapihvi 400 g","2222222222222")], null],
];
for (const [label, candidates, expected] of scenarios) {
  const result = pick(candidates,source,ean);
  const actual = result?.ean || null;
  console.log(JSON.stringify({scenario:label,returned:candidates.length,selected:result?.name||null,ean:actual}));
  assert.equal(actual,expected,label);
}
console.log("PASS K comparison identity guard scenarios");

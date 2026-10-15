const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../src/app/components/ziiply/offerSearch/ziiplyOfferSearchCore.ts"), "utf8");
const start = source.indexOf("function gostaOfferSortPrice(");
const end = source.indexOf("\nexport function sortZiiplyGostaOffersByPrice", start);
assert.ok(start >= 0 && end > start, "Shared Gösta price sorter must exist");

// Execute the actual production implementation, removing only TypeScript type annotations.
const implementation = source.slice(start, end)
  .replace("item: ZiiplyGostaOfferLike", "item")
  .replaceAll("(item as any)", "item");
const priceOf = vm.runInNewContext(implementation + "\ngostaOfferSortPrice");

test("numeric offer price takes priority over regular and comparison price", () => {
  assert.equal(priceOf({ offerPrice: 3.5, price: 5.99, priceText: "9,99 €/kg" }), 3.5);
});
test("multi-buy price text uses euro amount, not quantity", () => {
  assert.equal(priceOf({ priceText: "2 kpl / 4,00 €" }), 4);
  assert.equal(priceOf({ priceText: "4,00 € / 2 kpl" }), 4);
});
test("unit prices do not become total prices", () => {
  assert.equal(priceOf({ priceText: "3,99 €/kg" }), Infinity);
  assert.equal(priceOf({ priceText: "2 kpl" }), Infinity);
});
test("missing prices go last", () => {
  assert.equal(priceOf({}), Infinity);
  assert.equal(priceOf({ offerPrice: 0 }), Infinity);
});
test("wrapped source data is recognized", () => {
  assert.equal(priceOf({ __sourceOfferSearchResult: { offerPrice: 2.49 } }), 2.49);
});

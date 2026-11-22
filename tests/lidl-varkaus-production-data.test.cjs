const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");
const path = require("node:path");

function loadTs(file, dependencies = {}) {
  const filename = path.resolve(file);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = module.paths;
  mod.require = (name) => dependencies[name] || require(name);
  mod._compile(compiled, filename);
  return mod.exports;
}
const taxonomy = loadTs("src/app/components/ziiply/offerSearch/sharedProductCategory.ts");
const { resolveLidlGroceryCategories } = loadTs(
  "src/app/components/ziiply/offerSearch/lidlIndependentCategory.ts",
  { "./sharedProductCategory": taxonomy },
);
test("Varkaus production-data regression: exclude toy and two unpriced Lidl Plus offers", () => {
  const items = [
    { title: "Lupilu Puinen jäätelökärry tai makeiskoju", price: 19.99, offerPrice: 19.99 },
    { title: "Energiajuoma 24-pack", price: "", offerPrice: "" },
    { title: "Limonadi 12-pack", price: "", offerPrice: "" },
    { title: "Deluxe Pistaasijäätelö", price: 2.99, offerPrice: 2.99 },
    { title: "KIVIKYLÄN Lihapyörykkä sinihomejuustotäytteellä", price: 3.49, offerPrice: 3.49 },
    { title: "Klementiini 1 kg", price: "1,69", offerPrice: "1,69" },
  ];
  const result = resolveLidlGroceryCategories(items);
  assert.deepEqual(result.map(x => x.title), items.slice(3).map(x => x.title));
  assert.deepEqual(result.map(x => x.category), ["Pakasteet", "Liha & makkarat", "Hevi"]);
});
test("Lidl rejects zero, negative, NaN, malformed and absent offer prices", () => {
  const prices = ["", " ", "not a price", "12abc", null, undefined, 0, -1, NaN, Infinity];
  for (const price of prices) {
    assert.equal(resolveLidlGroceryCategories([{ title: "Banaani", price, offerPrice: price }]).length, 0, String(price));
  }
  assert.equal(resolveLidlGroceryCategories([{ title: "Banaani", price: 1.29, offerPrice: 1.29 }]).length, 1);
});

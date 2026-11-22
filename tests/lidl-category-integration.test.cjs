const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

function loadTs(relativePath) {
  const filename = path.resolve(relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const js = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(js, filename);
  return mod.exports;
}
// TypeScript import is resolved from the transpiled module through a tiny
// in-process resolver; tests execute the production resolver, not copied rules.
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "./sharedProductCategory" && parent?.filename?.endsWith("lidlIndependentCategory.ts")) {
    return loadTs("src/app/components/ziiply/offerSearch/sharedProductCategory.ts");
  }
  return originalLoad.apply(this, arguments);
};
let resolveLidlGroceryCategories;
try {
  ({ resolveLidlGroceryCategories } = loadTs("src/app/components/ziiply/offerSearch/lidlIndependentCategory.ts"));
} finally {
  Module._load = originalLoad;
}
test("Lidl parser offers are categorized without Neon, nested data matches", () => {
  const offers = [
    { title: "Kivikylän lihapyörykät", source: "lidl-fi-public", __sourceOfferSearchResult: { title: "Kivikylän lihapyörykät", category: "Maitotuotteet" } },
    { title: "Pistaasijuustokakku", source: "lidl-fi-public", category: "Maitotuotteet" },
    { title: "Parsakaali", source: "lidl-fi-public" },
    { title: "Paistinpannu", source: "lidl-fi-public" },
    { title: "Tuntematon elintarvike", source: "lidl-fi-public" },
  ];
  const actual = resolveLidlGroceryCategories(offers);
  assert.equal(actual.length, 4);
  assert.deepEqual(actual.map(row => row.category), ["Liha & makkarat", "Leipomo", "Hevi", ""]);
  assert.equal(actual[0].__sourceOfferSearchResult.category, "Liha & makkarat");
  assert.equal(actual[0].__sourceOfferSearchResult.categoryPath, "Liha & makkarat");
  assert.equal(actual[4], undefined);
  assert.equal(actual[3].categoryResolution, "unresolved");
});
test("Verified Neon EAN can supply a category when title is not identifiable", () => {
  const [item] = resolveLidlGroceryCategories([{ title: "Tuote X", neonCategoryMatch: "ean", neonDisplayCategory: "Juomat" }]);
  assert.equal(item.category, "Juomat");
  assert.equal(item.categoryResolution, "verified-ean");
});

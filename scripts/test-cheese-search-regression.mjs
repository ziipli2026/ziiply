import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync("src/app/components/ziiply/ziiplyCore.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
const module = { exports };
vm.runInNewContext(compiled, {
  module, exports, console,
  require: (id) => {
    if (id === "posthog-js") return { default: {} };
    if (id === "./search/searchIntentAI") return { correctSearchQuery: (q) => q };
    throw new Error("Unexpected dependency: " + id);
  },
}, { timeout: 10000 });
const { isBadNormalResult, isHardRejectedKMatch, productGroupGate } = module.exports;
assert.equal(typeof isBadNormalResult, "function");
assert.equal(typeof isHardRejectedKMatch, "function");
assert.equal(typeof productGroupGate, "function");
const product = (name) => ({ id: 1, name, category: "Maitotuotteet" });

for (const name of ["Juustoportti porkkanasose 500 g", "Juustoportti kaurapuuro 400 g"]) {
  assert.equal(isBadNormalResult(product(name), "juusto"), true, name + " must not pass cheese search");
  assert.equal(isHardRejectedKMatch("juusto", name), true, name + " must not match cheese");
  assert.equal(productGroupGate("juusto", name), false, name + " must fail group gate");
}
for (const name of ["Juustoportti Edam juusto 500 g", "Valio tuorejuusto 200 g", "Valio sulatejuusto 200 g", "Valio raejuusto 200 g"]) {
  assert.equal(isBadNormalResult(product(name), "juusto"), false, name + " must remain in cheese search");
  assert.equal(isHardRejectedKMatch("juusto", name), false, name + " must match cheese");
  assert.equal(productGroupGate("juusto", name), true, name + " must pass group gate");
}
assert.equal(isBadNormalResult(product("Juustoportti juustodippi 200 g"), "juusto"), true);
assert.equal(isHardRejectedKMatch("juusto", "Juustoportti juustodippi 200 g"), true);
assert.equal(productGroupGate("juusto", "Juustoportti juustodippi 200 g"), false);
assert.equal(isHardRejectedKMatch("Juustoportti porkkanasose", "Juustoportti porkkanasose"), false);
assert.equal(isBadNormalResult(product("Juustoportti porkkanasose 500 g"), "Juustoportti porkkanasose"), false, "brand-specific carrot puree search must not become cheese search");
// Regression examples from the 35-category provider report: raw API results
// must not be accepted as final normal-search matches.
for (const [query, name] of [
  ["jogurtti", "Myslipatukka jogurttikuorrutteella 35 g"],
  ["jogurtti", "Jogurttisalaattikastike 250 ml"],
  ["jauheliha", "Jauhelihapizza 350 g"],
  ["jauheliha", "Jauhelihamausteseos 30 g"],
  ["maito", "Maitopullotutti 2 kpl"],
  ["maito", "Pikacappuccino maitojauhe 200 g"],
]) {
  assert.equal(isBadNormalResult(product(name), query), true, query + ": " + name + " must not appear in final results");
}
// Additional false positives observed in the desktop milk debug export.
for (const name of [
  "Nestlé NAN H.A.1 Maitopohjainen äidinmaidonkorvike 200ml",
  "Maitokolmio asidofilus-bifidopiimä 1l",
  "Maitokolmio rasvaton piimä 1l",
  "Nestlé Nan Pro 2 maitopohjainen käyttövalmis vierotusvalmiste 1000ml",
]) {
  assert.equal(isBadNormalResult(product(name), "maito"), true, name + " must not appear in milk results");
}
// Keep legitimate products visible when rejecting misleading raw provider hits.
for (const [query, name] of [
  ["jogurtti", "Valio luonnonjogurtti 1 kg"],
  ["jogurtti", "Arla maustamaton jogurtti 1 l"],
  ["jauheliha", "Naudan jauheliha 400 g"],
  ["jauheliha", "Sika-nauta jauheliha 400 g"],
  ["maito", "Valio kevytmaito 1 l"],
  ["maito", "Valio rasvaton maito 1 l"],
]) {
  assert.equal(isBadNormalResult(product(name), query), false, query + ": " + name + " must remain in final results");
}
console.log("Cheese and provider-spillover behavioral regression checks passed");

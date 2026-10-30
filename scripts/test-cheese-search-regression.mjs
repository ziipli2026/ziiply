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
const { isBadNormalResult, isHardRejectedKMatch } = module.exports;
assert.equal(typeof isBadNormalResult, "function");
assert.equal(typeof isHardRejectedKMatch, "function");
const product = (name) => ({ id: 1, name, category: "Maitotuotteet" });

for (const name of ["Juustoportti porkkanasose 500 g", "Juustoportti kaurapuuro 400 g"]) {
  assert.equal(isBadNormalResult(product(name), "juusto"), true, name + " must not pass cheese search");
  assert.equal(isHardRejectedKMatch("juusto", name), true, name + " must not match cheese");
}
for (const name of ["Juustoportti Edam juusto 500 g", "Valio tuorejuusto 200 g", "Valio sulatejuusto 200 g", "Valio raejuusto 200 g"]) {
  assert.equal(isBadNormalResult(product(name), "juusto"), false, name + " must remain in cheese search");
  assert.equal(isHardRejectedKMatch("juusto", name), false, name + " must match cheese");
}
assert.equal(isBadNormalResult(product("Juustoportti juustodippi 200 g"), "juusto"), true);
assert.equal(isHardRejectedKMatch("juusto", "Juustoportti juustodippi 200 g"), true);
assert.equal(isHardRejectedKMatch("Juustoportti porkkanasose", "Juustoportti porkkanasose"), false);
console.log("Cheese search behavioral regression checks passed");

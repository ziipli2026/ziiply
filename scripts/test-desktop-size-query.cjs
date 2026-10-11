const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const source = fs.readFileSync("src/app/components/ziiply/ziiplyCore.ts", "utf8");
const ast = ts.createSourceFile("core.ts", source, ts.ScriptTarget.Latest, true);
const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === "getNormalSearchQueries");
assert.ok(fn, "desktop query generator exists");
const code = source.slice(fn.getStart(ast), fn.end).replace(/^export\s+/, "");
const context = {
  detectSearchIntent: () => ({variants: [], category: "generic"}),
  normalize: s => String(s).toLowerCase().trim(),
  normalizeLooseProductMatch: s => String(s).toLowerCase().replace(/\s+/g, " ").trim(),
  getNormalizedWords: s => String(s).toLowerCase().split(/\s+/),
  getPrimaryProductNounQuery: () => "",
  getColaSpecificSearchQueries: () => [],
  isVerySpecificSearch: () => true,
  uniqueNormalizedQueries: arr => [...new Set(arr.filter(Boolean).map(s => String(s).toLowerCase().trim()))],
  getSearchQuery: s => s,
};
vm.createContext(context);
vm.runInContext(ts.transpileModule(code, {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText + "\nthis.search = getNormalSearchQueries;", context);
const cases = [
 ["Oltermanni alkuperäinen 1kg", "oltermanni alkuperäinen"],
 ["Santa Maria tortilla original 8kpl", "santa maria tortilla original"],
 ["Coca Cola Zero 1,5l", "coca cola zero"],
];
for (const [input, fallback] of cases) {
 const queries = Array.from(context.search(input));
 assert.equal(queries[0], input.toLowerCase());
 assert.ok(queries.slice(0,2).includes(fallback), input + ": missing size-free query");
 assert.ok(!queries.includes("cola"), "must not broaden to generic cola");
}
assert.equal(context.search("Santa Maria tortilla").length, 1);
console.log("Desktop exact-size query regressions passed");

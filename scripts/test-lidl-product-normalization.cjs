const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const source = fs.readFileSync("src/app/api/lidl/products/route.ts", "utf8");
function helper(name, next) {
  const start = source.indexOf("function " + name + "(");
  const end = source.indexOf("\nfunction " + next + "(", start) >= 0
    ? source.indexOf("\nfunction " + next + "(", start)
    : source.indexOf("\nasync function " + next + "(", start);
  assert(start >= 0 && end > start, "missing helper: " + name);
  return source.slice(start, end);
}
const ctx = vm.createContext({});
const helpers = helper("getPrice", "isValidGtin") + "\n" + helper("isValidGtin", "getEan") + "\n" + helper("getEan", "fixEncoding") + "\n" + helper("fixEncoding", "normalize").split("\ntype RuoanhintaStore")[0] + "\n" + helper("normalize", "lidlSearchScore") + "\n" + helper("lidlSearchScore", "resolveRuoanhintaLidlStoreId");
const compiled = ts.transpileModule(helpers, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
vm.runInContext(compiled, ctx);
assert.equal(ctx.isValidGtin("6410405082657"), true);
assert.equal(ctx.isValidGtin("6410405082651"), false);
assert.equal(ctx.isValidGtin("12345"), false);
assert.equal(ctx.isValidGtin("96385074"), true);
assert.equal(ctx.getEan({ean:"bad",gtin:"6410405082657"}),"6410405082657");
assert.equal(ctx.getEan({ean:"6410405082651",barcode:"96385074"}),"96385074");
assert.equal(ctx.getEan({externalId:"6410405082657"}),undefined);
assert.equal(ctx.fixEncoding("MÃ¤Ã¤rÃ¤"),"Määrä");
const score = (name, query, brand = "") => ctx.lidlSearchScore({name, brandName:brand},query);
assert(score("Maito 1 l","maito") > score("Maitosuklaa 100 g","maito"));
assert(score("Maito","maito") > score("Maito 1 l","maito"));
assert(score("Rasvaton maito 1 l","rasvaton maito") > score("Maito 1 l","rasvaton maito"));
assert(score("Valio rasvaton maito 1 l","valio rasvaton maito") > score("Maito 1 l","valio rasvaton maito"));
assert(score("Maito 1 l","maito") > score("Maitokahvi 1 l","maito"));
assert.equal(score("Juusto 500 g","maito"),0);
assert.match(source,/\.filter\(\(product\) => getPrice\(product\) > 0 && lidlSearchScore\(product, search\) > 0\)/);
assert.equal(ctx.getPrice({storeItems:[{price:2.49}]}),2.49);
for (const price of [0,-1,NaN,Infinity,-Infinity,"2.49",null]) assert.equal(ctx.getPrice({storeItems:[{price}]}),0);
assert.equal(ctx.getPrice({}),0);
assert.match(source,/comparisonPriceUnit: product\.storeItems\?\.\[0\]\?\.comparisonPriceUnit/);
assert.match(source,/priceVerified: false/);
// Source contract: do not fabricate pack sizes or €/kg, €/l values.
assert.match(source,/comparisonPrice: product\.storeItems\?\.\[0\]\?\.comparisonPrice \?\? undefined/);
assert.match(source,/comparisonPriceUnit: product\.storeItems\?\.\[0\]\?\.comparisonPriceUnit \?\? undefined/);
assert.match(source,/price: getPrice\(product\)/);
assert.doesNotMatch(source,/comparisonPrice:\s*(?:getPrice\(product\)|(?:Math\.)?round\()/);
assert.doesNotMatch(source,/packSize:\s*(?:parseFloat|Number)\(/);
assert.match(source,/\.sort\(\(a, b\) => lidlSearchScore\(b, search\) - lidlSearchScore\(a, search\)\)/);

console.log("Lidl product search GTIN, source, encoding and price contract: PASS");

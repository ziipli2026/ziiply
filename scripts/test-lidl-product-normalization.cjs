const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("src/app/api/lidl/products/route.ts", "utf8");
function helper(name, next) {
  const start = source.indexOf("function " + name + "(");
  const end = source.indexOf("\nfunction " + next + "(", start);
  assert(start >= 0 && end > start, "missing helper: " + name);
  return source.slice(start, end);
}
const ctx = vm.createContext({});
vm.runInContext(helper("isValidGtin", "getEan") + "\n" + helper("getEan", "fixEncoding") + "\n" + helper("fixEncoding", "normalize").split("\ntype RuoanhintaStore")[0], ctx);
assert.equal(ctx.isValidGtin("6410405082657"), true);
assert.equal(ctx.isValidGtin("6410405082651"), false);
assert.equal(ctx.isValidGtin("12345"), false);
assert.equal(ctx.isValidGtin("96385074"), true);
assert.equal(ctx.getEan({ean:"bad",gtin:"6410405082657"}),"6410405082657");
assert.equal(ctx.getEan({ean:"6410405082651",barcode:"96385074"}),"96385074");
assert.equal(ctx.getEan({externalId:"6410405082657"}),undefined);
assert.equal(ctx.fixEncoding("MÃ¤Ã¤rÃ¤"),"Määrä");
assert.match(source,/\.filter\(\(product\) => getPrice\(product\) > 0\)/);
assert.match(source,/comparisonPriceUnit: product\.storeItems\?\.\[0\]\?\.comparisonPriceUnit/);
assert.match(source,/priceVerified: false/);
console.log("Lidl product search GTIN, source, encoding and price contract: PASS");

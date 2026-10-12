const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

// Exercise the exact source parsing expressions, not a separately reimplemented regex.
const src = fs.readFileSync("src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts", "utf8");
function statement(prefix) {
  const line = src.split("\n").find(x => x.trimStart().startsWith(prefix));
  assert.ok(line, "Missing production statement: " + prefix);
  return line.trim();
}
const comparisonStatement = statement("const comparison = offerDescription.match(");
const depositStatement = statement("const depositMatch = sourceDescription.match(");
function parseDescription(description) {
  const ctx = { offerDescription: description.split(/ilman\\s+plussa(?:-korttia)?/i)[0], sourceDescription: description };
  vm.runInNewContext(comparisonStatement + "\n" + depositStatement +
    "\nthis.comparison = comparison; this.depositMatch = depositMatch;", ctx);
  return { comparison: ctx.comparison, deposit: ctx.depositMatch };
}
for (const [name, description, min, max, unit] of [
  ["Findus", "250-360 g (8,31-11,96/kg) Ilman Plussa-korttia 4,09/pkt", "8,31", "11,96", "kg"],
  ["Atria", "350-400 g (3,75-4,29/kg)", "3,75", "4,29", "kg"],
  ["Naapurin Maalaiskana", "240 g tai 300 g (8,33-10,42/kg)", "8,33", "10,42", "kg"],
  ["Nocco", "6,15-6,62/l, sis. pantit 0,45 Ilman Plussa-korttia 2,85/tlk", "6,15", "6,62", "l"],
]) {
  test(name + " preserves source comparison-price range", () => {
    const match = parseDescription(description).comparison;
    assert.ok(match, name);
    assert.equal(match[1], min);
    assert.equal(match[2], max);
    assert.equal(match[3], unit);
  });
}
test("Nocco deposit comes from original source description", () => {
  const parsed = parseDescription("6,15-6,62/l, sis. pantit 0,45 Ilman Plussa-korttia 2,85/tlk");
  assert.ok(parsed.deposit);
  assert.equal(parsed.deposit[1], "0,45");
});
test("No invented deposit for a promotion without deposit information", () => {
  assert.equal(parseDescription("350-400 g (3,75-4,29/kg)").deposit, null);
});
test("Normal price after Ilman Plussa-korttia cannot override offer unit price", () => {
  const parsed = parseDescription("8,31-11,96/kg Ilman Plussa-korttia 11,36-17,40/kg");
  assert.equal(parsed.comparison[1], "8,31");
  assert.equal(parsed.comparison[2], "11,96");
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/components/ziiply/cart/comparisonRankingCore.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { rankComparisonResults } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
const row = (store, foundItems, missingItems, totalPrice, comingSoon = false) => ({ store, foundItems, missingItems, totalPrice, comingSoon });

test("complete baskets sort by verified total, not input order", () => {
  const result = rankComparisonResults([row("expensive", 3, 0, 18), row("cheap", 3, 0, 12)]);
  assert.deepEqual(result.map(x => x.store), ["cheap", "expensive"]);
});
test("incomplete cheap basket cannot beat complete basket", () => {
  const result = rankComparisonResults([row("partial", 2, 1, 2), row("complete", 3, 0, 19)]);
  assert.equal(result[0].store, "complete");
});
test("more found items outrank fewer among incomplete baskets", () => {
  const result = rankComparisonResults([row("one", 1, 2, 3), row("two", 2, 1, 11)]);
  assert.equal(result[0].store, "two");
});
test("zero, NaN, and infinity totals cannot be complete", () => {
  for (const invalid of [0, NaN, Infinity, -Infinity, -1]) {
    const result = rankComparisonResults([row("invalid", 3, 0, invalid), row("valid", 3, 0, 20)]);
    assert.equal(result[0].store, "valid");
  }
});
test("coming-soon stores are always last", () => {
  const result = rankComparisonResults([row("later", 3, 0, 1, true), row("available", 3, 0, 20)]);
  assert.equal(result[0].store, "available");
});
test("equal invalid totals preserve stable order", () => {
  const result = rankComparisonResults([row("first", 0, 2, 0), row("second", 0, 2, 0)]);
  assert.deepEqual(result.map(x => x.store), ["first", "second"]);
});
test("input array is never mutated", () => {
  const original = [row("expensive", 2, 0, 20), row("cheap", 2, 0, 10)];
  rankComparisonResults(original);
  assert.deepEqual(original.map(x => x.store), ["expensive", "cheap"]);
});

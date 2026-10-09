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

test("complete equal-price baskets retain deterministic input order", () => {
  const result = rankComparisonResults([row("A", 3, 0, 12.45), row("B", 3, 0, 12.45)]);
  assert.deepEqual(result.map(x => x.store), ["A", "B"]);
});
test("complete basket wins even if incomplete basket has lower apparent total", () => {
  const result = rankComparisonResults([row("partial", 4, 1, 1.99), row("complete", 5, 0, 24.99)]);
  assert.deepEqual(result.map(x => x.store), ["complete", "partial"]);
});
test("coming-soon basket cannot win even with more matched products", () => {
  const result = rankComparisonResults([row("future", 10, 0, 1, true), row("current", 1, 4, 12)]);
  assert.equal(result[0].store, "current");
});

test("desktop comparison uses the shared ranking rules used by the mobile flow", () => {
  const desktop = readFileSync(new URL("../src/app/desktop-preview/page.tsx", import.meta.url), "utf8");
  assert.match(desktop, /import \{ rankComparisonResults \} from ["']\.\.\/components\/ziiply\/cart\/comparisonRankingCore["']/);
  assert.match(desktop, /rankComparisonResults\(Object\.values\(selectedStores\)/);
});

test("desktop comparison excludes weight-labelled rows and offer-only rows like the mobile comparison", () => {
  const desktop = readFileSync(new URL("../src/app/desktop-preview/page.tsx", import.meta.url), "utf8");
  assert.match(desktop, /item\.source===["']justiina["']&&item\.ziiplyWeightLabel!==true&&item\.product\?\.ziiplyWeightLabel!==true/);
  assert.match(desktop, /Number\.isFinite\(Number\(item\.quantity \?\? 1\)\)&&Number\(item\.quantity \?\? 1\)>0/);
});

test("desktop comparison prices remain scoped to the selected chain and store identity", () => {
  const desktop = readFileSync(new URL("../src/app/desktop-preview/page.tsx", import.meta.url), "utf8");
  assert.match(desktop, /const key=chain\+\":\"\+storeId/);
  assert.match(desktop, /matches\[key\]\[desktopComparisonRowKey\(item\)\]=price/);
  assert.match(desktop, /sanitizeDesktopComparisonMatches\(cached\.matches,selectedKeys,eligibleKeys\)/);
});

test("desktop comparison cache signature is independent of basket row order", () => {
  const desktop = readFileSync(new URL("../src/app/desktop-preview/page.tsx", import.meta.url), "utf8");
  assert.match(desktop, /items:cartItems\.filter\(\(item:any\)=>item\.source===["']justiina["']\).*\.sort\(\(a,b\)=>JSON\.stringify\(a\)\.localeCompare\(JSON\.stringify\(b\)\)\)/);
});

const cacheSource = readFileSync(new URL("../src/app/components/ziiply/cart/desktopComparisonCacheCore.ts", import.meta.url), "utf8");
const cacheJs = ts.transpileModule(cacheSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { sanitizeDesktopComparisonMatches } = await import("data:text/javascript;base64," + Buffer.from(cacheJs).toString("base64"));

test("desktop cache accepts only selected store identities and eligible comparison rows", () => {
  const valid = sanitizeDesktopComparisonMatches(
    { "S:store-1": { "ean:111": 2.49 }, "K:store-2": { "ean:111": 2.79 } },
    ["S:store-1", "K:store-2"],
    ["ean:111"]
  );
  assert.deepEqual(valid, { "S:store-1": { "ean:111": 2.49 }, "K:store-2": { "ean:111": 2.79 } });
  assert.equal(sanitizeDesktopComparisonMatches(
    { "S:old-store": { "ean:111": 2.49 } },
    ["S:store-1"],
    ["ean:111"]
  ), null);
  assert.equal(sanitizeDesktopComparisonMatches(
    { "S:store-1": { "ean:offer-only": 1.99 } },
    ["S:store-1"],
    ["ean:111"]
  ), null);
});

test("desktop cache rejects non-positive, non-finite, and malformed comparison prices", () => {
  for (const price of [0, -0.01, NaN, Infinity, "2.49", null]) {
    assert.equal(sanitizeDesktopComparisonMatches(
      { "S:store-1": { "ean:111": price } },
      ["S:store-1"],
      ["ean:111"]
    ), null);
  }
});

test("desktop cache initializes empty rows for selected stores with no matches", () => {
  assert.deepEqual(
    sanitizeDesktopComparisonMatches({ "S:store-1": { "ean:111": 2.49 } }, ["S:store-1", "K:store-2"], ["ean:111"]),
    { "S:store-1": { "ean:111": 2.49 }, "K:store-2": {} }
  );
});

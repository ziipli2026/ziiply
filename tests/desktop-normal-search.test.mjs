import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/components/ziiply/search/desktopNormalSearchService.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { normalizeDesktopNormalResults } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
const store = { id: "123", name: "Testikauppa" };

test("S and K store results retain positive numeric prices", () => {
  for (const chain of ["S", "K"]) {
    const [item] = normalizeDesktopNormalResults([{ price: 2.49, ean: "123" }], chain, store);
    assert.equal(item.__price, 2.49);
    assert.equal(item.__priceVerified, true);
    assert.equal(item.__catalogOnly, false);
    assert.equal(item.__storeId, "123");
  }
});
test("invalid or missing prices cannot be verified", () => {
  for (const price of [undefined, null, "invalid", 0, -1, Infinity]) {
    const [item] = normalizeDesktopNormalResults([{ price }], "S", store);
    assert.equal(item.__priceVerified, false);
    assert.equal(item.__price, 0);
  }
});
test("comma decimal price is normalized", () => {
  const [item] = normalizeDesktopNormalResults([{ price: "1,99" }], "K", store);
  assert.equal(item.__price, 1.99);
});
test("Lidl discovery results cannot become verified prices", () => {
  const [item] = normalizeDesktopNormalResults([{ price: 1.99 }], "LIDL", store);
  assert.equal(item.__price, 0);
  assert.equal(item.__priceVerified, false);
  assert.equal(item.__catalogOnly, true);
});
test("Tokmanni and Eurospar catalog prices are not local verified prices", () => {
  for (const chain of ["TOKMANNI", "EUROSPAR"]) {
    const [item] = normalizeDesktopNormalResults([{ price: 1.99 }], chain, store);
    assert.equal(item.__priceVerified, false);
    assert.equal(item.__catalogOnly, true);
  }
});
test("store-item nested price is used when direct price missing", () => {
  const [item] = normalizeDesktopNormalResults([{ storeItems: [{ price: 3.49 }] }], "S", store);
  assert.equal(item.__price, 3.49);
});

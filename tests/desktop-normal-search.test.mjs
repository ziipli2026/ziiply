import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/components/ziiply/search/desktopNormalSearchService.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { normalizeDesktopNormalResults, fetchDesktopNormalProducts, refreshDesktopCartProductPrice } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
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

test("S and K searches pass selected store identifier to the API", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return { ok: true, json: async () => ({ products: [{ name: "test" }] }) };
  };
  try {
    await fetchDesktopNormalProducts("kahvi", "S", { id: "S-123", name: "Prisma" });
    await fetchDesktopNormalProducts("kahvi", "K", { externalId: "K-456", name: "Citymarket" });
    assert.equal(new URL(requests[0].url, "https://example.test").pathname, "/api/s-products");
    assert.equal(new URL(requests[0].url, "https://example.test").searchParams.get("store"), "S-123");
    assert.equal(new URL(requests[1].url, "https://example.test").pathname, "/api/k-products");
    assert.equal(new URL(requests[1].url, "https://example.test").searchParams.get("store"), "K-456");
    assert.equal(requests[0].options.cache, "no-store");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("failed normal search rejects rather than returning a false empty catalog", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  try {
    await assert.rejects(fetchDesktopNormalProducts("maito", "S", store), /HTTP 503/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("local price without a selected store identifier is not verified", () => {
  for (const chain of ["S", "K"]) {
    const [item] = normalizeDesktopNormalResults([{ price: 2.49 }], chain, { name: "Unknown" });
    assert.equal(item.__priceVerified, false);
    assert.equal(item.__storeId, "");
  }
});

test("exact cart price refresh recognizes nested EAN from selected store", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({
    products: [{ product: { ean: "6412345678901" }, price: 2.59 }]
  }) });
  try {
    const price = await refreshDesktopCartProductPrice(
      { ean: "6412345678901", title: "Testituote" }, "S", store
    );
    assert.equal(price, 2.59);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

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

test("exact refresh supports nested cart product identity and title", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({
    products: [{ product: { ean: "6412345678901" }, price: 3.19 }]
  }) });
  try {
    const price = await refreshDesktopCartProductPrice(
      { product: { ean: "6412345678901", name: "Testituote" } }, "K", store
    );
    assert.equal(price, 3.19);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("exact refresh rejects unscoped store even with matching EAN", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw Error("unexpected fetch"); };
  try {
    const price = await refreshDesktopCartProductPrice(
      { ean: "6412345678901", title: "Testituote" }, "S", { name: "Unknown" }
    );
    assert.equal(price, null);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("cart price refresh retries exact EAN after unsuccessful name search", async () => {
  const originalFetch = globalThis.fetch;
  const searches = [];
  globalThis.fetch = async url => {
    const query = new URL(String(url), "https://example.test").searchParams.get("search");
    searches.push(query);
    return { ok: true, json: async () => ({ products: query === "6412345678901"
      ? [{ ean: "6412345678901", price: 4.29 }] : [] }) };
  };
  try {
    const price = await refreshDesktopCartProductPrice(
      { ean: "6412345678901", title: "Testituote" }, "K", store
    );
    assert.equal(price, 4.29);
    assert.deepEqual(searches, ["Testituote", "6412345678901"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("cart refresh can find exact EAN without a product title", async () => {
  const originalFetch = globalThis.fetch;
  const searches = [];
  globalThis.fetch = async url => {
    searches.push(new URL(String(url), "https://example.test").searchParams.get("search"));
    return { ok: true, json: async () => ({ products: [{ ean: "6412345678901", price: 1.79 }] }) };
  };
  try {
    const price = await refreshDesktopCartProductPrice(
      { ean: "6412345678901" }, "S", store
    );
    assert.equal(price, 1.79);
    assert.deepEqual(searches, ["6412345678901"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("EAN fallback never substitutes a different barcode", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({
    products: [{ ean: "6412345678902", price: 0.99 }]
  }) });
  try {
    const price = await refreshDesktopCartProductPrice(
      { ean: "6412345678901", title: "Testituote" }, "K", store
    );
    assert.equal(price, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("multi-store results use the selected store price rather than first row", () => {
  const [item] = normalizeDesktopNormalResults([{
    storeItems: [
      { storeId: "other", price: 1.25 },
      { storeId: "123", price: 2.75 }
    ]
  }], "S", store);
  assert.equal(item.__price, 2.75);
  assert.equal(item.__priceVerified, true);
});

test("multi-store results without matching store do not verify a price", () => {
  const [item] = normalizeDesktopNormalResults([{
    storeItems: [{ storeId: "other", price: 1.25 }]
  }], "K", store);
  assert.equal(item.__price, 0);
  assert.equal(item.__priceVerified, false);
});

test("nested single storeItem from another store is not verified", () => {
  const [item] = normalizeDesktopNormalResults([{
    storeItem: { storeId: "other", price: 1.49 }
  }], "S", store);
  assert.equal(item.__price, 0);
  assert.equal(item.__priceVerified, false);
});

test("nested single storeItem for selected store remains verified", () => {
  const [item] = normalizeDesktopNormalResults([{
    storeItem: { storeId: "123", price: 2.49 }
  }], "K", store);
  assert.equal(item.__price, 2.49);
  assert.equal(item.__priceVerified, true);
});

test("direct product price scoped to another store is rejected", () => {
  const [item] = normalizeDesktopNormalResults([{
    storeId: "other", price: 1.09
  }], "S", store);
  assert.equal(item.__price, 0);
  assert.equal(item.__priceVerified, false);
});

test("direct product price scoped to selected store is accepted", () => {
  const [item] = normalizeDesktopNormalResults([{
    storeId: "123", price: 2.09
  }], "K", store);
  assert.equal(item.__price, 2.09);
  assert.equal(item.__priceVerified, true);
});

test("S and K search refuse missing store ID without making API request", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw Error("unexpected request"); };
  try {
    for (const chain of ["S", "K"]) {
      await assert.rejects(fetchDesktopNormalProducts("maito", chain, { name: "Unknown" }),
        /Selected store identifier missing/);
    }
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("known numeric S/K store IDs still reach their respective API routes", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async url => {
    requests.push(String(url));
    return { ok: true, json: async () => ({ items: [] }) };
  };
  try {
    await fetchDesktopNormalProducts("kahvi", "S", { id: 292, name: "Prisma Hyvinkää" });
    await fetchDesktopNormalProducts("kahvi", "K", { id: 3221, name: "K-Citymarket Hyvinkää" });
    assert.equal(new URL(requests[0], "https://example.test").searchParams.get("store"), "292");
    assert.equal(new URL(requests[1], "https://example.test").searchParams.get("store"), "3221");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("nested direct product price honors nested selected-store identity", () => {
  const [wrong] = normalizeDesktopNormalResults([{
    store: { id: "other" }, price: 1.11
  }], "S", store);
  assert.equal(wrong.__priceVerified, false);
  assert.equal(wrong.__price, 0);

  const [right] = normalizeDesktopNormalResults([{
    store: { id: "123" }, price: 2.22
  }], "K", store);
  assert.equal(right.__priceVerified, true);
  assert.equal(right.__price, 2.22);
});

test("unmatched multi-store rows cannot fall back to generic direct price", () => {
  const [item] = normalizeDesktopNormalResults([{
    price: 0.89,
    storeItems: [
      { storeId: "other-a", price: 0.89 },
      { storeId: "other-b", price: 0.95 }
    ]
  }], "S", store);
  assert.equal(item.__price, 0);
  assert.equal(item.__priceVerified, false);
});

test("matching store row wins over generic direct price", () => {
  const [item] = normalizeDesktopNormalResults([{
    price: 0.89,
    storeItems: [
      { storeId: "other", price: 0.89 },
      { storeId: "123", price: 1.15 }
    ]
  }], "K", store);
  assert.equal(item.__price, 1.15);
  assert.equal(item.__priceVerified, true);
});

test("S store search forwards both exact store ID and store name", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  globalThis.fetch = async url => {
    requestUrl = String(url);
    return { ok: true, json: async () => ({ items: [] }) };
  };
  try {
    await fetchDesktopNormalProducts("kahvi", "S", { id: 417, name: "Prisma Tuusula" });
    const parsed = new URL(requestUrl, "https://example.test");
    assert.equal(parsed.pathname, "/api/s-products");
    assert.equal(parsed.searchParams.get("store"), "417");
    assert.equal(parsed.searchParams.get("storeName"), "Prisma Tuusula");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("K store search preserves numeric store ID exactly", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  globalThis.fetch = async url => {
    requestUrl = String(url);
    return { ok: true, json: async () => ({ items: [] }) };
  };
  try {
    await fetchDesktopNormalProducts("maito", "K", { id: 9876, name: "K-Citymarket Testi" });
    const parsed = new URL(requestUrl, "https://example.test");
    assert.equal(parsed.pathname, "/api/k-products");
    assert.equal(parsed.searchParams.get("store"), "9876");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

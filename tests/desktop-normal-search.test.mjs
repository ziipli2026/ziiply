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

test("desktop comparison exact EAN matcher accepts nested provider product identifiers", () => {
  const page = readFileSync(new URL("../src/app/desktop-preview/page.tsx", import.meta.url), "utf8");
  assert.match(page, /p\.ean\?\?p\.barcode\?\?p\.product\?\.ean\?\?p\.product\?\.barcode/);
  assert.match(page, /byEan\.filter\(\(p:any\)=>String\(p\.ean\?\?p\.barcode\?\?p\.product\?\.ean\?\?p\.product\?\.barcode/);
});

test("S/K search prefers internal API store ID over external ID", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async url => {
    requests.push(String(url));
    return { ok: true, json: async () => ({ items: [] }) };
  };
  try {
    await fetchDesktopNormalProducts("kahvi", "S", {
      id: 417, externalId: "external-s-999", name: "Prisma Tuusula"
    });
    await fetchDesktopNormalProducts("kahvi", "K", {
      id: 9876, externalId: "external-k-888", name: "K-Citymarket Testi"
    });
    assert.equal(new URL(requests[0], "https://example.test").searchParams.get("store"), "417");
    assert.equal(new URL(requests[1], "https://example.test").searchParams.get("store"), "9876");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("price verification uses internal API store ID when external ID differs", () => {
  const [item] = normalizeDesktopNormalResults([{
    storeItems: [
      { storeId: "external-store-999", price: 1.05 },
      { storeId: "417", price: 2.15 }
    ]
  }], "S", { id: 417, externalId: "external-store-999", name: "Prisma Tuusula" });
  assert.equal(item.__price, 2.15);
  assert.equal(item.__priceVerified, true);
});

test("price rows prefer internal storeId when externalId differs", () => {
  const [item] = normalizeDesktopNormalResults([{
    storeItems: [
      { externalId: "external-store-999", storeId: "417", price: 2.35 },
      { externalId: "417", storeId: "external-store-999", price: 1.05 }
    ]
  }], "S", { id: 417, externalId: "external-store-999", name: "Prisma Tuusula" });
  assert.equal(item.__price, 2.35);
  assert.equal(item.__priceVerified, true);
});

test("cart price refresh prefers internal API store ID over external ID", () => {
  const refreshStart = source.indexOf("export async function refreshDesktopCartProductPrice");
  const refreshEnd = source.indexOf("/**", refreshStart + 10);
  const refreshSource = source.slice(refreshStart, refreshEnd > refreshStart ? refreshEnd : undefined);
  assert.match(refreshSource, /store\.id\s*\?\?\s*store\.externalId/);
  assert.doesNotMatch(refreshSource, /store\.externalId\s*\?\?\s*store\.id/);
});

test("single mismatched store row cannot lend generic price to selected store", () => {
  const [item] = normalizeDesktopNormalResults([{
    price: 1.29,
    storeItems: [{ storeId: "other-store", price: 1.29 }]
  }], "S", store);
  assert.equal(item.__price, 0);
  assert.equal(item.__priceVerified, false);
});

test("mismatched singular storeItem cannot lend generic price to selected store", () => {
  const [item] = normalizeDesktopNormalResults([{
    price: 1.39,
    storeItem: { storeId: "other-store", price: 1.39 }
  }], "K", store);
  assert.equal(item.__price, 0);
  assert.equal(item.__priceVerified, false);
});

test("desktop cart and comparison keys prefer internal store ID consistently", () => {
  const page = readFileSync(new URL("../src/app/desktop-preview/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /store\?\.externalId\s*\?\?\s*store\?\.id/);
  assert.doesNotMatch(page, /store\.externalId\s*\?\?\s*store\.id/);
  assert.doesNotMatch(page, /x\.externalId\s*\?\?\s*x\.id/);
  assert.match(page, /store\?\.id\s*\?\?\s*store\?\.externalId/);
});

test("two selected stores keep distinct verified prices for the same EAN", () => {
  const products = [{
    ean: "6410405124517",
    price: 0.99,
    storeItems: [
      { storeId: "417", price: 1.48 },
      { storeId: "9876", price: 1.79 }
    ]
  }];
  const [prisma] = normalizeDesktopNormalResults(products, "S", { id: 417, name: "Prisma Tuusula" });
  const [citymarket] = normalizeDesktopNormalResults(products, "K", { id: 9876, name: "K-Citymarket Testi" });
  assert.equal(prisma.__priceVerified, true);
  assert.equal(citymarket.__priceVerified, true);
  assert.equal(prisma.__price, 1.48);
  assert.equal(citymarket.__price, 1.79);
  assert.equal(prisma.__storeId, "417");
  assert.equal(citymarket.__storeId, "9876");
});

test("foreign store price never becomes a valid basket total", () => {
  const [missing] = normalizeDesktopNormalResults([{
    ean: "6410405124517",
    price: 1.48,
    storeItems: [{ storeId: "417", price: 1.48 }]
  }], "K", { id: 9876, name: "K-Citymarket Testi" });
  assert.equal(missing.__priceVerified, false);
  assert.equal(missing.__price, 0);
});

test("cart restore clears previously verified prices and preserves quantity", async () => {
  const cartSource = readFileSync(new URL("../src/app/components/ziiply/cart/desktopCartCore.ts", import.meta.url), "utf8");
  const cartJs = ts.transpileModule(cartSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { restoreDesktopCartWithoutStalePrices } = await import("data:text/javascript;base64," + Buffer.from(cartJs).toString("base64"));
  const [restored] = restoreDesktopCartWithoutStalePrices([{
    ean: "6410405124517", source: "justiina", quantity: 3,
    price: 1.48, __price: 1.48, __priceVerified: true, __storeId: "417", __chain: "S"
  }]);
  assert.equal(restored.quantity, 3);
  assert.equal(restored.price, null);
  assert.equal(restored.__price, null);
  assert.equal(restored.__priceVerified, false);
  assert.equal(restored.__needsPriceRefresh, true);
});

test("changing selected store invalidates old verified cart price", async () => {
  const cartSource = readFileSync(new URL("../src/app/components/ziiply/cart/desktopCartCore.ts", import.meta.url), "utf8");
  const cartJs = ts.transpileModule(cartSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { invalidateDesktopCartPricesForStoreSelection } = await import("data:text/javascript;base64," + Buffer.from(cartJs).toString("base64"));
  const [changed] = invalidateDesktopCartPricesForStoreSelection([{
    ean: "6410405124517", source: "justiina", quantity: 2,
    price: 1.48, __price: 1.48, __priceVerified: true, __storeId: "417", __chain: "S"
  }], new Set(["S:9876"]));
  assert.equal(changed.price, null);
  assert.equal(changed.__priceVerified, false);
  assert.equal(changed.__needsPriceRefresh, true);
});

test("desktop comparison cache signature includes store identity, quantity and product identity", () => {
  const page = readFileSync(new URL("../src/app/desktop-preview/page.tsx", import.meta.url), "utf8");
  const start = page.indexOf("const desktopCompareSignature=JSON.stringify(");
  const end = page.indexOf("const [desktopCompareResolvedSignature", start);
  assert.ok(start >= 0 && end > start);
  const signature = page.slice(start, end);
  assert.match(signature, /store\?\.id\?\?store\?\.externalId/);
  assert.match(signature, /desktopCartIdentity\(item\)/);
  assert.match(signature, /Number\(item\.quantity \?\? 1\)/);
  assert.match(signature, /item\.ean/);
  assert.match(signature, /\.sort\(/);
});

test("desktop comparison cache rejects expired and old-version entries", () => {
  const page = readFileSync(new URL("../src/app/desktop-preview/page.tsx", import.meta.url), "utf8");
  assert.match(page, /JSON\.parse\(key\)\?\.version===2/);
  assert.match(page, /entry\.expiresAt>Date\.now\(\)/);
  assert.match(page, /cached\.expiresAt>Date\.now\(\)/);
  assert.match(page, /desktopCompareResolvedSignature===desktopCompareSignature/);
});

test("comparison cache rejects foreign store, foreign item and invalid prices", async () => {
  const source = readFileSync(new URL("../src/app/components/ziiply/cart/desktopComparisonCacheCore.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { sanitizeDesktopComparisonMatches: clean } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
  const stores = ["S:417"], items = ["ean:6410405124517"];
  assert.deepEqual(clean({ "S:417": { "ean:6410405124517": 1.48 } }, stores, items), { "S:417": { "ean:6410405124517": 1.48 } });
  assert.equal(clean({ "S:999": {} }, stores, items), null);
  assert.equal(clean({ "S:417": { "ean:other": 1.48 } }, stores, items), null);
  for (const price of [0, -1, NaN, Infinity, "1.48"]) {
    assert.equal(clean({ "S:417": { "ean:6410405124517": price } }, stores, items), null);
  }
});

test("desktop page sanitizes cached quotes before reuse", () => {
  const page = readFileSync(new URL("../src/app/desktop-preview/page.tsx", import.meta.url), "utf8");
  assert.match(page, /sanitizeDesktopComparisonMatches\(cached\.matches,selectedKeys,eligibleKeys\)/);
});

test("desktop comparison validates both cache read and cache write", () => {
  const page = readFileSync(new URL("../src/app/desktop-preview/page.tsx", import.meta.url), "utf8");
  assert.match(page, /sanitizeDesktopComparisonMatches\(cached\.matches,selectedKeys,eligibleKeys\)/);
  assert.match(page, /sanitizeDesktopComparisonMatches\(matches,selectedKeys,eligibleKeys\)/);
  assert.match(page, /if\(validatedMatches\)desktopCompareCacheRef\.current\[signature\]/);
});

test("failed desktop comparison search never resolves partial basket prices", () => {
  const page = readFileSync(new URL("../src/app/desktop-preview/page.tsx", import.meta.url), "utf8");
  assert.match(page, /setDesktopCompareMatches\(searchFailed\?\{\}:matches\)/);
  assert.match(page, /setDesktopCompareResolvedSignature\(searchFailed\?"":signature\)/);
});

test("desktop comparison counts quantities in totals and excludes invalid quantities", () => {
  const page = readFileSync(new URL("../src/app/desktop-preview/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Number\.isFinite\(Number\(item\.quantity\|\|1\)\)/);
  assert.match(page, /Number\(item\.quantity\|\|1\)>0/);
  assert.match(page, /verified\[desktopCartIdentity\(item\)\]\*Number\(item\.quantity\|\|1\)/);
});

test("same EAN in two stores remains separate while repeat in one store increments quantity", async () => {
  const source = readFileSync(new URL("../src/app/components/ziiply/cart/desktopCartCore.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { appendDesktopCartItem } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
  const first = { ean: "6410405124517", __chain: "K", __storeId: "100", price: 1.48 };
  const second = { ...first, __storeId: "200", price: 1.79 };
  let cart = appendDesktopCartItem([], first, "justiina");
  cart = appendDesktopCartItem(cart, second, "justiina");
  cart = appendDesktopCartItem(cart, first, "justiina");
  assert.equal(cart.length, 2);
  assert.equal(cart.find(item => item.__storeId === "100").quantity, 2);
  assert.equal(cart.find(item => item.__storeId === "200").quantity, 1);
});

test("quantity update and removal affect only matching store EAN row", async () => {
  const source = readFileSync(new URL("../src/app/components/ziiply/cart/desktopCartCore.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { appendDesktopCartItem, changeDesktopCartItemQuantity } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
  const a = { ean: "6410405124517", __chain: "K", __storeId: "100", source: "justiina" };
  const b = { ...a, __storeId: "200" };
  let cart = appendDesktopCartItem([], a, "justiina");
  cart = appendDesktopCartItem(cart, b, "justiina");
  cart = changeDesktopCartItemQuantity(cart, a, 2);
  assert.equal(cart.find(x => x.__storeId === "100").quantity, 3);
  assert.equal(cart.find(x => x.__storeId === "200").quantity, 1);
  cart = changeDesktopCartItemQuantity(cart, a, -3);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].__storeId, "200");
  assert.equal(cart[0].quantity, 1);
});

test("same EAN offer and normal-price items remain separate basket rows", async () => {
  const source = readFileSync(new URL("../src/app/components/ziiply/cart/desktopCartCore.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { appendDesktopCartItem, changeDesktopCartItemQuantity } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
  const product = { ean: "6410405124517", __chain: "K", __storeId: "100" };
  let cart = appendDesktopCartItem([], product, "gosta");
  cart = appendDesktopCartItem(cart, product, "justiina");
  cart = appendDesktopCartItem(cart, product, "gosta");
  assert.equal(cart.length, 2);
  assert.equal(cart.find(x => x.source === "gosta").quantity, 2);
  assert.equal(cart.find(x => x.source === "justiina").quantity, 1);
  cart = changeDesktopCartItemQuantity(cart, { ...product, source: "gosta" }, -2);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].source, "justiina");
});

test("desktop comparison excludes Gosta offers from search and totals", () => {
  const page = readFileSync(new URL("../src/app/desktop-preview/page.tsx", import.meta.url), "utf8");
  assert.match(page, /const eligible=cartItems\.filter\(\(item:any\)=>item\.source==="justiina"/);
  assert.match(page, /const comparable=cartItems\.filter\(\(item:any\)=>item\.source==="justiina"/);
  assert.match(page, /items:cartItems\.filter\(\(item:any\)=>item\.source==="justiina"/);
});

test("weight-label basket items are excluded from desktop price comparison", () => {
  const page = readFileSync(new URL("../src/app/desktop-preview/page.tsx", import.meta.url), "utf8");
  assert.match(page, /item\.ziiplyWeightLabel!==true&&item\.product\?\.ziiplyWeightLabel!==true/);
  assert.match(page, /item\.ziiplyWeightLabel!==true && item\.product\?\.ziiplyWeightLabel!==true/);
});

test("comparison never substitutes a different EAN when an exact barcode exists", () => {
  const page = readFileSync(new URL("../src/app/desktop-preview/page.tsx", import.meta.url), "utf8");
  assert.match(page, /exact=ean\?products\.filter/);
  assert.match(page, /exact=byEan\.filter/);
  assert.match(page, /const candidates=exact\.length>0\?exact:products/);
  assert.match(page, /const chosen=exact\.length>0\?pricedCandidates/);
});
test("name-based comparison checks product attributes before choosing substitute", () => {
  const page = readFileSync(new URL("../src/app/desktop-preview/page.tsx", import.meta.url), "utf8");
  assert.match(page, /pricedCandidates\.filter\(\(p:any\)=>isComparisonAttributeCompatible\(title,p\.name\)\)/);
});

test("mobile shared comparison attribute gate rejects different package sizes and milk types", () => {
  const core = readFileSync(new URL("../src/app/components/ziiply/ziiplyCore.ts", import.meta.url), "utf8");
  const start = core.indexOf("function isComparisonAttributeCompatible(");
  const end = core.indexOf("export function pickCheapestCompatibleComparisonProduct", start);
  assert.ok(start >= 0 && end > start);
  const gate = core.slice(start, end);
  assert.match(gate, /parseMetricSize\(sourceName\)/);
  assert.match(gate, /parseMetricSize\(candidateName\)/);
  assert.match(gate, /sourceSize\.amount !== candidateSize\.amount/);
  assert.match(gate, /sourceSize\.unitGroup !== candidateSize\.unitGroup/);
  assert.match(gate, /sourceGroup && group\(candidate\) !== sourceGroup/);
});

test("real shared comparison gate rejects 1l versus 500ml and milk versus yoghurt", async () => {
  const source = readFileSync(new URL("../src/app/components/ziiply/ziiplyCore.ts", import.meta.url), "utf8");
  const normalizeStart = source.indexOf("export function fixText(");
  const normalizeEnd = source.indexOf("export function normalizeEan(", normalizeStart);
  const sizeStart = source.indexOf("function parseMetricSize(");
  const sizeEnd = source.indexOf("export function getExactWordScore(", sizeStart);
  const gateStart = source.indexOf("export function isComparisonAttributeCompatible(");
  const gateEnd = source.indexOf("export function pickCheapestCompatibleComparisonProduct", gateStart);
  assert.ok(normalizeStart >= 0 && normalizeEnd > normalizeStart && sizeStart >= 0 && sizeEnd > sizeStart && gateStart >= 0 && gateEnd > gateStart);
  const isolated = source.slice(normalizeStart, normalizeEnd) + "\n" +
    source.slice(sizeStart, sizeEnd) + "\n" +
    source.slice(gateStart, gateEnd).replace("return !isHardRejectedAlternative(sourceName, candidateName);", "return true;");
  const js = ts.transpileModule(isolated, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { isComparisonAttributeCompatible: compatible } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
  assert.equal(compatible("Maito 1 l", "Maito 500 ml"), false);
  assert.equal(compatible("Maito 1 l", "Jogurtti 1 l"), false);
  assert.equal(compatible("Maito 1 l", "Maito 1 l"), true);
});

test("desktop comparison does not turn zero quantity into one", () => {
  const page = readFileSync(new URL("../src/app/desktop-preview/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /Number\(item\.quantity \?\? 1\)/);
  assert.match(page, /Number\(item\.quantity \?\? 1\)/);
  assert.equal(Number(0 ?? 1), 0);
  assert.equal(Number(undefined ?? 1), 1);
});

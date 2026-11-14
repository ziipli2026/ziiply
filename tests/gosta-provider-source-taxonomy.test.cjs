const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const lidl = fs.readFileSync("src/app/components/ziiply/offerSearch/providers/lidlPublicLeafletProvider.ts", "utf8");
const tokmanni = fs.readFileSync("src/app/components/ziiply/offerSearch/providers/tokmanniProvider.ts", "utf8");
test("Lidl structured grid preserves product taxonomy", () => {
  assert.match(lidl, /sourceCategoryPath: String\(product\.keyfacts\?\.wonCategoryPrimary \|\| product\.category \|\| ""\)/);
});
test("Lidl JSON-LD product parser preserves product taxonomy", () => {
  assert.match(lidl, /sourceCategoryPath: String\(product\.category \|\| ""\)/);
});
test("Lidl campaign card parser preserves product taxonomy", () => {
  const start = lidl.indexOf("function parseCampaignProductCards(");
  const end = lidl.indexOf("\nfunction productLinks(", start);
  assert.ok(start >= 0 && end > start);
  assert.match(lidl.slice(start, end), /sourceCategoryPath: String\(product\.category \|\| ""\)/);
});
test("Tokmanni retains page department without claiming product taxonomy", () => {
  assert.match(tokmanni, /sourceDepartment: "elintarvikkeet-ja-elainruoka"/);
  assert.match(tokmanni, /sourceCategoryPath: ""/);
});

test("Lidl source departments reject non-grocery offers before name heuristics", () => {
  const start = lidl.indexOf("function categoryFor(");
  const end = lidl.indexOf("\nfunction visitProducts(", start);
  assert.ok(start >= 0 && end > start);
  const source = lidl.slice(start, end).replace("name: string, sourceUrl: string", "name, sourceUrl");
  const categoryFor = new Function("normalize", "lidlProductCategory", source + "\nreturn categoryFor;")(
    value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, " "),
    () => null
  );
  assert.equal(categoryFor("Crelando Sukkalanka 2 kerää", "https://www.lidl.fi/h/ompelukone-ja-tarvikkeet/h10067530"), "Muut");
  assert.equal(categoryFor("Ultimate Speed Pullotunkki", "https://www.lidl.fi/h/auto-ja-moottoripyoerae/h10067538"), "Muut");
  assert.equal(categoryFor("Kanan fileepihvit", "https://www.lidl.fi/h/lihat/h10095752"), "Liha & makkarat");
  assert.equal(categoryFor("Pyykinpesuaine", "https://www.lidl.fi/h/siivous/h1001"), "Kodinhoito");
});

test("Lidl Plus keeps citrus fruit and excludes obvious non-food", () => {
  const provider = fs.readFileSync("src/app/components/ziiply/offerSearch/providers/lidlProvider.ts", "utf8");
  const start = provider.indexOf("function classifyLidlOffer(");
  const end = provider.indexOf("\nfunction formatPrice(", start);
  assert.ok(start >= 0 && end > start);
  const source = provider.slice(start, end).replace("name: string, brand = \"\"", "name, brand = \"\"");
  const classify = new Function("normalizeText", "lidlProductCategory", source + "\nreturn classifyLidlOffer;")(
    value => String(value).toLowerCase(), () => null
  );
  assert.equal(classify("Klementiini 1 kg"), "Hevi");
  assert.equal(classify("Mandariini 1 kg"), "Hevi");
  assert.equal(classify("Auton akkulaturi"), "Muut");
});

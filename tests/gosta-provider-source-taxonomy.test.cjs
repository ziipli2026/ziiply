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

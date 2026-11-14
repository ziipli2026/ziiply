const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("src/app/components/ziiply/offerSearch/ziiplyOfferSearchCore.ts", "utf8");
const start = source.indexOf("export function isGostaDailyGoodsOffer(");
const end = source.indexOf("\nexport function dedupeZiiplyGostaOfferResultsV146", start);
assert.ok(start >= 0 && end > start, "shared gate must exist");
const functionSource = source.slice(start, end).replace("export function isGostaDailyGoodsOffer(item: ZiiplyGostaOfferLike): boolean", "function isGostaDailyGoodsOffer(item)").replace(/ as any/g, "");
const normalizeGostaCoreText = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g," ja ").replace(/[^a-z0-9\s-]/g," ").replace(/\s+/g," ").trim();
const gate = new Function("getResolvedGostaCategoryV166", "normalizeGostaCoreText", functionSource + "\nreturn isGostaDailyGoodsOffer;")((item) => item.category, normalizeGostaCoreText);
const cases = [
  ["food", {title:"Maito",category:"Maitotuotteet",categoryPath:"Maitotuotteet > Maito"},true],
  ["cleaning", {title:"Pyykinpesuaine",category:"Kodinhoito",categoryPath:"Kodinhoito > Pyykinpesuaineet"},true],
  ["pet food", {title:"Kissanruoka",category:"Lemmikit",categoryPath:"Lemmikit > Ruoat"},true],
  ["non-grocery category", {title:"Neulelanka",category:"Koti & vapaa-aika",categoryPath:"Käsityöt > Neulelangat"},false],
  ["tool mislabeled food", {title:"Tunkki",category:"Kuivatuotteet",categoryPath:"Työkalut > Autotarvikkeet"},false],
  ["clothes mislabeled food", {title:"Takki",category:"Hevi",categoryPath:"Vaatteet > Ulkovaatteet"},false],
  ["garden miscategorized as produce", {title:"Kasvualusta",category:"Hevi",categoryPath:"Puutarha > Kasvualustat"},false],
  ["electronics miscategorized as drinks", {title:"Kodinkone",category:"Juomat",categoryPath:"Elektroniikka > Kodinkoneet"},false],
  ["cleaning hygiene", {title:"Astianpesuaine",category:"Kodinhoito",categoryPath:"Kodinhoito > Astianpesuaineet"},true],
  ["baby care", {title:"Vaipat",category:"Lastenhoito",categoryPath:"Lastenhoito > Vaipat"},true],
  ["unknown", {title:"Tuntematon",category:"Muut"},false],
  ["cached source taxonomy", {title:"Tuote",category:"Maitotuotteet",__sourceOfferSearchResult:{sourceCategoryPath:"Käyttötavarat > Työkalut"}},false],
];
for (const [name, item, expected] of cases) test(name, () => assert.equal(gate(item), expected));
test("no product-name blacklist", () => {
  const core = fs.readFileSync("src/app/components/ziiply/offerSearch/ziiplyOfferCategoryCore.ts","utf8");
  assert.ok(!core.includes("sukkalanka|pullotunkki|ompelutarvikelaatikko"));
});

test("Lidl preserves source taxonomy separately from display categories", () => {
  const provider = fs.readFileSync("src/app/components/ziiply/offerSearch/providers/lidlPublicLeafletProvider.ts", "utf8");
  assert.match(provider, /sourceCategoryPath\?: string/);
  assert.match(provider, /sourceCategoryPath: String\(product\.keyfacts\?\.wonCategoryPrimary \|\| product\.category \|\| ""\)/);
  assert.match(provider, /sourceCategoryPath: String\(product\.category \|\| ""\)/);
});
test("Tokmanni retains actual page scope, not a fabricated product category", () => {
  const provider = fs.readFileSync("src/app/components/ziiply/offerSearch/providers/tokmanniProvider.ts", "utf8");
  assert.match(provider, /sourceDepartment: "elintarvikkeet-ja-elainruoka"/);
  assert.match(provider, /sourceCategoryPath: ""/);
});
test("All public result cleaning paths use the same grocery gate", () => {
  const core = fs.readFileSync("src/app/components/ziiply/offerSearch/ziiplyOfferSearchCore.ts", "utf8");
  const dedupe = core.slice(core.indexOf("export function dedupeZiiplyGostaOfferResultsV146"), core.indexOf("export function cleanZiiplyGostaOfferResultsV146"));
  const clean = core.slice(core.indexOf("export function cleanZiiplyGostaOfferResultsV146"), core.indexOf("function gostaOfferSortPrice"));
  assert.match(dedupe, /!isGostaDailyGoodsOffer\(item\)/);
  assert.match(clean, /!isGostaDailyGoodsOffer\(item\)/);
});

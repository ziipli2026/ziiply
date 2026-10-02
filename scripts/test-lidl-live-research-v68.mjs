import { strict as assert } from "node:assert";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(import.meta.dirname, "..");
const source = readFileSync(join(root, "src/lib/lidlResearchSearch.ts"), "utf8");
const corpus = JSON.parse(readFileSync(join(root, "data/lidl/official-grocery-candidates-v44-2026-10-01.json"), "utf8"));
const evidence = JSON.parse(readFileSync(join(root, "data/lidl/independent-staple-ean-evidence-2026-10-02.json"), "utf8"));
const temp = mkdtempSync(join(tmpdir(), "ziiply-lidl-research-"));
try {
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, resolveJsonModule: true } });
  let js = compiled.outputText.replace(/from ["']\.\.\/\.\.\/data\/lidl\/official-grocery-candidates-v44-2026-10-01\.json["'];?/, "from './catalog.mjs';")
    .replace(/from ["']\.\.\/\.\.\/data\/lidl\/independent-staple-ean-evidence-2026-10-02\.json["'];?/, "from './evidence.mjs';");
  assert.ok(js.includes("./catalog.mjs") && js.includes("./evidence.mjs"), "Both production research imports must be mapped");
  writeFileSync(join(temp, "catalog.mjs"), "export default " + JSON.stringify(corpus) + ";");
  writeFileSync(join(temp, "evidence.mjs"), "export default " + JSON.stringify(evidence) + ";");
  writeFileSync(join(temp, "research.mjs"), js);
  const { searchLidlResearch } = await import(pathToFileURL(join(temp, "research.mjs")).href);
  const priced = corpus.records.filter(r => typeof r.displayedPriceEur === "number");
  assert.equal(priced.length, 110, "Price observation count changed; review before updating");
  const cases = ["maito", "jauheliha", "makaroni", "kananmunat", "kahvi", "kevytmaito", "kahvipavut", "kaurahiutale"];
  for (const query of cases) {
    const rows = searchLidlResearch(query);
    assert.deepEqual(rows, searchLidlResearch(query), "Search must be deterministic: " + query);
    assert.equal(new Set(rows.map(r => r.id)).size, rows.length, "Duplicate result ID: " + query);
    assert.ok(rows.length <= 15);
    assert.ok(rows.every(r => r.price === null && r.ean === null && r.priceVerified === false && r.storeItems.length === 0), "Unverified price leaked into checkout: " + query);
  }
  // Regular-food discovery regressions: these are research names, never priced cart rows.
  const discoveryCases = [
    ["kahvipavut", "Bellarom Extra Dark Roast kahvipavut"],
    ["tee", "Lord Nelson Earl Grey tee"],
    ["maito", "Ilona kevytmaito"],
    ["jogurtti", "Ilona mangojogurtti"],
    ["jogurtti", "Ilona maustamaton jogurtti"],
    ["juusto", "Ilona raejuusto"],
    ["juusto", "Milbona rasvaton raejuusto"],
  ];
  for (const [query, expectedName] of discoveryCases) {
    const rows = searchLidlResearch(query, 50);
    assert.ok(rows.some(r => r.name === expectedName), "Missing regular Lidl research result: " + query + " -> " + expectedName);
    assert.ok(rows.every(r => r.price === null && r.ean === null && r.priceVerified === false && r.storeItems.length === 0),
      "Research result leaked into priced cart: " + query);
  }
  assert.ok(searchLidlResearch("kahvipavut", 50).every(r => /kahvipav/i.test(r.name.normalize("NFKD").replace(/[\\u0300-\\u036f]/g, ""))),
    "Coffee beans search must not include ground/filter coffee");
  // Justiina receives this discovery ordering directly: do not lose relevant
  // results or accidentally promote observed catalog prices to checkout prices.
  for (const query of ["maito", "jogurtti", "juusto", "kahvipavut", "tee"]) {
    const rows = searchLidlResearch(query, 40);
    assert.ok(rows.every(r => r.source === "lidl.fi-public-research" && r.name.trim()),
      "Single-chain Lidl discovery source/name contract failed: " + query);
    assert.ok(rows.every(r => r.price === null && r.ean === null && r.priceVerified === false && r.storeItems.length === 0),
      "Single-chain Lidl discovery must stay unpriced: " + query);
    assert.deepEqual(rows, searchLidlResearch(query, 40), "Justiina ordering must be stable: " + query);
  }
  // Inflected/common singular forms should return the same Lidl research names.
  for (const [variant, canonical] of [["jogurtit", "jogurtti"], ["kahvipapu", "kahvipavut"]]) {
    assert.deepEqual(searchLidlResearch(variant, 50), searchLidlResearch(canonical, 50),
      "Lidl query form mismatch: " + variant + " -> " + canonical);
  }
  const observed = searchLidlResearch("oddlygood barista");
  assert.ok(observed.some(r => r.observedPriceEur === 1.89 && r.price === null && r.priceVerified === false), "Observed catalog price must remain separate");
  const quarantine = new Set(corpus.quarantinedProductIds.map(String));
  for (const q of ["olut", "lonkero"]) assert.ok(searchLidlResearch(q).every(r => !quarantine.has(String(r.lidlProductId))));
  const actualNames = new Set(corpus.records.map(r => String(r.name).toLowerCase()));
  const corporate = evidence.records.filter(r => r.eanStatus === "not_verified" && r.recordKind !== "generic-product-type-not-sku" && r.source.startsWith("https://corporate.lidl.fi/"));
  assert.ok(corporate.length > 0, "Corporate evidence missing");
  const sample = corporate.find(r => !actualNames.has(String(r.name).toLowerCase()));
  assert.ok(sample, "No independent named corporate evidence");
  const corporateWords = String(sample.name).split(/\s+/).filter(x => x.length > 3);
  assert.ok(corporateWords.length, "Corporate fixture needs a searchable word");
  const corporateHits = searchLidlResearch(corporateWords[0], 50);
  assert.ok(corporateHits.some(r => r.name === sample.name && r.priceVerified === false), "Corporate research name not discoverable: " + sample.name);
  console.log(JSON.stringify({ status: "PASS", testedProductionModule: true, queries: cases.length, observedPrices: priced.length, corporateEvidence: corporate.length }));
} finally { rmSync(temp, { recursive: true, force: true }); }

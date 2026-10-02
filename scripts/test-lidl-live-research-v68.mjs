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

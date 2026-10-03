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
  // All dated public category observations are provenance-only, never verified stock or checkout prices.
  const categoryObservations = evidence.records.filter(r => r.assortmentEvidence === "lidl-public-category-observation");
  assert.ok(categoryObservations.length >= 37, "Expected sourced Lidl category observations missing");
  for (const record of categoryObservations) {
    assert.ok(record.source.startsWith("https://www.lidl.fi/") && /^\d{4}-\d{2}-\d{2}$/.test(record.observedDate),
      "Category observation needs an official source and dated observation: " + record.name);
    assert.equal(record.recordKind, "lidl-named-product");
    assert.equal(record.ean, null);
    assert.equal(record.eanStatus, "not_verified");
    assert.equal(record.currentStoreStockVerified, false);
    assert.equal(Object.hasOwn(record, "price"), false, "Do not persist campaign prices as research prices: " + record.name);
  }
  // Full-batch data audit: every source row must be distinct and unpriced, not
  // merely the handful of names selected by representative search queries.
  const sourceKeys = new Set();
  for (const record of evidence.records) {
    assert.ok(typeof record.name === "string" && record.name.trim(), "Unnamed Lidl evidence");
    assert.ok(typeof record.source === "string" && record.source.startsWith("https://"), "Missing evidence URL: " + record.name);
    assert.equal(record.eanStatus, "not_verified", "Unexpected EAN verification: " + record.name);
    assert.equal(record.ean, null, "Unexpected EAN: " + record.name);
    assert.equal(Object.hasOwn(record, "price"), false, "Evidence row contains checkout price: " + record.name);
    const key = record.name.toLocaleLowerCase("fi-FI").trim() + "|" + record.source;
    assert.ok(!sourceKeys.has(key), "Duplicate Lidl source record: " + record.name);
    sourceKeys.add(key);
  }
  // Search results must retain each source observation date, not the evidence-file date.
  for (const record of categoryObservations) {
    const rows = searchLidlResearch(record.name, 50);
    const matching = rows.find(r => r.name === record.name && r.assortmentEvidence === record.assortmentEvidence);
    // Broad queries may hit the 50-result cap. The source row itself is
    // validated above; assert provenance whenever it survives result ranking.
    if (matching) {
      assert.equal(matching.observedDate, record.observedDate,
        "Individual Lidl source date was overwritten: " + record.name);
      assert.equal(matching.evidenceSource, record.source,
        "Individual Lidl evidence URL was overwritten: " + record.name);
      assert.equal(matching.price, null, "Unverified source gained checkout price: " + record.name);
      assert.equal(matching.ean, null, "Unverified source gained an EAN: " + record.name);
      assert.equal(matching.priceVerified, false);
      assert.deepEqual(matching.storeItems, []);
    }
  }
  // One representative batch covers all newly sourced food groups without per-word commits.
  for (const [query, expected] of [
    ["teriyaki", "Vitasia Teriyaki-broileriateria"], ["perhepizza", "Chef Select Perhepizza"],
    ["pelmeni", "Taschki Pelmeni"], ["kananugetit", "Kananugetit dipillä"],
    ["khinkali", "Kuljanka Khinkalitaikinanyytti"], ["borssikeitto", "Kuljanka Borssikeitto"],
    ["pastanyytti", "Kuljanka Pastanyytti raejuusto-perunatäytteellä"],
    ["liha perunanyytti", "Kuljanka Liha-perunanyytti"], ["paneroitu juusto", "Kuljanka Paneroitu juusto"],
    ["papu lihapata", "Podravka Papu-lihapata"], ["burgeri", "HK Burgeri 6 kpl"],
    ["croissantit", "Danerolles Croissantit 2 kpl"], ["reissumies", "Oululainen Reissumies Tosi Ohut 210 g"],
    ["hönösaaristolaisrieska", "Pågen Hönösaaristolaisrieska"],
    ["murea leikkele", "Snellman Tosi murea leikkele"], ["punainen lenkki", "Atria Punainen lenkki 2 kpl"],
    ["ramenliemi", "Vitasia Ramenliemi"], ["siitakesienitasku", "Vitasia Siitakesienitasku"],
    ["moniviljasiemensämpylä", "Moniviljasiemensämpylä 6 kpl"],
  ]) {
    assert.ok(searchLidlResearch(query, 50).some(r => r.name === expected && r.price === null && r.ean === null && r.priceVerified === false),
      "Sourced Lidl category batch result missing or priced: " + expected);
  }
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
  for (const [variant, canonical] of [["kananmunat","kananmuna"],["perunat","peruna"],["banaanit","banaani"],["juustot","juusto"],["leivät","leipä"],["makaronit","makaroni"],["jogurtit", "jogurtti"], ["kahvipapu", "kahvipavut"],["korvapuustit","korvapuusti"],["riisipiirakat","riisipiirakka"],["kaurahiutale","kaurahiutaleet"]]) {
    assert.deepEqual(searchLidlResearch(variant, 50), searchLidlResearch(canonical, 50),
      "Lidl query form mismatch: " + variant + " -> " + canonical);
  }
  // Compound staple queries must match the actual product name, not a flavour-only variant.
  for (const query of ["kahvi vanilja", "maito suklaa", "jogurtti mansikka"]) {
    const category = query.split(" ")[0];
    const rows = searchLidlResearch(query, 50);
    const singleCategoryNames = new Set(searchLidlResearch(category, 50).map(r => r.lidlProductId));
    assert.ok(rows.every(r => singleCategoryNames.has(r.lidlProductId)),
      "Compound Lidl staple query escaped product-name category: " + query);
  }
  // Tea must be an actual named product category, not merely a flavour variant.
  const teaIds = new Set(searchLidlResearch("tee", 50).map(r => r.lidlProductId));
  assert.ok(teaIds.size > 0, "Named Lidl tea research results missing");
  for (const query of ["tee vanilja", "tee sitruuna"]) {
    assert.ok(searchLidlResearch(query, 50).every(r => teaIds.has(r.lidlProductId)),
      "Tea compound search escaped product-name category: " + query);
  }
  // The API asks for 40 discovery candidates; the helper must preserve its explicit limit.
  for (const query of ["maito", "juusto", "jogurtti"]) {
    const forty = searchLidlResearch(query, 40);
    assert.ok(forty.length <= 40, "Lidl API discovery limit exceeded: " + query);
    assert.deepEqual(forty.slice(0, 15), searchLidlResearch(query, 15),
      "Increasing Lidl discovery limit changed the highest-ranked matches: " + query);
  }
  // Named Myllykivi and Combino products from Lidl's supplier article must be discoverable.
  for (const [query, expected] of [["pikakaurahiutaleet", "Myllykivi pikakaurahiutaleet"], ["kaurapasta", "Combino kaurapasta"]]) {
    const rows = searchLidlResearch(query, 50);
    assert.ok(rows.some(r => r.name === expected && r.price === null && r.ean === null && r.priceVerified === false),
      "Missing documented Lidl supplier research name: " + expected);
  }
  // Two separately documented bakery names are historical research, not verified SKUs.
  for (const [query, expected] of [["jättikorvapuusti", "Jättikorvapuusti"], ["pakasteriisipiirakka", "Pakasteriisipiirakka"]]) {
    const rows = searchLidlResearch(query, 50);
    assert.ok(rows.some(r => r.name === expected && r.price === null && r.ean === null && r.priceVerified === false),
      "Missing documented historical Lidl bakery name: " + expected);
  }
  // Ordinary grocery terms should discover documented compound product names.
  for (const [query, expected] of [["korvapuusti", "Jättikorvapuusti"], ["korvapuustit", "Jättikorvapuusti"], ["riisipiirakka", "Pakasteriisipiirakka"], ["riisipiirakat", "Pakasteriisipiirakka"], ["kaurahiutaleet", "Myllykivi pikakaurahiutaleet"], ["kaurahiutale", "Myllykivi pikakaurahiutaleet"]]) {
    assert.ok(searchLidlResearch(query, 50).some(r => r.name === expected && r.price === null && r.ean === null),
      "Lidl compound-name discovery failed: " + query + " -> " + expected);
  }
  // Official Lidl dairy category: one batched discovery check for four named records.
  for (const [query, expected] of [
    ["proteiinivanukas", "Milbona proteiinivanukas"],
    ["vadelmakefir", "Pilos vadelmakefir"],
    ["höyrytetty juusto", "Kuljanka höyrytetty juusto"],
    ["eränkävijä", "Kuusamon Juusto Eränkävijä-juusto"],
  ]) {
    assert.ok(searchLidlResearch(query, 50).some(r => r.name === expected && r.ean === null && r.price === null && r.priceVerified === false),
      "Official dairy research candidate missing or incorrectly priced: " + expected);
  }
  // Batch-check six dated Lidl dairy category observations; no promotion price becomes a checkout price.
  for (const [query, expected] of [
    ["turkkilainen jogurtti","Juustoportti pehmeä turkkilainen jogurtti"],
    ["maalaishyytelö","Kartanon maalaishyytelö"],
    ["juustoviipale","Arla juustoviipale"],
    ["soijavalmiste","Alpro soijavalmiste"],
    ["tuorejuusto","Jokilaakson Juusto tuorejuusto"],
    ["proteiinipirtelö","Arla proteiinipirtelö"],
  ]) {
    assert.ok(searchLidlResearch(query, 50).some(r => r.name === expected && r.ean === null && r.price === null && r.priceVerified === false),
      "Dated Lidl dairy research observation missing or priced: " + expected);
  }
  // One batch covers the fifteen official dry-grocery category observations.
  for (const [query, expected] of [
    ["nuudeli", "MAMA Nuudeli 6-pack"], ["snack pot", "KNORR Snack Pot"],
    ["kuppinuudeli", "NISSIN Kuppinuudeli 4 kpl"], ["sushiriisi", "Vitasia sushiriisi"],
    ["udonnuudeli", "Vitasia maustettu udonnuudeli"], ["ramen", "Vitasia Udon- tai Ramen-nuudeli"],
    ["sobanuudelit", "Vitasia sobanuudelit"], ["pankojauho", "SamLip pankojauho"],
    ["misokeitto", "Vitasia misokeitto"], ["sushi inkivääri", "Vitasia sushi-inkivääri"],
    ["maustekurkut", "Kuljanka maustekurkut etikkaliemessä"], ["hapankurkku", "Kuljanka hapankurkku"],
    ["gulassikeitto", "Kuljanka gulassikeitto"], ["ajvar", "Kuljanka ajvar-paprikatahna"],
    ["hapankaali", "Kuljanka hapankaali"],
  ]) {
    assert.ok(searchLidlResearch(query, 50).some(r => r.name === expected && r.ean === null && r.price === null && r.priceVerified === false),
      "Official Lidl dry-grocery research candidate missing or priced: " + expected);
  }
  // Dated official frozen-food and vegetable category observations, checked as one batch.
  for (const [query, expected] of [
    ["gyoza", "Vitasia Gyoza-taikinanyytti 400 g"], ["kalapihvi", "Leroy Rapea kalapihvi"],
    ["surimikatkaravut", "Vitasia Surimikatkaravut"], ["edamamepavut", "Vitasia Edamamepavut 200 g"],
    ["mochijäätelö", "Vitasia Mochijäätelö"], ["juustokakkujäätelö", "Gelatelli Juustokakkujäätelö"],
    ["minijäätelöpuikko", "Magnum Minijäätelöpuikko 6-pack"],
    ["pikkutomaatti", "Kotimainen pikkutomaatti"], ["retiisi", "Retiisi"],
    ["porkkana", "Kotimainen porkkana"], ["hokkaidokurpitsa", "Kotimainen hokkaidokurpitsa"],
    ["varsiselleri", "Kotimainen varsiselleri"], ["kiinankaali", "Kotimainen kiinankaali"],
    ["peruna", "Kotimainen peruna"], ["ruusukaali", "Kotimainen ruusukaali"],
    ["punajuuri", "Kotimainen punajuuri"], ["kirsikkatomaatti", "Kotimainen kirsikkatomaatti"],
  ]) {
    assert.ok(searchLidlResearch(query, 50).some(r => r.name === expected && r.ean === null && r.price === null && r.priceVerified === false),
      "Lidl frozen/vegetable research candidate missing or priced: " + expected);
  }
  // Names recovered from the exact public category listings, still unpriced research.
  for (const [query, expected] of [["ramenkeitto","Vitasia ramenkeitto"],["turkkilainen jogurtti","Juustoportti pehmeä turkkilainen jogurtti 4 kpl"]]) {
    assert.ok(searchLidlResearch(query, 50).some(r=>r.name===expected && r.price===null && r.ean===null && r.priceVerified===false),
      "Lidl category observation missing or incorrectly priced: "+expected);
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

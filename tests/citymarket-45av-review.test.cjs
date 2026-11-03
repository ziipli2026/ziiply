const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
function loadExports(file, names) {
  let source = fs.readFileSync(path.join(root, file), "utf8");
  for (const name of names) source = source.replace(new RegExp("export\\s+function\\s+" + name + "\\b"), "function " + name);
  source += "\nmodule.exports = {" + names.join(",") + "};";
  const mod = { exports: {} };
  new Function("module", "exports", source)(mod, mod.exports);
  return mod.exports;
}
const fixes = loadExports("src/app/components/ziiply/offerSearch/providers/kCitymarket45AVCorrections.js",
  ["repairCitymarketPrintedTitle", "removeDuplicateContinuationRows", "repairCitymarketCategory"]);
const proof = loadExports("src/app/components/ziiply/offerSearch/providers/kCitymarketPrintedTransactionProof.js",
  ["verifyPrintedTransaction"]);
const evidence = JSON.parse(fs.readFileSync(path.join(root, "diagnostics/45AV/parser-evidence.json"), "utf8"));
const byTitle = fragment => evidence.rows.find(row => String(row.title).toLowerCase().includes(fragment));
test("45AV corrected titles and prices retain the original publisher image card identity", () => {
  const provider = fs.readFileSync(path.join(root, "src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts"), "utf8");
  assert.match(provider, /_45AV_KCM\/i\.test\(leafletUrl\)/);
  assert.match(provider, /publisherOfferId:"kcm:spatial:"\+page\+":"\+rawTitle\+":"\+suffix/);
  assert.match(provider, /publisherOfferId:row\.publisherOfferId/);
});
test("45AV unresolved image audit retains OCR evidence for manual review", () => {
  const source = fs.readFileSync(path.join(root, "scripts/citymarket/build-images.py"), "utf8");
  assert.match(source, /ocrWords/);
  assert.match(source, /manual-review-needed/);
});
test("45AV clipped Mikroateriat title is reconstructed from the bilingual publisher line", () => {
  assert.equal(fixes.repairCitymarketPrintedTitle(byTitle("eriat 300 g")), "MIKROATERIAT 300 g");
});
test("45AV clipped J in JAUHOINEN PERUNA is restored", () => {
  const row = byTitle("auhoinen peruna");
  assert.equal(fixes.repairCitymarketPrintedTitle(row), "KIINTEÄ, YLEIS ja JAUHOINEN PERUNA 2 kg");
});
test("45AV leading price glyph is not retained as part of Fazer KLASSIKOT", () => {
  assert.equal(fixes.repairCitymarketPrintedTitle(byTitle("6klassikot")), "KLASSIKOT 260 g (24,19/kg)");
});
test("duplicate TUMMA continuation is removed without dropping the complete Vaasan product", () => {
  const rows = evidence.rows.filter(row => /MOILAS FREE FROM|^TUMMA 3 kpl/i.test(String(row.title)));
  assert.equal(rows.length, 2);
  const kept = fixes.removeDuplicateContinuationRows(rows);
  assert.equal(kept.length, 1);
  assert.match(kept[0].title, /MOILAS FREE FROM OHUT TUMMA/);
});
test("45AV fallback categories are replaced with product-form categories", () => {
  const cases = [
    ["MIKROATERIAT 300 g", "Valmisruoka"],
    ["VIHIS KASVISPIIRAKKA 115 g", "Valmisruoka"],
    ["ARRUFATINA KLEMENTIINI 1,5 kg", "Hevi"],
    ["Vaasan LAKTOOSITON MOILAS FREE FROM OHUT TUMMA 3 kpl/150 g", "Leipomo"],
    ["HAMPURILAISET 150 g", "Liha & makkarat"],
    ["SILLIT 210–245 g", "Kala"],
    ["CRISPY FISH 240 g/2 kpl", "Pakasteet"],
    ["KLASSIKOT 260 g", "Makeiset & keksit"],
    ["JUHLAPÖYDÄN KONVEHTEJA 300 g", "Makeiset & keksit"],
    ["HIENOJA KONVEHTEJA 170 g", "Makeiset & keksit"],
    ["KONVEHDIT 175 g", "Makeiset & keksit"],
    ["JULESKUM 250 g", "Makeiset & keksit"],
    ["NIVEA VARTALOVOITEET 100–400 ml", "Hygienia & kosmetiikka"],
    ["TUOPPI 0,48 l", "Koti & vapaa-aika"],
    ["KIERRÄTYSASTIA 6 l", "Koti & vapaa-aika"],
    ["VICHY tai NOVELLE KIVENNÄISVEDET 0,33 l/tlk 6-pack", "Juomat"],
    ["PAPRIKA 2 kpl/300 g", "Hevi"],
    ["KIINTEÄ, YLEIS ja AUHOINEN PERUNA 2 kg", "Hevi"],
    ["PROTEIN RAHKAT 200 g", "Maitotuotteet"],
    ["TÄYSMEHUT 900 ml/pl tai", "Juomat"],
    ["SMOOTHIET 750 ml/pl", "Juomat"],
    ["VITAL HYVINVOINTIMEHUT 1 l", "Juomat"],
    ["PASTAT 600–650 g", "Kuivatuotteet"],
    ["SAVUSTETTU KIRJOLOHIFILEE n. 700 g", "Kala"],
    ["RIISIPUURO 300 g", "Valmisruoka"],
    ["KINKKUSUIKALEET 300 g", "Liha & makkarat"],
    ["LV PYYKINPESUNESTEET 750 ml", "Kodinhoito"],
    ["WC-PAPERI 16 rl", "Kodinhoito"],
  ];
  for (const [title, expected] of cases) assert.equal(fixes.repairCitymarketCategory(title, "Muut"), expected, title);
});
test("Juleskum printed glyph is reconciled to its own 250 g × 7.96 €/kg rate", () => {
  const row = byTitle("juleskum 250 g");
  const fixed = proof.verifyPrintedTransaction(row, row.debugNearbyBoxes);
  assert.equal(fixed.spatialResolved.value, 1.99);
});
test("Vital 2 × 1 l transaction is reconciled to the printed 2.35 €/l rate", () => {
  const row = byTitle("vital hyvinvointimehut");
  const fixed = proof.verifyPrintedTransaction(row, row.debugNearbyBoxes);
  assert.equal(fixed.spatialResolved.value, 4.70);
  assert.equal(fixed.spatialResolved.quantity, 2);
});

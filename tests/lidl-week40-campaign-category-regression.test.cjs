const test = require("node:test");
const assert = require("node:assert/strict");

function classifyLidlOffer(name, brand = "") {
  const s = `${name} ${brand}`.toLowerCase();
  if (/korvapuusti|ruispala|blini|kreikkalainen juustotanko/.test(s)) return "Leipomo";
  if (/maito|jogur|jugur|rahka|juusto|kerma|voi\b|piima|viili/.test(s)) return "Maitotuotteet";
  return "Muut";
}

function splitMeatballForCampaign(structured) {
  const meatballOfficial = structured.find(item =>
    String(item.name || item.title || "").toLowerCase().includes("kotimainen lihapulla")
  );
  return {
    meatballOfficial,
    structuredForMerge: meatballOfficial ? structured.filter(item => item !== meatballOfficial) : structured,
  };
}

test("Kreikkalainen juustotanko is bakery, not dairy", () => {
  assert.equal(classifyLidlOffer("Kreikkalainen juustotanko"), "Leipomo");
});

test("Kartanon Lidl Plus origin is removed before verified campaign merge", () => {
  const meatball = { id: "lidl-plus-meatball", name: "Kotimainen lihapulla", imageUrl: "https://example.test/meatball.jpg" };
  const selleri = { id: "lidl-plus-selleri", name: "Kotimainen varsiselleri 250 g" };
  const { meatballOfficial, structuredForMerge } = splitMeatballForCampaign([meatball, selleri]);
  assert.equal(meatballOfficial, meatball);
  assert.deepEqual(structuredForMerge, [selleri]);
  assert.equal(meatballOfficial.imageUrl, "https://example.test/meatball.jpg");
});

test("unrelated Lidl Plus offers remain in Tarjoukset", () => {
  const rows = [
    { id: "a", name: "Kotimainen varsiselleri 250 g" },
    { id: "b", name: "Riihiruispala" },
  ];
  const { meatballOfficial, structuredForMerge } = splitMeatballForCampaign(rows);
  assert.equal(meatballOfficial, undefined);
  assert.deepEqual(structuredForMerge, rows);
});

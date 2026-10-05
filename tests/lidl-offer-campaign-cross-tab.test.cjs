const test = require("node:test");
const assert = require("node:assert/strict");

function buildLidlMaster(combined, publicCampaigns) {
  return [...combined, ...publicCampaigns];
}

test("Lidl Plus store-feed row stays in Tarjoukset", () => {
  const offer = {
    id: "lidl-FI0218-product-1",
    name: "Kotimainen varsiselleri 250 g",
    source: "lidl-plus",
  };
  const master = buildLidlMaster([offer], []);
  assert.equal(master.filter((x) => x.campaignType !== "campaign").length, 1);
  assert.equal(master.filter((x) => x.campaignType === "campaign").length, 0);
});

test("explicit verified short campaign stays only in Kampanjat", () => {
  const campaign = {
    id: "lidl-leaflet-danerolles-croissants-20261005",
    name: "Danerolles Croissantit 240 g",
    source: "verified-official-leaflet",
    campaignType: "campaign",
    campaignSection: "5.–7.10.",
  };
  const master = buildLidlMaster([campaign], []);
  assert.equal(master.filter((x) => x.campaignType !== "campaign").length, 0);
  assert.equal(master.filter((x) => x.campaignType === "campaign").length, 1);
});

test("public Lidl campaign remains a campaign without changing store-feed offers", () => {
  const offer = { id: "lidl-FI0218-a", name: "Tarjous A", source: "lidl-plus" };
  const campaign = { id: "lidl-public-campaign-b", name: "Kampanja B", source: "lidl-fi-public", campaignType: "campaign" };
  const master = buildLidlMaster([offer], [campaign]);
  assert.deepEqual(master.filter((x) => x.campaignType !== "campaign").map((x) => x.id), ["lidl-FI0218-a"]);
  assert.deepEqual(master.filter((x) => x.campaignType === "campaign").map((x) => x.id), ["lidl-public-campaign-b"]);
});

test("store-feed offers are never promoted wholesale into campaigns", () => {
  const combined = [
    { id: "lidl-FI0218-a", source: "lidl-plus" },
    { id: "lidl-FI0218-b", source: "lidl-plus" },
    { id: "lidl-leaflet-carrot", source: "verified-official-leaflet" },
  ];
  const master = buildLidlMaster(combined, []);
  assert.equal(master.filter((x) => x.campaignType === "campaign").length, 0);
  assert.equal(master.filter((x) => x.campaignType !== "campaign").length, 3);
});

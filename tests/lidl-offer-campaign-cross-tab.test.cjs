const test = require("node:test");
const assert = require("node:assert/strict");

function removeStructuredCampaignOrigins(combined, structuredCampaigns) {
  const structuredCampaignOriginIds = new Set(
    structuredCampaigns
      .map((offer) => String(offer.id || "").replace(/^lidl-campaign-/, ""))
      .filter(Boolean),
  );

  return combined.filter((offer) =>
    offer.campaignType === "campaign" ||
    !structuredCampaignOriginIds.has(String(offer.id || ""))
  );
}

test("Lidl Plus campaign origin is not left in Tarjoukset", () => {
  const original = {
    id: "lidl-FI0218-product-1",
    name: "Kotimainen varsiselleri 250 g",
    source: "lidl-plus",
  };
  const campaign = {
    ...original,
    id: "lidl-campaign-lidl-FI0218-product-1",
    source: "lidl-plus-campaign",
    campaignType: "campaign",
  };

  const offers = removeStructuredCampaignOrigins([original], [campaign]);
  assert.deepEqual(offers, []);
});

test("independent verified leaflet row stays in Tarjoukset", () => {
  const leaflet = {
    id: "lidl-leaflet-carrot",
    name: "Kotimainen porkkana 1 kg",
    source: "verified-official-leaflet",
  };
  const campaign = {
    id: "lidl-campaign-lidl-FI0218-product-1",
    name: "Kotimainen varsiselleri 250 g",
    source: "lidl-plus-campaign",
    campaignType: "campaign",
  };

  const offers = removeStructuredCampaignOrigins([leaflet], [campaign]);
  assert.deepEqual(offers, [leaflet]);
});

test("existing campaign rows are never removed from the shared master side", () => {
  const shortCampaign = {
    id: "lidl-leaflet-danerolles-croissants-20261005",
    name: "Danerolles Croissantit 240 g",
    source: "verified-official-leaflet",
    campaignType: "campaign",
    campaignSection: "5.–7.10.",
  };
  const sameIdStructured = {
    id: "lidl-campaign-lidl-leaflet-danerolles-croissants-20261005",
    campaignType: "campaign",
  };

  const rows = removeStructuredCampaignOrigins([shortCampaign], [sameIdStructured]);
  assert.deepEqual(rows, [shortCampaign]);
});

test("cross-tab identity invariant: promoted Lidl Plus id cannot remain non-campaign", () => {
  const combined = [
    { id: "lidl-FI0218-a", name: "A", source: "lidl-plus" },
    { id: "lidl-FI0218-b", name: "B", source: "lidl-plus" },
    { id: "lidl-leaflet-carrot", name: "Porkkana", source: "verified-official-leaflet" },
  ];
  const campaigns = [
    { id: "lidl-campaign-lidl-FI0218-a", name: "A", campaignType: "campaign" },
    { id: "lidl-campaign-lidl-FI0218-b", name: "B", campaignType: "campaign" },
  ];

  const offers = removeStructuredCampaignOrigins(combined, campaigns);
  const campaignOrigins = new Set(campaigns.map((x) => x.id.replace(/^lidl-campaign-/, "")));

  assert.equal(offers.some((x) => campaignOrigins.has(x.id) && x.campaignType !== "campaign"), false);
  assert.deepEqual(offers.map((x) => x.id), ["lidl-leaflet-carrot"]);
});

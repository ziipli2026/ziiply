import assert from "node:assert/strict";
import fs from "node:fs";

const fixturePath = "tests/fixtures/citymarket/41LV.approved.json";
const manifestPath = "src/app/components/ziiply/offerSearch/providers/data/kCitymarketLeafletImages.json";
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const entry = Object.entries(manifest.publications).find(([url]) => url.includes("_41LV_KCM/"));
if (!entry) {
  console.error("41LV image manifest not found. Import only the approved 41LV manifest entry from main before running this audit.");
  process.exitCode = 2;
} else {
  const [publicationUrl, publication] = entry;
  const keys = new Set(fixture.offers.map(row => row.key));
  const imageKeys = Object.keys(publication.images);
  assert.equal(fixture.offers.length, fixture.offerCount);
  assert.equal(publication.offerCount, fixture.offerCount);
  assert.equal(keys.size, fixture.offerCount, "Duplicate fixture offer identifiers");
  assert.ok(imageKeys.every(key => keys.has(key)), "Manifest image is not in approved fixture");
  const uncovered = fixture.offers.filter(row => !publication.images[row.key]);
  const report = {
    publicationUrl, approvedOffers: fixture.offerCount,
    existingImages: imageKeys.length, missingImages: uncovered.length,
    missing: uncovered.map(row => ({ key: row.key, page: row.page, identity: row.identity })),
  };
  console.log(JSON.stringify(report, null, 2));
}

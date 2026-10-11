import fs from "node:fs";
import assert from "node:assert/strict";
const fixture = JSON.parse(fs.readFileSync("tests/fixtures/citymarket/41LV.approved.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("src/app/components/ziiply/offerSearch/providers/data/kCitymarketLeafletImages.json", "utf8"));
const review = JSON.parse(fs.readFileSync("scripts/citymarket/41lv-image-source-candidates.json", "utf8"));
const publication = manifest.publications[fixture.sourceUrl];
assert.ok(publication, "Missing publication");
assert.equal(publication.pdfSha256, fixture.pdfSha256);
const offerById = new Map(fixture.offers.map(offer => [offer.key, offer]));
const seen = new Set();
for (const candidate of review.candidates) {
  assert.ok(!seen.has(candidate.offerId), "Duplicate candidate offer ID");
  seen.add(candidate.offerId);
  const offer = offerById.get(candidate.offerId);
  assert.ok(offer, "Candidate must match exact approved 41LV offer");
  assert.ok(offer.identity.includes(candidate.fragment), "Candidate product identity mismatch");
  assert.ok(!publication.images[candidate.offerId], "Candidate already has approved image");
  assert.match(candidate.ean, /^[0-9]{13}$/, "Invalid EAN");
  assert.ok(candidate.url.startsWith("https://www.k-ruoka.fi/kauppa/tuote/"), "Unexpected source");
  assert.ok(candidate.url.endsWith("-" + candidate.ean), "Product URL EAN mismatch");
  assert.equal(candidate.approved, false, "External source alone cannot approve image");
  assert.equal(candidate.imageUrl, null, "No image without verified image evidence");
}
console.log("Verified " + seen.size + " candidate records; no unapproved images were added.");

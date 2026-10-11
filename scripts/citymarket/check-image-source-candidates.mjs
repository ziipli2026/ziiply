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
  assert.ok(candidate.status === "product-identity-verified-image-not-extracted" || candidate.status === "image-candidate-found-needs-rights-and-leaflet-visual-verification", "Unknown candidate status");
  assert.equal(candidate.imageUrl === null, candidate.status === "product-identity-verified-image-not-extracted", "Candidate image and review status must agree");
  assert.equal(candidate.approved, false, "External source alone cannot approve image");
  if (candidate.imageUrl !== null) {
    assert.ok(candidate.imageUrl.startsWith("https://"), "Image candidate must use HTTPS");
    assert.ok(candidate.imageEvidenceUrl?.startsWith("https://"), "Image candidate requires source evidence");
    assert.equal(candidate.approved, false, "Found image must remain unapproved until verified");
  }
}
console.log("Verified " + seen.size + " candidate records; no unapproved images were added.");

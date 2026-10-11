import fs from "node:fs";
import assert from "node:assert/strict";

// Read-only preparation from approved leaflet fixtures. Never guesses image URLs.
const fixturePath = process.argv[2] ?? "tests/fixtures/citymarket/41LV.approved.json";
const manifestPath = "src/app/components/ziiply/offerSearch/providers/data/kCitymarketLeafletImages.json";
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const publication = Object.entries(manifest.publications).find(([url]) => url === fixture.sourceUrl)?.[1];
assert.ok(publication, "No exact matching publication; do not mix images between issues");
assert.equal(publication.pdfSha256, fixture.pdfSha256, "Leaflet hash mismatch");
assert.equal(publication.offerCount, fixture.offerCount, "Offer count mismatch");
const missing = fixture.offers.filter(offer => !publication.images[offer.key]);
const ambiguous = /(?:^|\s)(?:tai|sekä|seka|valikoima|erilaiset|useita|lajitelma|ja)(?=\s|$)|\d+\s*[–-]\s*\d+\s*(?:g|kg|ml|l)\b/i;
const rows = missing.map(offer => ({
  offerId: offer.key,
  page: offer.page,
  identity: offer.identity,
  priceToken: offer.priceToken,
  reviewStatus: "needs-visual-verification",
  reviewPriority: ambiguous.test(offer.identity) ? "manual-multi-product" : "manual-single-product",
  imageUrl: null,
  approved: false,
  evidence: "approved-leaflet-fixture",
}));
const report = {
  publicationUrl: fixture.sourceUrl,
  leafletSha256: fixture.pdfSha256,
  totalOffers: fixture.offerCount,
  existingImages: Object.keys(publication.images).length,
  missingImages: rows.length,
  rows,
};
assert.equal(report.totalOffers, report.existingImages + report.missingImages);
console.log(JSON.stringify(report, null, 2));

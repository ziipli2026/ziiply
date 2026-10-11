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
  // Verify every approved image points to a real local SVG fragment.
  const expectedAsset = "/citymarket-leaflets/" + publication.pdfSha256 + "/images.svg";
  const assetPath = "public" + expectedAsset;
  assert.ok(fs.existsSync(assetPath), "41LV SVG image asset missing: " + assetPath);
  const svg = fs.readFileSync(assetPath, "utf8");
  assert.ok(svg.startsWith("<svg "), "41LV image asset must be an SVG");
  const fragmentIds = new Set([...svg.matchAll(/<view\\s+id="([^"]+)"/g)].map(match => match[1]));
  for (const [key, image] of Object.entries(publication.images)) {
    assert.ok(image.startsWith(expectedAsset + "#"), "Unexpected 41LV image path for " + key);
    const fragment = image.slice(expectedAsset.length + 1);
    assert.ok(fragmentIds.has(fragment), "41LV SVG fragment missing for " + key + ": " + fragment);
  }
  const uncovered = fixture.offers.filter(row => !publication.images[row.key]);
  const unsafeName = /\b(tai|sekä|seka|ja|valikoima|erilaiset|useita|lajitelma)\b|\d+\s*[–-]\s*\d+\s*(?:g|kg|ml|l)\b|\b(?:plussa-kortilla|ilman plussa-korttia)\b/i;
  const diagnostic = uncovered.map(row => ({ ...row, candidateSafe: !unsafeName.test(row.identity) && !/\b(?:geelit|suihkeet|tiivisteet|tahranpoistajat|jäätelöt|juustoviipaleet|pyykinpesunesteet|täysmehut|rahkat|vanukkaat|pyykkietikat|suihkugeelit|wc-paperi|meikkivoide)\b/i.test(row.identity) }));
  // Conservative identity extraction for a diagnostic-only bank lookup.
  // The approved leaflet fixture does not contain EANs or verified brands.
  const parseIdentity = (identity) => {
    const raw = identity.trim();
    if (unsafeName.test(raw) || /\b(?:plussa|ilman|tarjous|norm\.|alk\.)\b/i.test(raw)) return null;
    const matches = [...raw.matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\b/gi)];
    if (matches.length !== 1) return null;
    const match = matches[0];
    const before = raw.slice(0, match.index).trim();
    const after = raw.slice(match.index + match[0].length).trim();
    if (after && !/^\([^)]*\)$/.test(after)) return null;
    if (before.length < 12 || /\d|\/|\b(?:ja|tai|sekä|seka)\b/i.test(before)) return null;
    if (/\b(?:geelit|suihkeet|tiivisteet|tahranpoistajat|jäätelöt|juustoviipaleet|pyykinpesunesteet|täysmehut|rahkat|vanukkaat|pyykkietikat|suihkugeelit|wc-paperi|meikkivoide)\b/i.test(before)) return null;
    return { name: before, packageSize: match[1].replace(",", ".") + " " + match[2].toLowerCase() };
  };
  const parsed = uncovered.map(row => ({ ...row, extracted: parseIdentity(row.identity) }));
  // Review candidates are evidence, not approved images. Keep them outside the manifest.
  const manualEvidence = [
    { identity: "arkimeetvursti 400 g", ean: "6409630019507", bankName: "Kotivara Arkimeetvursti 400g", status: "brand-unverified", evidence: "Neon product bank; leaflet brand not verified" },
    { identity: "poron paistikäristys 400 g", ean: "6405980450007", bankName: "Rönkä Poron paistikäristys 400 g pakaste", status: "brand-unverified", evidence: "Neon product bank; leaflet brand not verified" },
    { identity: "sriracha kastikkeet 215 ml", ean: "8710605030556", bankName: "Go-Tan Tulinen sriracha chili ketsuppi kastike 215ml", status: "multi-product-offer", evidence: "Plural offer; one image cannot represent every variant" },
  ];
  const reviewCandidates = manualEvidence.map(candidate => {
    const offer = uncovered.find(row => row.identity === candidate.identity);
    assert.ok(offer, "Review candidate must exist in the approved 41LV fixture: " + candidate.identity);
    assert.ok(!publication.images[offer.key], "Review candidates must not overwrite approved images");
    return { offerId: offer.key, ...candidate, approved: false };
  });
  const report = {
    publicationUrl, approvedOffers: fixture.offerCount,
    existingImages: imageKeys.length, missingImages: uncovered.length,
    imageAssetVerified: true, verifiedImageFragments: imageKeys.length,
    diagnosticOnly: true,
    reviewCandidates,
    nameParsingCandidates: diagnostic.filter(row => row.candidateSafe).length, // candidates only; never automatic image approval
    manualReviewCandidates: diagnostic.filter(row => !row.candidateSafe).length,
    extractedIdentityCount: parsed.filter(row => row.extracted).length,
    extractedIdentities: parsed.filter(row => row.extracted).map(row => ({ key: row.key, ...row.extracted })),
    missing: diagnostic,
  };
  console.log(JSON.stringify(report, null, 2));
}

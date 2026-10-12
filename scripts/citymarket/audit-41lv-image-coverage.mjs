import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";

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
  const bankApproval = JSON.parse(fs.readFileSync("scripts/citymarket/41lv-verified-bank-images.json", "utf8"));
  assert.equal(bankApproval.leafletSha256, fixture.pdfSha256, "Bank approval belongs to another leaflet");
  const approvedBankById = new Map(bankApproval.images.map(row => [row.offerId, row]));
  assert.equal(approvedBankById.size, bankApproval.images.length, "Duplicate bank approvals");
  const localImageKeys = imageKeys.filter(key => publication.images[key].includes("/images.svg#"));
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
  const fragmentIds = new Set([...svg.matchAll(/<view\s+id="([^"]+)"/g)].map(match => match[1]));
  assert.equal(fragmentIds.size, localImageKeys.length, "Unexpected or duplicate 41LV SVG view IDs");
  const usedFragments = new Set();
  for (const [key, image] of Object.entries(publication.images)) {
    if (image.startsWith("/") && image.endsWith(".png")) {
      const proof = approvedBankById.get(key);
      assert.ok(proof?.approved && proof.leafletVisualMatch && proof.imageFetchedAndViewed, "Embedded image lacks visual approval");
      assert.equal(proof.sourceType, "leaflet-embedded");
      assert.equal(proof.sourcePdfSha256, fixture.pdfSha256);
      assert.equal(image, proof.imageUrl);
      assert.ok(image.startsWith("/citymarket-leaflets/" + fixture.pdfSha256 + "/"));
      assert.ok(Array.isArray(proof.imageXrefs) && proof.imageXrefs.every(x => Number.isInteger(x) && x > 0));
      const bytes = fs.readFileSync("public" + image);
      assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "Not a PNG");
      assert.equal(createHash("sha256").update(bytes).digest("hex"), proof.assetSha256);
      continue;
    }
    if (image.startsWith("https://")) {
      const proof = approvedBankById.get(key);
      assert.ok(proof?.approved && proof.imageFetchedAndViewed && (proof.leafletVisualMatch || (proof.printedIdentityVerified && proof.sourceIdentityVerified && proof.sourceUrl?.startsWith("https://"))), "External image lacks verified identity evidence");
      assert.equal(image, proof.imageUrl, "Bank image differs from reviewed URL");
      assert.match(proof.ean, /^\d{13}$/);
      assert.ok(keys.has(proof.offerId));
      continue;
    }
    assert.ok(image.startsWith(expectedAsset + "#"), "Unexpected 41LV image path for " + key);
    const fragment = image.slice(expectedAsset.length + 1);
    assert.ok(fragmentIds.has(fragment), "41LV SVG fragment missing for " + key + ": " + fragment);
    assert.ok(!usedFragments.has(fragment), "41LV SVG fragment reused by multiple offers: " + fragment);
    usedFragments.add(fragment);
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
  const reviewCandidates = manualEvidence.filter(candidate => uncovered.some(row => row.identity === candidate.identity)).map(candidate => {
    const offer = uncovered.find(row => row.identity === candidate.identity);
    assert.ok(offer, "Review candidate must exist in the approved 41LV fixture: " + candidate.identity);
    assert.ok(!publication.images[offer.key], "Review candidates must not overwrite approved images");
    assert.ok(/^\d{13}$/.test(candidate.ean), "Review candidate EAN must contain 13 digits");
    assert.ok(["brand-unverified", "multi-product-offer"].includes(candidate.status), "Review candidate must carry a blocking reason");
    return { offerId: offer.key, page: offer.page, ...candidate, approved: false, eligibleForAutomaticImage: false, nextAction: candidate.status === "multi-product-offer" ? "Verify all variants in the leaflet before choosing any image" : "Verify printed brand and pictured packaging on leaflet page " + offer.page };
  });
  assert.equal(new Set(reviewCandidates.map(row => row.offerId)).size, reviewCandidates.length, "Duplicate 41LV review candidates");
  assert.ok(reviewCandidates.every(row => row.approved === false && row.eligibleForAutomaticImage === false), "Unverified image must remain blocked");
  const report = {
    publicationUrl, approvedOffers: fixture.offerCount,
    existingImages: imageKeys.length, missingImages: uncovered.length,
    imageAssetVerified: true, verifiedImageFragments: localImageKeys.length,
    verifiedBankImages: imageKeys.filter(key => publication.images[key].startsWith("https://")).length,
    verifiedEmbeddedImages: imageKeys.filter(key => publication.images[key].startsWith("/") && publication.images[key].endsWith(".png")).length,
    diagnosticOnly: true,
    reviewCandidates,
    reviewSummary: { pending: reviewCandidates.length, brandVerification: reviewCandidates.filter(row => row.status === "brand-unverified").length, multiProduct: reviewCandidates.filter(row => row.status === "multi-product-offer").length, approved: 0 },
    nameParsingCandidates: diagnostic.filter(row => row.candidateSafe).length, // candidates only; never automatic image approval
    manualReviewCandidates: diagnostic.filter(row => !row.candidateSafe).length,
    extractedIdentityCount: parsed.filter(row => row.extracted).length,
    extractedIdentities: parsed.filter(row => row.extracted).map(row => ({ key: row.key, ...row.extracted })),
    missing: diagnostic,
  };
  console.log(JSON.stringify(report, null, 2));
}

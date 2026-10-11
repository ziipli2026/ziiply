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
  const unsafeName = /\b(tai|sekä|seka|ja|valikoima|erilaiset|useita|lajitelma)\b|\d+\s*[–-]\s*\d+\s*(?:g|kg|ml|l)\b|\b(?:plussa-kortilla|ilman plussa-korttia)\b/i;
  const diagnostic = uncovered.map(row => ({ ...row, candidateSafe: !unsafeName.test(row.identity) && !/\b(?:geelit|suihkeet|tiivisteet|tahranpoistajat|jäätelöt|juustoviipaleet|pyykinpesunesteet|täysmehut|rahkat|vanukkaat|pyykkietikat|suihkugeelit|wc-paperi|meikkivoide)\b/i.test(row.identity) }));
  // Conservative identity extraction for a diagnostic-only bank lookup.
  // The approved leaflet fixture does not contain EANs or verified brands.
  const parseIdentity = (identity) => {
    const raw = identity.trim();
    if (unsafeName.test(raw) || /\\b(?:plussa|ilman|tarjous|norm\\.|alk\\.)\\b/i.test(raw)) return null;
    const matches = [...raw.matchAll(/(\\d+(?:[.,]\\d+)?)\\s*(kg|g|ml|l)\\b/gi)];
    if (matches.length !== 1) return null;
    const match = matches[0];
    const before = raw.slice(0, match.index).trim();
    const after = raw.slice(match.index + match[0].length).trim();
    if (after && !/^\\([^)]*\\)$/.test(after)) return null;
    if (before.length < 12 || /\\d|\\/|\\b(?:ja|tai|sekä|seka)\\b/i.test(before)) return null;
    if (/\\b(?:geelit|suihkeet|tiivisteet|tahranpoistajat|jäätelöt|juustoviipaleet|pyykinpesunesteet|täysmehut|rahkat|vanukkaat|pyykkietikat|suihkugeelit|wc-paperi|meikkivoide)\\b/i.test(before)) return null;
    return { name: before, packageSize: match[1].replace(",", ".") + " " + match[2].toLowerCase() };
  };
  const parsed = uncovered.map(row => ({ ...row, extracted: parseIdentity(row.identity) }));
  const report = {
    publicationUrl, approvedOffers: fixture.offerCount,
    existingImages: imageKeys.length, missingImages: uncovered.length,
    diagnosticOnly: true,
    nameParsingCandidates: diagnostic.filter(row => row.candidateSafe).length, // candidates only; never automatic image approval
    manualReviewCandidates: diagnostic.filter(row => !row.candidateSafe).length,
    extractedIdentityCount: parsed.filter(row => row.extracted).length,
    extractedIdentities: parsed.filter(row => row.extracted).map(row => ({ key: row.key, ...row.extracted })),
    missing: diagnostic,
  };
  console.log(JSON.stringify(report, null, 2));
}

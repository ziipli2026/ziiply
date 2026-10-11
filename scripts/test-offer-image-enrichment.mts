import assert from "node:assert/strict";
import { normalizeImageBankRows } from "../src/lib/offerImageEanLookup";
import { planImageEnrichment, resolveImageEnrichmentBatch, type OfferImageJob } from "../src/lib/offerImageEnrichmentQueue";
import { enrichOfferImage, matchOfferImage, type OfferImageCandidate } from "../src/lib/offerImageEnrichment";

const base: OfferImageCandidate = { ean: "6410405124517", name: "Pirkka Täysjyvävehnätortilla 8 x 320 g", brand: "Pirkka", packageSize: "320 g" };
const image = { ...base, imageUrl: "https://example.org/product.webp" };
assert.equal(matchOfferImage(base, image).accepted, true);
assert.equal(enrichOfferImage(base, [image]).imageUrl, image.imageUrl);
assert.equal(matchOfferImage(base, { ...image, ean: "6410405124518" }).accepted, false);
assert.equal(matchOfferImage(base, { ...image, packageSize: "500 g" }).accepted, false);
assert.equal(matchOfferImage(base, { ...image, brand: "Coop" }).accepted, false);
assert.equal(matchOfferImage(base, { ...image, name: "Pirkka Tortilla 320 g" }).accepted, false);
assert.equal(matchOfferImage({ name: "Kahvi" }, { name: "Kahvi", imageUrl: image.imageUrl }).accepted, false);
assert.equal(enrichOfferImage({ ...base, imageUrl: "/existing.webp" }, [image]).imageUrl, "/existing.webp");
assert.equal(enrichOfferImage(base, [image, { ...image, imageUrl: "https://example.org/other.webp" }]).imageUrl, undefined);
for (const chain of ["prisma", "citymarket", "k-supermarket", "k-market", "lidl", "tokmanni", "spar"]) {
  assert.equal(enrichOfferImage({ ...base, source: chain }, [{ ...image, source: chain }]).imageUrl, image.imageUrl);
}
assert.equal(matchOfferImage({name:"Pirkka valikoima 320 g",packageSize:"320 g"}, {name:"Pirkka valikoima 320 g",packageSize:"320 g",imageUrl:image.imageUrl}).accepted,false);
assert.equal(matchOfferImage({name:"Kahvit tai teet 500 g",packageSize:"500 g"}, {name:"Kahvit tai teet 500 g",packageSize:"500 g",imageUrl:image.imageUrl}).accepted,false);
assert.equal(matchOfferImage({name:"Pirkka Kahvipaketti",packageSize:"250–500 g"}, {name:"Pirkka Kahvipaketti",packageSize:"250–500 g",imageUrl:image.imageUrl}).accepted,false);
console.log("Offer image matcher regression checks passed");

const job = (offerId: string, offer: OfferImageCandidate = base): OfferImageJob => ({ chain: "citymarket", offerId, offer });
const planned = planImageEnrichment([job("one"), job("one"), job("existing", { ...base, imageUrl: "/existing.webp" }), job("empty", {}), job("two")]);
assert.deepEqual(planned.map(item => item.offerId), ["one", "two"]);
const batch = await resolveImageEnrichmentBatch([job("one"), job("existing", { ...base, imageUrl: "/existing.webp" }), job("bad"), job("skip")], async item => {
  if (item.offerId === "bad") throw Error("simulated lookup failure");
  return [image];
}, { maxJobs: 3 });
assert.deepEqual(batch.map(item => item.status), ["enriched", "already-present", "unresolved"]);
assert.equal(batch[0].imageUrl, image.imageUrl);
assert.equal(batch[1].imageUrl, "/existing.webp");
assert.equal(batch[2].imageUrl, undefined);
assert.deepEqual(await resolveImageEnrichmentBatch([job("one")], async () => [image], { maxJobs: 0 }), []);
assert.equal(matchOfferImage(base, { ...image, imageUrl: "http://example.org/image.webp" }).accepted, false);
assert.equal(matchOfferImage(base, { ...image, imageUrl: "//example.org/image.webp" }).accepted, false);
console.log("Offer image queue, limits, failure handling and URL regression checks passed");

const conflictCandidates: OfferImageCandidate[] = [
  { ...image, imageUrl: "https://example.org/a.webp" },
  { ...image, imageUrl: "https://example.org/b.webp" },
];
const conflictingBank = await resolveImageEnrichmentBatch([job("ambiguous")], async () => conflictCandidates);
assert.deepEqual(conflictingBank.map(item => item.status), ["unresolved"]);
const wrongBrandBank = await resolveImageEnrichmentBatch([job("wrong-brand")], async () => [{ ...image, brand: "Coop" }]);
assert.equal(wrongBrandBank[0].status, "unresolved");
const wrongSizeBank = await resolveImageEnrichmentBatch([job("wrong-size")], async () => [{ ...image, packageSize: "500 g" }]);
assert.equal(wrongSizeBank[0].status, "unresolved");
const missingImageBank = await resolveImageEnrichmentBatch([job("missing-image")], async () => [{ ...image, imageUrl: null }]);
assert.equal(missingImageBank[0].status, "unresolved");
const duplicateSameImage = await resolveImageEnrichmentBatch([job("same-image")], async () => [image, { ...image }]);
assert.equal(duplicateSameImage[0].status, "enriched");
assert.equal(duplicateSameImage[0].imageUrl, image.imageUrl);
console.log("Neon-style image bank ambiguity and identity regression checks passed");

const bankRow = { ean: base.ean, name: base.name, brand: base.brand, quantity: base.packageSize, imageUrl: image.imageUrl, source: "k-ruoka" };
assert.deepEqual(normalizeImageBankRows([bankRow]), [{ ean: base.ean, name: base.name, brand: base.brand, packageSize: base.packageSize, imageUrl: image.imageUrl, source: "k-ruoka" }]);
assert.equal(normalizeImageBankRows(Array.from({ length: 101 }, () => bankRow)).length, 0);
assert.equal(normalizeImageBankRows(Array.from({ length: 100 }, () => bankRow)).length, 100);
assert.equal(normalizeImageBankRows([{ ean: null, name: null, brand: null, quantity: null, imageUrl: null, source: null }])[0].imageUrl, null);
console.log("Neon row normalization and 100-row ambiguity cap checks passed");

const missingCandidateEan = { ...image, ean: null };
assert.deepEqual(matchOfferImage(base, missingCandidateEan), { accepted: false, reason: "candidate-ean-missing" });
assert.equal(enrichOfferImage(base, [missingCandidateEan]).imageUrl, undefined);
assert.equal(matchOfferImage({ ...base, ean: null }, missingCandidateEan).accepted, true);
assert.equal(matchOfferImage(base, { ...image, ean: "6410405124518" }).reason, "ean-conflict");
console.log("EAN-preserving image matching regression checks passed");

const skuOffer = { ...base, productCode: "SKU-123", source: "citymarket" };
const skuWithoutEan = { ...image, ean: null, productCode: "SKU-123", source: "citymarket" };
assert.deepEqual(matchOfferImage(skuOffer, skuWithoutEan), { accepted: false, reason: "candidate-ean-missing" });
assert.equal(enrichOfferImage(skuOffer, [skuWithoutEan]).imageUrl, undefined);
assert.deepEqual(matchOfferImage({ ...skuOffer, ean: "invalid" }, { ...skuWithoutEan, ean: "invalid" }), { accepted: false, reason: "invalid-offer-ean" });
assert.equal(matchOfferImage({ ...skuOffer, ean: null }, skuWithoutEan).reason, "exact-source-product-code");
console.log("SKU fallback cannot bypass EAN safety checks");

assert.deepEqual(matchOfferImage({ ...base, ean: null }, { ...image, ean: "invalid" }), { accepted: false, reason: "invalid-candidate-ean" });
assert.equal(matchOfferImage({ ...base, ean: null }, { ...image, ean: base.ean }).accepted, true);
assert.equal(matchOfferImage({ ...base, ean: null }, { ...image, ean: null }).accepted, true);
console.log("Malformed candidate EAN rejection checks passed");

for (const unsafeImageUrl of ["\\\\example.org/image.webp", "/\\\\example.org/image.webp", "https://example.org/image.webp\\n", "https://example.org/image.webp\\t", "https://example.org\\\\image.webp"]) {
  assert.equal(matchOfferImage(base, { ...image, imageUrl: unsafeImageUrl }).accepted, false, "Unsafe image URL must be rejected: " + JSON.stringify(unsafeImageUrl));
}
console.log("Image URL backslash and control-character checks passed");

assert.equal(matchOfferImage(base, { ...image, imageUrl: "javascript:alert(1)" }).accepted, false);
assert.equal(matchOfferImage(base, { ...image, imageUrl: "data:image/svg+xml,<svg/>" }).accepted, false);
assert.equal(matchOfferImage(base, { ...image, imageUrl: "file:///etc/passwd" }).accepted, false);
assert.equal(matchOfferImage(base, { ...image, imageUrl: "/safe-image.svg" }).accepted, true);
assert.equal(matchOfferImage(base, { ...image, imageUrl: "https://example.org/safe-image.webp" }).accepted, true);
console.log("URL protocol allowlist checks passed");

for (const invalidRelative of ["image.webp", "./image.webp", "../image.webp", "ftp://example.org/image.webp", "HTTP://example.org/image.webp", "https:example.org/image.webp"]) {
  assert.equal(matchOfferImage(base, { ...image, imageUrl: invalidRelative }).accepted, false, "Non-canonical image URL accepted: " + invalidRelative);
}
console.log("Canonical absolute HTTPS or root-relative image URL checks passed");

import assert from "node:assert/strict";
import { enrichOfferImage, matchOfferImage } from "../src/lib/offerImageEnrichment";

const base = { ean: "6410405124517", name: "Pirkka Täysjyvävehnätortilla 8 x 320 g", brand: "Pirkka", packageSize: "320 g" };
const image = { ...base, imageUrl: "https://example.org/product.webp" };
assert.equal(matchOfferImage(base, image).accepted, true);
assert.equal(enrichOfferImage(base, [image]).imageUrl, "https://example.org/product.webp");
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
const ambiguous = [
  "Parodontax Ultra Clean ja Sensodyne Sensitive Gum HAMMASTAHNAT 75 ml",
  "COSTA RICA tai PREMIUM BLEND KAHVIT 250–500 g",
  "WC-GEELIT erilaiset 750 ml",
];
for (const name of ambiguous) {
  assert.equal(matchOfferImage({ name, packageSize: "750 ml" }, { name, packageSize: "750 ml", imageUrl: image.imageUrl }).accepted, false);
}
assert.equal(matchOfferImage({ name: "Lotus Nessu nenäliina", packageSize: "100 kpl" }, { name: "Lotus Nessu nenäliina", packageSize: "100 kpl", imageUrl: image.imageUrl }).accepted, true);
console.log("Offer image matcher regression checks passed");

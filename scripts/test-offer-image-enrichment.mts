import assert from "node:assert/strict";
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

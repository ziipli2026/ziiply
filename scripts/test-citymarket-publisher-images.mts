import assert from "node:assert/strict";
import manifest from "../src/app/components/ziiply/offerSearch/providers/data/kCitymarketLeafletImages.json";
import approvals from "./citymarket/41lv-verified-bank-images.json";
import {getKCitymarketPublisherImage} from "../src/app/components/ziiply/offerSearch/providers/kCitymarketPublisherImages.ts";
let count=0;
for (const [source, publication] of Object.entries(manifest.publications)) {
  for (const [id, image] of Object.entries(publication.images)) {
    assert.equal(getKCitymarketPublisherImage(source,id), image, id);
    assert.equal(getKCitymarketPublisherImage(source+"?different-publication",id),null);
    count++;
  }
  assert.equal(getKCitymarketPublisherImage(source,"__proto__"),null);
  assert.equal(getKCitymarketPublisherImage(source,"missing-offer"),null);
}
assert.equal(Object.keys(Object.values(manifest.publications).find(p=>p.pdfSha256===approvals.leafletSha256)!.images).length,91);
assert.equal(approvals.images.length,79);
console.log("Publisher resolver: "+count+" exact image links verified, including all 91 41LV offers.");

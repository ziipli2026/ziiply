// Regression against the actual cart-price helper in page.tsx (no duplicated implementation).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const page = fs.readFileSync("src/app/page.tsx", "utf8");
const helperStart = page.indexOf("function getGostaCartBundleTextV870(");
const start = page.indexOf("function getGostaCartPriceV758(");
const end = page.indexOf("\nexport default function Page()", start);
assert(start >= 0 && end > start, "cart price helper must be present");
assert(helperStart >= 0 && helperStart < start, "bundle text helper must be present");
const code = page.slice(helperStart, end)
  .replace("offer: any): string", "offer)")
  .replace("offer: any): number", "offer)")
  .replace("offer: any): { total: number; unit: number }", "offer)")
  .replace("value: unknown): number | null", "value)");
const price = vm.runInNewContext(code + "\ngetGostaCartPriceV758;", {});
const cases = [
  ["K two-pack numeric source", { chain:"K", offerPrice:"7,00 € / 2 kpl", __sourceOfferSearchResult:{price:7,debug:{offerQuantity:2}} }, 7, 3.5],
  ["K two-pack text source", { chain:"K", offerPrice:"7,00 € / 2 kpl", __sourceOfferSearchResult:{price:"7,00 € / 2 kpl",debug:{offerQuantity:2}} }, 7, 3.5],
  ["K three-pack", { chain:"K", offerPrice:"4,50 € / 3 kpl", __sourceOfferSearchResult:{price:4.5,debug:{offerQuantity:3}} }, 4.5, 1.5],
  ["Cittari two-pack 4 euro", { chain:"K", offerPrice:"4,00 € / 2 kpl", __sourceOfferSearchResult:{price:4,offerQuantity:2} }, 4, 2],
  ["Cittari three-pack 8 euro", { chain:"K", offerPrice:"8,00 € / 3 kpl", __sourceOfferSearchResult:{price:8,offerQuantity:3} }, 8, 8/3],
  ["Cittari three-pack 12 euro", { chain:"K", offerPrice:"12,00 € / 3 kpl", __sourceOfferSearchResult:{price:12,offerQuantity:3} }, 12, 4],
  ["Prisma reverse four-pack", {chain:"S",offerPrice:"4 kpl = 2 €",__sourceOfferSearchResult:{priceText:"4 kpl = 2 €",price:0.69}}, 2, 0.5],
  ["Cittari reverse three-pack", {chain:"K",offerPrice:"3 kpl = 12 €",__sourceOfferSearchResult:{priceText:"3 kpl = 12 €",price:12}}, 12, 4],
  ["Cittari comparison price must not override bundle", {chain:"K",offerPrice:"8,00 € / 3 kpl",__sourceOfferSearchResult:{priceText:"8,00 € / 3 kpl",price:2.67}}, 8, 8/3],
  ["display bundle wins over source plain price", {chain:"K",offerPrice:"3 kpl = 12 €",__sourceOfferSearchResult:{priceText:"4,00 €",price:4}}, 12, 4],
  ["K single", { chain:"K", offerPrice:"2,99 €", __sourceOfferSearchResult:{price:2.99} }, 2.99, 2.99],
  ["S single", { chain:"S", offerPrice:"1,79 €" }, 1.79, 1.79],
  ["EUROSPAR explicit single equivalent", {chain:"EUROSPAR",priceBasis:"multi-buy-total",singleEquivalentPrice:1.25,offerPrice:"5,00 € / 4 kpl"}, 5, 1.25],
  ["malformed text fails closed", {chain:"K",offerPrice:"ei hintaa"}, 0, 0],
];
for (const [name, offer, total, unit] of cases) {
  const actual = price(offer);
  assert.equal(actual.total,total,name+" total");
  assert.equal(actual.unit,unit,name+" unit");
  console.log("PASS",name);
}
assert.equal((page.match(/getGostaCartPriceV758\(offer\);/g)||[]).length,2,"single and bulk add must both use helper");
console.log("PASS single and bulk add share the same price helper");
const bundleStart = page.indexOf("function getGostaCartBundleQuantityV869(");
assert(bundleStart >= 0 && bundleStart < start, "bundle quantity helper must be present");
const bundleCode = page.slice(helperStart, start).replaceAll("offer: any): string", "offer)").replace("offer: any): number", "offer)");
const bundleQuantity = vm.runInNewContext(bundleCode + "\ngetGostaCartBundleQuantityV869;", {});
for (const [name, offer, expected] of [
  ["Prisma four-pack", {offerPrice:"4 kpl = 2 €"}, 4],
  ["Cittari three-pack", {offerPrice:"8,00 € / 3 kpl"}, 3],
  ["ordinary single", {offerPrice:"2,99 €"}, 1],
  ["source plain price but display bundle", {offerPrice:"3 kpl = 12 €",__sourceOfferSearchResult:{priceText:"4,00 €",price:4}}, 3],
]) assert.equal(bundleQuantity(offer), expected, name + " cart quantity");
assert.equal((page.match(/quantity: isWeightedOffer \? 1 : offerBundleQuantityV869/g)||[]).length,1,"single add must use bundle quantity");
assert.equal((page.match(/quantity: offerBundleQuantityV869/g)||[]).length,1,"bulk add must use bundle quantity");
console.log("PASS bundle quantity is used for single and bulk cart adds");
assert(page.includes("ziiplyOfferBundleQuantity: Number((item as any).ziiplyOfferBundleQuantity)"),"saved cart sanitizer must preserve bundle quantity");
assert(page.includes("const quantityDelta = delta * bundleStep;"),"quantity controls must change whole bundles");
console.log("PASS saved cart metadata and quantity-step guards");


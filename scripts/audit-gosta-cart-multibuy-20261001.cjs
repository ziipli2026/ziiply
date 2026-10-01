// Regression against the actual cart-price helper in page.tsx (no duplicated implementation).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const page = fs.readFileSync("src/app/page.tsx", "utf8");
const start = page.indexOf("function getGostaCartPriceV758(");
const end = page.indexOf("\nexport default function Page()", start);
assert(start >= 0 && end > start, "cart price helper must be present");
const code = page.slice(start, end)
  .replace("offer: any): { total: number; unit: number }", "offer)")
  .replace("value: unknown): number | null", "value)");
const price = vm.runInNewContext(code + "\ngetGostaCartPriceV758;", {});
const cases = [
  ["K two-pack numeric source", { chain:"K", offerPrice:"7,00 € / 2 kpl", __sourceOfferSearchResult:{price:7,debug:{offerQuantity:2}} }, 7, 3.5],
  ["K two-pack text source", { chain:"K", offerPrice:"7,00 € / 2 kpl", __sourceOfferSearchResult:{price:"7,00 € / 2 kpl",debug:{offerQuantity:2}} }, 7, 3.5],
  ["K three-pack", { chain:"K", offerPrice:"4,50 € / 3 kpl", __sourceOfferSearchResult:{price:4.5,debug:{offerQuantity:3}} }, 4.5, 1.5],
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

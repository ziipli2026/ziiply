const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
// Execute the exact production display functions with their TypeScript annotations
// stripped only from the function signatures; do not duplicate the logic.
const src=fs.readFileSync("src/app/components/ziiply/cards/ZiiplyMobileOfferSearchCard.tsx","utf8");
function extract(start,end){const a=src.indexOf(start),b=src.indexOf(end,a);assert.ok(a>=0&&b>a,start);return src.slice(a,b);}
const normalize=extract("function normalizePrice(price: unknown) {","function getNumericPrice").replace("price: unknown","price");
const display=extract("function getOfferPrice(offer: ZiiplyMobileOfferSearchItem) {","function splitOfferDisplayPrice(value: string) {").replace("offer: ZiiplyMobileOfferSearchItem","offer");
const split=extract("function splitOfferDisplayPrice(value: string) {","function getNormalPrice").replace("value: string","value");
const ctx={};vm.runInNewContext(normalize+display+split+"\nthis.getOfferPrice=getOfferPrice;this.splitOfferDisplayPrice=splitOfferDisplayPrice;",ctx);
const cases=[
 [{price:10,offerQuantity:3,offerUnit:"KPL"},"10,00 € / 3 KPL"],
 [{price:10,unitPrice:13.13,offerQuantity:3,offerUnit:"kpl"},"10,00 € / 3 kpl"],
 [{priceText:"10,00 € / 3 kpl",price:13.13,offerQuantity:3},"10,00 € / 3 kpl"],
 [{price:5,offerQuantity:3,offerUnit:"kpl"},"5,00 € / 3 kpl"],
 [{price:4,offerQuantity:2,offerUnit:"kpl"},"4,00 € / 2 kpl"],
];
for(const [offer,expected] of cases)test("Citymarket multibuy "+expected,()=>{
 const actual=ctx.getOfferPrice(offer);assert.equal(actual,expected);
 const split=ctx.splitOfferDisplayPrice(actual);assert.ok(split.amount.includes("€"));assert.ok(split.basis.includes("/"));
});
test("Source multibuy metadata overrides misleading unit price",()=>{
 const actual=ctx.getOfferPrice({price:13.13,__sourceOfferSearchResult:{price:10,offerQuantity:3,offerUnit:"kpl",unitPrice:13.13}});
 assert.equal(actual,"10,00 € / 3 kpl");
});

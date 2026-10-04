import assert from "node:assert/strict";
import { importVerifiedLidlPrices } from "./lib/lidl-verified-price-import.mjs";
const now = new Date("2026-10-04T18:00:00Z");
const base = {lidlProductId:"10000000",storeId:"lidl-hyvinkaa",regularPriceEur:1.29,priceKind:"regular",priceSource:"verified-store-receipt",checkoutPriceVerified:true,evidenceReference:"receipt-test-1",observedAt:"2026-10-04T12:00:00Z",validThrough:"2026-10-05T12:00:00Z"};
const rows = [
 {...base,priceKind:"offer"},
 {...base,storeId:"lidl-jarvenpaa"},
 {...base,priceSource:"lidl-public-category"},
 {...base,checkoutPriceVerified:false},
 {...base,observedAt:"2026-09-01T12:00:00Z",validThrough:"2026-09-02T12:00:00Z"},
 {...base,lidlProductId:"99999999"},
 base,
 {...base,evidenceReference:"receipt-test-2",regularPriceEur:1.19,observedAt:"2026-10-04T13:00:00Z"},
];
const result=importVerifiedLidlPrices(rows,["10000000"],"lidl-hyvinkaa",now);
assert.equal(result.prices.length,1);
assert.equal(result.prices[0].regularPriceEur,1.19);
assert.equal(result.prices[0].evidenceReference,"receipt-test-2");
assert.deepEqual(result.rejected.map(x=>x.reason),["not-regular","store-mismatch","unverified-source","unverified-source","stale-or-future","unknown-product"]);
console.log("PASS: 8 Lidl price-import cases; only latest verified in-store regular price accepted");

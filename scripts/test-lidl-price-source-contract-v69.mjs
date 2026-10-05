#!/usr/bin/env node
/** Offline source contract: no external collection or production import. */
import assert from "node:assert/strict";
import { classifyLidlPriceEvidence } from "./lib/lidl-price-source-contract.mjs";
const classify = (row, store) => {
 const result = classifyLidlPriceEvidence(row, store, new Date("2026-10-04T16:00:00Z"));
 return { price: result.regularPriceEur, comparable: result.comparable, reason: result.reason };
};
const base = {regularPriceEur:1.49,priceKind:"regular",storeId:"FI-1",priceSource:"authorized-store-feed",checkoutPriceVerified:true,evidenceReference:"test-fixture",observedAt:"2026-10-04T10:00:00Z",validThrough:"2026-10-05T00:00:00Z"};
const receiptBase = {...base,priceSource:"verified-store-receipt",validThrough:null};
const cases = [
 ["verified",base,true],
 ["missing",{...base,regularPriceEur:null},false],
 ["zero",{...base,regularPriceEur:0},false],
 ["offer",{...base,priceKind:"offer"},false],
 ["previous",{...base,priceKind:"previous-displayed"},false],
 ["other-store",{...base,storeId:"FI-2"},false],
 ["third-party",{...base,priceSource:"ruoanhinta-lidl"},false],
 ["public-lidl-fi",{...base,priceSource:"lidl-fi-public-observation",checkoutPriceVerified:false},false],
 ["unverified",{...base,checkoutPriceVerified:false},false],
 ["no-evidence",{...base,evidenceReference:""},false],
 ["stale",{...base,validThrough:"2026-10-03T23:59:59Z"},false],
 ["future",{...base,observedAt:"2026-10-05T10:00:00Z"},false],
 ["missing-observation",{...base,observedAt:null},false],
 ["invalid-observation",{...base,observedAt:"not-a-date"},false],
 ["timezone-required",{...base,observedAt:"2026-10-04T10:00:00"},false],
 ["missing-expiry",{...base,validThrough:null},false],
 ["fresh-receipt",receiptBase,true],
 ["stale-receipt",{...receiptBase,observedAt:"2026-10-03T10:00:00Z"},false],
 ["expiry-before-observation",{...base,validThrough:"2026-10-04T09:00:00Z"},false],
 ["no-store-scope",base,false,""],
 ["negative-price",{...base,regularPriceEur:-1},false],
 ["nan-price",{...base,regularPriceEur:NaN},false]
];
for (const [name,row,expected,argumentsStore] of cases) {
 const actual=classify(row,argumentsStore ?? "FI-1");
 assert.equal(actual.comparable,expected,name);
 assert.equal(actual.price,expected?1.49:null,name+" price");
 if(name==="public-lidl-fi") assert.equal(actual.reason,"public-observation-not-checkout-verified");
}
console.log(JSON.stringify({suite:"Lidl offline price source contract",passed:cases.length,failed:0,productionChanges:false}));

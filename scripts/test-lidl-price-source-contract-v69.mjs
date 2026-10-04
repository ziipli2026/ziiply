#!/usr/bin/env node
/** Offline source contract: no external collection or production import. */
import assert from "node:assert/strict";
const classify = (row, expectedStore) => {
 const price = row.regularPriceEur;
 if (!Number.isFinite(price) || price <= 0) return { price: null, comparable: false, reason: "missing-price" };
 if (row.priceKind !== "regular") return { price: null, comparable: false, reason: "not-regular" };
 if (row.storeId !== expectedStore) return { price: null, comparable: false, reason: "store-mismatch" };
 if (!["authorized-store-feed","verified-store-receipt"].includes(row.priceSource) || row.checkoutPriceVerified !== true || !row.evidenceReference) return { price: null, comparable: false, reason: "unverified-source" };
 if (!row.observedAt || !Number.isFinite(Date.parse(row.observedAt)) || !row.validThrough || !Number.isFinite(Date.parse(row.validThrough))) return { price: null, comparable: false, reason: "missing-freshness" };
 const at = Date.parse(row.observedAt), through = Date.parse(row.validThrough);
 const now = Date.parse("2026-10-04T16:00:00Z");
 if (at > now || through < now) return { price: null, comparable: false, reason: "stale-or-future" };
 return { price, comparable: true, reason: "verified" };
};
const base = {regularPriceEur:1.49,priceKind:"regular",storeId:"FI-1",priceSource:"authorized-store-feed",checkoutPriceVerified:true,evidenceReference:"test-fixture",observedAt:"2026-10-04T10:00:00Z",validThrough:"2026-10-05T00:00:00Z"};
const cases = [
 ["verified",base,true],
 ["missing",{...base,regularPriceEur:null},false],
 ["zero",{...base,regularPriceEur:0},false],
 ["offer",{...base,priceKind:"offer"},false],
 ["previous",{...base,priceKind:"previous-displayed"},false],
 ["other-store",{...base,storeId:"FI-2"},false],
 ["third-party",{...base,priceSource:"ruoanhinta-lidl"},false],
 ["unverified",{...base,checkoutPriceVerified:false},false],
 ["no-evidence",{...base,evidenceReference:""},false],
 ["stale",{...base,validThrough:"2026-10-03T23:59:59Z"},false],
 ["future",{...base,observedAt:"2026-10-05T10:00:00Z"},false]
];
for (const [name,row,expected] of cases) {
 const actual=classify(row,"FI-1");
 assert.equal(actual.comparable,expected,name);
 assert.equal(actual.price,expected?1.49:null,name+" price");
}
console.log(JSON.stringify({suite:"Lidl offline price source contract",passed:cases.length,failed:0,productionChanges:false}));

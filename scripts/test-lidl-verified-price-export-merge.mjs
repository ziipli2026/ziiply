import assert from "node:assert/strict";
import {classifyLidlPriceEvidence} from "./lib/lidl-price-source-contract.mjs";
const now=new Date("2026-10-05T10:00:00+03:00");
const valid={lidlProductId:"10037642",storeId:"TEST",regularPriceEur:1.89,priceKind:"regular",observedAt:"2026-10-05T09:00:00+03:00",validThrough:null,evidenceReference:"receipt:test",priceSource:"verified-store-receipt",checkoutPriceVerified:true};
assert.equal(classifyLidlPriceEvidence(valid,"TEST",now).comparable,true);
for(const bad of [
 {...valid,storeId:"OTHER"},
 {...valid,priceKind:"promotion"},
 {...valid,evidenceReference:""},
 {...valid,priceSource:"lidl-fi-public-observation"},
 {...valid,observedAt:"2026-10-03T09:00:00+03:00"}
]) assert.equal(classifyLidlPriceEvidence(bad,"TEST",now).comparable,false);
const key=r=>[r.lidlProductId,r.storeId,r.observedAt,r.priceSource,r.evidenceReference].join("|");
assert.equal(new Set([valid,valid].map(key)).size,1);
console.log(JSON.stringify({ok:true,cases:7}));

// CI trigger: verified price gate covers receipt bank import with catalog-backed fixture and exact-store rejection.
import "./test-lidl-pilot-receipt-bank-import.mjs";

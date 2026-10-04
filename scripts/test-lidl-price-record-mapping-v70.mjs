#!/usr/bin/env node
import assert from "node:assert/strict";
import { classifyLidlPriceEvidence } from "./lib/lidl-price-source-contract.mjs";
const now = new Date("2026-10-04T16:00:00Z");
const verified = {regularPriceEur:2.19,priceKind:"regular",storeId:"FI-1",priceSource:"authorized-store-feed",checkoutPriceVerified:true,evidenceReference:"offline-fixture",observedAt:"2026-10-04T10:00:00Z",validThrough:"2026-10-05T00:00:00Z"};
function map(row) {
 const evidence = classifyLidlPriceEvidence(row,"FI-1",now);
 return {id:row.id,name:row.name,imageUrl:row.imageUrl??null,ean:row.ean??null,regularPriceEur:evidence.regularPriceEur,comparable:evidence.comparable,priceStatus:evidence.reason};
}
const rows=[
 {id:"bakery-1",name:"Paistopiste-tuote",imageUrl:"https://example.invalid/image.jpg",regularPriceEur:null},
 {id:"verified-1",name:"Testituote",...verified},
 {id:"offer-1",name:"Tarjoustuote",...verified,priceKind:"offer"},
 {id:"old-1",name:"Vanha hintatieto",...verified,validThrough:"2026-10-03T00:00:00Z"}
];
const mapped=rows.map(map);
assert.equal(mapped.length,4);
assert.equal(mapped[0].regularPriceEur,null);
assert.equal(mapped[0].imageUrl,rows[0].imageUrl);
assert.equal(mapped[0].comparable,false);
assert.equal(mapped[1].regularPriceEur,2.19);
assert.equal(mapped[1].comparable,true);
for (const item of mapped.slice(2)) { assert.equal(item.regularPriceEur,null); assert.equal(item.comparable,false); }
assert.deepEqual(mapped.filter(x=>x.comparable).map(x=>x.id),["verified-1"]);
console.log(JSON.stringify({suite:"Lidl offline nullable product mapping",passed:10,failed:0,records:mapped.length,comparable:1}));

import assert from "node:assert/strict";
import { importN183Batch } from "./kcitymarket-n183-import.mjs";
const now=Date.parse("2026-10-24T12:00:00Z");
const offer={storeId:"N183",storeName:"K-Citymarket Hyvinkää",sourceScope:"SELECTED_STORE_WEB_OFFERS",offerId:"offer-1",title:"Kahvi",price:3.99,validFrom:"2026-10-23T00:00:00Z",validUntil:"2026-10-25T23:59:59Z"};
const batch={verifiedStoreOffers:true,complete:true,storeId:"N183",storeName:"K-Citymarket Hyvinkää",sourceUrl:"https://www.k-ruoka.fi/kauppa/k-citymarket-hyvinkaa",sourceEvidence:{storeScopeConfirmed:true,offerScopeConfirmed:true,storeId:"N183",offerIds:["offer-1"]},scannedAt:new Date(now).toISOString(),offers:[offer]};
function mockSql(previous=[]) {
  const calls=[];
  const sql=(strings,...values)=>{calls.push({strings,values});return Promise.resolve(calls.length===1?[{offers:previous}]:[])};
  return {sql,calls};
}
const valid=mockSql();
assert.deepEqual(await importN183Batch(batch,valid.sql,now),{stored:1,previousActive:0,publicationIds:0});
assert.equal(valid.calls.length,2);
for(const patch of [{verifiedStoreOffers:false},{complete:false},{sourceEvidence:{}},{sourceUrl:"https://example.com/offer"},{sourceEvidence:{storeScopeConfirmed:true,offerScopeConfirmed:true,storeId:"N183",offerIds:["other"]}},{scannedAt:"2020-01-01T00:00:00Z"},{offers:[{...offer,storeId:"N184"}]},{offers:[]}]) {
  const m=mockSql();
  await assert.rejects(importN183Batch({...batch,...patch},m.sql,now));
  assert.equal(m.calls.length,0,"Invalid batch must not query or write Neon");
}
const previous=Array.from({length:10},(_,i)=>({...offer,offerId:String(i)}));
const reduced=mockSql(previous);
await assert.rejects(importN183Batch(batch,reduced.sql,now),/coverage regression/);
assert.equal(reduced.calls.length,1,"Coverage regression must not write Neon");
console.log("N183_IMPORT_TESTS_OK");

import assert from "node:assert/strict";
import { validateN183Offer, validateN183Batch, N183_SCOPE } from "./kcitymarket-n183-validate.mjs";
const now = Date.parse("2026-10-24T12:00:00Z");
const offer = { storeId:"N183", storeName:"K-Citymarket Hyvinkää",
  sourceScope:N183_SCOPE, offerId:"123", title:"Kahvi", price:3.99,
  validFrom:"2026-10-23T00:00:00Z", validUntil:"2026-10-25T23:59:59Z" };
const batch = {verifiedStoreOffers:true, complete:true, storeId:"N183",
  storeName:"K-Citymarket Hyvinkää", offers:[offer]};
assert.equal(validateN183Batch(batch, now).length, 1);
assert.equal(validateN183Offer(offer, now).id, "kruoka-n183-123");
for (const change of [
  {storeId:"N184"}, {storeName:"K-Citymarket Vantaa Jumbo"},
  {sourceScope:"SELECTED_STORE_PUBLICATION"}, {price:0},
  {offerId:""}, {validUntil:"2026-10-23T00:00:00Z"},
  {validFrom:"2026-10-26T00:00:00Z"}
]) {
  assert.equal(validateN183Offer({...offer,...change}, now), null, JSON.stringify(change));
}
for (const change of [
  {verifiedStoreOffers:false}, {complete:false}, {storeId:"N184"},
  {offers:[]}, {offers:[offer,{...offer,offerId:"123"}]},
  {offers:[offer,{...offer,storeId:"N184",offerId:"124"}]}
]) assert.throws(() => validateN183Batch({...batch,...change}, now));
console.log("N183_VALIDATION_TESTS_OK");

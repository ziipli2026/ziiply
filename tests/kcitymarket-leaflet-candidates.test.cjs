const test = require("node:test");
const assert = require("node:assert/strict");
// Historical 40LV/26 excerpts. Research only; never infer store-specific availability.
const { parseStrictPair, classifyStoreScope } = require("./helpers/kcitymarket-strict-pair.cjs");
test("40LV/26 Sitkas: correct product and PS prices", () => {
  const result = parseStrictPair(["SITKAS 100 % RUIS tai RUIS- SIEMEN TUORENÄKKÄRI 220 g (11,32/kg)", "249", "PS", "Ilman Plussa-korttia 2,79/ps (12,68/kg)"]);
  assert.deepEqual(result, {offer:2.49, regular:2.79, unit:"PS", productContext:["SITKAS 100 % RUIS tai RUIS- SIEMEN TUORENÄKKÄRI 220 g (11,32/kg)"]});
});
test("40LV/26 Savuhovi: correct product and PKT prices", () => {
  const result = parseStrictPair(["Savuhovi", "VIILU KANALASTUT 180 g", "299", "PKT", "Ilman Plussa-korttia 3,99/pkt (22,17/kg)"]);
  assert.equal(result.offer, 2.99); assert.equal(result.regular, 3.99);
  assert.equal(result.unit, "PKT"); assert.ok(result.productContext.includes("VIILU KANALASTUT 180 g"));
});
test("reject unit mismatch, truncated glyph and range", () => {
  assert.equal(parseStrictPair(["Product","249","PS","Ilman Plussa-korttia 2,79/pkt"]), null);
  assert.equal(parseStrictPair(["Product","79","PKT","Ilman Plussa-korttia 4,49/pkt"]), null);
  assert.equal(parseStrictPair(["Product","299","PS","Ilman Plussa-korttia 3,55–3,59/ps"]), null);
});

test("reject equal or higher offer price and malformed price evidence", () => {
  assert.equal(parseStrictPair(["Product","279","PS","Ilman Plussa-korttia 2,79/ps"]), null);
  assert.equal(parseStrictPair(["Product","299","PS","Ilman Plussa-korttia 2,79/ps"]), null);
  assert.equal(parseStrictPair(["Product","2,49","PS","Ilman Plussa-korttia 2,79/ps"]), null);
  assert.equal(parseStrictPair(["Product","249","PS","Ilman Plussa-korttia 2,79/kg"]), null);
});
test("reject detached price evidence and missing product context", () => {
  assert.equal(parseStrictPair(["249","PS","Ilman Plussa-korttia 2,79/ps"]), null);
  assert.equal(parseStrictPair(["Product","249","PS","Other text","Ilman Plussa-korttia 2,79/ps"]), null);
});

test("reject missing unit and non-discounted price", () => {
  assert.equal(parseStrictPair(["Product","299","PKT","Ilman Plussa-korttia 3,99"]), null);
  assert.equal(parseStrictPair(["Product","399","PKT","Ilman Plussa-korttia 3,99/pkt"]), null);
  assert.equal(parseStrictPair(["Product","499","PKT","Ilman Plussa-korttia 3,99/pkt"]), null);
});

test("reject unit-price text, split glyphs and ambiguous adjacent labels", () => {
  assert.equal(parseStrictPair(["Product 220 g","(11,32/kg)","PS","Ilman Plussa-korttia 2,79/ps"]), null);
  assert.equal(parseStrictPair(["Product","2","49","PS","Ilman Plussa-korttia 2,79/ps"]), null);
  assert.equal(parseStrictPair(["Product","249","€/kg","Ilman Plussa-korttia 2,79/kg"]), null);
  assert.equal(parseStrictPair(["Product","249","PKT","Ilman Plussa-korttia 2,79/ps"]), null);
});

test("reject ambiguous reference suffix and oversized compact price", () => {
  assert.equal(parseStrictPair(["Product","299","PKT","Ilman Plussa-korttia 3,99/pkt–4,49/pkt"]), null);
  assert.equal(parseStrictPair(["Product","299","PKT","Ilman Plussa-korttia 3,99/pkt tai 4,49/pkt"]), null);
  assert.equal(parseStrictPair(["Product","9999","PKT","Ilman Plussa-korttia 3,99/pkt"]), null);
});

test("national leaflet cannot inherit Hyvinkaa store identity", () => {
  assert.deepEqual(classifyStoreScope({kind:"NATIONAL_LEAFLET", storeId:"k-citymarket-hyvinkaa", identityVerified:false}), {storeScoped:false,storeId:null});
  assert.deepEqual(classifyStoreScope({kind:"VERIFIED_STORE_OFFERS", storeId:"k-citymarket-hyvinkaa", identityVerified:false}), {storeScoped:false,storeId:null});
  assert.deepEqual(classifyStoreScope({kind:"VERIFIED_STORE_OFFERS", storeId:"k-citymarket-hyvinkaa", identityVerified:true,verifiedStoreId:"k-citymarket-hyvinkaa",evidence:{canonicalPageUrl:"https://www.k-ruoka.fi/kauppa/k-citymarket-hyvinkaa",pageHttpStatus:200,pageIdentitySeen:true,offerFeedStoreId:"k-citymarket-hyvinkaa",offerFeedIdentityVerified:true}}), {storeScoped:true,storeId:"k-citymarket-hyvinkaa"});
});

test("reject store-scope identity mismatch and missing independent verification", () => {
  assert.deepEqual(classifyStoreScope({kind:"VERIFIED_STORE_OFFERS",storeId:"k-citymarket-hyvinkaa",identityVerified:true}), {storeScoped:false,storeId:null});
  assert.deepEqual(classifyStoreScope({kind:"VERIFIED_STORE_OFFERS",storeId:"k-citymarket-hyvinkaa",verifiedStoreId:"k-citymarket-iso-omena",identityVerified:true}), {storeScoped:false,storeId:null});
  assert.deepEqual(classifyStoreScope({kind:"VERIFIED_STORE_OFFERS",storeId:"k-citymarket-hyvinkaa",verifiedStoreId:"k-citymarket-hyvinkaa",identityVerified:true,evidence:{canonicalPageUrl:"https://www.k-ruoka.fi/kauppa/k-citymarket-hyvinkaa",pageHttpStatus:200,pageIdentitySeen:true,offerFeedStoreId:"k-citymarket-hyvinkaa",offerFeedIdentityVerified:true}}), {storeScoped:true,storeId:"k-citymarket-hyvinkaa"});
});

test("reject malformed store slug despite matching asserted identity", () => {
  for (const storeId of ["k-citymarket-", "k-citymarket--hyvinkaa", "k-citymarket-hyvinkaa-", "k-citymarket-hyvinkaa/../iso-omena", "K-Citymarket-Hyvinkaa"]) {
    assert.deepEqual(classifyStoreScope({kind:"VERIFIED_STORE_OFFERS",storeId,verifiedStoreId:storeId,identityVerified:true}), {storeScoped:false,storeId:null});
  }
});

test("reject store scope without verified canonical-page evidence", () => {
  const base = {kind:"VERIFIED_STORE_OFFERS",storeId:"k-citymarket-hyvinkaa",verifiedStoreId:"k-citymarket-hyvinkaa",identityVerified:true};
  assert.equal(classifyStoreScope(base).storeScoped, false);
  assert.equal(classifyStoreScope({...base,evidence:{canonicalPageUrl:"https://www.k-ruoka.fi/kauppa/k-citymarket-iso-omena",pageHttpStatus:200,pageIdentitySeen:true}}).storeScoped, false);
  assert.equal(classifyStoreScope({...base,evidence:{canonicalPageUrl:"https://www.k-ruoka.fi/kauppa/k-citymarket-hyvinkaa",pageHttpStatus:403,pageIdentitySeen:true}}).storeScoped, false);
  assert.equal(classifyStoreScope({...base,evidence:{canonicalPageUrl:"https://www.k-ruoka.fi/kauppa/k-citymarket-hyvinkaa",pageHttpStatus:200,pageIdentitySeen:false}}).storeScoped, false);
});

test("generic Edut route cannot inherit identity from originating store page", () => {
  const base={kind:"VERIFIED_STORE_OFFERS",storeId:"k-citymarket-hyvinkaa",verifiedStoreId:"k-citymarket-hyvinkaa",identityVerified:true};
  const evidence={canonicalPageUrl:"https://www.k-ruoka.fi/kauppa/k-citymarket-hyvinkaa",pageHttpStatus:200,pageIdentitySeen:true};
  assert.equal(classifyStoreScope({...base,evidence}).storeScoped,false);
  assert.equal(classifyStoreScope({...base,evidence:{...evidence,offerFeedStoreId:"k-citymarket-iso-omena",offerFeedIdentityVerified:true}}).storeScoped,false);
  assert.equal(classifyStoreScope({...base,evidence:{...evidence,offerFeedStoreId:"k-citymarket-hyvinkaa",offerFeedIdentityVerified:true}}).storeScoped,true);
});

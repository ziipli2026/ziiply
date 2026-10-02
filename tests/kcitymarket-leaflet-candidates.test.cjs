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

test("reject missing unit and ambiguous multibuy reference", () => {
  for (const reference of [
    "Ilman Plussa-korttia 3,99",
    "Ilman Plussa-korttia 3,99/pari",
    "Ilman Plussa-korttia 2 kpl / 5,00",
    "Ilman Plussa-korttia 3,99–4,49/pkt",
    "Ilman Plussa-korttia 3,99/pkt tai 4,49/pkt"
  ]) assert.equal(parseStrictPair(["Example product 200 g", "299", "PKT", reference]), null, reference);
});
test("reject split offer glyphs and multibuy labels", () => {
  for (const lines of [
    ["Example product", "2", "50", "KPL", "Ilman Plussa-korttia 3,00/kpl"],
    ["Example product 2 kpl 5,00", "250", "KPL", "Ilman Plussa-korttia 3,00/kpl"],
    ["Example product", "299", "PKT", "Ilman Plussa-korttia 3,99/pkt tai 2 pkt 6,00"]
  ]) assert.equal(parseStrictPair(lines), null);
});

test("ordinary pack weights are not mistaken for multibuy prices", () => {
  const result = parseStrictPair(["Example coffee 2 x 250 g", "299", "PKT", "Ilman Plussa-korttia 3,99/pkt"]);
  assert.equal(result?.offer, 2.99);
  assert.equal(result?.unit, "PKT");
});
test("reject alternative multibuy price punctuation in product context", () => {
  for (const context of ["Example 2 kpl / 5,00", "Example 2 pkt: 5,00", "Example 2 ps = 5,00", "Example 2 kpl hintaan 5,00"]) {
    assert.equal(parseStrictPair([context, "250", "KPL", "Ilman Plussa-korttia 3,00/kpl"]), null, context);
  }
});

test("allow informational unit price after a verified ordinary reference", () => {
  const result = parseStrictPair(["Example cereal 300 g (8,30/kg)", "249", "PKT", "Ilman Plussa-korttia 2,99/pkt (9,97/kg)"]);
  assert.equal(result?.offer, 2.49);
  assert.equal(result?.regular, 2.99);
});
test("reject a second price or multibuy clause after reference price", () => {
  for (const suffix of [" tai 2 pkt 5,00", " – 2 pkt 5,00", " - 2 pkt 5,00", " tai 4,49/pkt"]) {
    assert.equal(parseStrictPair(["Example cereal 300 g", "249", "PKT", "Ilman Plussa-korttia 2,99/pkt" + suffix]), null, suffix);
  }
});

test("reject zero, malformed and non-finite compact offer values", () => {
  for (const digits of ["000", "0000", "00", "2,49", "NaN", "Infinity", "-249", "249€"]) {
    assert.equal(parseStrictPair(["Example product 200 g", digits, "PKT", "Ilman Plussa-korttia 3,99/pkt"]), null, digits);
  }
});
test("reject zero or malformed reference prices", () => {
  for (const reference of ["0,00/pkt", "00,00/pkt", "3,9/pkt", "3.999/pkt", "-3,99/pkt"]) {
    assert.equal(parseStrictPair(["Example product 200 g", "249", "PKT", "Ilman Plussa-korttia " + reference]), null, reference);
  }
});

test("reject decimal compact offer encodings without exact cents", () => {
  for (const digits of ["24", "2490", "249.0", "0249", "24900"]) {
    assert.equal(parseStrictPair(["Example product 200 g", digits, "PKT", "Ilman Plussa-korttia 3,99/pkt"]), null, digits);
  }
});
test("reject reference prices with extra numeric payload after the unit", () => {
  for (const reference of [
    "Ilman Plussa-korttia 3,99/pkt 2,49",
    "Ilman Plussa-korttia 3,99/pkt + 2,49",
    "Ilman Plussa-korttia 3,99/pkt / 2,49"
  ]) assert.equal(parseStrictPair(["Example product 200 g", "249", "PKT", reference]), null, reference);
});

test("accept standard trailing unit-price evidence in reference line", () => {
  const result = parseStrictPair(["Example cheese 250 g", "299", "PKT", "Ilman Plussa-korttia 3,49/pkt (13,96/kg)"]);
  assert.equal(result?.offer, 2.99);
  assert.equal(result?.regular, 3.49);
});
test("reject unsupported trailing units or malformed parenthetical evidence", () => {
  for (const suffix of [
    " (3,49/m2)",
    " (3,49/kpl) extra",
    " (13,96/kg 12,00/kg)",
    " (13,96)"
  ]) assert.equal(parseStrictPair(["Example cheese 250 g", "299", "PKT", "Ilman Plussa-korttia 3,49/pkt" + suffix]), null, suffix);
});

test("reject forged store-scoped evidence despite valid canonical page", () => {
  const base = {kind:"VERIFIED_STORE_OFFERS",storeId:"k-citymarket-hyvinkaa",verifiedStoreId:"k-citymarket-hyvinkaa",identityVerified:true};
  const evidence = {canonicalPageUrl:"https://www.k-ruoka.fi/kauppa/k-citymarket-hyvinkaa",pageHttpStatus:200,pageIdentitySeen:true,offerFeedStoreId:"k-citymarket-hyvinkaa",offerFeedIdentityVerified:true};
  for (const changed of [
    {kind:"NATIONAL_LEAFLET"},
    {verifiedStoreId:"k-citymarket-iso-omena"},
    {evidence:{...evidence,offerFeedIdentityVerified:false}},
    {evidence:{...evidence,offerFeedStoreId:"k-citymarket-iso-omena"}},
    {evidence:{...evidence,canonicalPageUrl:"https://www.k-ruoka.fi/kauppa/k-citymarket-hyvinkaa?from=leaflet"}}
  ]) assert.deepEqual(classifyStoreScope({...base,evidence,...changed}), {storeScoped:false,storeId:null});
});

test("store evidence must not accept an asserted feed identity without independent verification", () => {
  const storeId = "k-citymarket-hyvinkaa";
  const base = {kind:"VERIFIED_STORE_OFFERS",storeId,verifiedStoreId:storeId,identityVerified:true};
  const evidence = {canonicalPageUrl:"https://www.k-ruoka.fi/kauppa/"+storeId,pageHttpStatus:200,pageIdentitySeen:true,offerFeedStoreId:storeId,offerFeedIdentityVerified:true};
  for (const missing of ["pageHttpStatus","pageIdentitySeen","offerFeedStoreId","offerFeedIdentityVerified","canonicalPageUrl"]) {
    const incomplete = {...evidence}; delete incomplete[missing];
    assert.deepEqual(classifyStoreScope({...base,evidence:incomplete}), {storeScoped:false,storeId:null}, missing);
  }
  assert.deepEqual(classifyStoreScope({...base,evidence:{...evidence,offerFeedIdentityVerified:"true"}}), {storeScoped:false,storeId:null});
  assert.deepEqual(classifyStoreScope({...base,evidence:{...evidence,pageHttpStatus:"200"}}), {storeScoped:false,storeId:null});
});

test("compact cents retain exact boundaries without silently rounding", () => {
  assert.deepEqual(parseStrictPair(["Example product 200 g","101","PKT","Ilman Plussa-korttia 1,02/pkt"]), {offer:1.01,regular:1.02,unit:"PKT",productContext:["Example product 200 g"]});
  assert.equal(parseStrictPair(["Example product 200 g","102","PKT","Ilman Plussa-korttia 1,02/pkt"]), null);
  assert.equal(parseStrictPair(["Example product 200 g","103","PKT","Ilman Plussa-korttia 1,02/pkt"]), null);
});

test("reject detached or repeated reference anchors rather than borrowing a price", () => {
  for (const lines of [
    ["Example product 200 g","249","PKT","Ilman Plussa-korttia 3,99/pkt","Ilman Plussa-korttia 4,99/pkt"],
    ["Example product 200 g","249","PKT","Other product","Ilman Plussa-korttia 3,99/pkt"],
    ["Example product 200 g","249","PKT","Ilman Plussa-korttia 3,99/pkt","299","PKT","Ilman Plussa-korttia 4,99/pkt"]
  ]) assert.equal(parseStrictPair(lines), null, JSON.stringify(lines));
});

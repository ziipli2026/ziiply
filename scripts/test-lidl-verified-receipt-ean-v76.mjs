#!/usr/bin/env node
import assert from "node:assert/strict";
import { mapVerifiedLidlReceiptPriceToEan } from "./lib/lidl-verified-receipt-ean.mjs";

const price={lidlProductId:"10037650",storeId:"FI-TEST",regularPriceEur:3.39,priceKind:"regular",priceSource:"verified-store-receipt",checkoutPriceVerified:true,evidenceReference:"receipt:test",observedAt:"2026-10-06T08:00:00Z"};
const link={lidlProductId:"10037650",ean:"8850987146619"};
const ok=mapVerifiedLidlReceiptPriceToEan(price,[link]);
assert.equal(ok.reason,"verified");
assert.equal(ok.row.ean,"8850987146619");
assert.equal(ok.row.freshUntil,"2026-10-07T08:00:00.000Z");
assert.equal(ok.row.checkoutPriceVerified,true);
assert.equal(mapVerifiedLidlReceiptPriceToEan(price,[]).reason,"missing-verified-ean");
assert.equal(mapVerifiedLidlReceiptPriceToEan(price,[link,{...link,ean:"12345678"}]).reason,"ambiguous-verified-ean");
assert.equal(mapVerifiedLidlReceiptPriceToEan({...price,checkoutPriceVerified:false},[link]).reason,"price-not-verified-receipt");
console.log(JSON.stringify({suite:"Lidl verified receipt to EAN",passed:4,failed:0}));

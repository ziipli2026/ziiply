#!/usr/bin/env node
import assert from "node:assert/strict";
import { processLidlManualPriceBatch } from "./lib/lidl-manual-price-batch.mjs";

const base={permissionToUseEvidence:true,lidlProductId:"10037650",storeId:"FI-TEST",receiptUnitPriceEur:3.39,receiptEvidenceReference:"receipt:test-001",receiptTimestamp:"2026-10-06T08:00:00Z",isLidlPlus:false,isPromotion:false,isMultiBuy:false,priceBasis:"unit"};
const links=[{lidlProductId:"10037650",ean:"8850987146619"}];
const ok=processLidlManualPriceBatch([base],["10037650"],"FI-TEST",new Date("2026-10-06T09:00:00Z"),links);
assert.equal(ok.acceptedCount,1);
assert.equal(ok.neonReadyCount,1);
assert.equal(ok.neonRows[0].ean,"8850987146619");
assert.equal(ok.neonRows[0].checkoutPriceVerified,true);
assert.equal(ok.neonRows[0].freshUntil,"2026-10-07T08:00:00.000Z");

const promo=processLidlManualPriceBatch([{...base,isPromotion:true}],["10037650"],"FI-TEST",new Date("2026-10-06T09:00:00Z"),links);
assert.equal(promo.acceptedCount,0);
assert.equal(promo.neonReadyCount,0);

const noEan=processLidlManualPriceBatch([base],["10037650"],"FI-TEST",new Date("2026-10-06T09:00:00Z"),[]);
assert.equal(noEan.acceptedCount,1);
assert.equal(noEan.neonReadyCount,0);
assert.equal(noEan.rejected.at(-1).reason,"missing-verified-ean");

console.log(JSON.stringify({suite:"Lidl receipt to Neon row end-to-end",passed:8,failed:0}));

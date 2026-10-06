#!/usr/bin/env node
/**
 * Build a conservative Neon reclassification plan from Lidl collector output.
 * Usage: node scripts/build-lidl-price-reclassification-plan.mjs collector.json
 * Never changes Neon itself. Only exact Lidl productId/EAN links are eligible.
 */
import { readFileSync } from "node:fs";
const input=process.argv[2];
if(!input) throw new Error("Pass collector JSON path");
const data=JSON.parse(readFileSync(input,"utf8"));
const rows=[...(data.records||[]),...(data.reviewQueue||[])];
const eligible=rows.filter(r=>
  r.lidlProductId &&
  r.temporalStatus!=="future" &&
  r.temporalStatus!=="past" &&
  (r.priceKind==="offer"||r.priceKind==="lidl_plus") &&
  (r.productMatchConfidence==="official-category-api"||
   r.productMatchConfidence==="exact-name"||
   r.availabilityKind==="continuous-listing")
);
const byProduct=new Map();
for(const r of eligible){
  const key=String(r.lidlProductId);
  const prev=byProduct.get(key);
  if(!prev || (prev.priceKind!=="lidl_plus"&&r.priceKind==="lidl_plus")) byProduct.set(key,r);
}
const changes=[...byProduct.values()].map(r=>({
  lidlProductId:String(r.lidlProductId),
  priceKind:r.priceKind,
  reason:r.priceClassificationReason,
  displayedPriceEur:r.displayedPriceEur,
  observedAt:r.observedAt,
  validFrom:r.validFrom??null,
  validThrough:r.validThrough??null,
  source:r.source
}));
process.stdout.write(JSON.stringify({
  schemaVersion:1,
  mode:"plan-only",
  safety:"exact productId evidence; no database writes",
  count:changes.length,
  changes
},null,2)+"\n");

import assert from "node:assert/strict";
import { classifyLidlPriceEvidence } from "./lib/lidl-price-source-contract.mjs";
const now=new Date("2026-10-05T10:00:00+03:00");
const row={lidlProductId:"10037642",storeId:"LIDL-HYVINKAA-TEST",regularPriceEur:1.89,priceKind:"regular",priceSource:"verified-store-receipt",checkoutPriceVerified:true,evidenceReference:"synthetic-test-only",observedAt:"2026-10-05T09:00:00+03:00"};
function resolve(rows,id,store){const hits=rows.filter(r=>r.lidlProductId===id&&r.storeId===store).map(r=>({r,v:classifyLidlPriceEvidence(r,store,now)})).filter(x=>x.v.comparable).sort((a,b)=>Date.parse(b.r.observedAt)-Date.parse(a.r.observedAt));return hits[0]?.v.regularPriceEur??null;}
assert.equal(resolve([],"10037642","LIDL-HYVINKAA-TEST"),null);
assert.equal(resolve([row],"10037642","LIDL-HYVINKAA-TEST"),1.89);
assert.equal(resolve([row],"10037642","OTHER"),null);
assert.equal(resolve([{...row,observedAt:"2026-10-03T09:00:00+03:00"}],"10037642","LIDL-HYVINKAA-TEST"),null);
assert.equal(resolve([{...row,priceSource:"lidl-fi-public-observation"}],"10037642","LIDL-HYVINKAA-TEST"),null);
console.log(JSON.stringify({ok:true,cases:5,note:"synthetic data only; no production price imported"}));

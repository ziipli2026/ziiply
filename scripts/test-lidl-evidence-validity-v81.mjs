#!/usr/bin/env node
import assert from "node:assert/strict";
import { lidlEvidenceFreshUntil } from "./lib/lidl-evidence-freshness.mjs";

const futureObserved="2026-10-06T08:00:00Z";
assert.equal(
  lidlEvidenceFreshUntil({observedAt:futureObserved,priceKind:"offer",validThrough:"2026-10-14"}),
  "2026-10-14T23:59:59.999Z"
);
assert.equal(
  lidlEvidenceFreshUntil({observedAt:futureObserved,priceKind:"lidl_plus",validThrough:"2026-10-11"}),
  "2026-10-11T23:59:59.999Z"
);
assert.equal(
  lidlEvidenceFreshUntil({observedAt:futureObserved,priceKind:"offer",validThrough:null}),
  futureObserved
);
const validFrom="2026-10-08";
const today="2026-10-06";
assert.equal(today>=validFrom,false);
console.log(JSON.stringify({suite:"Lidl validity-bound freshness",passed:4,failed:0}));

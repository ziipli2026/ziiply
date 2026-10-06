#!/usr/bin/env node
import assert from "node:assert/strict";

function isFresh(row, ean, storeId, now) {
  if (!row || row.priceKind !== "regular") return false;
  if (row.ean !== ean || row.storeId !== storeId) return false;
  if (!Number.isFinite(row.priceEur) || row.priceEur <= 0) return false;
  const observed = Date.parse(row.observedAt), until = Date.parse(row.freshUntil), current = now.getTime();
  return [observed, until, current].every(Number.isFinite) && observed <= current && current <= until && until >= observed;
}
const decide=(row,ean,storeId,now)=>isFresh(row,ean,storeId,now)?"use-cache":"refresh";
const now=new Date("2026-10-06T12:00:00Z");
const base={ean:"6410405124517",storeId:"LIDL-HYVINKAA",priceEur:1.48,priceKind:"regular",observedAt:"2026-10-06T06:00:00Z",freshUntil:"2026-10-07T06:00:00Z"};
assert.equal(decide(base,base.ean,base.storeId,now),"use-cache");
assert.equal(decide({...base,freshUntil:"2026-10-06T11:59:59Z"},base.ean,base.storeId,now),"refresh");
assert.equal(decide(base,base.ean,"LIDL-JARVENPAA",now),"refresh");
assert.equal(decide({...base,priceKind:"offer"},base.ean,base.storeId,now),"refresh");
assert.equal(decide({...base,priceEur:0},base.ean,base.storeId,now),"refresh");
console.log(JSON.stringify({suite:"Lidl EAN price cache freshness",passed:5,failed:0}));

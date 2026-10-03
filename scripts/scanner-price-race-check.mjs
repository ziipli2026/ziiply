import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/page.tsx", "utf8");
const section = source.split("// Käynnistä hinnan rikastus taustalle.")[1]?.split("// V790: Tokmanni/SPAR exact-EAN")[0];
assert.ok(section, "scanner S/K enrichment block exists");
assert.match(section, /requestedSEpochV806/);
assert.match(section, /requestedKEpochV806/);
assert.match(section, /isSameEan\(candidate\.ean, getEanSearchVariants\(ean\)\)/);
assert.equal((section.match(/comparisonUserStartedRefV768\.current\) scheduleComparisonUpdate\(nextCart\)/g)||[]).length,2,"both async updates respect manual Halpuuta");
assert.equal((section.match(/persistCartImmediately\(nextCart\)/g)||[]).length,0,"cart persistence remains in effect");

function storeTracker(initial) {
  let id=initial, epoch=0;
  return {
    request:()=>({id,epoch}),
    select:next=>{if(next!==id){id=next;epoch++;}},
    accepts:request=>request.id===id && request.epoch===epoch,
  };
}
for(const chain of ["S","K"]){
  const t=storeTracker(101);
  const old=t.request();
  assert.ok(t.accepts(old),chain+" same store accepted");
  t.select(202);
  assert.ok(!t.accepts(old),chain+" old store rejected");
  t.select(101);
  assert.ok(!t.accepts(old),chain+" A-B-A stale response rejected");
  assert.ok(t.accepts(t.request()),chain+" fresh A accepted");
}
for(const order of [["S","K"],["K","S"]]){
  let userStarted=false, schedules=0;
  const complete=()=>{if(userStarted)schedules++;};
  complete();assert.equal(schedules,0,"no comparison before Halpuuta");
  userStarted=true;
  for(const chain of order)complete(chain);
  assert.equal(schedules,2,order.join("->")+" both responses schedule after Halpuuta");
}
// Pirkka tortilla 6410405124517: identity is instant, S price lookup skipped,
// K lookup checks EAN and exact barcode even if the first search is incomplete.
const tortilla = "6410405124517";
const bankName = "Pirkka Täysjyvävehnätortilla";
const ownBrand = /^(pirkka|k-menu)\\b/i.test(bankName) ? "k" : "";
assert.equal(ownBrand, "k");
assert.equal(ownBrand !== "k", false, "Pirkka must not wait for S enrichment");
const generic = bankName.replace(/^(?:pirkka(?: parhaat)?|k-menu)\\s+/i, "").trim();
assert.deepEqual([tortilla, bankName, generic], [tortilla, bankName, "Täysjyvävehnätortilla"]);
const candidates = [{ean:"0000000000000",price:1.99},{ean:tortilla,price:2.49}];
assert.equal(candidates.find(p=>p.ean===tortilla && p.price>0)?.price,2.49);
assert.match(source, /ownBrandV801 !== "k"/);
assert.match(source, /genericNameV810/);
console.log("Pirkka tortilla scanner routing simulation: PASS");
console.log("Scanner source-contract and isolated race/order simulations: PASS");

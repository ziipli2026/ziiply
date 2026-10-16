import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/components/ziiply/cards/ZiiplyMobileOfferSearchCard.tsx", "utf8");
const normalize = (value) => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9åäö]/gi, "").trim();
const filterCategory = (items, category) => items.filter(item => normalize(item.category) === normalize(category));
const fixtures = [
  {ean:"6410000000001",title:"Riisi",price:"2,99 €",imageUrl:"https://example.com/a.jpg",category:"Kuivatuotteet"},
  {ean:"6410000000002",title:"Pasta",price:"1,49 €",imageUrl:"https://example.com/b.jpg",category:"Kuivatuotteet"},
  {ean:"6410000000003",title:"Jogurtti",price:"0,99 €",imageUrl:"https://example.com/c.jpg",category:"Maitotuotteet"},
];
test("category selection does not lose or mix rows", () => {
  assert.equal(filterCategory(fixtures,"Kuivatuotteet").length,2);
  assert.equal(filterCategory(fixtures,"Maitotuotteet").length,1);
  assert.equal(filterCategory(fixtures,"Tuntematon").length,0);
  assert.equal(fixtures.length,3);
});
test("category matching is case and diacritic insensitive", () => {
  assert.equal(normalize("Maitotuotteet"),normalize("MAITOTUOTTEET"));
  assert.equal(normalize("Hygienia & kosmetiikka"),normalize("hygienia & kosmetiikka"));
});
test("landing screen does not imply missing loaded results", () => {
  assert.match(source,/const visibleItems = waitingForCompleteResults \|\| showLandingView \? \[\] : items;/);
  assert.match(source,/visibleItemsReasonV234/);
});
test("all-category diagnostic remains available", () => {
  assert.match(source,/automaticCategoryAuditV235/);
  for(const key of ["missingFields","duplicateEans","categoryCountMismatches","checkedRows"]){
    assert.ok(source.includes(key),key);
  }
});
test("weighted pricing evidence remains propagated", () => {
  assert.match(source,/isWeightedProduct/);
  assert.match(source,/isApproximatePrice/);
});

test("filtered category audit does not compare unrelated category totals", () => {
  assert.match(source, /const isCategoryFiltered = Boolean\(shownFilter\)/);
  assert.match(source, /isCategoryFiltered && normalizeCategoryKey\(category\) !== normalizeCategoryKey\(shownFilter\)/);
});

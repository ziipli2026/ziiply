#!/usr/bin/env node
// Read-only category registry audit. No API calls or production writes.
const fs = require("node:fs");
const assert = require("node:assert/strict");
const rules = require('./lib/read-search-registry.cjs')();
const categories = rules.map(rule=>rule.category);
const unique = new Set(categories);
const issues = [];
const MIN_CATEGORY_COUNT = 54;
if (categories.length < MIN_CATEGORY_COUNT) issues.push(`Category coverage regressed: ${categories.length} < ${MIN_CATEGORY_COUNT}`);
const variantOwners = new Map();
const normalizedDuplicateWarnings = [];
for (const rule of rules) {
  const category = rule.category;
  if (!Array.isArray(rule.variants)) { issues.push(category + ": missing variants"); continue; }
  const rawVariants = rule.variants.map(x => x.toLowerCase().trim());
  const variants = rawVariants.map(x => x.normalize("NFD").replace(/[\u0300-\u036f]/g,""));
  if (!variants.length) issues.push(category + ": empty variants");
  const withinCategory = new Set();
  const exactWithinCategory = new Set();
  for (const [index, variant] of variants.entries()) {
    if (exactWithinCategory.has(rawVariants[index])) issues.push(`${category}: duplicate exact variant ${JSON.stringify(rawVariants[index])}`);
    exactWithinCategory.add(rawVariants[index]);
    if (!variant) issues.push(`${category}: blank normalized variant`);
    if (withinCategory.has(variant)) normalizedDuplicateWarnings.push(`${category}: equivalent normalized variant ${JSON.stringify(variant)}`);
    withinCategory.add(variant);
    const owners = variantOwners.get(variant) || new Set();
    owners.add(category);
    variantOwners.set(variant, owners);
  }
}
const ambiguousExactVariants = [...variantOwners.entries()].filter(([, owners]) => owners.size > 1).map(([variant, owners]) => ({ variant, categories: [...owners] }));
if (ambiguousExactVariants.length) issues.push("Exact search variants shared across categories: " + JSON.stringify(ambiguousExactVariants));
if (unique.size !== categories.length) issues.push("Duplicate category ids");
const examples = [
 ["ketsuppi","ketchup"],["sinappi","mustard"],["majoneesi","mayonnaise"],
 ["tomaattimurska","tomato_crush"],["tomaattipyree","tomato_paste"],
 ["kaurahiutale","oatmeal"],["mysli","muesli"],["wc-paperi","toilet_paper"],
 ["talouspaperi","paper_towels"],["pyykinpesuaine","laundry_detergent"],
 ["astianpesuaine","dishwashing"],["kahvi","coffee"],["maito","milk"],
];
for (const [query,expected] of examples) {
 const rule = rules.find(rule=>rule.category===expected);
 if (!rule || !rule.variants.includes(query)) issues.push(query+": missing exact variant in "+expected);
}
const report={categoryCount:categories.length,uniqueCount:unique.size,ambiguousExactVariants,normalizedDuplicateWarnings,exampleCount:examples.length,issues,limitations:["Static registry audit only; does not execute TypeScript ranking","No live API result coverage, UI or learning behavior verified"]};
console.log(JSON.stringify(report,null,2));
if (issues.length) process.exitCode=1;

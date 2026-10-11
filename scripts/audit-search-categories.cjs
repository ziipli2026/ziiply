#!/usr/bin/env node
// Read-only category registry audit. No API calls or production writes.
const fs = require("node:fs");
const assert = require("node:assert/strict");
const source = fs.readFileSync("src/app/components/ziiply/ziiplyCore.ts","utf8");
const section = source.split("const SEARCH_INTENTS: SearchIntent[] = [")[1]?.split("\n];")[0];
assert(section, "SEARCH_INTENTS not found");
const blocks = [...section.matchAll(/category:\s*"([^"]+)"[\s\S]*?(?=\bcategory:\s*"|$)/g)];
const categories = blocks.map(m=>m[1]);
const unique = new Set(categories);
const issues = [];
const variantOwners = new Map();
for (const match of blocks) {
  const category = match[1];
  const variantList = match[0].match(/variants:\s*\[([^\]]*)\]/);
  if (!variantList) { issues.push(category + ": missing variants"); continue; }
  const variants = [...variantList[1].matchAll(/"([^"]+)"/g)].map(x => x[1].normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim());
  if (!variants.length) issues.push(category + ": empty variants");
  for (const variant of variants) {
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
 const block = blocks.find(m=>m[1]===expected)?.[0];
 if (!block || !block.includes('"'+query+'"')) issues.push(query+": missing exact variant in "+expected);
}
const report={categoryCount:categories.length,uniqueCount:unique.size,ambiguousExactVariants,exampleCount:examples.length,issues,limitations:["Static registry audit only; does not execute TypeScript ranking","No live API result coverage, UI or learning behavior verified"]};
console.log(JSON.stringify(report,null,2));
if (issues.length) process.exitCode=1;

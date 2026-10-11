#!/usr/bin/env node
// Read-only category registry audit. No API calls or production writes.
const fs = require("node:fs");
const assert = require("node:assert/strict");
const source = fs.readFileSync("src/app/components/ziiply/ziiplyCore.ts","utf8");
const section = source.split("const SEARCH_INTENTS: SearchIntent[] = [")[1]?.split("\n];")[0];
assert(section, "SEARCH_INTENTS not found");
const blocks = [...section.matchAll(/\{\s*category:\s*"([^"]+)"[\s\S]*?\n\s*\},?/g)];
const categories = blocks.map(m=>m[1]);
const unique = new Set(categories);
const issues = [];
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
const report={categoryCount:categories.length,uniqueCount:unique.size,exampleCount:examples.length,issues,limitations:["Static registry audit only; does not execute TypeScript ranking","No live API result coverage, UI or learning behavior verified"]};
console.log(JSON.stringify(report,null,2));
if (issues.length) process.exitCode=1;

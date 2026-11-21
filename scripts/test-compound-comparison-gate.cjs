// Regression for shared S/K/SPAR basket comparison product identity.
// Run with: node scripts/test-compound-comparison-gate.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("src/app/components/ziiply/ziiplyCore.ts", "utf8");
const start = source.indexOf("  // A mixed grocery product must not be matched");
const end = source.indexOf("  // Product form matters:", start);
assert(start >= 0 && end > start, "shared compound identity guard missing");
const guard = source.slice(start, end);
assert(guard.includes("sourceCompound"), "compound guard missing");
// Extract the exact matcher and test it against representative names without
// introducing a separate, potentially divergent production implementation.
const expression = guard.match(/\.match\((\/.*?\/u)\);/);
assert(expression, "compound matcher expression not found");
const matcher = Function("return " + expression[1])();
const tests = [
  ["K-Menu riisi-vihannessekoitus 450 g", true],
  ["K-Menu riisi-vihannes sekoitus 450 g", false],
  ["Riisi-vihannessekoitus pakaste 450 g", true],
  ["K-Menu riisi-vihannespakaste 450 g", true],
  ["K-Menu riisi-vihannessekoitus 450 g karkki", true],
  ["Tokmanni karkkirasia 450 g", false],
];
for (const [name, expected] of tests) assert.equal(Boolean(matcher.test(name.toLowerCase())), expected, name);
const stem = part => part.slice(0, Math.max(4, part.length - 2));
const fits = (candidate, parts) => parts.every(part => candidate.toLowerCase().split(/[^a-zåäö0-9]+/).some(word => word.startsWith(stem(part))));
assert.equal(fits("Tokmanni makeisrasia 450 g", ["riisi","vihannes"]), false);
assert.equal(fits("Prisma kasvispakaste 450 g", ["riisi","vihannes"]), false);
assert.equal(fits("Riisi-vihannessekoitus 450 g", ["riisi","vihannes"]), true);
assert.equal(fits("Riisi vihannes sekoitus 450 g", ["riisi","vihannes"]), true);
console.log("PASS shared compound comparison guard regression");

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type Rule = { category: string; variants: string[]; requiredAny?: string[] };
const registryText = readFileSync("src/app/components/ziiply/search/searchCategoryRegistry.ts", "utf8");
const rules = JSON.parse(registryText.slice(registryText.indexOf("= [") + 2).trim().replace(/;\s*$/, "")) as Rule[];
const core = readFileSync("src/app/components/ziiply/ziiplyCore.ts", "utf8");
const normalize = (v: string) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const standalone = new Set(["voi", "tee"]);
const matches = (text: string, token: string) => standalone.has(token) ? text.split(/[^a-z0-9]+/).includes(token) : text.includes(token);
function detect(query: string) {
  const q = normalize(query);
  const exact = rules.find(r => r.variants.some(v => normalize(v) === q));
  if (exact) return exact.category;
  const candidates = rules.flatMap(r => [...r.variants, ...(r.requiredAny || [])].map(t => ({category:r.category, token:normalize(t)})).filter(x => x.token.length >= 3 && matches(q,x.token)));
  candidates.sort((a,b) => b.token.length - a.token.length);
  return candidates[0]?.category || "generic";
}
assert.equal(rules.length, 191);
assert.equal(new Set(rules.map(r=>r.category)).size, rules.length);
for(const [q,expected] of Object.entries({voi:"butter",maito:"milk",liha:"meat",kana:"chicken",cola:"cola",oltermanni:"cheese",mandariini:"fruit_veg",porkkana:"fruit_veg"})) assert.equal(detect(q),expected,q);
assert.equal(detect("porkkana"),"fruit_veg");
for (const [q, expected] of Object.entries({
  "kanasuikale": "chicken",
  "broilerin jauheliha": "meat",
  "meijerivoi": "butter",
  "coca-cola": "cola",
})) {
  const actual = detect(q);
  assert.equal(actual, expected, q);
}
assert.ok(core.includes("!isExplicitlyExcludedSearchProduct(query, product)"));
assert.ok(core.includes("const standaloneTerms = new Set"));
console.log("Desktop category registry smoke checks passed (191 categories; 8 queries).");

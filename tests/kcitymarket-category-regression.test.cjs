const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
// Execute the actual production category() function, not a copy of its rules.
const source = fs.readFileSync("src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts","utf8");
const match = source.match(/export function category\(t:string\)\{[\s\S]*?\n\}\nfunction isNoiseLine/);
assert.ok(match, "Production category function must be found");
const categorySource = match[0].replace("export function category(t:string)", "function category(t)").replace(/\nfunction isNoiseLine$/, "");
const context = {clean: (s) => String(s).trim()};
vm.runInNewContext(categorySource + "\nthis.classify=category;", context);
const cases = [
  ["Friggs maissikakut", "Kuivatuotteet"],
  ["Riisikakut 100 g", "Kuivatuotteet"],
  ["Pakastemuusiperuna 500 g", "Pakasteet"],
  ["Oolannin MUUSIPERUNA", "Pakasteet"],
  ["Pakasteperunat 1 kg", "Pakasteet"],
  ["Ingman Creamy jäätelö 850 ml", "Pakasteet"],
  ["Jäätelötuutit 6 kpl", "Pakasteet"],
  ["Tuore peruna 5 kg", "Hevi"],
  ["Kananpojan fileepalat", "Liha & makkarat"],
  ["Pinaattikeitto pakaste", "Pakasteet"],
  ["Kahvi 500 g", "Kahvi & tee"],
];
for(const [name, expected] of cases){
  test("Citymarket category: "+name, () => assert.equal(context.classify(name),expected));
}

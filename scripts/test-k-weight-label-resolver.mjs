// Standalone research test for Finnish K-store price-embedded scale labels.
// IMPORTANT: this file is not imported by Ziiply production/scanner code.
// Run manually: node scripts/test-k-weight-label-resolver.mjs

function ean13CheckDigit(first12) {
  if (!/^\d{12}$/.test(first12)) throw new Error("EAN-13 body must contain 12 digits");
  const sum = [...first12].reduce((total, ch, i) => total + Number(ch) * (i % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

function isValidEan13(ean) {
  return /^\d{13}$/.test(ean) && ean13CheckDigit(ean.slice(0, 12)) === ean[12];
}

function parseKPriceScaleLabel(ean) {
  if (!isValidEan13(ean)) throw new Error("Invalid EAN-13");
  if (!ean.startsWith("2000")) throw new Error("Not a tested K price-label 20 00 structure");
  const plu = ean.slice(4, 8);
  const priceCents = Number(ean.slice(8, 12));
  const canonicalBody = `2000${plu}0000`;
  const canonicalEan = canonicalBody + ean13CheckDigit(canonicalBody);
  return { plu, priceCents, price: priceCents / 100, canonicalEan };
}

function makeScaleLabel(plu, priceCents) {
  const body = `2000${plu}${String(priceCents).padStart(4, "0")}`;
  return body + ean13CheckDigit(body);
}

const realLabels = [
  { label: "2000638805044", plu: "6388", priceCents: 504, canonical: "2000638800001", name: "Bruno mandariini Nadorcott" },
  { label: "2000612501849", plu: "6125", priceCents: 184, canonical: "2000612500002", name: "Pirkka suomalainen jäävuorisalaatti" },
];

const canonicalCases = [
  ["8187","2000818700008"],["6863","2000686300003"],["5036","2000503600002"],
  ["3295","2000329500005"],["6076","2000607600007"],["6215","2000621500000"],
  ["6002","2000600200006"],["6324","2000632400009"],["6809","2000680900001"],
  ["6453","2000645300006"],["6353","2000635300009"],["6812","2000681200001"],
  ["6372","2000637200000"],["6429","2000642900001"],["7970","2000797000007"],
  ["5121","2000512100005"],["7971","2000797100004"],["5157","2000515700004"],
  ["7973","2000797300008"],["8078","2000807800009"],["5174","2000517400001"],
  ["5566","2000556600004"],
];

let passed = 0;
function assert(condition, message) {
  if (!condition) throw new Error(message);
  passed++;
}

for (const t of realLabels) {
  const r = parseKPriceScaleLabel(t.label);
  assert(r.plu === t.plu, `${t.name}: PLU mismatch`);
  assert(r.priceCents === t.priceCents, `${t.name}: price mismatch`);
  assert(r.canonicalEan === t.canonical, `${t.name}: canonical EAN mismatch`);
}

for (const [plu, canonical] of canonicalCases) {
  assert(isValidEan13(canonical), `PLU ${plu}: canonical EAN check digit invalid`);
  const synthetic = makeScaleLabel(plu, 397);
  const parsed = parseKPriceScaleLabel(synthetic);
  assert(parsed.plu === plu, `PLU ${plu}: synthetic PLU mismatch`);
  assert(parsed.priceCents === 397, `PLU ${plu}: synthetic price mismatch`);
  assert(parsed.canonicalEan === canonical, `PLU ${plu}: canonical round-trip mismatch`);
}

const invalid = ["2000638805045", "1234567890123", "200061250184"];
for (const value of invalid) {
  let rejected = false;
  try { parseKPriceScaleLabel(value); } catch { rejected = true; }
  assert(rejected, `Invalid input was not rejected: ${value}`);
}

console.log(`K-weight-label resolver standalone test: PASS (${passed} assertions)`);
console.log("Production scanner/EAN code was not used or modified.");

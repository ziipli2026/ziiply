const test = require("node:test");
const assert = require("node:assert/strict");
// Historical 40LV/26 excerpts. Research only; never infer store-specific availability.
function parseStrictPair(lines) {
  const anchor = lines.findIndex(line => line.startsWith("Ilman Plussa-korttia"));
  if (anchor < 2) return null;
  const digits = lines[anchor - 2], unit = lines[anchor - 1];
  const normal = lines[anchor].match(/^Ilman Plussa-korttia\s+(\d{1,3}[,.]\d{2})\s*\/\s*(pkt|ps|rs|kpl|kg|tlk|plo|prk|ltk)\b/i);
  if (!/^\d{3,4}$/.test(digits) || !/^(PKT|PS|RS|KPL|KG|TLK|PLO|PRK|LTK)$/i.test(unit) || !normal || unit.toLowerCase() !== normal[2].toLowerCase()) return null;
  const offer = Number(digits) / 100, regular = Number(normal[1].replace(",", "."));
  return offer < regular ? { offer, regular, unit, productContext: lines.slice(0, anchor - 2) } : null;
}
test("40LV/26 Sitkas: correct product and PS prices", () => {
  const result = parseStrictPair(["SITKAS 100 % RUIS tai RUIS- SIEMEN TUORENÄKKÄRI 220 g (11,32/kg)", "249", "PS", "Ilman Plussa-korttia 2,79/ps (12,68/kg)"]);
  assert.deepEqual(result, {offer:2.49, regular:2.79, unit:"PS", productContext:["SITKAS 100 % RUIS tai RUIS- SIEMEN TUORENÄKKÄRI 220 g (11,32/kg)"]});
});
test("40LV/26 Savuhovi: correct product and PKT prices", () => {
  const result = parseStrictPair(["Savuhovi", "VIILU KANALASTUT 180 g", "299", "PKT", "Ilman Plussa-korttia 3,99/pkt (22,17/kg)"]);
  assert.equal(result.offer, 2.99); assert.equal(result.regular, 3.99);
  assert.equal(result.unit, "PKT"); assert.ok(result.productContext.includes("VIILU KANALASTUT 180 g"));
});
test("reject unit mismatch, truncated glyph and range", () => {
  assert.equal(parseStrictPair(["Product","249","PS","Ilman Plussa-korttia 2,79/pkt"]), null);
  assert.equal(parseStrictPair(["Product","79","PKT","Ilman Plussa-korttia 4,49/pkt"]), null);
  assert.equal(parseStrictPair(["Product","299","PS","Ilman Plussa-korttia 3,55–3,59/ps"]), null);
});

test("reject equal or higher offer price and malformed price evidence", () => {
  assert.equal(parseStrictPair(["Product","279","PS","Ilman Plussa-korttia 2,79/ps"]), null);
  assert.equal(parseStrictPair(["Product","299","PS","Ilman Plussa-korttia 2,79/ps"]), null);
  assert.equal(parseStrictPair(["Product","2,49","PS","Ilman Plussa-korttia 2,79/ps"]), null);
  assert.equal(parseStrictPair(["Product","249","PS","Ilman Plussa-korttia 2,79/kg"]), null);
});
test("reject detached price evidence and missing product context", () => {
  assert.equal(parseStrictPair(["249","PS","Ilman Plussa-korttia 2,79/ps"]), null);
  assert.equal(parseStrictPair(["Product","249","PS","Other text","Ilman Plussa-korttia 2,79/ps"]), null);
});

test("reject missing unit and non-discounted price", () => {
  assert.equal(parseStrictPair(["Product","299","PKT","Ilman Plussa-korttia 3,99"]), null);
  assert.equal(parseStrictPair(["Product","399","PKT","Ilman Plussa-korttia 3,99/pkt"]), null);
  assert.equal(parseStrictPair(["Product","499","PKT","Ilman Plussa-korttia 3,99/pkt"]), null);
});

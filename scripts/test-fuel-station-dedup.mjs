import assert from "node:assert/strict";

function dedupe(stations) {
  const unique = new Map();
  for (const station of [...stations].sort((a, b) => Number(a.id) - Number(b.id))) {
    const address = String(station.address ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    const chain = String(station.chain ?? "").trim().toLowerCase();
    const key = address && chain ? chain + "|" + address : "id|" + station.id;
    const previous = unique.get(key);
    if (!previous) { unique.set(key, { ...station }); continue; }
    for (const [priceKey, dateKey] of [["diesel", "observedDiesel"], ["price95", "observed95"], ["price98", "observed98"]]) {
      const candidateTime = Date.parse(String(station[dateKey] ?? "")) || 0;
      const previousTime = Date.parse(String(previous[dateKey] ?? "")) || 0;
      if (station[priceKey] != null && (previous[priceKey] == null || candidateTime > previousTime)) {
        previous[priceKey] = station[priceKey];
        previous[dateKey] = station[dateKey];
      }
    }
  }
  return [...unique.values()];
}
const result = dedupe([
  { id: "12683", chain: "St1", name: "ST1 Haukilahti", address: "Ahventie  2", diesel: 1.8, observedDiesel: "2026-10-09T10:00:00Z" },
  { id: "836", chain: "St1", name: "Haukilahti", address: " Ahventie 2 ", diesel: 1.9, observedDiesel: "2026-10-08T10:00:00Z", price95: 1.7, observed95: "2026-10-09T08:00:00Z" },
  { id: "900", chain: "ABC", name: "Other chain", address: "Ahventie 2" },
  { id: "901", chain: "St1", name: "Other address", address: "Ahventie 3" },
]);
assert.equal(result.length, 3);
const haukilahti = result.find((s) => s.id === "836");
assert.ok(haukilahti);
assert.equal(haukilahti.diesel, 1.8);
assert.equal(haukilahti.price95, 1.7);
console.log("Fuel station deduplication: 4 checks passed");

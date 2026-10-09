import assert from "node:assert/strict";

const isExcluded = (station) => /\bteboil\b/i.test(
  String(station?.chain ?? "") + " " + String(station?.name ?? "")
);

const cases = [
  [{ chain: "Teboil", name: "Keskusta" }, true],
  [{ chain: "Teboil Express", name: "Keskusta" }, true],
  [{ chain: "TEBOIL", name: "Keskusta" }, true],
  [{ chain: null, name: "Teboil Express Helsinki" }, true],
  [{ chain: "ABC", name: "Teboil vanha nimi" }, true],
  [{ chain: "Teboil Oy", name: "Keskusta" }, true],
  [{ chain: "Neste / Teboil", name: "Keskusta" }, true],
  [{ chain: "ABC", name: "Vanha Teboil Keskusta" }, true],
  [{ chain: "St1", name: "Veikkari" }, false],
  [{ chain: "Neste Oil Express", name: "Pasila" }, false],
  [{ chain: "ABC", name: "Liikenneasema" }, false],
  [{ chain: null, name: null }, false],
];

for (const [station, expected] of cases) {
  assert.equal(isExcluded(station), expected, JSON.stringify(station));
}
console.log(`Teboil exclusion: ${cases.length} cases passed`);

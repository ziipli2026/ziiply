const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("src/app/components/ziiply/offerSearch/sharedProductCategory.ts", "utf8");
const ruleLines = source.split("\n").filter(line => line.trim().startsWith("[/"));
const rules = ruleLines.map(line => {
  const match = line.match(/^\s*\[(\/.*\/u),\s*"([^"]+)"\],?\s*$/);
  assert.ok(match, "Unparseable shared taxonomy rule: " + line);
  return [Function("return " + match[1])(), match[2]];
});
const compoundRules = source.split("\n").filter(line => line.trim().startsWith("if (/(?:")).map(line => {
  const match = line.match(/if \((\/.*\/u)\.test\(s\)\) return "([^"]+)";/);
  assert.ok(match, "Unparseable compound rule: " + line);
  return [Function("return " + match[1])(), match[2]];
});
function classify(title) {
  const s = title.normalize("NFKC").toLocaleLowerCase("fi-FI").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return [...compoundRules, ...rules].find(([re]) => re.test(s))?.[1] ?? null;
}
for (const [title, category] of [
  ["Kivikylän lihapyörykät 350 g", "Liha & makkarat"],
  ["Pistaasijuustokakku", "Leipomo"],
  ["Rahkapulla", "Leipomo"],
  ["Parsakaali", "Hevi"],
  ["Paistinpannu 28 cm", "Koti & vapaa-aika"],
  ["Suklaamaitojuoma", "Juomat"],
  ["Tuntematon merkkituote 400 g", null],
  ["Maitosuklaa", "Makeiset & keksit"],
  ["Juustopizza", "Valmisruoka"],
  ["Perunalaatikko", "Valmisruoka"],
  ["Säilytyslaatikko 12 l", "Koti & vapaa-aika"],
  ["Muovilaatikko 5 l", "Koti & vapaa-aika"],
  ["Savustettu kirjolohi", "Kala"],
  ["Kirjolohiöljy koirille", "Lemmikit"],
  ["Koiran asu", "Lemmikit"],
]) test(title, () => assert.equal(classify(title), category));

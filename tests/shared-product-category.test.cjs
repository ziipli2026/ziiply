const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");
const path = require("node:path");
const file = path.resolve("src/app/components/ziiply/offerSearch/sharedProductCategory.ts");
const source = fs.readFileSync(file, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: file,
}).outputText;
const mod = new Module(file, module);
mod.filename = file;
mod.paths = module.paths;
mod._compile(compiled, file);
const classify = mod.exports.classifySharedProductCategory;
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
  ["Pakastepizza", "Pakasteet"],
  ["Pakasteparsakaali", "Pakasteet"],
  ["Perunalaatikko", "Valmisruoka"],
  ["Säilytyslaatikko 12 l", "Koti & vapaa-aika"],
  ["Muovilaatikko 5 l", "Koti & vapaa-aika"],
  ["Savustettu kirjolohi", "Kala"],
  ["Kirjolohiöljy koirille", "Lemmikit"],
  ["Koiran asu", "Lemmikit"],
  ["Klementiini 1 kg", "Hevi"],
  ["Tuorejuusto", "Maitotuotteet"],
  ["Ultimate Plus -konetiskitabletti", "Kodinhoito"],
  ["Siivousetikka", "Kodinhoito"],
  ["Minivesimeloni", "Hevi"],
  ["Neulemekko", "Koti & vapaa-aika"],
  ["Nauta-viljapossujauheliha", "Liha & makkarat"],
  ["Perinteinen hedelmäjogurtti", "Maitotuotteet"],
  ["Kanan sisäfilee", "Liha & makkarat"],
  ["Deluxe Prosciutto Crudo", "Liha & makkarat"],
  ["Saskia Vadelmanmakuinen lähdevesi 12-pack", "Juomat"],
  ["JOENSUUN HERKKULEIPOMO Ahvenkukko", "Leipomo"],
  ["FREEWAY Talvilimonadi", "Juomat"],
  ["LÖFBERGS Magnifika-suodatinkahvi", "Kahvi & tee"],
  ["Deluxe Alkoholiton puolukkaglögi", "Juomat"],
  ["FAZER AITO Kauragurtti", "Maitotuotteet"],
  ["Alesto Manteli-rusinasekoitus", "Kuivatuotteet"],
  ["Parkside Erikoisporanteräsarja", "Koti & vapaa-aika"],
  ["Parkside Kiinnityskoukut", "Koti & vapaa-aika"],
  ["PHILIPS 2000 Series -pölynimuri", "Koti & vapaa-aika"],
  ["Kotimainen joulutähti", "Koti & vapaa-aika"],
  ["Esmara Neulepaita", "Koti & vapaa-aika"],
  ["esmara Men Lämpöpoolopaita", "Koti & vapaa-aika"],
  ["esmara Men Premium-kauluspaita", "Koti & vapaa-aika"],
  ["esmara Men Aluspaita", "Koti & vapaa-aika"],
  ["Lupilu Toiminnallinen pehmolelu", "Koti & vapaa-aika"],
  ["Lupilu Puinen motoriikkalelu", "Koti & vapaa-aika"],
  ["BAYER DESIGN Ääntelevä nukke", "Koti & vapaa-aika"],
  ["BAYER DESIGN Nukenvaunu- tai tarvikesetti", "Koti & vapaa-aika"],
  ["Lupilu Roolileikkisetti", "Koti & vapaa-aika"],
  ["Lupilu Taikataulu", "Koti & vapaa-aika"],
  ["Lupilu Magneettinen rakennussarja", "Koti & vapaa-aika"],
  ["Lupilu Leikkiruokasetti", "Koti & vapaa-aika"],
  ["Lupilu Puiset rakennuspalikat", "Koti & vapaa-aika"],
  ["Lupilu Puinen jäätelökärry tai makeiskoju", "Koti & vapaa-aika"],
  ["Puinen jäätelökärry", "Koti & vapaa-aika"],
  ["Lasten makeiskoju", "Koti & vapaa-aika"],
  ["Deluxe Pistaasijäätelö", "Pakasteet"],
  ["FAVORINA Joulumakeiset", "Makeiset & keksit"],
]) test(title, () => assert.equal(classify(title), category));

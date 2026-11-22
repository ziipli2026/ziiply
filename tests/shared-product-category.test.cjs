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
]) test(title, () => assert.equal(classify(title), category));

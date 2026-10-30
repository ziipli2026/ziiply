import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/components/ziiply/ziiplyCore.ts", "utf8");
const brandSafe = /target\.replace\(\/\\bjuustoportti\(\?:n\)\?\\b\/g, " "\)/g;
const count = [...source.matchAll(brandSafe)].length;
assert.equal(count, 2, "Both cheese comparison gates must ignore the Juustoportti brand");
assert.match(source, /productTypeName = normalizedName\.replace\(\/\\bjuustoportti/, "Normal results must ignore the brand");
assert.doesNotMatch(source, /\["tuorejuusto", "sulatejuusto", "raejuusto", "juustodippi"/, "Valid cheese types must not be excluded as a group");
assert.match(source, /"juustodippi", "dippi", "nacho", "kastike"/, "Cheese dips and sauces must remain excluded");
console.log("Cheese search source regression checks passed");

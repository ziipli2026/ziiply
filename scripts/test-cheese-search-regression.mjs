import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/components/ziiply/ziiplyCore.ts", "utf8");
const brandSafe = /target\.replace\(\/\\bjuustoportti\(\?:n\)\?\\b\/g, " "\)/g;
const count = [...source.matchAll(brandSafe)].length;
assert.equal(count, 2, "Both cheese comparison gates must ignore the Juustoportti brand");
assert.match(source, /productTypeName = normalizedName\.replace\(\/\\bjuustoportti/, "Normal results must ignore the brand");
assert.doesNotMatch(source, /const targetIsWrongCheeseProduct = hasAnyToken\(target, \[\s*"tuorejuusto"/, "Valid cheese types must not be excluded from candidate comparisons");
assert.doesNotMatch(source, /const forbiddenWords = hasAnyToken\(target, \[\s*"tuorejuusto"/, "Valid cheese types must not be excluded from strict matching");
assert.match(source, /"juustodippi", "dippi", "nacho", "kastike"/, "Cheese dips and sauces must remain excluded");
console.log("Cheese search source regression checks passed");

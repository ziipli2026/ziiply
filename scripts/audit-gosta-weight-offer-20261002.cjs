// Isolated static regression of production weight-offer comparison guards.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const page = fs.readFileSync("src/app/page.tsx","utf8");
function has(pattern,label) { assert.match(page,pattern,label); console.log("PASS",label); }
has(/function isComparableWeightOfferV797\(item: CartItem\)/,"weight offer detector exists");
has(/unit === "kg" && Number\.isFinite\(quote\) && quote > 0/,"kg quote requires a valid positive price");
has(/if \(isComparableWeightOfferV797\(item\)\) return true;/,"unknown-weight offer can participate in unit-price comparison");
has(/return cart\.filter\(\(item\) => !isManualShoppingItem\(item\) &&\s*isComparisonEligibleV797\(item\) && !isComparableWeightOfferV797\(item\)\);/,"unknown-weight offer excluded from euro basket coverage and totals");
has(/!\(ean && resolvePriceWeightLabel\(ean\)\)/,"priced weight-label EAN is not confused with unknown-weight offer");
console.log("PASS static guards; runtime weight-entry and persisted-cart behavior still require separate dynamic tests");

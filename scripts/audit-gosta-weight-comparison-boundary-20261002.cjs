const assert=require("node:assert/strict");
const fs=require("node:fs");
const page=fs.readFileSync("src/app/page.tsx","utf8");
const mobile=fs.readFileSync("src/app/components/ziiply/cards/ZiiplyMobileCartCard.tsx","utf8");
const eligibility=page.match(/function isComparisonEligibleV797\(item: CartItem\) \{([\s\S]*?)\n  \}/);
assert.ok(eligibility,"comparison eligibility helper exists");
assert.match(eligibility[1],/if \(String\(item\.source \|\| ""\)\.toLowerCase\(\) === "offer"\) return false;/);
assert.doesNotMatch(page,/isComparableWeightOfferV797/,"no €/kg offer exception remains");
assert.match(page,/const comparisonCartV738 = nextCart\.filter\(isComparisonEligibleV797\);/);
assert.match(page,/const comparableCartV730 = cart\.filter\(isComparisonEligibleV797\);/);
assert.match(page,/const comparableCart = useMemo\(\(\) => \{[\s\S]*?isComparisonEligibleV797\(item\)\);/);
assert.match(mobile,/if \(isPendingWeightPriceV794\(item\)\) return 0;/,"pending weighed price excluded from receipt total");
const eligible=x=>String(x.source||"").toLowerCase()!=="offer"&&!x.weightLabel;
const items=[
 {source:"offer",price:5},
 {source:"offer",price:0,weightOffer:true,comparisonPrice:8.99,comparisonPriceUnit:"kg"},
 {source:"normal",price:2.5},
 {source:"normal",weightLabel:true,price:0}
];
assert.deepEqual(items.filter(eligible),[items[2]]);
assert.equal(items.slice(0,2).filter(eligible).length,0);
console.log("PASS fixed-price and €/kg Gösta offers excluded; normal item retained");
console.log("PASS pending weight receipt remains excluded from euro total");

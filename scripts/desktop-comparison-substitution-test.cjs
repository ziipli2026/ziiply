const fs=require("node:fs");const ts=require("typescript");const vm=require("node:vm");const assert=require("node:assert/strict");
const source=fs.readFileSync("src/app/desktop-preview/page.tsx","utf8");
const start=source.indexOf("  function desktopStrictCompareIdentity(");
const end=source.indexOf("\n  function desktopPickCompareCandidate(",start);
assert(start>=0&&end>start,"Strict comparison helper missing");
const fn=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const context={};vm.runInNewContext(fn,context);
const check=context.desktopStrictCompareIdentity;
const cases=[
 ["Kotimaista Silakkafilee MSC 250 g","Kotimaista Lauantaimakkara 250 g",false],
 ["Xtra väkiviinaetikka 1 l","Pirkka väkiviinaetikka 1 l",true],
 ["Kotimaista sokeriherne 150 g","Pirkka sokeriherneet 150 g",true],
 ["Kotimaista tilli 30 g","Pirkka tilli 30 g",true],
 ["Meira valkopippuri 35 g","Meira maustepippuri 35 g",false],
 ["Kotimaista Silakkafilee MSC 250 g","Pirkka Silakkafilee MSC 250 g",true],
 ["Kotimaista Silakkafilee MSC 250 g","Pirkka Seiti MSC 250 g",false],
 ["Pirkka tilli 30 g","Kotimaista tilli kuivattu 30 g",false],
 ["Pirkka väkiviinaetikka 1 l","Xtra väkiviinaetikka maustettu 1 l",false]
];
for(const [a,b,expected] of cases){assert.equal(check(a,b),expected,a+" / "+b);console.log("PASS",a,"=>",b,expected)}
const pick=source.slice(end,source.indexOf("\n  async function openDesktopComparison()",end));
assert(pick.includes("desktopPackageCompatible("),"Package size must be checked");
assert(pick.includes("isComparisonAttributeCompatible("),"Attributes must be checked");
assert(pick.includes("desktopStrictCompareIdentity("),"Identity must be checked");
assert(pick.includes("if(exact.length)return"),"Exact EAN must take priority");
assert(!source.includes('(!isS&&data?.source==="ruoanhinta-k")?Math.round('),"K-store Ruoanhinta prices are already cents and must not be multiplied by 100");
assert(pick.includes("!desktopHasExplicitPackage(name)"),"Exact EAN must not bypass explicit package counts");
assert(source.includes("function desktopHasExplicitPackage("),"Explicit package guard must exist");
console.log("PASS: comparison matcher guards");

const packageStart=source.indexOf("  function desktopPackageCompatible(");
const packageEnd=source.indexOf("\n  function desktopFindPackageAlternative(",packageStart);
assert(packageStart>=0&&packageEnd>packageStart,"Package compatibility helper missing");
const packageFn=ts.transpileModule(source.slice(packageStart,packageEnd),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(packageFn,context);
const compatible=context.desktopPackageCompatible;
for(const [a,b,expected] of [
  ["Maito 1 l","Maito 1000 ml",true],
  ["Kerma 2 dl","Kerma 200 ml",true],
  ["Jogurtti 500 g","Jogurtti 500 ml",false],
  ["Juusto 1 kg","Juusto 1000 g",true],
  ["Maito 1 l","Maito 500 ml",false],
  ["Kananmunat 10 kpl","Kananmunat 10 kpl",true],
  ["Kananmunat 10 kpl","Kananmunat 6 kpl",false],
  ["Kananmunat 10 kpl","Maito 10 dl",false],
  ["Jogurtti 2x250 g","Jogurtti 250 g",false],
  ["Jogurtti 2x250 g","Jogurtti 2x250 g",true],
  ["Jogurtti 2x250 g","Jogurtti 3x250 g",false]
]){
  assert.equal(compatible(a,b),expected,a+" / "+b);
  console.log("PASS package",a,"=>",b,expected);
}

// Verified weight estimates: cents/kg * grams / 1000 => cents, then euros.
assert.equal(Math.round(89*500/1000)/100,0.45,"500 g at 0.89 EUR/kg");
assert.equal(Math.round(139*250/1000)/100,0.35,"250 g at 1.39 EUR/kg");
assert(source.includes("Math.round(verifiedWeightCents*comparisonGrams/1000)/100"),"Automatic weighed-item price must convert grams to kg");
assert(source.includes("weightEstimate:estimatedWeightPrice!==null"),"Estimated prices must be marked as estimates");
assert(source.includes("const finalPrice=estimatedWeightPrice??price"),"Verified weight estimate must replace raw item quote");
console.log("PASS: verified weighed-item estimates");

assert(source.includes("if(exactWeighed.length)return exactWeighed"),"Verified weighed produce exact EAN must survive package-size rejection");
assert(source.includes("desktopVerifiedKgPriceCents(p)!==null"),"Exact weighed EAN requires verified kilogram price");
assert(source.includes("comparisonGrams/(Number.isFinite(cartQuantity)"),"Recipe grams must be divided across basket quantity");
console.log("PASS: weighed produce exact EAN and quantity guards");

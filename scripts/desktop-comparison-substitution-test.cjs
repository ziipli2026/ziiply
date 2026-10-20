const fs=require("node:fs");const vm=require("node:vm");const assert=require("node:assert/strict");
const source=fs.readFileSync("src/app/desktop-preview/page.tsx","utf8");
const start=source.indexOf("  function desktopStrictCompareIdentity(");
const end=source.indexOf("\n  function desktopPickCompareCandidate(",start);
assert(start>=0&&end>start,"Strict comparison helper missing");
const fn=source.slice(start,end).replace(/:string/g,"").replace(/:boolean/g,"");
const context={};vm.runInNewContext(fn,context);
const check=context.desktopStrictCompareIdentity;
const cases=[
 ["Kotimaista Silakkafilee MSC 250 g","Kotimaista Lauantaimakkara 250 g",false],
 ["Xtra väkiviinaetikka 1 l","Pirkka väkiviinaetikka 1 l",true],
 ["Kotimaista sokeriherne 150 g","Pirkka sokeriherneet 150 g",true],
 ["Kotimaista tilli 30 g","Pirkka tilli 30 g",true],
 ["Meira valkopippuri 35 g","Meira maustepippuri 35 g",false],
 ["Kotimaista Silakkafilee MSC 250 g","Pirkka Silakkafilee MSC 250 g",true],
 ["Kotimaista Silakkafilee MSC 250 g","Pirkka Seiti MSC 250 g",false]
];
for(const [a,b,expected] of cases){assert.equal(check(a,b),expected,a+" / "+b);console.log("PASS",a,"=>",b,expected)}
const pick=source.slice(end,source.indexOf("\n  async function openDesktopComparison()",end));
assert(pick.includes("desktopPackageCompatible("),"Package size must be checked");
assert(pick.includes("isComparisonAttributeCompatible("),"Attributes must be checked");
assert(pick.includes("desktopStrictCompareIdentity("),"Identity must be checked");
assert(pick.includes("if(exact.length)return"),"Exact EAN must take priority");
console.log("PASS: comparison matcher guards");

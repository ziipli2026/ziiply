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
assert(pick.includes("!desktopHasExplicitPackage(name)"),"Exact EAN must not bypass explicit package counts");
assert(source.includes("function desktopHasExplicitPackage("),"Explicit package guard must exist");
console.log("PASS: comparison matcher guards");

const packageStart=source.indexOf("  function desktopPackageCompatible(");
const packageEnd=source.indexOf("\n  function desktopFindPackageAlternative(",packageStart);
assert(packageStart>=0&&packageEnd>packageStart,"Package compatibility helper missing");
const packageFn=source.slice(packageStart,packageEnd).replace(/:string/g,"").replace(/:boolean/g,"");
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
  ["Kananmunat 10 kpl","Maito 10 dl",false]
]){
  assert.equal(compatible(a,b),expected,a+" / "+b);
  console.log("PASS package",a,"=>",b,expected);
}

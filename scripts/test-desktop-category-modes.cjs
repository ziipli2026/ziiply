const fs=require("node:fs"),assert=require("node:assert/strict"),vm=require("node:vm"),ts=require("typescript");
const source=fs.readFileSync("src/app/desktop-preview/page.tsx","utf8");
function extract(name){const start=source.indexOf("  function "+name+"(");assert(start>=0,name+" missing");const brace=source.indexOf("{",start);let depth=0,end=-1;for(let i=brace;i<source.length;i++){if(source[i]==="{")depth++;if(source[i]==="}"&&!--depth){end=i+1;break}}assert(end>0,name+" unterminated");return source.slice(start,end)}
const names=["desktopCheapestPack","desktopIsFilterCoffee","desktopCheapestCompatible","desktopCompareCategoryCompatible"];
const code=ts.transpileModule(names.map(extract).join("\n")+"\nexports.check=desktopCompareCategoryCompatible;exports.pack=desktopCheapestCompatible;",{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const ctx={exports:{},productGroupGate:()=>true};vm.runInNewContext(code,ctx);const {check,pack}=ctx.exports;
const p=(name,category)=>({name,category});
const cases=[
["sokerillinen/sokeriton",p("Coop Cola 1,5 l","limonadi"),p("Pirkka Cola Zero 1,5 l","limonadi"),false],
["eri kategoria",p("Coop Cola 1,5 l","limonadi"),p("Pirkka Cola 1,5 l","mehu"),false],
["sama ominaisuus",p("Coop Cola Zero 1,5 l","limonadi"),p("Pirkka Cola Zero 1,5 l","limonadi"),true],
["laktoositon/tavallinen",p("Valio kevytmaito laktoositon 1 l","maito"),p("Arla kevytmaito 1 l","maito"),false],
["sama maito",p("Valio kevytmaito laktoositon 1 l","maito"),p("Arla kevytmaito laktoositon 1 l","maito"),true],
["eri pakkauskoko",p("Coop Cola 1,5 l","limonadi"),p("Pirkka Cola 0,5 l","limonadi"),false]
];
let failures=0;for(const [label,a,b,expected] of cases){const actual=check(a,b)&&pack(a.name,b.name);const ok=actual===expected;console.log((ok?"PASS":"FAIL")+" "+label+" expected="+expected+" actual="+actual);if(!ok)failures++}
const modeBlock=source.slice(source.indexOf("async function desktopChangeCompareMatchMode"),source.indexOf("async function desktopSelectCompareAlternative"));
assert(modeBlock.includes("desktopCompareCategoryCompatible"),"all modes must share category gate");
assert(modeBlock.indexOf("desktopCompareCategoryCompatible")<modeBlock.indexOf('if(mode==="own_brands")'),"category gate must precede brand filtering");
assert(modeBlock.indexOf("desktopCompareCategoryCompatible")<modeBlock.indexOf('if(mode==="same_brand")'),"category gate must precede same brand");
console.log("Mode gating checked: halvin / ketjun omat / sama brändi");
if(failures)process.exitCode=1;

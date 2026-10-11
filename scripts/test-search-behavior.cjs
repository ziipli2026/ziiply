#!/usr/bin/env node
// Execute actual TypeScript search code against deterministic fixtures.
const fs = require("node:fs");
const assert = require("node:assert/strict");
const ts = require("typescript");
require.extensions[".ts"] = function(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX
  }}).outputText;
  module._compile(compiled, filename);
};
// Node does not resolve extensionless local TypeScript imports by default.
const Module = require("node:module");
const path = require("node:path");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  try { return originalResolve.call(this, request, parent, isMain, options); }
  catch (error) {
    if (error.code === "MODULE_NOT_FOUND" && request.startsWith(".")) {
      const candidate = path.resolve(path.dirname(parent.filename), request + ".ts");
      if (fs.existsSync(candidate)) return candidate;
    }
    throw error;
  }
};
const root = "../src/app/components/ziiply";
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === "posthog-js") return { __esModule: true, default: {} };
  return originalLoad.call(this, request, parent, isMain);
};
const core = require(root+"/ziiplyCore.ts");
Module._load = originalLoad;
const memory = require(root+"/search/searchIntentMemory.ts");
const samples = [
  ["ketsuppi","ketchup"],["sinappi","mustard"],["majoneesi","mayonnaise"],
  ["tomaattimurska","tomato_crush"],["tomaattipyree","tomato_paste"],
  ["mysli","muesli"],["wc-paperi","toilet_paper"],["talouspaperi","paper_towels"],
  ["pyykinpesuaine","laundry_detergent"],["astianpesuaine","dishwashing"],
  ["kahvi","coffee"],["maito","milk"],
  ["keksi","cookies"],["karkki","candy"],["suklaa","chocolate"],
  ["sipsit","snacks"],["chips","snacks"],
  ["porkkana","fruit_veg"],["kananmuna","egg"],
  ["hillosokeri","sugar"],["riisipuuro","porridge"],
  ["puuroriisi","rice"],["ranskanperunat","frozen"],
  ["kotimainen porkkana 1 kg","fruit_veg"],
  ["luomu kananmunat 10 kpl","egg"],
  ["Felix tomaattiketsuppi 500 g","ketchup"],
  ["riisipuuro 500 g","porridge"],
  ["puuroriisi 1 kg","rice"],
  ["ranskanperunat pakaste 1 kg","frozen"],
  ["broilerin jauheliha 400 g","meat"],
  ["tomaattimurska 400 g","tomato_crush"],
  ["hunajasinappi 250 g","mustard"],
  ["suolapähkinä 200 g","snacks"],
  ["suolapähkinä","snacks"],["hunajasinappi","mustard"],
  ["tomaattitahna","tomato_paste"],["dijonsinappi","mustard"]
];
assert(samples.length >= 16, "Insufficient intent regression coverage");
samples.push(...[["kerma", "cream"], ["kuohukerma", "cream"], ["ruokakerma", "cream"], ["vispikerma", "cream"], ["rahka", "quark"], ["maitorahka", "quark"], ["proteiinirahka", "quark"], ["raejuusto", "cottage_cheese"], ["tuorejuusto", "cream_cheese"], ["voi", "butter"], ["meijerivoi", "butter"], ["margariini", "margarine"], ["kasvirasvalevite", "margarine"], ["tee", "tea"], ["mustatee", "tea"], ["vihreä tee", "tea"], ["teepussi", "tea"], ["mehu", "juice"], ["appelsiinimehu", "juice"], ["omenamehu", "juice"], ["makkara", "sausage"], ["grillimakkara", "sausage"], ["lenkkimakkara", "sausage"], ["nakki", "sausage"], ["leikkele", "cold_cuts"], ["kinkkuleikkele", "cold_cuts"], ["kalkkunaleikkele", "cold_cuts"], ["hammastahna", "toothpaste"], ["deodorantti", "deodorant"], ["antiperspirantti", "deodorant"]]);
samples.push(["kosteusvoide","generic"],["aurinkovoide","generic"],
 ["proteesi","generic"],["apteekki","generic"],
 ["Valio voi 500 g","butter"],["musta tee 20 pussia","tea"],
 ["meijerivoi 500 g","butter"],["vihreä tee 20 pussia","tea"]);
const results=[];
for (const [query,expected] of samples) {
 const actual=core.detectSearchIntent(query).category;
 results.push({query,expected,actual,pass:actual===expected});
}
// Verify the real result ranker, not only intent detection.
const makeProduct = (id, name, category) => ({id,name,category,price:2.5});
const rankingCases = [
  {query:"ketsuppi", products:[makeProduct(1,"Ketsupin makuinen kastike","Kastikkeet"),makeProduct(2,"Felix Ketsuppi 500 g","Ketsupit")], first:2},
  {query:"kananmuna", products:[makeProduct(3,"Kananmunaton leivonnainen","Leivonta"),makeProduct(4,"Kotimainen kananmuna 10 kpl","Kananmunat")], first:4, excluded:[3]},
  {query:"sinappi", products:[makeProduct(5,"Sinappikastike 250 ml","Kastikkeet"),makeProduct(6,"Turun sinappi 250 g","Sinapit")], first:6, excluded:[5]},
  {query:"tomaattimurska", products:[makeProduct(7,"Tomaattipyree 200 g","Säilykkeet"),makeProduct(8,"Tomaattimurska 400 g","Säilykkeet")], first:8, excluded:[7]},
  {query:"tomaattipyree", products:[makeProduct(9,"Tomaattimurska 400 g","Säilykkeet"),makeProduct(10,"Tomaattipyree 200 g","Säilykkeet")], first:10, excluded:[9]},
  {query:"sinappi", products:[makeProduct(11,"Sinappi ja sinappikastike 250 g","Sinapit"),makeProduct(12,"Sinappikastike 250 ml","Kastikkeet")], first:11, excluded:[12]},
  {query:"hunajasinappi", products:[makeProduct(13,"Hunajasinappi 250 g","Sinapit"),makeProduct(14,"Majoneesi 250 g","Kastikkeet")], first:13},
  {query:"sinappikastike", products:[makeProduct(15,"Sinappikastike 250 ml","Kastikkeet")], first:15},
  {query:"sinappimajoneesi", products:[makeProduct(16,"Sinappimajoneesi 250 ml","Kastikkeet")], first:16},
  {query:"tomaattimurskakeitto", products:[makeProduct(17,"Tomaattimurskakeitto 400 g","Keitot")], first:17},
  {query:"tomaattipyree", products:[makeProduct(18,"Tomaattipyree ja tomaattimurska 400 g","Säilykkeet")], first:18},
  {query:"tomaattimurska", products:[makeProduct(19,"Tomaattimurska ja tomaattipyree 400 g","Säilykkeet")], first:19},
];
rankingCases.push(...[{"query": "kuohukerma", "products": [{"id": 500, "name": "Kermajäätelö 1 l", "category": "Kermat", "price": 2.5}, {"id": 501, "name": "Valio kuohukerma 2 dl", "category": "Kermat", "price": 2.5}], "first": 501}, {"query": "maitorahka", "products": [{"id": 502, "name": "Rahkapiirakka 400 g", "category": "Rahkat", "price": 2.5}, {"id": 503, "name": "Valio maitorahka 250 g", "category": "Rahkat", "price": 2.5}], "first": 503}, {"query": "raejuusto", "products": [{"id": 504, "name": "Raejuustosalaatti 300 g", "category": "Raejuustot", "price": 2.5}, {"id": 505, "name": "Arla raejuusto 200 g", "category": "Raejuustot", "price": 2.5}], "first": 505}, {"query": "tuorejuusto", "products": [{"id": 506, "name": "Tuorejuustokakku 400 g", "category": "Tuorejuustot", "price": 2.5}, {"id": 507, "name": "Philadelphia tuorejuusto 200 g", "category": "Tuorejuustot", "price": 2.5}], "first": 507}, {"query": "meijerivoi", "products": [{"id": 508, "name": "Voitaikina 500 g", "category": "Voit", "price": 2.5}, {"id": 509, "name": "Valio meijerivoi 500 g", "category": "Voit", "price": 2.5}], "first": 509}, {"query": "kasvirasvalevite", "products": [{"id": 510, "name": "Margariinikeksi 300 g", "category": "Margariinit", "price": 2.5}, {"id": 511, "name": "Kasvirasvalevite 400 g", "category": "Margariinit", "price": 2.5}], "first": 511}, {"query": "vihreä tee", "products": [{"id": 512, "name": "Jäätee 1 l", "category": "Teet", "price": 2.5}, {"id": 513, "name": "Vihreä tee 20 teepussia", "category": "Teet", "price": 2.5}], "first": 513}, {"query": "appelsiinimehu", "products": [{"id": 514, "name": "Appelsiinimehujää 100 g", "category": "Mehut", "price": 2.5}, {"id": 515, "name": "Appelsiinimehu 1 l", "category": "Mehut", "price": 2.5}], "first": 515}, {"query": "grillimakkara", "products": [{"id": 516, "name": "Makkarakeitto 300 g", "category": "Makkarat", "price": 2.5}, {"id": 517, "name": "HK grillimakkara 400 g", "category": "Makkarat", "price": 2.5}], "first": 517}, {"query": "kinkkuleikkele", "products": [{"id": 518, "name": "Kinkkuleikkele pizza 400 g", "category": "Leikkeleet", "price": 2.5}, {"id": 519, "name": "Kinkkuleikkele 200 g", "category": "Leikkeleet", "price": 2.5}], "first": 519}, {"query": "hammastahna", "products": [{"id": 520, "name": "Hammasharja 1 kpl", "category": "Hammastahnat", "price": 2.5}, {"id": 521, "name": "Hammastahna 75 ml", "category": "Hammastahnat", "price": 2.5}], "first": 521}, {"query": "deodorantti", "products": [{"id": 522, "name": "Deodorantti suihkugeeli 250 ml", "category": "Deodorantit", "price": 2.5}, {"id": 523, "name": "Deodorantti 50 ml", "category": "Deodorantit", "price": 2.5}], "first": 523}]);
// Retail-style regression fixtures based on known Finnish grocery product naming.
// These are deterministic examples, NOT fresh responses from store APIs.
const retailFixtures = [
 {query:"kuohukerma", good:"Valio kuohukerma 2 dl", decoy:"Valio kermajäätelö 1 l"},
 {query:"raejuusto", good:"Arla raejuusto 200 g", decoy:"Raejuustosalaatti 300 g"},
 {query:"tuorejuusto", good:"Philadelphia tuorejuusto 200 g", decoy:"Tuorejuustokakku 400 g"},
 {query:"maitorahka", good:"Valio maitorahka 250 g", decoy:"Rahkapiirakka 400 g"},
 {query:"grillimakkara", good:"HK grillimakkara 400 g", decoy:"Makkarakeitto 300 g"},
 {query:"ketsuppi", good:"Felix tomaattiketsuppi 500 g", decoy:"Ketsupin makuinen kastike 500 g"},
 {query:"tomaattimurska", good:"Tomaattimurska 400 g", decoy:"Tomaattipyree 200 g"},
 {query:"vihreä tee", good:"Vihreä tee 20 teepussia", decoy:"Jäätee 1 l"},
 {query:"appelsiinimehu", good:"Appelsiinimehu 1 l", decoy:"Appelsiinimehujää 100 g"},
 {query:"kananmuna", good:"Kotimainen kananmuna 10 kpl", decoy:"Kananmunaton leivonnainen"},
 {query:"voi", good:"Valio meijerivoi 500 g", decoy:"Voitaikina 500 g"},
 {query:"kinkkuleikkele", good:"Kinkkuleikkele 200 g", decoy:"Kinkkuleikkele pizza 400 g"}
];
const retailRankingResults = retailFixtures.map((fixture,index)=>{
 const good = makeProduct(3000+index*2,fixture.good,"");
 const decoy = makeProduct(3001+index*2,fixture.decoy,"");
 const ranked = core.rankNormalSearchResults(fixture.query,[decoy,good]);
 return {query:fixture.query,expectedFirst:good.id,actualFirst:ranked[0]?.id,
  pass:ranked[0]?.id===good.id};
});
// A one-product query must not become empty merely because the name mentions sauce.
const exclusionCases = [
  ["sinappi", "Sinappikastike 250 ml", true],
  ["sinappi", "Sinappi ja sinappikastike 250 g", false],
  ["hunajasinappi", "Hunajasinappi 250 g", false],
  ["tomaattimurska", "Tomaattipyree 200 g", true],
  ["tomaattimurska", "Tomaattimurska 400 g", false],
  ["tomaattipyree", "Tomaattimurska 400 g", true],
  ["tomaattipyree", "Tomaattipyree 200 g", false],
  ["ketsuppi", "Felix Ketsuppi 500 g", false],
  ["sinappi", "Sinappi ja majoneesi 250 g", false],
  ["sinappi", "Pelkkä majoneesi 250 g", true],
  ["hunajasinappi", "Hunajasinappi-majoneesi 250 g", false],
  ["tomaattimurska", "Tomaattimurska ja tomaattipyree 400 g", false],
  ["tomaattipyree", "Tomaattipyree ja tomaattimurska 400 g", false],
  ["sinappikastike", "Sinappikastike 250 ml", false],
  ["sinappimajoneesi", "Sinappimajoneesi 250 ml", false],
  ["tomaattimurskakeitto", "Tomaattipyree 200 g", false],
];
exclusionCases.push(["raejuustosalaatti","Raejuustosalaatti 300 g",false],
 ["tuorejuustokakku","Tuorejuustokakku 400 g",false],
 ["rahkapiirakka","Rahkapiirakka 400 g",false],
 ["makkarakeitto","Makkarakeitto 300 g",false]);
const exclusionResults = exclusionCases.map(([query,name,expected]) => {
  const actual = core.isExplicitlyExcludedSearchProduct(query, makeProduct(0,name,""));
  return {query,name,expected,actual,pass:actual===expected};
});
const rankingResults = rankingCases.map(({query,products,first,excluded=[]}) => {
  const ranked = core.rankNormalSearchResults(query,products);
  const excludedPresent = excluded.filter(id => ranked.some(p => p.id === id));
  return {query,expectedFirst:first,actualFirst:ranked[0]?.id,excludedPresent,pass:ranked[0]?.id===first && excludedPresent.length===0};
});
const data=new Map();
global.window={localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
const chosen={id:101,name:"Felix Ketsuppi 500 g",ean:"6411234567890",brandName:"Felix",category:"Ketsupit"};
const alternative={id:102,name:"Heinz Tomato Ketchup 500 g",ean:"6411234567891",brandName:"Heinz",category:"Ketsupit"};
const before=memory.getLearnedSearchBoost("ketsuppi",chosen);
memory.rememberSearchChoice("ketsuppi",chosen,"added_to_cart");
memory.rememberSearchChoice("ketsuppi",chosen,"added_to_cart");
const after=memory.getLearnedSearchBoost("ketsuppi",chosen);
const structure=memory.getLearnedStructureBoost("ketsuppi",alternative);
const stored=memory.loadSearchIntentMemory();
const persisted=Object.values(stored.entries).some(e=>e.productName===chosen.name&&e.positiveCount===2);
memory.rememberSearchChoice("ketsuppi",chosen,"rejected");
const afterRejection=memory.getLearnedSearchBoost("ketsuppi",chosen);
const otherQuery=memory.getLearnedSearchBoost("maito",chosen);
const negativeProduct={id:103,name:"Heinz Ketsuppi 1 kg",ean:"6411234567892",brandName:"Heinz",category:"Ketsupit"};
const negativeBefore=memory.getLearnedSearchBoost("ketsuppi",negativeProduct);
memory.rememberSearchChoice("ketsuppi",negativeProduct,"skipped");
const negativeAfter=memory.getLearnedSearchBoost("ketsuppi",negativeProduct);
memory.clearSearchIntentMemory();
const afterClear=memory.loadSearchIntentMemory();
const learning={before:before.boost,after:after.boost,positive:after.positiveCount,structure:structure.boost,persisted,afterRejection:afterRejection.boost,isolatedOtherQuery:otherQuery.boost,negativeBefore:negativeBefore.boost,negativeAfter:negativeAfter.boost,cleared:Object.keys(afterClear.entries).length===0,pass:after.positiveCount===2&&after.boost>before.boost&&persisted&&afterRejection.boost<after.boost&&negativeAfter.negativeCount===1&&negativeAfter.boost<negativeBefore.boost&&otherQuery.positiveCount===0&&Object.keys(afterClear.entries).length===0};
// Learning must never promote an unrelated product that the intent guard rejects.
const blockedCoffeeProduct = {id:201,name:"Kahvinsuodatin 100 kpl",category:"Suodatinpussit"};
memory.rememberSearchChoice("kahvi",blockedCoffeeProduct,"added_to_cart");
const blockedCoffeeBoost = memory.getLearnedSearchBoost("kahvi",blockedCoffeeProduct);
const guardedLearning = {
  blockedCoffeeBoost: blockedCoffeeBoost.boost,
  blockedCoffeeReason: blockedCoffeeBoost.reason,
  pass: blockedCoffeeBoost.boost === -100 && blockedCoffeeBoost.reason === "blocked_by_intent_guardrail"
};
memory.clearSearchIntentMemory();
// Check that repeated events remain bounded and clearing the memory resets the boost.
const saturationProduct = {id:301,name:"Felix Ketsuppi 500 g",ean:"6411234567890",brandName:"Felix",category:"Ketsupit"};
for (let i=0;i<12;i++) memory.rememberSearchChoice("ketsuppi",saturationProduct,"added_to_cart");
const saturated = memory.getLearnedSearchBoost("ketsuppi",saturationProduct);
const saturationEntries = Object.values(memory.loadSearchIntentMemory().entries);
const saturatedCount = saturationEntries.find(e => e.productName === saturationProduct.name)?.positiveCount;
memory.clearSearchIntentMemory();
const reset = memory.getLearnedSearchBoost("ketsuppi",saturationProduct);
const boundedLearning = {
  saturatedBoost:saturated.boost,
  saturatedCount,
  resetBoost:reset.boost,
  pass:saturated.boost===32 && saturatedCount===12 && reset.boost===0
};
// Reviewed ambiguous terms: the complete product term owns the category,
// rather than a shorter word inside it (e.g. kana inside porkkana).
const collisionCases = [
 ["hunajasinappi","mustard"],
 ["tomaattimurska","tomato_crush"],["tomaatti murska","tomato_crush"],
 ["tomaattipyree","tomato_paste"],["tomaattitahna","tomato_paste"],
 ["riisipuuro","porridge"],["sämpyläjauho","flour"],["hillosokeri","sugar"],
 ["tomaattiketsuppi","ketchup"],["tomaatti ketsuppi","ketchup"],
 ["broilerin jauheliha","meat"],
 ["kananmuna","egg"],["kananmunat","egg"],["kananmunia","egg"],
 ["kananmuna 10 kpl","egg"],["kananmunat 10 kpl","egg"],
 ["vapaan kanan munat","egg"],["luomu kananmunat","egg"],
 ["puuroriisi","rice"],["porkkana","fruit_veg"],
 ["ranskanperunat","frozen"],["suolapähkinä","snacks"]
];
collisionCases.push(["maitorahka","quark"],["raejuusto","cottage_cheese"],
 ["tuorejuusto","cream_cheese"],["omenamehu","juice"],
 ["virvoitusjuoma cola","cola"],["kermajuusto","cheese"]);
const collisionResults = collisionCases.flatMap(([term, expected]) =>
 [term, `Kotimainen ${term} 500 g`, term.toUpperCase(),
  term.normalize("NFD").replace(/[\u0300-\u036f]/g, "")]
 .map(query => {
  const actual = core.detectSearchIntent(query).category;
  return {query, expected, actual, pass:actual===expected};
 })
);
// Every future diagnostic collision must receive a reviewed expectation.
const {execFileSync} = require("node:child_process");
const diagnostics = JSON.parse(execFileSync(process.execPath,
 ["scripts/audit-search-collisions.cjs"], {encoding:"utf8"}));
const unreviewedCollisions = diagnostics.collisions.filter(item =>
 !collisionCases.some(([term, category]) => term===item.term && category===item.expected));
assert.equal(diagnostics.collisions.length, diagnostics.collisionCount,
 "Collision report was truncated; not all collisions were checked");
const expandedLearningCases = [
 ["raejuusto","Arla raejuusto 200 g","Raejuustosalaatti 200 g"],
 ["tuorejuusto","Philadelphia tuorejuusto 200 g","Tuorejuustokakku 200 g"],
 ["rahka","Valio maitorahka 250 g","Rahkapiirakka 250 g"],
 ["omenamehu","Omenamehu 1 l","Omena 1 kg"],
 ["tee","Vihreä tee 20 pussia","Proteesi 1 kpl"],
 ["voi","Valio voi 500 g","Kosteusvoide 500 g"]
];
const expandedLearningResults = expandedLearningCases.map(([query, goodName, badName], index) => {
 memory.clearSearchIntentMemory();
 const good = {id:800+index*2,name:goodName};
 const bad = {id:801+index*2,name:badName};
 for(let i=0;i<8;i++) {
  memory.rememberSearchChoice(query,good,"selected");
  memory.rememberSearchChoice(query,bad,"selected");
 }
 const goodBoost=memory.getLearnedSearchBoost(query,good).boost;
 const badBoost=memory.getLearnedSearchBoost(query,bad).boost;
 const otherQueryBoost=memory.getLearnedSearchBoost("hammastahna",good).boost;
 const suggestions=memory.getLearnedSuggestions(query);
 const suggestionsPass=suggestions.some(s=>s.label===goodName) && !suggestions.some(s=>s.label===badName);
 return {query,goodBoost,badBoost,otherQueryBoost,
  pass:goodBoost>0 && badBoost<=0 && otherQueryBoost<=0 && suggestionsPass};
});
memory.clearSearchIntentMemory();
memory.clearSearchIntentMemory();
const learnedProfile = {id:900,name:"Raejuusto 200 g",category:"Raejuustot",brandName:"A"};
const sameStructure = {id:901,name:"Raejuusto 200 g",category:"Raejuustot",brandName:"B",price:3};
const otherStructure = {id:902,name:"Raejuusto 100 g",category:"Raejuustot",brandName:"C",price:1};
const wrongCategory = {id:903,name:"Raejuustosalaatti 200 g",category:"Raejuustot",price:0.5};
for(let i=0;i<3;i++) memory.rememberSearchChoice("raejuusto",learnedProfile,"selected");
const integratedRank = core.rankNormalSearchResults("raejuusto",[otherStructure,wrongCategory,sameStructure],
 product=>memory.getLearnedStructureBoost("raejuusto",product).boost);
const integratedLearning = {ids:integratedRank.map(p=>p.id),
 pass:integratedRank[0]?.id===901 && integratedRank[2]?.id===903};
memory.clearSearchIntentMemory();
const failures=results.filter(r=>!r.pass);
assert.equal(results.length, samples.length, "Some category cases were not executed");
console.log(JSON.stringify({total:results.length,passed:results.length-failures.length,failures,rankingResults,retailRankingResults,exclusionResults,collisionResults,unreviewedCollisions,expandedLearningResults,integratedLearning,learning,guardedLearning,boundedLearning},null,2));
if(!integratedLearning.pass||expandedLearningResults.some(r=>!r.pass)||unreviewedCollisions.length||collisionResults.some(r=>!r.pass)||failures.length||rankingResults.some(r=>!r.pass)||retailRankingResults.some(r=>!r.pass)||exclusionResults.some(r=>!r.pass)||!learning.pass||!guardedLearning.pass||!boundedLearning.pass){
 console.error("Search behavior regression failed", {failures,rankingResults,learning});
 process.exitCode=1;
}

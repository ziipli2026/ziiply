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
["purukumi", "chewing_gum"],["kahvakuula", "sports_equipment"],["jakoavain", "tools"],["liimapuulevy", "building_supplies"],["askartelupaperi", "craft_supplies"],["led-valo", "lighting"],["nilkkuri", "clothing"],["moottoriöljy", "automotive"],["astiaharja", "cleaning_tools"],["dippikastike", "dip_sauce"],["tortilla", "tortilla"],["pähkinä", "nuts_seeds"],["rusina", "dried_fruit"],["hedelmäsäilyke", "canned_fruit"],["kvinoa", "grain_side"],["ranskanperuna", "frozen_potatoes"],["maapähkinävoi", "sweet_spread"],["kahvijuomajauhe", "drink_powder"],["huulikiilto", "makeup"],["glögi", "seasonal_drink"],["lintulauta", "pet_supplies"],["kärpäspaperi", "pest_control"],
["lastenruoka","baby_food"],["vieroitusvalmiste","baby_food"],["kookosmaito","coconut_milk"],["proteiinipatukka","sports_nutrition"],["falafel","prepared_protein"],["kebab","prepared_protein"],
["kala", "fish"],["sulatejuusto", "processed_cheese"],["rasvaseos", "butter_blend"],["leivonta-aines", "baking_ingredients"],["kondensoitu maito", "condensed_milk"],["jälkiruokakastike", "dessert_sauce"],

["valmisateria", "ready_meal"],["valmissalaatti", "prepared_salad"],["panini", "ready_sandwich"],["ohukainen", "pancakes"],["olut", "beer"],["siideri", "cider"],["lonkero", "long_drink"],["energiajuoma", "energy_drink"],["kahvijuoma", "coffee_drink"],["virvoitusjuoma", "soft_drink"],["lähdevesi", "water"],["mehukeitto", "fruit_soup"],["smoothie", "smoothie"],
["kauramaito","plant_drink"],

["kosteusvoide", "skin_care"],["lelu", "toys"],["ravintolisä", "supplements"],["koiranruoka", "pet_food"],["keittiöväline", "kitchen_tools"],["juomapullo", "tableware"],["kahvinkeitin", "kitchen_appliances"],["hiustenhoitoaine", "hair_conditioner"],["hiuslakka", "hair_styling"],["vanupuikko", "hygiene_supplies"],["putkenavaaja", "cleaning_products"],

["jäätelö", "ice_cream"],["pakastevihannekset", "frozen_vegetables"],["pakastemarjat", "frozen_fruit"],["pakastekala", "frozen_fish"],["pakastetaikina", "frozen_dough"],

["keitto", "soup"],["ruokakastike", "cooking_sauce"],["liemikuutio", "stock"],["mauste", "seasoning"],["etikka", "vinegar"],["nuudeli", "noodles"],["pizza", "pizza"],["ateria-aines", "meal_kit"],

["kermaviili", "sour_cream"],["smetana", "smetana"],["ranskankerma", "creme_fraiche"],["viili", "fermented_milk"],["vanukas", "pudding"],["kaurajuoma", "plant_drink"],["maitojauhe", "milk_powder"],["pulla", "pastry"],

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
samples.push(["kosteusvoide","skin_care"],["aurinkovoide","skin_care"],
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
  {query:"maito",products:[makeProduct(1601,"Xtra kookosmaito 400 ml","CAABGBCAGAAAA"),makeProduct(1602,"Valio kevytmaito 1 l","Maidot")],first:1602,excluded:[1601]},
  {query:"cola",products:[makeProduct(1603,"Leader urheilujuomajauhe cola","kosmetiikka-terveys-ja-hygienia/terveysvalmisteet/urheiluvalmisteet"),makeProduct(1604,"Coca Cola 0,33 l","Colajuomat")],first:1604,excluded:[1603]},
  {query:"smoothie",products:[makeProduct(1605,"Coop Eko smoothie 6 kk","CAABGAOAIAAAI"),makeProduct(1606,"Mun smoothie 300 ml","Smoothiet")],first:1606,excluded:[1605]},
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
// User-reported voi false positives and reviewed provider category contracts.
rankingCases.push({query:"voi", products:[
  makeProduct(800,"Valio voi normaalisuolainen 500 g","maito-juusto-munat-ja-rasvat/rasvat/voit"),
  makeProduct(801,"Puhdas+ shea voi 50ml","Ihonhoito"),
  makeProduct(802,"Play Doh Voi, pilvi, kupla","Lelut"),
  makeProduct(803,"Atria grilliperunat voi-tilli 500g","Valmisruoka"),
  makeProduct(804,"Aaria Voi popcorn maustepurkki 110g","Mausteet"),
  makeProduct(805,"Top of the Pop mikropopcorn 100g voi","Snacksit"),
  makeProduct(806,"Momma ohuet piparkakut 150g paahd voi","Keksit"),
  makeProduct(807,"Estrella Maalaissipsi voi & merisuola 180g","Snacksit"),
  makeProduct(808,"Elonen Superpuusti Paahdettu voi 2kpl/220g","Leivonnaiset"),
  makeProduct(809,"Friggs Maissikakku Voi-Merisuola 120g","Keksit"),
  makeProduct(810,"Myllyn Paras annospuuro paahdettu voi-chia 5x45g","Puurot"),
  makeProduct(811,"Classic Paahtoinen Voi-Suolainen Karamelli kermajäätelö","Pakasteet"),
  makeProduct(812,"Jokilaakson Juusto kirkastettu voi 200g","maito-juusto-munat-ja-rasvat/rasvat/voit"),
  makeProduct(813,"Juustoportti kirnuvoi 200 g","maito-juusto-munat-ja-rasvat/rasvat/voit"),
],first:800,excluded:[801,802,803,804,805,806,807,808,809,810,811]});
rankingCases.push({query:"kerma",products:[
  makeProduct(814,"Kerma maustettu tuorejuusto 200g","maito-juusto-munat-ja-rasvat/juustot-leivan-paalle/kermajuustot"),
  makeProduct(815,"Valio kuohukerma 2dl","maito-juusto-munat-ja-rasvat/maitotuotteet/kermat"),
],first:815,excluded:[814]});
rankingCases.push({query:"voi popcorn",products:[makeProduct(816,"Top of the Pop voi popcorn 100g","Snacksit")],first:816});
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
rankingCases.push({query:"maito",products:[makeProduct(1101,"Elovena kaurajuoma kahviin 1 l","maito-juusto-munat-ja-rasvat/maidot-ja-piimat/kasvipohjaiset-juomat"),makeProduct(1102,"Valio kevytmaito 1 l","maito-juusto-munat-ja-rasvat/maidot-ja-piimat/maidot")],first:1102,excluded:[1101]});
rankingCases.push({query:"kerma",products:[makeProduct(1103,"Valio kermaviili 200g","maito-juusto-munat-ja-rasvat/maitotuotteet/kermaviilit"),makeProduct(1104,"Valio kuohukerma 2dl","maito-juusto-munat-ja-rasvat/maitotuotteet/kermat")],first:1104,excluded:[1103]});
rankingCases.push({query:"kaurajuoma",products:[makeProduct(1105,"Elovena kaurajuoma kahviin 1 l","maito-juusto-munat-ja-rasvat/maidot-ja-piimat/kasvipohjaiset-juomat"),makeProduct(1106,"Valio kevytmaito 1 l","maito-juusto-munat-ja-rasvat/maidot-ja-piimat/maidot")],first:1105,excluded:[1106]});
rankingCases.push({query:"vanukas",products:[makeProduct(1107,"Jacky maitosuklaavanukas 120g","maito-juusto-munat-ja-rasvat/rahkat-vanukkaat-ja-valipalat/vanukkaat"),makeProduct(1108,"Valio maitorahka 250g","maito-juusto-munat-ja-rasvat/maitotuotteet/rahkat")],first:1107,excluded:[1108]});

rankingCases.push({query:"maito",products:[makeProduct(1201,"Coop kaurajuoma 1 l","CAAAMAEAAAAAA"),makeProduct(1202,"Kotimaista kevytmaito 1 L","CAAAMAAAAAEAA")],first:1202,excluded:[1201]});
rankingCases.push({query:"kahvi",products:[makeProduct(1203,"Coop kahvi tumma paahto 450 g","CAABIAAAAACAA"),makeProduct(1204,"Olympus Aito kreikkalainen jogurtti 0% rasvaa 150g kahvi","CAAAQAAAKACAA")],first:1203,excluded:[1204]});

rankingCases.push({query:"kana",products:[makeProduct(1301,"Knorr kanaliemikuutio 10x10g","CAABGBAAGACAE"),makeProduct(1302,"Atria kanan fileesuikale 400g","liha-ja-kasviproteiinit/broileri-kana-ja-kalkkuna/fileet-pihvit-ja-rullat")],first:1302,excluded:[1301]});
rankingCases.push({query:"juusto",products:[makeProduct(1303,"Knorr tomaattikeitto mascarponejuustolla 570 ml","CAABGAYACAAAE"),makeProduct(1304,"Valio Arkijuusto 750g","CAAAOAAAAAAAA")],first:1304,excluded:[1303]});
rankingCases.push({query:"pizza",products:[makeProduct(1305,"Xtra pizzamauste 30 g","CAABGBAAKAOAC"),makeProduct(1306,"Coop Pizza Salami 345 g pakaste","CAABQACAAAAAA")],first:1306,excluded:[1305]});
rankingCases.push({query:"kanaliemikuutio",products:[makeProduct(1307,"Knorr kanaliemikuutio 10x10g","CAABGBAAGACAE"),makeProduct(1308,"Atria kanan fileesuikale 400g","liha-ja-kasviproteiinit/broileri-kana-ja-kalkkuna/fileet-pihvit-ja-rullat")],first:1307,excluded:[1308]});

rankingCases.push({query:"jäätelö",products:[makeProduct(1401,"Kotimaista kermajäätelö vanilja 1L","CAABQAAAAAAAA"),makeProduct(1402,"Coop kukkakaalinuput 400g pakaste","CAABQAGACAEAA")],first:1401,excluded:[1402]});
assert.equal(core.isExplicitlyExcludedSearchProduct("pakaste",makeProduct(1403,"Kotimaista kermajäätelö vanilja 1L","CAABQAAAAAAAA")),false);
assert.equal(core.isExplicitlyExcludedSearchProduct("pakaste",makeProduct(1404,"Coop Pizza Salami 345g pakaste","CAABQACAAAAAA")),false);
assert.equal(core.isExplicitlyExcludedSearchProduct("kerma",makeProduct(1405,"Kotimaista kermajäätelö vanilja 1L","CAABQAAAAAAAA")),true);

const frozenResults = core.rankNormalSearchResults("pakaste",[
  makeProduct(1410,"Kotimaista kermajäätelö vanilja 1L","CAABQAAAAAAAA"),
  makeProduct(1411,"Coop Pizza Salami 345g pakaste","CAABQACAAAAAA"),
  makeProduct(1412,"Coop kukkakaalinuput 400g pakaste","CAABQAGACAEAA")
]);
assert.deepEqual(new Set(frozenResults.map(p=>p.id)),new Set([1410,1411,1412]),"Parent search must retain different frozen product groups");
rankingCases.push({query:"maito",products:[makeProduct(1501,"Kissanmaito 3 x 200 ml Catmilk","kissanruoka"),makeProduct(1502,"Puhdistusmaito Lierac 200 ml","kasvojen puhdistusemulsiot ja -maidot ja -voiteet"),makeProduct(1503,"Kotimaista kevytmaito 1 L","CAAAMAAAAAEAA")],first:1503,excluded:[1501,1502]});
rankingCases.push({query:"kahvi",products:[makeProduct(1504,"Kahvinkeitin Wilfa CM10B-A125","kahvinkeittimet"),makeProduct(1505,"House kahvilusikka Leo 4 kpl","CACAGACAAACAA"),makeProduct(1506,"Coop kahvi tumma paahto 450g","CAABIAAAAACAA")],first:1506,excluded:[1504,1505]});
rankingCases.push({query:"kananmuna",products:[makeProduct(1507,"House kananmunaleikkuri ja lohkoja","CACAGAGAAASAE"),makeProduct(1508,"Kotimaista kananmunat 10 kpl","maito-juusto-munat-ja-rasvat/munat/kananmunat")],first:1508,excluded:[1507]});

rankingCases.push({query:"kahvi",products:[makeProduct(1601,"Frezza Latte 250ml maitokahvijuoma","juomat/kahvi-ja-suodatinpussit/valmiit-kahvijuomat"),makeProduct(1602,"Coop kahvi tumma paahto 450g","CAABIAAAAACAA")],first:1602,excluded:[1601]});
rankingCases.push({query:"cola",products:[makeProduct(1603,"Nocco Focus cola energiajuoma 0,33l","juomat/energia--ja-urheilujuomat/energiajuomat"),makeProduct(1604,"Coop Cola virvoitusjuoma 1,5l","CAAAYAKACAAAA")],first:1604,excluded:[1603]});
rankingCases.push({query:"kana",products:[makeProduct(1605,"Hetki kermainen kana-pasta 270g","valmisruoka/valmisruoat-ja--keitot/mikroateriat"),makeProduct(1606,"Atria kanan fileesuikale 400g","liha-ja-kasviproteiinit/broileri-kana-ja-kalkkuna/fileet-pihvit-ja-rullat")],first:1606,excluded:[1605]});
assert.equal(core.isExplicitlyExcludedSearchProduct("virvoitusjuoma",makeProduct(1607,"Coop Cola 1,5l","CAAAYAKACAAAA")),false);

assert.equal(core.isExplicitlyExcludedSearchProduct("kahvijuoma",makeProduct(1701,"Frezza maitokahvijuoma 250ml","Kahvi")),false,"A source-specific Kahvi mapping must not exclude other providers' coffee drinks");
rankingCases.push({query:"maito",products:[makeProduct(1801,"Dogan Kondensoitu maito 300g","CAABGBAAOAAAK"),makeProduct(1802,"Kotimaista kevytmaito 1 L","CAAAMAAAAAEAA")],first:1802,excluded:[1801]});
rankingCases.push({query:"voi",products:[makeProduct(1803,"Valio Oivariini rasvaseos 400g","maito-juusto-munat-ja-rasvat/rasvat/rasvalevitteet"),makeProduct(1804,"Valio voi 500g","maito-juusto-munat-ja-rasvat/rasvat/voit")],first:1804,excluded:[1803]});
assert.equal(core.isExplicitlyExcludedSearchProduct("kala",makeProduct(1805,"Rainbow lohifilee 250g pakaste","CAABQAIACAAAA")),false);
assert.equal(core.isExplicitlyExcludedSearchProduct("pakaste",makeProduct(1806,"Rainbow lohifilee 250g pakaste","CAABQAIACAAAA")),false);

rankingCases.push({query:"jäätelö",products:[makeProduct(1901,"Bello Dolce vaahtomakeiset jäätelö 150g","CAABGAQAEAMAA"),makeProduct(1902,"Kotimaista kermajäätelö vanilja 1L","CAABQAAAAAAAA")],first:1902,excluded:[1901]});
rankingCases.push({query:"juusto",products:[makeProduct(1903,"Vaasan Cheddarpasteija 90g","CAAAWAMAIAEAA"),makeProduct(1904,"Valio Arkijuusto 750g","CAAAOAAAAAAAA")],first:1904,excluded:[1903]});
rankingCases.push({query:"cola",products:[makeProduct(1905,"Coop Cola Chews makeiset 80g","CAABGAQAKAAAA"),makeProduct(1906,"Coop Cola virvoitusjuoma 1,5l","CAAAYAKACAAAA")],first:1906,excluded:[1905]});

rankingCases.push({query:"maito",products:[{...makeProduct(2001,"Kasvovoi Nivea Q10 50 ml","Maitotuotteet"),ean:"4006000233840"},makeProduct(2002,"Kotimaista kevytmaito 1L","CAAAMAAAAAEAA")],first:2002,excluded:[2001]});
rankingCases.push({query:"juusto",products:[{...makeProduct(2003,"Juustonaksu Priima 150g","Maitotuotteet"),ean:"6416485840521"},makeProduct(2004,"Valio Arkijuusto 750g","CAAAOAAAAAAAA")],first:2004,excluded:[2003]});
rankingCases.push({query:"kana",products:[{...makeProduct(2005,"Kissanruoka Friskies kana-kasvis 2kg","Liha & makkarat"),ean:"7336012472508"},makeProduct(2006,"Atria kanan fileesuikale 400g","liha-ja-kasviproteiinit/broileri-kana-ja-kalkkuna/fileet-pihvit-ja-rullat")],first:2006,excluded:[2005]});
rankingCases.push({query:"kasvovoi",products:[{...makeProduct(2007,"Kasvovoi Nivea Q10 50 ml","Maitotuotteet"),ean:"4006000233840"}],first:2007});
assert.equal(core.isExplicitlyExcludedSearchProduct("paahdettu voi piparkakku",{...makeProduct(2008,"Ohuet piparkakut Momma 150 g paahdettu voi","Maitotuotteet"),ean:"6410580429575"}),false);

rankingCases.push({query:"jäätelö",products:[makeProduct(2101,"Ibero hiusharja jäätelö minttu 59242","kosmetiikka-terveys-ja-hygienia/hiukset-ja-hiustenhoito/hiusharjat-ja-kammat"),makeProduct(2102,"Kotimaista kermajäätelö vanilja 1L","CAABQAAAAAAAA")],first:2102,excluded:[2101]});
rankingCases.push({query:"cola",products:[makeProduct(2103,"Lipsmacker Coca Cola huulivoide 4g","kosmetiikka-ja-hygienia/kasvojenhoito/huulivoiteet"),makeProduct(2104,"Coop Cola virvoitusjuoma 1,5l","CAAAYAKACAAAA")],first:2104,excluded:[2103]});

assert.equal(core.detectSearchIntent("tuotemerkki xyz").category,"generic");
const freeTextResults = core.rankNormalSearchResults("tuotemerkki xyz",[
  makeProduct(2110,"Tuotemerkki XYZ kevytmaito 1L","CAAAMAAAAAEAA"),
  {...makeProduct(2111,"Tuotemerkki XYZ kasvovoi 50ml","Maitotuotteet"),ean:"4006000233840"}
]);
assert.deepEqual(new Set(freeTextResults.map(p=>p.id)),new Set([2110,2111]),"Unrecognized free-text searches must not reject reviewed categories");
assert.equal(core.isExplicitlyExcludedSearchProduct("hiusharja",makeProduct(2112,"Ibero hiusharja jäätelö minttu","kosmetiikka-terveys-ja-hygienia/hiukset-ja-hiustenhoito/hiusharjat-ja-kammat")),false);

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

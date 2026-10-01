import{strict as assert}from"node:assert";
import{searchResearch}from"./lidl-research-search-v53.mjs";
const sample=[
 {lidlProductId:"1",name:"Maitosuklaacookie",displayedPriceEur:1.5,ean:null},
 {lidlProductId:"2",name:"Täysmaito 1 l",displayedPriceEur:1.2,ean:null},
 {lidlProductId:"3",name:"Pasta Carbonara",displayedPriceEur:2.5,ean:null},
 {lidlProductId:"4",name:"PÅGEN Hönösaaristolaisrieska",displayedPriceEur:null,ean:null}
];
assert.deepEqual(searchResearch("maito",sample).map(r=>r.lidlProductId),["2"]);
assert.deepEqual(searchResearch("täysmaito",sample).map(r=>r.lidlProductId),["2"]);
assert.deepEqual(searchResearch("maitosuklaa",sample).map(r=>r.lidlProductId),["1"]);
assert.deepEqual(searchResearch("maito",[{lidlProductId:"x",name:"Maitosuklaa 100 g"}]),[]);
assert.deepEqual(searchResearch("pasta",sample).map(r=>r.lidlProductId),["3"]);
assert.deepEqual(searchResearch("voi",[
 {lidlProductId:"butter",name:"Meijerivoi 500 g"},
 {lidlProductId:"bread",name:"Voileipä 200 g"},
 {lidlProductId:"pastry",name:"Voitaikina 500 g"}
]).map(r=>r.lidlProductId),["butter"]);
assert.deepEqual(searchResearch("maito",[
 {lidlProductId:"milk",name:"Laktoositon maito 1 l"},
 {lidlProductId:"chocolate",name:"Maitosuklaa 100 g"}
]).map(r=>r.lidlProductId),["milk"]);
assert.deepEqual(searchResearch("kananmunat",[
 {lidlProductId:"egg",name:"Kotimainen kananmuna 10 kpl"},
 {lidlProductId:"other",name:"Kananmunaton majoneesi"}
]).map(r=>r.lidlProductId),["egg"]);
assert.deepEqual(searchResearch("kananmuna",[
 {lidlProductId:"egg",name:"Kotimaiset kananmunat 10 kpl"}
]).map(r=>r.lidlProductId),["egg"]);
assert.deepEqual(searchResearch("rieska",sample).map(r=>r.lidlProductId),[]);
assert.deepEqual(searchResearch("jauheliha",[
 {lidlProductId:"mince",name:"Naudan jauheliha 400 g"},
 {lidlProductId:"pie",name:"Jauhelihapiirakka"}
]).map(r=>r.lidlProductId),["mince"]);
assert.deepEqual(searchResearch("perunat",[
 {lidlProductId:"potatoes",name:"Kotimaiset perunat 1 kg"},
 {lidlProductId:"pie",name:"Perunapiirakka"}
]).map(r=>r.lidlProductId),["potatoes"]);
assert.deepEqual(searchResearch("banaanit",[
 {lidlProductId:"fruit",name:"Banaanit 1 kg"},
 {lidlProductId:"cake",name:"Banaanikakku"},
 {lidlProductId:"milkshake",name:"Banaanipirtelö"}
]).map(r=>r.lidlProductId),["fruit"]);
assert.deepEqual(searchResearch("banaani",[
 {lidlProductId:"fruit",name:"Banaanit 1 kg"},
 {lidlProductId:"cake",name:"Banaanikakku"}
]).map(r=>r.lidlProductId),["fruit"]);
assert.deepEqual(searchResearch("maito 1 l",[ 
 {lidlProductId:"milk-1",name:"Täysmaito 1 l"},
 {lidlProductId:"milk-2",name:"Täysmaito 2 l"},
 {lidlProductId:"milk-no-size",name:"Täysmaito"}
]).map(r=>r.lidlProductId),["milk-1"]);
assert.deepEqual(searchResearch("pasta carbonara",[
 {lidlProductId:"carbonara",name:"Pasta Carbonara"},
 {lidlProductId:"plain",name:"Pasta"},
 {lidlProductId:"other",name:"Carbonara kastike"}
]).map(r=>r.lidlProductId),["carbonara"]);
assert.deepEqual(searchResearch("maito banaani",[
 {lidlProductId:"milk",name:"Täysmaito"},
 {lidlProductId:"banana",name:"Banaani"}
]),[]);
assert.deepEqual(searchResearch("MAITO",sample).map(r=>r.lidlProductId),["2"]);
assert.deepEqual(searchResearch("  maito!!!  ",sample).map(r=>r.lidlProductId),["2"]);
assert.deepEqual(searchResearch("maito",sample,1).map(r=>r.lidlProductId),["2"]);
assert.deepEqual(searchResearch("maito",sample,50).map(r=>r.lidlProductId),["2"]);
assert.equal(searchResearch("täysmaito",sample)[0].ean,null);
assert.equal(searchResearch("täysmaito",sample)[0].regularPriceEur,null);
assert.equal(searchResearch("täysmaito",sample)[0].displayedPriceEur,null);
assert.equal(searchResearch("täysmaito",sample)[0].storeAvailability,"unknown");
assert.equal(searchResearch("täysmaito",sample)[0].checkoutPriceVerified,false);
assert.deepEqual(searchResearch("",sample),[]);
assert.deepEqual(searchResearch("maito",null),[]);
assert.deepEqual(searchResearch("maito",{}),[]);
assert.deepEqual(searchResearch("maito",[
 {lidlProductId:"valid",name:"Maito",variant:{unexpected:"object"}},
 {lidlProductId:"invalid",name:{unexpected:"object"},variant:["maito"]}
]).map(r=>r.lidlProductId),["valid"]);
assert.deepEqual(searchResearch("maito",[
 {lidlProductId:"same",name:"Täysmaito 1 l"},
 {lidlProductId:"same",name:"Kevytmaito 1 l"},
 {lidlProductId:"different",name:"Rasvaton maito 1 l"},
 {name:"Maito ilman tunnusta"},
 [],null
]).map(r=>r.lidlProductId),["different","same"]);
assert.equal(searchResearch("maito",sample,0).length,0);
assert.equal(searchResearch("maito",sample,Number.NaN).length,1);
assert.equal(searchResearch("maito",sample,-5).length,0);
assert.deepEqual(searchResearch("olut",[{lidlProductId:"10038275",name:"Olut"},{lidlProductId:"safe-fixture",name:"Olutniminen testituote"}]).map(r=>r.lidlProductId),["safe-fixture"]);
assert.deepEqual(searchResearch("testi",[{lidlProductId:"10038306",name:"Testi"},{lidlProductId:"10038307",name:"Testi"},{lidlProductId:"10038308",name:"Testi"}]),[]);
assert.deepEqual(searchResearch("maito",[null,...sample]).map(r=>r.lidlProductId),["2"]);
assert.deepEqual(searchResearch("maito",[
 {lidlProductId:"  duplicate ",name:"Maito"},
 {lidlProductId:"duplicate",name:"Maito"},
 {lidlProductId:" 10038275 ",name:"Maito"},
 {lidlProductId:" ",name:"Maito"}
]).map(r=>r.lidlProductId),["duplicate"]);
console.log("Lidl research name-only search safety tests passed");

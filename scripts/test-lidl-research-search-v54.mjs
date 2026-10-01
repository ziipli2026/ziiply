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
assert.deepEqual(searchResearch("kananmunat",[
 {lidlProductId:"egg",name:"Kotimainen kananmuna 10 kpl"},
 {lidlProductId:"other",name:"Kananmunaton majoneesi"}
]).map(r=>r.lidlProductId),["egg"]);
assert.deepEqual(searchResearch("kananmuna",[
 {lidlProductId:"egg",name:"Kotimaiset kananmunat 10 kpl"}
]).map(r=>r.lidlProductId),["egg"]);
assert.deepEqual(searchResearch("rieska",sample).map(r=>r.lidlProductId),[]);
assert.equal(searchResearch("täysmaito",sample)[0].regularPriceEur,null);
assert.equal(searchResearch("täysmaito",sample)[0].displayedPriceEur,null);
assert.equal(searchResearch("täysmaito",sample)[0].storeAvailability,"unknown");
assert.equal(searchResearch("täysmaito",sample)[0].checkoutPriceVerified,false);
assert.deepEqual(searchResearch("",sample),[]);
assert.deepEqual(searchResearch("olut",[{lidlProductId:"10038275",name:"Olut"},{lidlProductId:"safe-fixture",name:"Olutniminen testituote"}]).map(r=>r.lidlProductId),["safe-fixture"]);
assert.deepEqual(searchResearch("testi",[{lidlProductId:"10038306",name:"Testi"},{lidlProductId:"10038307",name:"Testi"},{lidlProductId:"10038308",name:"Testi"}]),[]);
assert.deepEqual(searchResearch("maito",[null,...sample]).map(r=>r.lidlProductId),["2"]);
console.log("Lidl research name-only search safety tests passed");

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
assert.deepEqual(searchResearch("juusto",[
 {lidlProductId:"cheese",name:"Juusto 400 g"},
 {lidlProductId:"cake",name:"Juustokakku"},
 {lidlProductId:"bread",name:"Juustoleipä"}
]).map(r=>r.lidlProductId),["cheese"]);
assert.deepEqual(searchResearch("juustot",[
 {lidlProductId:"cheese",name:"Juustot"},
 {lidlProductId:"cake",name:"Juustokakku"}
]).map(r=>r.lidlProductId),["cheese"]);
assert.deepEqual(searchResearch("leipä",[
 {lidlProductId:"bread",name:"Leipä 500 g"},
 {lidlProductId:"spread",name:"Leipälevite"},
 {lidlProductId:"crumbs",name:"Leipäjauho"}
]).map(r=>r.lidlProductId),["bread"]);
assert.deepEqual(searchResearch("leivät",[
 {lidlProductId:"bread",name:"Leivät"},
 {lidlProductId:"spread",name:"Leipälevite"}
]).map(r=>r.lidlProductId),["bread"]);
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
assert.deepEqual(searchResearch(null,sample),[]);
assert.deepEqual(searchResearch(123,sample),[]);
assert.deepEqual(searchResearch({toString:()=>"maito"},sample),[]);
assert.deepEqual(searchResearch(["maito"],sample),[]);
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
assert.equal(searchResearch("maito",sample,"0").length,1);
assert.equal(searchResearch("maito",sample,null).length,1);
assert.equal(searchResearch("maito",sample,Infinity).length,1);
assert.deepEqual(searchResearch("olut",[{lidlProductId:"10038275",name:"Olut"},{lidlProductId:"safe-fixture",name:"Olutniminen testituote"}]).map(r=>r.lidlProductId),["safe-fixture"]);
assert.deepEqual(searchResearch("testi",[{lidlProductId:"10038306",name:"Testi"},{lidlProductId:"10038307",name:"Testi"},{lidlProductId:"10038308",name:"Testi"}]),[]);
assert.deepEqual(searchResearch("maito",[null,...sample]).map(r=>r.lidlProductId),["2"]);
assert.deepEqual(searchResearch("maito",[
 {lidlProductId:"  duplicate ",name:"Maito"},
 {lidlProductId:"duplicate",name:"Maito"},
 {lidlProductId:" 10038275 ",name:"Maito"},
 {lidlProductId:" ",name:"Maito"}
]).map(r=>r.lidlProductId),["duplicate"]);

assert.deepEqual(searchResearch("Milbona raejuusto",[
 {lidlProductId:"brand-match",name:"Milbona Raejuusto 200 g"},
 {lidlProductId:"other-brand",name:"Raejuusto 200 g"},
 {lidlProductId:"other-product",name:"Milbona Jogurtti 200 g"}
]).map(r=>r.lidlProductId),["brand-match"]);
assert.deepEqual(searchResearch("maito 400 g",[
 {lidlProductId:"400",name:"Täysmaito 400 g"},
 {lidlProductId:"800",name:"Täysmaito 800 g"}
]).map(r=>r.lidlProductId),["400"]);
assert.deepEqual(searchResearch("tuntematon tuote",[
 {lidlProductId:"known",name:"Täysmaito 1 l"}
]),[]);
assert.deepEqual(searchResearch("voi",[
 {lidlProductId:"butter",name:"Meijerivoi 500 g"},
 {lidlProductId:"sandwich",name:"Voileipä 200 g"}
]).map(r=>r.lidlProductId),["butter"]);
assert.deepEqual(searchResearch("leivät",[
 {lidlProductId:"bread",name:"Leivät"},
 {lidlProductId:"spread",name:"Leipälevite"}
]).map(r=>r.lidlProductId),["bread"]);

/* Real 226-row candidate corpus: audit known discovery gaps without treating names as stock. */
import {readFileSync} from "node:fs";
const corpus=JSON.parse(readFileSync(new URL("../data/lidl/official-grocery-candidates-v44-2026-10-01.json",import.meta.url),"utf8")).records;
assert.equal(corpus.length,226);
for(const query of ["peruna","banaani","jauheliha"]){
 const hits=searchResearch(query,corpus);
 assert.ok(Array.isArray(hits));
 assert.ok(hits.every(r=>r.ean===null&&r.displayedPriceEur===null&&r.checkoutPriceVerified===false&&r.storeAvailability==="unknown"));
}

/* v61: rank exact query tokens before approved morphological alternatives. */
assert.deepEqual(searchResearch("maito",[
 {lidlProductId:"alternative",name:"Täysmaito 1 l"},
 {lidlProductId:"exact",name:"Maito 1 l"},
 {lidlProductId:"irrelevant",name:"Maitosuklaa"}
]).map(r=>r.lidlProductId),["exact","alternative"]);
assert.deepEqual(searchResearch("juusto",[
 {lidlProductId:"alternative",name:"Tuorejuusto 200 g"},
 {lidlProductId:"exact",name:"Juusto 400 g"},
 {lidlProductId:"pastry",name:"Juustokierre"}
]).map(r=>r.lidlProductId),["exact","alternative"]);
assert.deepEqual(searchResearch("leipä",[
 {lidlProductId:"alternative",name:"Kiviuunileipä"},
 {lidlProductId:"exact",name:"Leipä"},
 {lidlProductId:"spread",name:"Leipälevite"}
]).map(r=>r.lidlProductId),["exact","alternative"]);
assert.deepEqual(searchResearch("pasta carbonara",[
 {lidlProductId:"prefix",name:"Pastakastike Carbonara"},
 {lidlProductId:"exact",name:"Pasta Carbonara"}
]).map(r=>r.lidlProductId),["exact"]);

const corpusQueries=["peruna","banaani","jauheliha","juusto","leipä"];
for(const query of corpusQueries){
 const first=searchResearch(query,corpus);
 const second=searchResearch(query,corpus);
 assert.deepEqual(second,first,"Corpus query must be deterministic: "+query);
 assert.equal(new Set(first.map(r=>r.lidlProductId)).size,first.length,"No duplicate Lidl product IDs: "+query);
 assert.ok(first.length<=15,"Default result limit: "+query);
 assert.ok(first.every(r=>r.source==="lidl.fi-public-research"&&r.ean===null&&r.regularPriceEur===null&&r.displayedPriceEur===null&&r.storeAvailability==="unknown"&&r.checkoutPriceVerified===false),"Research feed safety: "+query);
}
/* v62: real-corpus multiword brand/product/variant coverage. */
assert.ok(searchResearch("milbona proteiinivanukas",corpus).some(r=>r.name==="MILBONA Proteiinivanukas"));
assert.ok(searchResearch("milbona proteiinivanukas kahvi",corpus).some(r=>r.name==="MILBONA Proteiinivanukas"&&/kahvi/.test(r.variant??"")));
assert.ok(searchResearch("red bull energiajuoma white peach",corpus).some(r=>r.name==="RED BULL Energiajuoma"));
assert.ok(searchResearch("arla juustoviipale",corpus).some(r=>r.name==="ARLA Juustoviipale"));
assert.deepEqual(searchResearch("milbona juustoviipale",corpus),[]);
assert.deepEqual(searchResearch("red bull proteiinivanukas",corpus),[]);
assert.deepEqual(searchResearch("milbona proteiinivanukas 999 kg",corpus),[]);


/* v63: multiword ranking, variant isolation and research-only output. */
const variantFixture=[
 {lidlProductId:"coffee",name:"MILBONA Proteiinivanukas",variant:"kahvi"},
 {lidlProductId:"coconut",name:"MILBONA Proteiinivanukas",variant:"kookos"},
 {lidlProductId:"other",name:"MILBONA Proteiinijuoma",variant:"kahvi"}
];
assert.deepEqual(searchResearch("milbona proteiinivanukas kahvi",variantFixture).map(r=>r.lidlProductId),["coffee"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas kookos",variantFixture).map(r=>r.lidlProductId),["coconut"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas mansikka",variantFixture),[]);
assert.deepEqual(searchResearch("milbona proteiinivanukas 200 g",variantFixture),[]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",variantFixture,1).map(r=>r.lidlProductId),["coffee"]);
assert.ok(searchResearch("milbona proteiinivanukas kahvi",variantFixture).every(r=>r.ean===null&&r.regularPriceEur===null&&r.displayedPriceEur===null&&r.checkoutPriceVerified===false&&r.storeAvailability==="unknown"));


/* v64: same display name can legitimately represent distinct source product IDs. */
const reissumies=corpus.filter(r=>r.name==="OULULAINEN Reissumies Tosi Ohut");
assert.equal(reissumies.length,2,"Real corpus should retain both distinct Reissumies records");
assert.equal(new Set(reissumies.map(r=>r.lidlProductId)).size,2);
const sameNameHits=searchResearch("oululainen reissumies tosi ohut",corpus);
assert.equal(sameNameHits.filter(r=>r.name==="OULULAINEN Reissumies Tosi Ohut").length,2,"Do not deduplicate by name");
assert.equal(new Set(sameNameHits.map(r=>r.lidlProductId)).size,sameNameHits.length,"Deduplicate by ID only");
assert.deepEqual(searchResearch("oululainen reissumies tosi ohut",corpus),sameNameHits,"Stable tie ordering");
assert.deepEqual(searchResearch("oululainen reissumies tosi ohut",corpus,1),sameNameHits.slice(0,1),"Limit after deterministic sorting");


/* v65: corpus coverage smoke audit across five broad grocery groups. */
const coverageCases=[
 ["maitosuklaa",/maito/i],
 ["jauheliha",/jauheliha/i],
 ["peruna",/peruna/i],
 ["leipä",/leip/i],
 ["juusto",/juusto/i],
 ["banaani",/banaani/i]
];
for(const [query,re] of coverageCases){
 const corpusCandidates=corpus.filter(r=>re.test(String(r.name??"")));
 const hits=searchResearch(query,corpus);
 assert.ok(corpusCandidates.length>0,"Fixture coverage missing for "+query);
 assert.ok(hits.length>0,"Research search returned no candidates for "+query);
 assert.ok(hits.every(r=>r.ean===null&&r.regularPriceEur===null&&r.displayedPriceEur===null&&r.storeAvailability==="unknown"&&r.checkoutPriceVerified===false),"Research-only fields violated for "+query);
}

const cheeseHits=searchResearch("juusto",corpus);
assert.ok(cheeseHits.some(r=>r.name==="ARLA Juustoviipale"),"Generic cheese query must find cheese slices");
assert.ok(cheeseHits.some(r=>r.name==="JOKILAAKSON JUUSTO Tuorejuusto 2 kpl"),"Generic cheese query must find cream cheese");
assert.ok(!searchResearch("juusto",[{lidlProductId:"pastry",name:"Juustokierre"},{lidlProductId:"pie",name:"Juustopiirakka"}]).length,"Cheese query must exclude cheese pastries");
const minceHits=searchResearch("jauheliha",corpus);
assert.ok(minceHits.some(r=>/Nauta-viljapossujauheliha/i.test(r.name)),"Generic mince query must find the actual mixed-mince candidate");
assert.ok(!searchResearch("jauheliha",[{lidlProductId:"pie",name:"Jauhelihapiirakka"}]).length);
assert.ok(searchResearch("peruna",corpus).some(r=>r.name==="Kotimainen peruna"));
assert.ok(!searchResearch("peruna",[{lidlProductId:"pie",name:"Perunapiirakka"}]).length);
assert.ok(searchResearch("banaani",corpus).some(r=>r.name==="Reilun kaupan banaani"));
assert.ok(!searchResearch("banaani",[{lidlProductId:"cake",name:"Banaanikakku"}]).length);
const breadCompoundNames=corpus.filter(r=>typeof r.name==="string"&&/leipä/i.test(r.name));
assert.ok(breadCompoundNames.length>0,"Fixture corpus must contain real compound bread names");
const breadQueryHits=searchResearch("leipä",corpus);
assert.ok(breadQueryHits.some(r=>/leipä/i.test(r.name)),"Generic bread query must find verified bread compounds");
assert.ok(!searchResearch("leipä",[{lidlProductId:"spread",name:"Leipälevite"},{lidlProductId:"crumb",name:"Leipäjauho"}]).length,"Bread query must exclude spread and crumbs");
console.log(JSON.stringify({audit:"Lidl real-corpus v56",candidateCount:corpus.length,breadCompoundCandidates:breadCompoundNames.length,breadQueryHits:breadQueryHits.length,rule:"Verified bread compound whitelist; no production behavior changed."}));
console.log("Lidl research name-only search safety and quality v56 tests passed");

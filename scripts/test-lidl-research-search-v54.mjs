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


/* v66: real-corpus branded/compound category searches. */
assert.ok(searchResearch("kotimainen omena",corpus).some(r=>r.name==="Kotimainen omena"));
assert.ok(searchResearch("kariniemen kananpojan rintaleike",corpus).some(r=>r.name==="KARINIEMEN Kananpojan rintaleike"));
assert.ok(searchResearch("atria pizza",corpus).some(r=>r.name==="ATRIA Pizza 2 kpl"));
assert.ok(searchResearch("marli vital mehujuoma",corpus).some(r=>r.name==="MARLI Vital-mehujuoma"));
assert.ok(searchResearch("kuljanka savustettu makkara",corpus).some(r=>r.name==="KULJANKA Savustettu makkara"));
assert.deepEqual(searchResearch("kariniemen pizza",corpus),[],"Brand/product tokens must not cross-match unrelated records");
assert.deepEqual(searchResearch("kuljanka kana",corpus),[],"Unrelated brand/product combination must not fabricate a match");


/* v67: punctuation, case and whitespace normalization on verified real-corpus products. */
assert.deepEqual(
 searchResearch("  MARLI   VITAL-MEHUJUOMA  ",corpus).map(r=>r.lidlProductId),
 searchResearch("marli vital mehujuoma",corpus).map(r=>r.lidlProductId),
 "Case, repeated whitespace and hyphenation must normalize identically"
);
assert.deepEqual(
 searchResearch("KARINIEMEN KANANPOJAN RINTALEIKE",corpus).map(r=>r.lidlProductId),
 searchResearch("kariniemen kananpojan rintaleike",corpus).map(r=>r.lidlProductId),
 "Search must be case-insensitive"
);
assert.ok(searchResearch("tymbark omena-kirsikkamehu",corpus).some(r=>r.name==="TYMBARK Omena-kirsikkamehu"));
assert.deepEqual(searchResearch("   ",corpus),[],"Whitespace-only query must return no results");


/* v67: exact generic term must not leak into unrelated compounds. */
const appleHits=searchResearch("omena",corpus);
assert.ok(appleHits.some(r=>r.name==="Kotimainen omena"));
assert.ok(!appleHits.some(r=>r.name==="Omenatasku"));
assert.ok(!appleHits.some(r=>r.name==="KARLENS Omenasiideri"));
assert.ok(searchResearch("omena kirsikkamehu",corpus).some(r=>r.name==="TYMBARK Omena-kirsikkamehu"));
const pizzaHits=searchResearch("pizza",corpus);
assert.ok(pizzaHits.some(r=>r.name==="ATRIA Pizza 2 kpl"));
assert.ok(!pizzaHits.some(r=>r.name==="Pizzadonitsi margherita"));


/* v68: explicit compound searches remain discoverable after generic safeguards. */
assert.ok(searchResearch("omenatasku",corpus).some(r=>r.name==="Omenatasku"));
assert.ok(searchResearch("omenasiideri",corpus).some(r=>r.name==="KARLENS Omenasiideri"));
assert.ok(searchResearch("pizzadonitsi",corpus).some(r=>r.name==="Pizzadonitsi margherita"));
assert.ok(searchResearch("salamipizza",corpus).some(r=>r.name==="Salamipizza"));
assert.ok(searchResearch("pizza hawaii",corpus).some(r=>r.name==="Pizza Hawaii"));
assert.ok(searchResearch("pizza kebab",corpus).some(r=>r.name==="Pizza Kebab"));
assert.ok(!searchResearch("omena",corpus).some(r=>r.name==="Omenatasku"||r.name==="KARLENS Omenasiideri"));
assert.ok(!searchResearch("pizza",corpus).some(r=>r.name==="Pizzadonitsi margherita"||r.name==="Salamipizza"));


/* v69: explicit pack quantity must be matched from the same source record. */
const packFixture=[
 {lidlProductId:"one",name:"ATRIA Pizza 1 kpl"},
 {lidlProductId:"two",name:"ATRIA Pizza 2 kpl"},
 {lidlProductId:"three",name:"ATRIA Pizza 3 kpl"},
 {lidlProductId:"other",name:"ATRIA Kanan fileesuikale 2 kpl"}
];
assert.deepEqual(searchResearch("atria pizza 2 kpl",packFixture).map(r=>r.lidlProductId),["two"]);
assert.deepEqual(searchResearch("atria pizza 1 kpl",packFixture).map(r=>r.lidlProductId),["one"]);
assert.deepEqual(searchResearch("atria pizza 4 kpl",packFixture),[]);
assert.ok(searchResearch("atria pizza 2 kpl",corpus).some(r=>r.name==="ATRIA Pizza 2 kpl"));
assert.deepEqual(searchResearch("atria pizza 4 kpl",corpus),[]);


/* v70: bounded limits and no price/EAN leakage on every returned real-corpus row. */
for(const limit of [0,1,2,15,50,500,-1,NaN,Infinity]){
 const hits=searchResearch("pizza",corpus,limit);
 assert.ok(hits.length<=Math.max(0,Math.min(50,Number.isFinite(limit)?Math.trunc(limit):15)));
 assert.ok(hits.every(r=>r.ean===null&&r.regularPriceEur===null&&r.displayedPriceEur===null&&r.checkoutPriceVerified===false&&r.storeAvailability==="unknown"));
}
assert.deepEqual(searchResearch("pizza",corpus,0),[]);
assert.deepEqual(searchResearch("pizza",corpus,-1),[]);
assert.deepEqual(searchResearch("pizza",corpus,1),searchResearch("pizza",corpus,50).slice(0,1));


/* v71: malformed source rows cannot introduce phantom or unsafe results. */
const malformedFixture=[
 null,[],{}, {lidlProductId:"",name:"Pizza"},
 {lidlProductId:"valid",name:"Pizza",ean:"1234567890123",regularPriceEur:9.99,displayedPriceEur:1.99,storeAvailability:"available",checkoutPriceVerified:true},
 {lidlProductId:"valid",name:"Pizza",ean:"9876543210987"},
 {lidlProductId:123,name:"Pizza"},
 {lidlProductId:"wrong",name:"Pizzadonitsi"}
];
const malformedHits=searchResearch("pizza",malformedFixture);
assert.deepEqual(malformedHits.map(r=>r.lidlProductId),["valid"]);
assert.equal(malformedHits[0].ean,null);
assert.equal(malformedHits[0].regularPriceEur,null);
assert.equal(malformedHits[0].displayedPriceEur,null);
assert.equal(malformedHits[0].storeAvailability,"unknown");
assert.equal(malformedHits[0].checkoutPriceVerified,false);
assert.deepEqual(searchResearch("pizza",null),[]);
assert.deepEqual(searchResearch(null,malformedFixture),[]);


/* v72: equal-score results should remain deterministic across input ordering. */
const stableFixture=[
 {lidlProductId:"a",name:"Pizza Hawaii"},
 {lidlProductId:"b",name:"Pizza Kebab"},
 {lidlProductId:"c",name:"Pizza Margherita"}
];
const stableForward=searchResearch("pizza",stableFixture).map(r=>r.lidlProductId);
const stableReverse=searchResearch("pizza",[...stableFixture].reverse()).map(r=>r.lidlProductId);
assert.deepEqual(stableForward,stableReverse);
assert.equal(new Set(stableForward).size,stableForward.length);
assert.deepEqual(searchResearch("pizza",[...stableFixture].reverse(),2).map(r=>r.lidlProductId),stableForward.slice(0,2));


/* v73: duplicate IDs must not inflate search counts or override research-only fields. */
const repeatedIdFixture=[
 {lidlProductId:"same",name:"Pizza Hawaii",ean:"123",displayedPriceEur:4.99},
 {lidlProductId:"same",name:"Pizza Hawaii",ean:"456",displayedPriceEur:1.99},
 {lidlProductId:"other",name:"Pizza Kebab"}
];
const repeatedHits=searchResearch("pizza",repeatedIdFixture);
assert.equal(repeatedHits.length,2);
assert.equal(repeatedHits.filter(r=>r.lidlProductId==="same").length,1);
assert.deepEqual(new Set(repeatedHits.map(r=>r.lidlProductId)).size,2);
assert.ok(repeatedHits.every(r=>r.ean===null&&r.displayedPriceEur===null&&r.checkoutPriceVerified===false));


/* v74: Finnish case, whitespace, diacritics and punctuation normalization. */
const baselineBread=searchResearch("leipä",corpus).map(r=>r.lidlProductId);
assert.deepEqual(searchResearch("LEIPÄ",corpus).map(r=>r.lidlProductId),baselineBread);
assert.deepEqual(searchResearch("leipa",corpus).map(r=>r.lidlProductId),baselineBread);
assert.deepEqual(searchResearch("  leipä   ",corpus).map(r=>r.lidlProductId),baselineBread);
const baselineBrand=searchResearch("atria pizza",corpus).map(r=>r.lidlProductId);
assert.deepEqual(searchResearch("ATRIA PIZZA",corpus).map(r=>r.lidlProductId),baselineBrand);
assert.deepEqual(searchResearch("  atria---pizza  ",corpus).map(r=>r.lidlProductId),baselineBrand);
assert.deepEqual(searchResearch("   ",corpus),[]);


/* v75: punctuation and malformed query input cannot produce phantom matches. */
for(const query of ["---","...","!!!","   ", "", null, undefined, 123, {}, []]){
 assert.deepEqual(searchResearch(query,corpus),[],"Invalid/empty query must return no results");
}
const brandPunctuation=searchResearch("atria pizza",corpus).map(r=>r.lidlProductId);
assert.deepEqual(searchResearch("ATRIA, Pizza!",corpus).map(r=>r.lidlProductId),brandPunctuation);
assert.deepEqual(searchResearch("atria / pizza",corpus).map(r=>r.lidlProductId),brandPunctuation);
assert.deepEqual(searchResearch("atria pizza nonexistent",corpus),[],"All search tokens must belong to one record");


/* v76: absent or malformed variants are safe; source metadata cannot override research provenance. */
const variantSafetyFixture=[
 {lidlProductId:"none",name:"Pizza Hawaii"},
 {lidlProductId:"null",name:"Pizza Kebab",variant:null},
 {lidlProductId:"number",name:"Pizza Margherita",variant:123},
 {lidlProductId:"source",name:"Pizza Salami",variant:"iso",source:"untrusted",observedDate:"2026-10-01",note:"untrusted",ean:"123",displayedPriceEur:4.99}
];
const variantSafetyHits=searchResearch("pizza",variantSafetyFixture);
assert.equal(variantSafetyHits.length,4);
assert.ok(variantSafetyHits.every(r=>r.source==="lidl.fi-public-research"&&r.ean===null&&r.displayedPriceEur===null&&r.checkoutPriceVerified===false));
assert.equal(variantSafetyHits.find(r=>r.lidlProductId==="none").variant,null);
assert.equal(variantSafetyHits.find(r=>r.lidlProductId==="null").variant,null);
assert.equal(variantSafetyHits.find(r=>r.lidlProductId==="number").variant,null);
assert.equal(variantSafetyHits.find(r=>r.lidlProductId==="source").variant,"iso");


/* v77: quarantined IDs stay excluded even when duplicated or presented with tempting matches. */
const quarantinedSet=new Set(["10038275","10038306","10038307","10038308"]);
const quarantineFixture=[
 ...[...quarantinedSet].flatMap(id=>[
  {lidlProductId:id,name:"Pizza Hawaii"},
  {lidlProductId:id,name:"Pizza Hawaii",ean:"123",displayedPriceEur:0.01}
 ]),
 {lidlProductId:"safe-pizza",name:"Pizza Hawaii"}
];
assert.deepEqual(searchResearch("pizza hawaii",quarantineFixture).map(r=>r.lidlProductId),["safe-pizza"]);
assert.ok(!searchResearch("pizza",corpus).some(r=>quarantinedSet.has(r.lidlProductId)));


/* v78: official research corpus integrity gate (not a product ingestion step). */
const corpusIds=corpus.map(r=>r.lidlProductId);
assert.equal(corpus.length,226,"Unexpected corpus size: review any intentional source refresh");
assert.equal(new Set(corpusIds).size,corpusIds.length,"Research corpus IDs must be unique");
assert.ok(corpus.every(r=>typeof r.lidlProductId==="string"&&r.lidlProductId.trim()&&typeof r.name==="string"&&r.name.trim()),"Every candidate needs an ID and name");
assert.ok(corpus.every(r=>!quarantinedSet.has(r.lidlProductId)),"Quarantined IDs cannot appear in the active research corpus");


/* v79: searching must not mutate the caller-owned research corpus. */
const immutableFixture=[
 {lidlProductId:"first",name:"Pizza Hawaii",variant:"iso"},
 {lidlProductId:"second",name:"Pizza Kebab",variant:"pieni"}
];
const beforeSearch=JSON.stringify(immutableFixture);
const firstSearch=searchResearch("pizza",immutableFixture);
assert.equal(JSON.stringify(immutableFixture),beforeSearch,"Search must not mutate source records or ordering");
firstSearch[0].name="Changed result";
firstSearch[0].variant="Changed variant";
assert.equal(JSON.stringify(immutableFixture),beforeSearch,"Returned result objects must not alias source records");
assert.deepEqual(searchResearch("pizza",immutableFixture).map(r=>r.name),["Pizza Hawaii","Pizza Kebab"]);


/* v80: repeated real-corpus searches are stable, including genuine misses. */
for(const query of ["pizza","omena","juusto","atria pizza","milbona proteiinivanukas"]){
 const first=searchResearch(query,corpus);
 const second=searchResearch(query,corpus);
 assert.deepEqual(second,first,"Repeated search changed results for "+query);
 assert.ok(first.every(r=>typeof r.lidlProductId==="string"&&r.lidlProductId.trim()&&typeof r.name==="string"&&r.name.trim()));
}
for(const query of ["ziiplynonexistentproduct","atria pizza nonexistent","milbona pizza"]){
 assert.deepEqual(searchResearch(query,corpus),[],"Missing product must not receive fallback phantom result: "+query);
}


/* v81: sorting and deduplication precede limit, independent of row order. */
const limitFixture=[
 {lidlProductId:"z",name:"Pizza Zeta"},
 {lidlProductId:"a",name:"Pizza Alfa"},
 {lidlProductId:"m",name:"Pizza Mokka"},
 {lidlProductId:"a",name:"Pizza Alfa"}
];
const sortedAll=searchResearch("pizza",limitFixture,50).map(r=>r.lidlProductId);
assert.equal(sortedAll.length,3);
for(const limit of [0,1,2,3,4,50]){
 assert.deepEqual(searchResearch("pizza",limitFixture,limit).map(r=>r.lidlProductId),sortedAll.slice(0,limit));
 assert.deepEqual(searchResearch("pizza",[...limitFixture].reverse(),limit).map(r=>r.lidlProductId),sortedAll.slice(0,limit));
}


/* v82: every query token must match within one record, including its own variant. */
const crossRecordFixture=[
 {lidlProductId:"a",name:"MILBONA Proteiinivanukas",variant:"kahvi"},
 {lidlProductId:"b",name:"MILBONA Proteiinijuoma",variant:"kookos"},
 {lidlProductId:"c",name:"ARLA Proteiinivanukas",variant:"kookos"}
];
assert.deepEqual(searchResearch("milbona proteiinivanukas kookos",crossRecordFixture),[]);
assert.deepEqual(searchResearch("arla proteiinivanukas kookos",crossRecordFixture).map(r=>r.lidlProductId),["c"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas kahvi",crossRecordFixture).map(r=>r.lidlProductId),["a"]);
assert.deepEqual(searchResearch("milbona proteiinijuoma kookos",crossRecordFixture).map(r=>r.lidlProductId),["b"]);


/* v83: multi-token query order must not change matching or ranking. */
for(const [forward,reverse] of [
 ["atria pizza","pizza atria"],
 ["milbona proteiinivanukas","proteiinivanukas milbona"],
 ["marli vital","vital marli"],
 ["pizza hawaii","hawaii pizza"],
 ["kotimainen omena","omena kotimainen"]
]){
 assert.deepEqual(searchResearch(forward,corpus),searchResearch(reverse,corpus),"Query order changed results: "+forward);
}


/* v84: repeating a query token must not create extra matches or reorder results. */
for(const [plain,repeated] of [
 ["pizza","pizza pizza"],
 ["atria pizza","atria atria pizza"],
 ["milbona proteiinivanukas","milbona proteiinivanukas milbona"],
 ["kotimainen omena","kotimainen omena omena"]
]){
 assert.deepEqual(searchResearch(repeated,corpus),searchResearch(plain,corpus),"Repeated query term changed results: "+repeated);
}


/* v85: research output must never promote unverified commerce fields. */
const unsafeCommerceFixture=[{
 lidlProductId:"unsafe-commerce",name:"Pizza Hawaii",
 ean:"6412345678901",regularPriceEur:12.34,displayedPriceEur:0.01,
 storeAvailability:"available",checkoutPriceVerified:true
}];
const unsafeCommerceResult=searchResearch("pizza hawaii",unsafeCommerceFixture);
assert.equal(unsafeCommerceResult.length,1);
for(const row of unsafeCommerceResult){
 assert.equal(row.ean,null);
 assert.equal(row.regularPriceEur,null);
 assert.equal(row.displayedPriceEur,null);
 assert.equal(row.storeAvailability,"unknown");
 assert.equal(row.checkoutPriceVerified,false);
}


/* v86: output is an explicit allowlist, not a spread of source internals. */
const internalFixture=[{
 lidlProductId:"private-fields",name:"Pizza Hawaii",variant:"iso",
 observedDate:"2026-10-01",internalToken:"secret",supplierCost:1.23,
 debugPayload:{raw:"do not expose"},imageUrl:"https://invalid.example/private",
 source:"untrusted-source"
}];
const internalResult=searchResearch("pizza hawaii",internalFixture);
assert.equal(internalResult.length,1);
assert.deepEqual(Object.keys(internalResult[0]).sort(),[
 "lidlProductId","name","variant","source","observedDate","ean",
 "regularPriceEur","storeAvailability","checkoutPriceVerified","displayedPriceEur","note"
].sort());
assert.equal(internalResult[0].source,"lidl.fi-public-research");
assert.equal(internalResult[0].observedDate,"2026-10-01");
assert.ok(!JSON.stringify(internalResult).includes("secret"));
assert.ok(!JSON.stringify(internalResult).includes("supplierCost"));


/* v87: malformed/missing variants cannot invent data or suppress valid names. */
const v87VariantFixture=[
 {lidlProductId:"variant-missing",name:"Pizza Hawaii"},
 {lidlProductId:"variant-object",name:"Pizza Kebab",variant:{text:"salainen"}},
 {lidlProductId:"variant-number",name:"Pizza Margherita",variant:123},
 {lidlProductId:"variant-valid",name:"MILBONA Proteiinivanukas",variant:"kahvi"}
];
for(const [query,id] of [
 ["pizza hawaii","variant-missing"],["pizza kebab","variant-object"],
 ["pizza margherita","variant-number"],["milbona proteiinivanukas kahvi","variant-valid"]
]){
 const hits=searchResearch(query,v87VariantFixture);
 assert.deepEqual(hits.map(r=>r.lidlProductId),[id]);
 assert.equal(hits[0].variant,id==="variant-valid"?"kahvi":null);
}
assert.deepEqual(searchResearch("salainen",v87VariantFixture),[],"Object variant must not be stringified into searchable text");


/* v88: malformed names must not become invented searchable product names. */
const v88NameFixture=[
 {lidlProductId:"name-null",name:null,variant:"Pizza Hawaii"},
 {lidlProductId:"name-number",name:12345,variant:"Pizza Hawaii"},
 {lidlProductId:"name-object",name:{text:"Pizza Hawaii"},variant:"Pizza Hawaii"},
 {lidlProductId:"name-valid",name:"Pizza Hawaii"}
];
const v88Hits=searchResearch("pizza hawaii",v88NameFixture);
assert.deepEqual(v88Hits.map(r=>r.lidlProductId).sort(),["name-valid","name-null","name-number","name-object"].sort());
assert.ok(v88Hits.every(r=>typeof r.name==="string"));
assert.ok(!searchResearch("12345",v88NameFixture).some(r=>r.lidlProductId==="name-number"));


/* v89: invalid IDs are excluded; whitespace around valid IDs is normalized. */
const v89IdFixture=[
 {lidlProductId:"",name:"Pizza Hawaii"},
 {lidlProductId:"   ",name:"Pizza Hawaii"},
 {lidlProductId:null,name:"Pizza Hawaii"},
 {lidlProductId:123,name:"Pizza Hawaii"},
 {lidlProductId:" valid-pizza ",name:"Pizza Hawaii"}
];
const v89Hits=searchResearch("pizza hawaii",v89IdFixture);
assert.deepEqual(v89Hits.map(r=>r.lidlProductId),["valid-pizza"]);
assert.equal(v89IdFixture[4].lidlProductId," valid-pizza ","Source ID must remain unchanged");


/* v90: quarantined IDs stay blocked even if the source ID has surrounding whitespace. */
const v90QuarantineFixture=[
 {lidlProductId:" 10038275 ",name:"Pizza Hawaii"},
 {lidlProductId:"\t10038306\n",name:"Pizza Hawaii"},
 {lidlProductId:"10038307",name:"Pizza Hawaii"},
 {lidlProductId:" 10038308",name:"Pizza Hawaii"},
 {lidlProductId:"allowed-90",name:"Pizza Hawaii"}
];
assert.deepEqual(searchResearch("pizza hawaii",v90QuarantineFixture).map(r=>r.lidlProductId),["allowed-90"]);


/* v91: mutating returned identity and variant cannot poison later searches. */
const v91Fixture=[{lidlProductId:"original-91",name:"MILBONA Proteiinivanukas",variant:"kahvi"}];
const v91First=searchResearch("milbona proteiinivanukas",v91Fixture);
assert.equal(v91First.length,1);
v91First[0].lidlProductId="modified-91";
v91First[0].variant="kookos";
v91First[0].observedDate="2099-01-01";
const v91Second=searchResearch("milbona proteiinivanukas kahvi",v91Fixture);
assert.equal(v91Second.length,1);
assert.equal(v91Second[0].lidlProductId,"original-91");
assert.equal(v91Second[0].variant,"kahvi");
assert.notEqual(v91Second[0].observedDate,"2099-01-01");
assert.deepEqual(searchResearch("milbona proteiinivanukas kookos",v91Fixture),[]);


/* v92: large requested limits remain capped at 50 without dropping safety fields. */
const v92Fixture=Array.from({length:65},(_,i)=>({
 lidlProductId:"limit92-"+String(i).padStart(2,"0"),name:"Pizza Test "+String(i).padStart(2,"0"),
 ean:"unverified",displayedPriceEur:0.01
}));
const v92Fifty=searchResearch("pizza",v92Fixture,50);
assert.equal(v92Fifty.length,50);
for(const oversized of [51,65,100,1000000]){
 const actual=searchResearch("pizza",v92Fixture,oversized);
 assert.deepEqual(actual,v92Fifty,"Unexpected behavior for limit "+oversized);
}
assert.deepEqual(searchResearch("pizza",v92Fixture,Infinity),searchResearch("pizza",v92Fixture,15),"Non-finite limit must use default");
assert.ok(v92Fifty.every(r=>r.ean===null&&r.displayedPriceEur===null));


/* v93: negative and fractional limits are clamped/truncated deterministically. */
const v93Rows=Array.from({length:6},(_,i)=>({lidlProductId:"limit93-"+i,name:"Pizza Test "+i}));
const v93All=searchResearch("pizza",v93Rows,6);
for(const limit of [-100,-1,-0.5,0,0.9]){
 assert.deepEqual(searchResearch("pizza",v93Rows,limit),[],"Expected zero results for limit "+limit);
}
for(const [limit,count] of [[1.1,1],[1.9,1],[2.1,2],[2.99,2],[5.9,5]]){
 assert.deepEqual(searchResearch("pizza",v93Rows,limit),v93All.slice(0,count),"Fractional limit mismatch: "+limit);
}


/* v94: non-numeric result limits fall back to the safe default of 15. */
const v94Rows=Array.from({length:25},(_,i)=>({lidlProductId:"limit94-"+i,name:"Pizza Test "+i}));
const v94Default=searchResearch("pizza",v94Rows,15);
assert.equal(v94Default.length,15);
for(const invalidLimit of [null,undefined,"2","50",true,false,{},[],[2],NaN,-Infinity]){
 assert.deepEqual(searchResearch("pizza",v94Rows,invalidLimit),v94Default,"Invalid limit must use default: "+String(invalidLimit));
}


/* v95: invalid row collections fail closed instead of throwing or leaking data. */
assert.deepEqual(searchResearch("pizza",undefined),searchResearch("pizza",corpus),"Undefined rows must select default corpus");
for(const invalidRows of [null,{},123,"pizza",true,false]){
 assert.deepEqual(searchResearch("pizza",invalidRows),[],"Invalid rows must return empty results: "+String(invalidRows));
}
assert.deepEqual(searchResearch("pizza",[]),[]);
assert.deepEqual(searchResearch("pizza",[null,undefined,0,false,"pizza",[],{}]),[]);


/* v96: malformed query types fail closed without invoking string coercion. */
const v96Rows=[{lidlProductId:"safe-96",name:"Pizza Hawaii"}];
for(const invalidQuery of [null,undefined,0,123,true,false,[],["pizza"],{}, {toString(){throw Error("must not coerce query");}}]){
 assert.deepEqual(searchResearch(invalidQuery,v96Rows),[],"Malformed query must return no matches");
}
assert.deepEqual(searchResearch("pizza hawaii",v96Rows).map(r=>r.lidlProductId),["safe-96"]);


/* v97: queries without searchable tokens must not return arbitrary products. */
const v97Rows=[{lidlProductId:"safe-97",name:"Pizza Hawaii"}];
for(const emptyQuery of [""," ","\t\n","...","---","/ + /","!!!","()[]{}","€ % &"]){
 assert.deepEqual(searchResearch(emptyQuery,v97Rows),[],"Tokenless query must return no matches: "+JSON.stringify(emptyQuery));
}
assert.deepEqual(searchResearch("  pizza   hawaii  ",v97Rows).map(r=>r.lidlProductId),["safe-97"]);


/* v98: duplicate IDs are removed before applying the requested result limit. */
const v98Rows=[
 {lidlProductId:"dup-98",name:"Pizza A"},
 {lidlProductId:"dup-98",name:"Pizza A"},
 {lidlProductId:"other-98",name:"Pizza B"},
 {lidlProductId:"third-98",name:"Pizza C"}
];
assert.deepEqual(searchResearch("pizza",v98Rows,2).map(r=>r.lidlProductId),["dup-98","other-98"]);
assert.deepEqual(searchResearch("pizza",v98Rows,3).map(r=>r.lidlProductId),["dup-98","other-98","third-98"]);


/* v99: normalized duplicate IDs must not consume result slots. */
const v99Rows=[
 {lidlProductId:" same-99 ",name:"Pizza A"},
 {lidlProductId:"same-99",name:"Pizza A"},
 {lidlProductId:" next-99 ",name:"Pizza B"},
 {lidlProductId:"last-99",name:"Pizza C"}
];
assert.deepEqual(searchResearch("pizza",v99Rows,2).map(r=>r.lidlProductId),["same-99","next-99"]);
assert.deepEqual(searchResearch("pizza",v99Rows,3).map(r=>r.lidlProductId),["same-99","next-99","last-99"]);
assert.equal(v99Rows[0].lidlProductId," same-99 ","Source ID must remain unchanged");


/* v100: explicit zero result limit must always suppress matches. */
const v100Rows=[
 {lidlProductId:"zero-100-a",name:"Pizza Hawaii"},
 {lidlProductId:"zero-100-b",name:"Pizza Kebab"},
 {lidlProductId:"zero-100-c",name:"Salamipizza"}
];
assert.ok(searchResearch("pizza",v100Rows).length>0);
assert.deepEqual(searchResearch("pizza",v100Rows,0),[]);
assert.deepEqual(searchResearch("pizza",v100Rows,-0),[]);
assert.deepEqual(searchResearch("pizza",corpus,0),[]);


/* v100: duplicate product identity wins once even across differing variants. */
const v100VariantRows=[
 {lidlProductId:"same-100",name:"MILBONA Proteiinivanukas",variant:"kahvi"},
 {lidlProductId:" same-100 ",name:"MILBONA Proteiinivanukas",variant:"kookos"},
 {lidlProductId:"other-100",name:"MILBONA Proteiinivanukas",variant:"vanilja"}
];
const v100Snapshot=JSON.stringify(v100VariantRows);
const v100Hits=searchResearch("milbona proteiinivanukas",v100VariantRows,3);
assert.deepEqual(v100Hits.map(r=>r.lidlProductId),["same-100","other-100"]);
assert.equal(JSON.stringify(v100VariantRows),v100Snapshot,"Duplicate resolution must not mutate source rows");
assert.equal(v100Hits.filter(r=>r.lidlProductId==="same-100").length,1);

/* v101: duplicate input ordering preserves unique product identities and source rows. */
const v101Rows=[
 {lidlProductId:" same-101 ",name:"MILBONA Proteiinivanukas",variant:"kahvi"},
 {lidlProductId:"other-101",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"same-101",name:"MILBONA Proteiinivanukas",variant:"kookos"}
];
const v101Snapshot=JSON.stringify(v101Rows);
const v101Forward=searchResearch("milbona proteiinivanukas",v101Rows,3);
const v101Reverse=searchResearch("milbona proteiinivanukas",[...v101Rows].reverse(),3);
assert.deepEqual(new Set(v101Forward.map(r=>r.lidlProductId)),new Set(["same-101","other-101"]));
assert.deepEqual(new Set(v101Reverse.map(r=>r.lidlProductId)),new Set(["same-101","other-101"]));
assert.equal(v101Forward.length,2);
assert.equal(v101Reverse.length,2);
assert.equal(JSON.stringify(v101Rows),v101Snapshot,"Input rows must remain unchanged");

/* v102: variant duplicates cannot consume result slots at tight limits. */
const v102Rows=[
 {lidlProductId:"dup-102",name:"MILBONA Proteiinivanukas",variant:"kahvi"},
 {lidlProductId:" dup-102 ",name:"MILBONA Proteiinivanukas",variant:"kookos"},
 {lidlProductId:"next-102",name:"MILBONA Proteiinivanukas",variant:"vanilja"}
];
const v102Snapshot=JSON.stringify(v102Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v102Rows,1).map(r=>r.lidlProductId),["dup-102"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v102Rows,2).map(r=>r.lidlProductId),["dup-102","next-102"]);
assert.equal(JSON.stringify(v102Rows),v102Snapshot,"Tight-limit search must not mutate input");

/* v103: blank identities must not collapse unrelated product rows. */
const v103Rows=[
 {lidlProductId:"",name:"MILBONA Proteiinivanukas kahvi"},
 {lidlProductId:"   ",name:"MILBONA Proteiinivanukas kookos"},
 {lidlProductId:"valid-103",name:"MILBONA Proteiinivanukas vanilja"}
];
const v103Snapshot=JSON.stringify(v103Rows);
const v103Hits=searchResearch("milbona proteiinivanukas",v103Rows,3);
assert.deepEqual(v103Hits.map(r=>r.lidlProductId),["valid-103"],"Blank identities must be excluded by the existing safety gate");
assert.ok(!v103Hits.some(r=>!r.lidlProductId.trim()),"No blank product identity may escape the safety gate");
assert.equal(JSON.stringify(v103Rows),v103Snapshot,"Blank-ID search must not mutate input");

/* v104: whitespace cannot bypass the quarantined product ID gate. */
const v104Rows=[
 {lidlProductId:" 10038275 ",name:"Olut"},
 {lidlProductId:"10038275",name:"Olut"},
 {lidlProductId:"safe-104",name:"Olutniminen testituote"}
];
const v104Snapshot=JSON.stringify(v104Rows);
assert.deepEqual(searchResearch("olut",v104Rows).map(r=>r.lidlProductId),["safe-104"]);
assert.equal(JSON.stringify(v104Rows),v104Snapshot,"Quarantine filtering must not mutate input");

/* v105: quarantined matches never consume a limited result slot. */
const v105Rows=[
 {lidlProductId:"10038275",name:"Olut"},
 {lidlProductId:" 10038275 ",name:"Olut"},
 {lidlProductId:"safe-105-a",name:"Olutniminen testituote A"},
 {lidlProductId:"safe-105-b",name:"Olutniminen testituote B"}
];
const v105Snapshot=JSON.stringify(v105Rows);
assert.deepEqual(searchResearch("olut",v105Rows,1).map(r=>r.lidlProductId),["safe-105-a"]);
assert.deepEqual(searchResearch("olut",v105Rows,2).map(r=>r.lidlProductId),["safe-105-a","safe-105-b"]);
assert.equal(JSON.stringify(v105Rows),v105Snapshot,"Limit and quarantine checks must not mutate input");

/* v106: quarantine filtering and valid-ID deduplication stay independent. */
const v106Rows=[
 {lidlProductId:" 10038275 ",name:"Olut"},
 {lidlProductId:"safe-106",name:"Olutniminen testituote",variant:"A"},
 {lidlProductId:" safe-106 ",name:"Olutniminen testituote",variant:"B"},
 {lidlProductId:"other-106",name:"Olutniminen testituote",variant:"C"}
];
const v106Snapshot=JSON.stringify(v106Rows);
const v106Hits=searchResearch("olut",v106Rows,3);
assert.deepEqual(v106Hits.map(r=>r.lidlProductId),["safe-106","other-106"]);
assert.equal(JSON.stringify(v106Rows),v106Snapshot,"Mixed quarantine and deduplication must not mutate input");

/* v107: ranking must not expose a repeated valid product identity. */
const v107Rows=[
 {lidlProductId:"dup-107",name:"MILBONA Proteiinivanukas vanilja"},
 {lidlProductId:" dup-107 ",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"other-107",name:"MILBONA Proteiinivanukas suklaa"}
];
const v107Snapshot=JSON.stringify(v107Rows);
const v107Hits=searchResearch("milbona proteiinivanukas",v107Rows,3);
assert.equal(v107Hits.length,2,"A ranked duplicate must occupy only one result slot");
assert.deepEqual(new Set(v107Hits.map(r=>r.lidlProductId)),new Set(["dup-107","other-107"]));
assert.equal(v107Hits.filter(r=>r.lidlProductId==="dup-107").length,1);
assert.equal(JSON.stringify(v107Rows),v107Snapshot,"Ranked deduplication must not mutate input");

/* v108: quarantine and duplicate rows cannot starve limited valid results. */
const v108Rows=[
 {lidlProductId:"10038275",name:"Olut"},
 {lidlProductId:" safe-108-a ",name:"Olutniminen testituote A"},
 {lidlProductId:"safe-108-a",name:"Olutniminen testituote A"},
 {lidlProductId:"10038275 ",name:"Olut"},
 {lidlProductId:"safe-108-b",name:"Olutniminen testituote B"}
];
const v108Snapshot=JSON.stringify(v108Rows);
assert.deepEqual(searchResearch("olut",v108Rows,1).map(r=>r.lidlProductId),["safe-108-a"]);
assert.deepEqual(searchResearch("olut",v108Rows,2).map(r=>r.lidlProductId),["safe-108-a","safe-108-b"]);
assert.equal(JSON.stringify(v108Rows),v108Snapshot,"Combined safety filtering must not mutate input");

/* v109: deduplication state must be fresh for each independent search. */
const v109Rows=[
 {lidlProductId:"same-109",name:"MILBONA Proteiinivanukas vanilja"},
 {lidlProductId:" same-109 ",name:"MILBONA Proteiinivanukas kookos"},
 {lidlProductId:"next-109",name:"MILBONA Proteiinivanukas suklaa"}
];
const v109Snapshot=JSON.stringify(v109Rows);
const v109Expected=["same-109","next-109"];
assert.deepEqual(searchResearch("milbona proteiinivanukas",v109Rows,1).map(r=>r.lidlProductId),["same-109"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v109Rows,2).map(r=>r.lidlProductId),v109Expected);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v109Rows,1).map(r=>r.lidlProductId),["same-109"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v109Rows,2).map(r=>r.lidlProductId),v109Expected);
assert.equal(JSON.stringify(v109Rows),v109Snapshot,"Repeated searches must not mutate input");

/* v110: returned rows must not alias or mutate source candidate records. */
const v110Rows=[
 {lidlProductId:" safe-110 ",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"other-110",name:"MILBONA Proteiinivanukas",variant:"suklaa"}
];
const v110Snapshot=JSON.stringify(v110Rows);
const v110Hits=searchResearch("milbona proteiinivanukas",v110Rows,2);
assert.equal(v110Hits.length,2);
assert.notStrictEqual(v110Hits[0],v110Rows[0],"Result objects must be separate from source records");
v110Hits[0].name="Modified result only";
v110Hits[0].lidlProductId="modified-110";
assert.equal(JSON.stringify(v110Rows),v110Snapshot,"Editing a result must not change source records");
assert.deepEqual(searchResearch("milbona proteiinivanukas",v110Rows,2).map(r=>r.lidlProductId),["safe-110","other-110"]);

/* v111: result object mutation must not leak into subsequent searches. */
const v111Rows=[
 {lidlProductId:"safe-111",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"next-111",name:"MILBONA Proteiinivanukas",variant:"suklaa"}
];
const v111Snapshot=JSON.stringify(v111Rows);
const v111First=searchResearch("milbona proteiinivanukas",v111Rows,2);
assert.equal(v111First.length,2);
v111First[0].name="Unrelated edited display";
v111First[0].variant="edited";
v111First[0].checkoutPriceVerified=true;
const v111Again=searchResearch("milbona proteiinivanukas",v111Rows,2);
assert.deepEqual(v111Again.map(r=>r.lidlProductId),["safe-111","next-111"]);
assert.equal(v111Again[0].name,"MILBONA Proteiinivanukas");
assert.equal(v111Again[0].variant,"vanilja");
assert.equal(v111Again[0].checkoutPriceVerified,false);
assert.equal(JSON.stringify(v111Rows),v111Snapshot,"A modified result must not contaminate later searches");

/* v112: changing returned fields cannot contaminate later limits or source rows. */
const v112Rows=[
 {lidlProductId:"first-112",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"second-112",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:"third-112",name:"MILBONA Proteiinivanukas",variant:"kookos"}
];
const v112Snapshot=JSON.stringify(v112Rows);
const v112Short=searchResearch("milbona proteiinivanukas",v112Rows,1);
assert.equal(v112Short.length,1);
v112Short[0].name="Edited only in returned row";
v112Short[0].lidlProductId="edited-112";
const v112Full=searchResearch("milbona proteiinivanukas",v112Rows,3);
assert.deepEqual(new Set(v112Full.map(r=>r.lidlProductId)),new Set(["first-112","second-112","third-112"]));
assert.ok(v112Full.every(r=>r.name==="MILBONA Proteiinivanukas"));
assert.equal(JSON.stringify(v112Rows),v112Snapshot,"Changing short results must not affect source rows");

/* v113: source price, EAN and stock fields never enter name-only research output. */
const v113Rows=[
 {lidlProductId:"safe-113",name:"MILBONA Proteiinivanukas",variant:"vanilja",ean:"1234567890123",regularPriceEur:0.02,displayedPriceEur:0.01,storeAvailability:"in_stock",checkoutPriceVerified:true}
];
const v113Snapshot=JSON.stringify(v113Rows);
const v113Hits=searchResearch("milbona proteiinivanukas",v113Rows,1);
assert.equal(v113Hits.length,1);
assert.equal(v113Hits[0].ean,null);
assert.equal(v113Hits[0].regularPriceEur,null);
assert.equal(v113Hits[0].displayedPriceEur,null);
assert.equal(v113Hits[0].storeAvailability,"unknown");
assert.equal(v113Hits[0].checkoutPriceVerified,false);
assert.equal(v113Hits[0].source,"lidl.fi-public-research");
assert.equal(JSON.stringify(v113Rows),v113Snapshot,"Research output filtering must not mutate source");

/* v114: variant-only name discovery must not leak source price or EAN fields. */
const v114Rows=[
 {lidlProductId:"10038275",name:"Testituote",variant:"Olut",ean:"1111111111111",displayedPriceEur:0.01},
 {lidlProductId:" safe-114 ",name:"Testituote",variant:"Olut",ean:"1234567890123",regularPriceEur:0.02,displayedPriceEur:0.01,storeAvailability:"in_stock",checkoutPriceVerified:true}
];
const v114Snapshot=JSON.stringify(v114Rows);
const v114Hits=searchResearch("olut",v114Rows,2);
assert.deepEqual(v114Hits.map(r=>r.lidlProductId),["safe-114"]);
assert.equal(v114Hits[0].ean,null);
assert.equal(v114Hits[0].regularPriceEur,null);
assert.equal(v114Hits[0].displayedPriceEur,null);
assert.equal(v114Hits[0].storeAvailability,"unknown");
assert.equal(v114Hits[0].checkoutPriceVerified,false);
assert.equal(JSON.stringify(v114Rows),v114Snapshot,"Variant-only matching must leave source intact");

/* v115: invalid product identifiers must not consume limited valid search slots. */
const v115Rows=[
 {lidlProductId:"",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"   ",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:null,name:"MILBONA Proteiinivanukas"},
 {lidlProductId:115,name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-115-a",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-115-b",name:"MILBONA Proteiinivanukas",variant:"suklaa"}
];
const v115Snapshot=JSON.stringify(v115Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v115Rows,1).map(r=>r.lidlProductId),["safe-115-a"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v115Rows,2).map(r=>r.lidlProductId),["safe-115-a","safe-115-b"]);
assert.equal(JSON.stringify(v115Rows),v115Snapshot,"Invalid ID filtering must not mutate input");

/* v116: fractional and negative limits must be normalized without changing input. */
const v116Rows=[
 {lidlProductId:"safe-116-a",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-116-b",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:"safe-116-c",name:"MILBONA Proteiinivanukas",variant:"kookos"}
];
const v116Snapshot=JSON.stringify(v116Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v116Rows,-2).map(r=>r.lidlProductId),[]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v116Rows,0.9).map(r=>r.lidlProductId),[]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v116Rows,1.9).map(r=>r.lidlProductId),["safe-116-a"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v116Rows,2.9).map(r=>r.lidlProductId),["safe-116-a","safe-116-b"]);
assert.equal(JSON.stringify(v116Rows),v116Snapshot,"Limit normalization must not mutate source");

/* v117: non-finite and non-number limits use the safe default. */
const v117Rows=Array.from({length:18},(_,i)=>({
 lidlProductId:`safe-117-${String(i+1).padStart(2,"0")}`,
 name:"MILBONA Proteiinivanukas",
 variant:"vanilja"
}));
const v117Snapshot=JSON.stringify(v117Rows);
for(const v117Limit of [NaN,Infinity,-Infinity,"2",null,undefined]){
 const v117Hits=searchResearch("milbona proteiinivanukas",v117Rows,v117Limit);
 assert.equal(v117Hits.length,15,`Unexpected default limit for ${String(v117Limit)}`);
 assert.equal(new Set(v117Hits.map(r=>r.lidlProductId)).size,15);
}
assert.equal(JSON.stringify(v117Rows),v117Snapshot,"Invalid limits must not mutate source");

/* v118: oversized limits must cap name-only research results at 50. */
const v118Rows=Array.from({length:55},(_,i)=>({
 lidlProductId:`safe-118-${String(i+1).padStart(2,"0")}`,
 name:"MILBONA Proteiinivanukas",
 variant:"vanilja"
}));
const v118Snapshot=JSON.stringify(v118Rows);
assert.equal(searchResearch("milbona proteiinivanukas",v118Rows,49).length,49);
const v118Capped=searchResearch("milbona proteiinivanukas",v118Rows,999);
assert.equal(v118Capped.length,50);
assert.equal(new Set(v118Capped.map(r=>r.lidlProductId)).size,50);
assert.deepEqual(v118Capped.map(r=>r.lidlProductId),searchResearch("milbona proteiinivanukas",v118Rows,50).map(r=>r.lidlProductId));
assert.equal(JSON.stringify(v118Rows),v118Snapshot,"Capping results must not mutate source");

/* v119: duplicate IDs must not consume the maximum 50 unique result slots. */
const v119Rows=Array.from({length:55},(_,i)=>({
 lidlProductId:`safe-119-${String(i+1).padStart(2,"0")}`,
 name:"MILBONA Proteiinivanukas",
 variant:"vanilja"
}));
v119Rows.unshift(
 {lidlProductId:"safe-119-01",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:" safe-119-01 ",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-119-02",name:"MILBONA Proteiinivanukas",variant:"vanilja"}
);
const v119Snapshot=JSON.stringify(v119Rows);
const v119Hits=searchResearch("milbona proteiinivanukas",v119Rows,999);
assert.equal(v119Hits.length,50);
assert.equal(new Set(v119Hits.map(r=>r.lidlProductId)).size,50);
assert.equal(v119Hits.filter(r=>r.lidlProductId==="safe-119-01").length,1);
assert.equal(v119Hits.filter(r=>r.lidlProductId==="safe-119-02").length,1);
assert.equal(JSON.stringify(v119Rows),v119Snapshot,"Deduplication at the cap must not mutate source");

/* v120: quarantined IDs cannot starve 50 valid unique result slots. */
const v120Rows=Array.from({length:55},(_,i)=>({
 lidlProductId:`safe-120-${String(i+1).padStart(2,"0")}`,
 name:"MILBONA Proteiinivanukas",
 variant:"vanilja"
}));
v120Rows.unshift(
 {lidlProductId:"10038275",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:" 10038275 ",name:"MILBONA Proteiinivanukas",variant:"vanilja"}
);
const v120Snapshot=JSON.stringify(v120Rows);
const v120Hits=searchResearch("milbona proteiinivanukas",v120Rows,999);
assert.equal(v120Hits.length,50);
assert.equal(new Set(v120Hits.map(r=>r.lidlProductId)).size,50);
assert.ok(v120Hits.every(r=>r.lidlProductId!=="10038275"));
assert.equal(JSON.stringify(v120Rows),v120Snapshot,"Quarantine filtering at cap must not mutate source");

/* v121: combined quarantine and duplicate rows must leave 50 valid unique slots. */
const v121Rows=Array.from({length:55},(_,i)=>({
 lidlProductId:`safe-121-${String(i+1).padStart(2,"0")}`,
 name:"MILBONA Proteiinivanukas",
 variant:"vanilja"
}));
v121Rows.unshift(
 {lidlProductId:"10038275",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:" 10038275 ",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-121-01",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:" safe-121-01 ",name:"MILBONA Proteiinivanukas",variant:"vanilja"}
);
const v121Snapshot=JSON.stringify(v121Rows);
const v121Hits=searchResearch("milbona proteiinivanukas",v121Rows,999);
assert.equal(v121Hits.length,50);
assert.equal(new Set(v121Hits.map(r=>r.lidlProductId)).size,50);
assert.ok(v121Hits.every(r=>r.lidlProductId!=="10038275"));
assert.equal(v121Hits.filter(r=>r.lidlProductId==="safe-121-01").length,1);
assert.equal(JSON.stringify(v121Rows),v121Snapshot,"Combined filtering must not mutate source");

/* v122: combined quarantine and duplicate filtering must respect small limits. */
const v122Rows=[
 {lidlProductId:"10038275",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:" safe-122-a ",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-122-a",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:" 10038275 ",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-122-b",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-122-c",name:"MILBONA Proteiinivanukas"}
];
const v122Snapshot=JSON.stringify(v122Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v122Rows,1).map(r=>r.lidlProductId),["safe-122-a"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v122Rows,2).map(r=>r.lidlProductId),["safe-122-a","safe-122-b"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v122Rows,3).map(r=>r.lidlProductId),["safe-122-a","safe-122-b","safe-122-c"]);
assert.equal(JSON.stringify(v122Rows),v122Snapshot,"Small-limit filtering must not mutate source");

/* v123: a zero-limit search must not contaminate later deduplication. */
const v123Rows=[
 {lidlProductId:" safe-123-a ",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-123-a",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-123-b",name:"MILBONA Proteiinivanukas"}
];
const v123Snapshot=JSON.stringify(v123Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v123Rows,0),[]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v123Rows,2).map(r=>r.lidlProductId),["safe-123-a","safe-123-b"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v123Rows,0),[]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v123Rows,1).map(r=>r.lidlProductId),["safe-123-a"]);
assert.equal(JSON.stringify(v123Rows),v123Snapshot,"Zero-limit searches must not mutate source");

/* v124: a no-match query cannot contaminate a later valid query. */
const v124Rows=[
 {lidlProductId:"safe-124-a",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-124-a",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:"safe-124-b",name:"MILBONA Proteiinivanukas",variant:"kookos"}
];
const v124Snapshot=JSON.stringify(v124Rows);
assert.deepEqual(searchResearch("täysinpuuttuvatuote",v124Rows,2),[]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v124Rows,2).map(r=>r.lidlProductId),["safe-124-a","safe-124-b"]);
assert.deepEqual(searchResearch("täysinpuuttuvatuote",v124Rows,1),[]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v124Rows,1).map(r=>r.lidlProductId),["safe-124-a"]);
assert.equal(JSON.stringify(v124Rows),v124Snapshot,"No-match searches must not mutate source");

/* v125: empty and whitespace-only queries must not contaminate later valid searches. */
const v125Rows=[
 {lidlProductId:"safe-125-a",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-125-a",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:"safe-125-b",name:"MILBONA Proteiinivanukas",variant:"kookos"}
];
const v125Snapshot=JSON.stringify(v125Rows);
for(const v125Query of ["","   ","\t\n"]){
 assert.deepEqual(searchResearch(v125Query,v125Rows,2),[]);
}
assert.deepEqual(searchResearch("milbona proteiinivanukas",v125Rows,2).map(r=>r.lidlProductId),["safe-125-a","safe-125-b"]);
assert.equal(JSON.stringify(v125Rows),v125Snapshot,"Blank queries must not mutate source");

/* v126: non-string queries must safely return no results without contaminating later searches. */
const v126Rows=[
 {lidlProductId:"safe-126-a",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-126-a",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:"safe-126-b",name:"MILBONA Proteiinivanukas",variant:"kookos"}
];
const v126Snapshot=JSON.stringify(v126Rows);
for(const v126Query of [null,undefined,126,true,["milbona"],{query:"milbona"}]){
 assert.deepEqual(searchResearch(v126Query,v126Rows,2),[]);
}
assert.deepEqual(searchResearch("milbona proteiinivanukas",v126Rows,2).map(r=>r.lidlProductId),["safe-126-a","safe-126-b"]);
assert.equal(JSON.stringify(v126Rows),v126Snapshot,"Invalid query types must not mutate source");

/* v127: non-array corpora must return no results and not affect later valid searches. */
const v127Rows=[
 {lidlProductId:"safe-127-a",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-127-b",name:"MILBONA Proteiinivanukas",variant:"suklaa"}
];
const v127Snapshot=JSON.stringify(v127Rows);
for(const v127Corpus of [null,127,true,"milbona",{records:v127Rows}]){
 assert.deepEqual(searchResearch("milbona proteiinivanukas",v127Corpus,2),[]);
}
assert.deepEqual(searchResearch("milbona proteiinivanukas",v127Rows,2).map(r=>r.lidlProductId),["safe-127-a","safe-127-b"]);
assert.equal(JSON.stringify(v127Rows),v127Snapshot,"Invalid corpus types must not mutate valid source");

/* v128: undefined corpus selects the default fixture; null explicitly disables results. */
const v128Default=searchResearch("milbona proteiinivanukas",undefined,2);
const v128Implicit=searchResearch("milbona proteiinivanukas");
assert.deepEqual(v128Default,searchResearch("milbona proteiinivanukas",undefined,2));
assert.deepEqual(v128Default,v128Implicit.slice(0,2));
assert.ok(v128Default.length>0,"Undefined corpus must use the default research fixture");
assert.deepEqual(searchResearch("milbona proteiinivanukas",null,2),[]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",undefined,2),v128Default,"Explicit null must not alter default fixture");

/* v129: malformed corpus rows must not consume the valid-result limit. */
const v129Rows=[
 null,undefined,129,true,"MILBONA Proteiinivanukas",["MILBONA Proteiinivanukas"],
 {lidlProductId:"",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"  ",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:129,name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-129-a",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-129-b",name:"MILBONA Proteiinivanukas",variant:"suklaa"}
];
const v129Snapshot=JSON.stringify(v129Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v129Rows,2).map(r=>r.lidlProductId),["safe-129-a","safe-129-b"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v129Rows,1).map(r=>r.lidlProductId),["safe-129-a"]);
assert.equal(JSON.stringify(v129Rows),v129Snapshot,"Malformed rows must not mutate the corpus");

/* v130: malformed name and variant fields cannot leak into name-only results. */
const v130Rows=[
 {lidlProductId:"bad-130",name:{text:"MILBONA Proteiinivanukas"},variant:130},
 {lidlProductId:"variant-130",name:{text:"Ignored"},variant:"MILBONA Proteiinivanukas"},
 {lidlProductId:"name-130",name:"MILBONA Proteiinivanukas",variant:{text:"Ignored"}}
];
const v130Snapshot=JSON.stringify(v130Rows);
const v130Hits=searchResearch("milbona proteiinivanukas",v130Rows,3);
assert.deepEqual(new Set(v130Hits.map(r=>r.lidlProductId)),new Set(["variant-130","name-130"]));
assert.equal(v130Hits.find(r=>r.lidlProductId==="variant-130").name,"");
assert.equal(v130Hits.find(r=>r.lidlProductId==="variant-130").variant,"MILBONA Proteiinivanukas");
assert.equal(v130Hits.find(r=>r.lidlProductId==="name-130").variant,null);
assert.equal(JSON.stringify(v130Rows),v130Snapshot,"Malformed fields must not mutate source");

/* v131: whitespace-normalized IDs must deduplicate without mutating source records. */
const v131Rows=[
 {lidlProductId:"  safe-131-a  ",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-131-a",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:"\tsafe-131-b\n",name:"MILBONA Proteiinivanukas",variant:"kookos"},
 {lidlProductId:"safe-131-b",name:"MILBONA Proteiinivanukas",variant:"kahvi"},
 {lidlProductId:" safe-131-c ",name:"MILBONA Proteiinivanukas",variant:"mansikka"}
];
const v131Snapshot=JSON.stringify(v131Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v131Rows,3).map(r=>r.lidlProductId),["safe-131-a","safe-131-b","safe-131-c"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v131Rows,2).map(r=>r.lidlProductId),["safe-131-a","safe-131-b"]);
assert.equal(JSON.stringify(v131Rows),v131Snapshot,"ID normalization must not mutate source");

/* v132: malformed rows and whitespace-ID duplicates must not consume the result limit. */
const v132Rows=[
 null,
 {lidlProductId:" ",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:" safe-132-a ",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-132-a",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:132,name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"\tsafe-132-b\n",name:"MILBONA Proteiinivanukas",variant:"kookos"},
 {lidlProductId:"safe-132-b",name:"MILBONA Proteiinivanukas",variant:"kahvi"},
 {lidlProductId:"safe-132-c",name:"MILBONA Proteiinivanukas",variant:"mansikka"}
];
const v132Snapshot=JSON.stringify(v132Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v132Rows,2).map(r=>r.lidlProductId),["safe-132-a","safe-132-b"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v132Rows,3).map(r=>r.lidlProductId),["safe-132-a","safe-132-b","safe-132-c"]);
assert.equal(JSON.stringify(v132Rows),v132Snapshot,"Malformed rows and duplicate IDs must not mutate source");

/* v133: mutating a returned item must not affect source records or subsequent results. */
const v133Rows=[
 {lidlProductId:" safe-133-a ",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-133-b",name:"MILBONA Proteiinivanukas",variant:"suklaa"}
];
const v133Snapshot=JSON.stringify(v133Rows);
const v133Before=searchResearch("milbona proteiinivanukas",v133Rows,2);
const v133Expected=JSON.parse(JSON.stringify(v133Before));
v133Before[0].name="changed";
v133Before[0].variant="changed";
v133Before[0].lidlProductId="changed";
v133Before[0].source="changed";
assert.deepEqual(searchResearch("milbona proteiinivanukas",v133Rows,2),v133Expected);
assert.equal(JSON.stringify(v133Rows),v133Snapshot,"Result mutation must not affect source");

/* v134: returned safety-field mutations cannot persist into a subsequent search. */
const v134Rows=[{lidlProductId:"safe-134",name:"MILBONA Proteiinivanukas",variant:"vanilja",ean:"1234567890123",regularPriceEur:9.99,storeAvailability:"in-stock",checkoutPriceVerified:true,displayedPriceEur:9.99}];
const v134Snapshot=JSON.stringify(v134Rows);
const v134First=searchResearch("milbona proteiinivanukas",v134Rows,1);
assert.equal(v134First.length,1);
v134First[0].ean="1234567890123";
v134First[0].regularPriceEur=9.99;
v134First[0].storeAvailability="in-stock";
v134First[0].checkoutPriceVerified=true;
v134First[0].displayedPriceEur=9.99;
const v134Again=searchResearch("milbona proteiinivanukas",v134Rows,1);
assert.equal(v134Again[0].ean,null);
assert.equal(v134Again[0].regularPriceEur,null);
assert.equal(v134Again[0].storeAvailability,"unknown");
assert.equal(v134Again[0].checkoutPriceVerified,false);
assert.equal(v134Again[0].displayedPriceEur,null);
assert.equal(JSON.stringify(v134Rows),v134Snapshot,"Result safety-field mutations must not affect source");

/* v135: deduplication state must be isolated across different corpora. */
const v135RowsA=[
 {lidlProductId:"shared-135",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"unique-135-a",name:"MILBONA Proteiinivanukas",variant:"suklaa"}
];
const v135RowsB=[
 {lidlProductId:"shared-135",name:"MILBONA Proteiinivanukas",variant:"kookos"},
 {lidlProductId:"unique-135-b",name:"MILBONA Proteiinivanukas",variant:"kahvi"}
];
const v135SnapshotA=JSON.stringify(v135RowsA);
const v135SnapshotB=JSON.stringify(v135RowsB);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v135RowsA,2).map(r=>r.lidlProductId),["shared-135","unique-135-a"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v135RowsB,2).map(r=>r.lidlProductId),["shared-135","unique-135-b"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v135RowsA,2).map(r=>r.lidlProductId),["shared-135","unique-135-a"]);
assert.equal(JSON.stringify(v135RowsA),v135SnapshotA);
assert.equal(JSON.stringify(v135RowsB),v135SnapshotB);

/* v136: equal-score results must remain deterministically ordered across repeated searches. */
const v136Rows=[
 {lidlProductId:"safe-136-z",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-136-a",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:"safe-136-m",name:"MILBONA Proteiinivanukas",variant:"kookos"}
];
const v136Snapshot=JSON.stringify(v136Rows);
const v136Expected=searchResearch("milbona proteiinivanukas",v136Rows,3).map(r=>r.lidlProductId);
assert.deepEqual(v136Expected,["safe-136-z","safe-136-a","safe-136-m"]);
for(let v136Attempt=0;v136Attempt<3;v136Attempt++){
 assert.deepEqual(searchResearch("milbona proteiinivanukas",v136Rows,3).map(r=>r.lidlProductId),v136Expected);
}
assert.equal(JSON.stringify(v136Rows),v136Snapshot,"Repeated sorting must not mutate source");

/* v137: changing the result limit must preserve a stable equal-score deduplicated prefix. */
const v137Rows=[
 {lidlProductId:"safe-137-a",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:" safe-137-a ",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:"safe-137-b",name:"MILBONA Proteiinivanukas",variant:"kookos"},
 {lidlProductId:"safe-137-c",name:"MILBONA Proteiinivanukas",variant:"kahvi"}
];
const v137Snapshot=JSON.stringify(v137Rows);
const v137Full=searchResearch("milbona proteiinivanukas",v137Rows,3).map(r=>r.lidlProductId);
assert.deepEqual(v137Full,["safe-137-a","safe-137-b","safe-137-c"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v137Rows,1).map(r=>r.lidlProductId),v137Full.slice(0,1));
assert.deepEqual(searchResearch("milbona proteiinivanukas",v137Rows,2).map(r=>r.lidlProductId),v137Full.slice(0,2));
assert.deepEqual(searchResearch("milbona proteiinivanukas",v137Rows,3).map(r=>r.lidlProductId),v137Full);
assert.equal(JSON.stringify(v137Rows),v137Snapshot,"Limit changes must not mutate source");

/* v138: the same normalized ID remains unique even when duplicate variants have different metadata. */
const v138Rows=[
 {lidlProductId:"safe-138-a",name:"MILBONA Proteiinivanukas",variant:"vanilja",source:"A"},
 {lidlProductId:" safe-138-a ",name:"MILBONA Proteiinivanukas",variant:"suklaa",source:"B",ean:"9999999999999"},
 {lidlProductId:"safe-138-b",name:"MILBONA Proteiinivanukas",variant:"kookos",source:"C"}
];
const v138Snapshot=JSON.stringify(v138Rows);
const v138Hits=searchResearch("milbona proteiinivanukas",v138Rows,3);
assert.deepEqual(v138Hits.map(r=>r.lidlProductId),["safe-138-a","safe-138-b"]);
assert.equal(v138Hits.filter(r=>r.lidlProductId==="safe-138-a").length,1);
assert.equal(JSON.stringify(v138Rows),v138Snapshot,"Duplicate metadata must not mutate source");

/* v139: duplicate selection remains deterministic when duplicate rows have different metadata. */
const v139Rows=[
 {lidlProductId:"safe-139-a",name:"MILBONA Proteiinivanukas",variant:"vanilja",source:"A"},
 {lidlProductId:"safe-139-a",name:"MILBONA Proteiinivanukas",variant:"suklaa",source:"B"},
 {lidlProductId:"safe-139-b",name:"MILBONA Proteiinivanukas",variant:"kookos",source:"C"}
];
const v139Snapshot=JSON.stringify(v139Rows);
const v139Expected=["safe-139-a","safe-139-b"];
for(let v139Attempt=0;v139Attempt<3;v139Attempt++){
 assert.deepEqual(searchResearch("milbona proteiinivanukas",v139Rows,2).map(r=>r.lidlProductId),v139Expected);
}
assert.equal(JSON.stringify(v139Rows),v139Snapshot,"Deterministic duplicate selection must not mutate source");

/* v140: duplicate IDs remain unique when the first occurrence has missing optional metadata. */
const v140Rows=[
 {lidlProductId:"safe-140-a",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-140-a",name:"MILBONA Proteiinivanukas",variant:"suklaa",ean:"6412345678901",source:"B"},
 {lidlProductId:"safe-140-b",name:"MILBONA Proteiinivanukas",variant:"kookos"}
];
const v140Snapshot=JSON.stringify(v140Rows);
const v140Hits=searchResearch("milbona proteiinivanukas",v140Rows,3);
assert.deepEqual(v140Hits.map(r=>r.lidlProductId),["safe-140-a","safe-140-b"]);
assert.equal(v140Hits.filter(r=>r.lidlProductId==="safe-140-a").length,1);
assert.equal(JSON.stringify(v140Rows),v140Snapshot,"Missing optional metadata must not break deduplication");

/* v141: optional metadata differences cannot affect which duplicate ID survives. */
const v141RowsA=[
 {lidlProductId:"safe-141-a",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-141-a",name:"MILBONA Proteiinivanukas",variant:"suklaa",ean:"6412345678901",source:"B"}
];
const v141RowsB=[...v141RowsA].reverse();
const v141SnapshotA=JSON.stringify(v141RowsA);
const v141SnapshotB=JSON.stringify(v141RowsB);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v141RowsA,2).map(r=>r.lidlProductId),["safe-141-a"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v141RowsB,2).map(r=>r.lidlProductId),["safe-141-a"]);
assert.equal(JSON.stringify(v141RowsA),v141SnapshotA);
assert.equal(JSON.stringify(v141RowsB),v141SnapshotB);

/* v142: duplicate IDs with missing/extra metadata remain a single result across repeated searches. */
const v142Rows=[
 {lidlProductId:" safe-142-a ",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-142-a",name:"MILBONA Proteiinivanukas",variant:"suklaa",ean:"6412345678901",source:"B",regularPriceEur:4.99},
 {lidlProductId:"safe-142-b",name:"MILBONA Proteiinivanukas",variant:"kookos"}
];
const v142Snapshot=JSON.stringify(v142Rows);
const v142Expected=["safe-142-a","safe-142-b"];
for(let v142Attempt=0;v142Attempt<3;v142Attempt++){
 assert.deepEqual(searchResearch("milbona proteiinivanukas",v142Rows,2).map(r=>r.lidlProductId),v142Expected);
}
assert.equal(JSON.stringify(v142Rows),v142Snapshot,"Repeated duplicate filtering must not mutate source");

/* v143: quarantined duplicate IDs with metadata variants remain excluded without mutating source. */
const v143Rows=[
 {lidlProductId:"10038275",name:"MILBONA Proteiinivanukas",variant:"vanilja",source:"A"},
 {lidlProductId:" 10038275 ",name:"MILBONA Proteiinivanukas",variant:"suklaa",source:"B",ean:"6412345678901"},
 {lidlProductId:"safe-143-a",name:"MILBONA Proteiinivanukas",variant:"kookos"},
 {lidlProductId:"safe-143-b",name:"MILBONA Proteiinivanukas",variant:"kahvi"}
];
const v143Snapshot=JSON.stringify(v143Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v143Rows,2).map(r=>r.lidlProductId),["safe-143-a","safe-143-b"]);
assert.equal(JSON.stringify(v143Rows),v143Snapshot,"Quarantined duplicate metadata must not mutate source");

/* v144: quarantined IDs cannot reappear after alternating searches and result limits. */
const v144Rows=[
 {lidlProductId:" 10038275 ",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-144-a",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:"10038275",name:"MILBONA Proteiinivanukas",variant:"kookos"},
 {lidlProductId:"safe-144-b",name:"MILBONA Proteiinivanukas",variant:"kahvi"}
];
const v144Snapshot=JSON.stringify(v144Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v144Rows,1).map(r=>r.lidlProductId),["safe-144-a"]);
assert.deepEqual(searchResearch("puuttuvatuote",v144Rows,2),[]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v144Rows,2).map(r=>r.lidlProductId),["safe-144-a","safe-144-b"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v144Rows,0),[]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v144Rows,2).map(r=>r.lidlProductId),["safe-144-a","safe-144-b"]);
assert.equal(JSON.stringify(v144Rows),v144Snapshot,"Alternating searches must not mutate source");

/* v145: a quarantined exact-name match cannot displace valid lower-scoring results. */
const v145Rows=[
 {lidlProductId:"10038275",name:"MILBONA Proteiinivanukas",variant:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-145-a",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-145-b",name:"MILBONA Proteiinivanukas",variant:"suklaa"}
];
const v145Snapshot=JSON.stringify(v145Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v145Rows,2).map(r=>r.lidlProductId),["safe-145-a","safe-145-b"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v145Rows,1).map(r=>r.lidlProductId),["safe-145-a"]);
assert.equal(JSON.stringify(v145Rows),v145Snapshot,"Quarantined exact matches must not mutate source");

/* v146: quarantined variant-only matches must not enter name-only discovery. */
const v146Rows=[
 {lidlProductId:"10038275",name:"Muu tuote",variant:"MILBONA Proteiinivanukas"},
 {lidlProductId:" 10038275 ",name:"Toinen tuote",variant:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-146-a",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-146-b",name:"Muu tuote",variant:"MILBONA Proteiinivanukas"}
];
const v146Snapshot=JSON.stringify(v146Rows);
const v146Hits=searchResearch("milbona proteiinivanukas",v146Rows,3);
assert.deepEqual(new Set(v146Hits.map(r=>r.lidlProductId)),new Set(["safe-146-a","safe-146-b"]));
assert.ok(v146Hits.every(r=>r.lidlProductId!=="10038275"));
assert.equal(JSON.stringify(v146Rows),v146Snapshot,"Variant quarantine filtering must not mutate source");

/* v147: whitespace-normalized quarantined IDs remain excluded across result limits. */
const v147Rows=[
 {lidlProductId:"\t10038275\n",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-147-a",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:" 10038275 ",name:"MILBONA Proteiinivanukas",variant:"kookos"},
 {lidlProductId:"safe-147-b",name:"MILBONA Proteiinivanukas",variant:"kahvi"}
];
const v147Snapshot=JSON.stringify(v147Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v147Rows,0),[]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v147Rows,1).map(r=>r.lidlProductId),["safe-147-a"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v147Rows,2).map(r=>r.lidlProductId),["safe-147-a","safe-147-b"]);
assert.equal(JSON.stringify(v147Rows),v147Snapshot,"Whitespace quarantine filtering must not mutate source");

/* v148: quarantined rows cannot consume the 50-result maximum. */
const v148Rows=[
 {lidlProductId:"10038275",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 ...Array.from({length:51},(_,i)=>({lidlProductId:`safe-148-${String(i).padStart(2,"0")}`,name:"MILBONA Proteiinivanukas",variant:"suklaa"}))
];
const v148Snapshot=JSON.stringify(v148Rows);
const v148Hits=searchResearch("milbona proteiinivanukas",v148Rows,100);
assert.equal(v148Hits.length,50);
assert.ok(v148Hits.every(r=>r.lidlProductId!=="10038275"));
assert.deepEqual(v148Hits.map(r=>r.lidlProductId),Array.from({length:50},(_,i)=>`safe-148-${String(i).padStart(2,"0")}`));
assert.equal(JSON.stringify(v148Rows),v148Snapshot,"Maximum-limit quarantine filtering must not mutate source");

/* v149: quarantined rows and normalized duplicate IDs cannot consume the 50-result cap. */
const v149Rows=[
 {lidlProductId:" 10038275 ",name:"MILBONA Proteiinivanukas"},
 ...Array.from({length:51},(_,i)=>[
  {lidlProductId:`safe-149-${String(i).padStart(2,"0")}`,name:"MILBONA Proteiinivanukas"},
  {lidlProductId:` safe-149-${String(i).padStart(2,"0")} `,name:"MILBONA Proteiinivanukas"}
 ]).flat()
];
const v149Snapshot=JSON.stringify(v149Rows);
const v149Hits=searchResearch("milbona proteiinivanukas",v149Rows,100);
assert.equal(v149Hits.length,50);
assert.deepEqual(v149Hits.map(r=>r.lidlProductId),Array.from({length:50},(_,i)=>`safe-149-${String(i).padStart(2,"0")}`));
assert.equal(new Set(v149Hits.map(r=>r.lidlProductId)).size,50);
assert.equal(JSON.stringify(v149Rows),v149Snapshot,"Quarantine and duplicate filtering must not mutate source");

/* v150: repeated capped searches preserve the same 50-item result without source mutation. */
const v150Rows=Array.from({length:55},(_,i)=>({
 lidlProductId:`safe-150-${String(i).padStart(2,"0")}`,
 name:"MILBONA Proteiinivanukas",
 variant:"vanilja"
}));
const v150Snapshot=JSON.stringify(v150Rows);
const v150Expected=Array.from({length:50},(_,i)=>`safe-150-${String(i).padStart(2,"0")}`);
for(let v150Attempt=0;v150Attempt<3;v150Attempt++){
 assert.deepEqual(searchResearch("milbona proteiinivanukas",v150Rows,100).map(r=>r.lidlProductId),v150Expected);
}
assert.equal(JSON.stringify(v150Rows),v150Snapshot,"Repeated capped searches must not mutate source");

/* v151: fractional limits are truncated before applying the 50-result cap. */
const v151Rows=Array.from({length:55},(_,i)=>({
 lidlProductId:`safe-151-${String(i).padStart(2,"0")}`,
 name:"MILBONA Proteiinivanukas",
 variant:"vanilja"
}));
const v151Snapshot=JSON.stringify(v151Rows);
assert.equal(searchResearch("milbona proteiinivanukas",v151Rows,49.9).length,49);
assert.equal(searchResearch("milbona proteiinivanukas",v151Rows,50.9).length,50);
assert.equal(searchResearch("milbona proteiinivanukas",v151Rows,100.9).length,50);
assert.equal(JSON.stringify(v151Rows),v151Snapshot,"Fractional cap checks must not mutate source");

/* v152: huge finite numeric limits are safely capped at 50. */
const v152Rows=Array.from({length:55},(_,i)=>({
 lidlProductId:`safe-152-${String(i).padStart(2,"0")}`,
 name:"MILBONA Proteiinivanukas",
 variant:"vanilja"
}));
const v152Snapshot=JSON.stringify(v152Rows);
for(const v152Limit of [Number.MAX_SAFE_INTEGER,Number.MAX_VALUE,1e100]){
 const v152Hits=searchResearch("milbona proteiinivanukas",v152Rows,v152Limit);
 assert.equal(v152Hits.length,50);
 assert.equal(new Set(v152Hits.map(r=>r.lidlProductId)).size,50);
}
assert.equal(JSON.stringify(v152Rows),v152Snapshot,"Huge finite limits must not mutate source");

/* v153: non-finite limits safely use the 15-result default. */
const v153Rows=Array.from({length:20},(_,i)=>({
 lidlProductId:`safe-153-${String(i).padStart(2,"0")}`,
 name:"MILBONA Proteiinivanukas",
 variant:"vanilja"
}));
const v153Snapshot=JSON.stringify(v153Rows);
const v153Default=searchResearch("milbona proteiinivanukas",v153Rows).map(r=>r.lidlProductId);
assert.equal(v153Default.length,15);
for(const v153Limit of [Infinity,-Infinity,NaN]){
 assert.deepEqual(searchResearch("milbona proteiinivanukas",v153Rows,v153Limit).map(r=>r.lidlProductId),v153Default);
}
assert.equal(JSON.stringify(v153Rows),v153Snapshot,"Non-finite limits must not mutate source");

/* v154: numeric-looking string limits cannot override the numeric default. */
const v154Rows=Array.from({length:20},(_,i)=>({
 lidlProductId:`safe-154-${String(i).padStart(2,"0")}`,
 name:"MILBONA Proteiinivanukas",
 variant:"vanilja"
}));
const v154Snapshot=JSON.stringify(v154Rows);
const v154Default=searchResearch("milbona proteiinivanukas",v154Rows).map(r=>r.lidlProductId);
assert.equal(v154Default.length,15);
for(const v154Limit of ["0","1","50","100","-1","15.9"]){
 assert.deepEqual(searchResearch("milbona proteiinivanukas",v154Rows,v154Limit).map(r=>r.lidlProductId),v154Default);
}
assert.equal(JSON.stringify(v154Rows),v154Snapshot,"String limits must not mutate source");

/* v155: boolean and null limits safely retain the numeric default. */
const v155Rows=Array.from({length:20},(_,i)=>({
 lidlProductId:`safe-155-${String(i).padStart(2,"0")}`,
 name:"MILBONA Proteiinivanukas",
 variant:"vanilja"
}));
const v155Snapshot=JSON.stringify(v155Rows);
const v155Default=searchResearch("milbona proteiinivanukas",v155Rows).map(r=>r.lidlProductId);
assert.equal(v155Default.length,15);
for(const v155Limit of [true,false,null]){
 assert.deepEqual(searchResearch("milbona proteiinivanukas",v155Rows,v155Limit).map(r=>r.lidlProductId),v155Default);
}
assert.equal(JSON.stringify(v155Rows),v155Snapshot,"Boolean and null limits must not mutate source");

/* v156: array and object limits cannot coerce into a numeric result limit. */
const v156Rows=Array.from({length:20},(_,i)=>({
 lidlProductId:`safe-156-${String(i).padStart(2,"0")}`,
 name:"MILBONA Proteiinivanukas",
 variant:"vanilja"
}));
const v156Snapshot=JSON.stringify(v156Rows);
const v156Default=searchResearch("milbona proteiinivanukas",v156Rows).map(r=>r.lidlProductId);
assert.equal(v156Default.length,15);
for(const v156Limit of [[],[0],[50],{}, {valueOf:()=>0}]){
 assert.deepEqual(searchResearch("milbona proteiinivanukas",v156Rows,v156Limit).map(r=>r.lidlProductId),v156Default);
}
assert.equal(JSON.stringify(v156Rows),v156Snapshot,"Array and object limits must not mutate source");

/* v157: negative and fractional limits clamp to zero or truncate deterministically. */
const v157Rows=Array.from({length:20},(_,i)=>({
 lidlProductId:`safe-157-${String(i).padStart(2,"0")}`,
 name:"MILBONA Proteiinivanukas",
 variant:"vanilja"
}));
const v157Snapshot=JSON.stringify(v157Rows);
for(const v157Limit of [-100,-1,-0.9,-0.1,0,0.9]){
 assert.deepEqual(searchResearch("milbona proteiinivanukas",v157Rows,v157Limit),[]);
}
assert.equal(searchResearch("milbona proteiinivanukas",v157Rows,1.9).length,1);
assert.equal(searchResearch("milbona proteiinivanukas",v157Rows,2.9).length,2);
assert.equal(JSON.stringify(v157Rows),v157Snapshot,"Negative and fractional limits must not mutate source");

/* v158: prototype-like IDs remain ordinary deduplicated strings. */
const v158Rows=[
 {lidlProductId:"__proto__",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"constructor",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:"toString",name:"MILBONA Proteiinivanukas",variant:"kookos"},
 {lidlProductId:" __proto__ ",name:"MILBONA Proteiinivanukas",variant:"kahvi"}
];
const v158Snapshot=JSON.stringify(v158Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v158Rows,4).map(r=>r.lidlProductId),["__proto__","constructor","toString"]);
assert.equal(JSON.stringify(v158Rows),v158Snapshot,"Prototype-like IDs must not mutate source");

/* v159: blank product IDs never consume the result limit. */
const v159Rows=[
 {lidlProductId:"",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"   ",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"\t\n",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-159-a",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-159-b",name:"MILBONA Proteiinivanukas"}
];
const v159Snapshot=JSON.stringify(v159Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v159Rows,2).map(r=>r.lidlProductId),["safe-159-a","safe-159-b"]);
assert.equal(JSON.stringify(v159Rows),v159Snapshot,"Blank IDs must not mutate source");

/* v160: non-string product IDs cannot consume result slots. */
const v160Rows=[
 {lidlProductId:12345,name:"MILBONA Proteiinivanukas"},
 {lidlProductId:0,name:"MILBONA Proteiinivanukas"},
 {lidlProductId:null,name:"MILBONA Proteiinivanukas"},
 {lidlProductId:["safe-160-array"],name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-160-a",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-160-b",name:"MILBONA Proteiinivanukas"}
];
const v160Snapshot=JSON.stringify(v160Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v160Rows,2).map(r=>r.lidlProductId),["safe-160-a","safe-160-b"]);
assert.equal(JSON.stringify(v160Rows),v160Snapshot,"Non-string IDs must not mutate source");

/* v161: Unicode edge whitespace around IDs is normalized before deduplication. */
const v161Rows=[
 {lidlProductId:"\u00a0safe-161-a\u00a0",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-161-a",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"\u2003safe-161-b\u2003",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-161-b",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-161-c",name:"MILBONA Proteiinivanukas"}
];
const v161Snapshot=JSON.stringify(v161Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v161Rows,3).map(r=>r.lidlProductId),["safe-161-a","safe-161-b","safe-161-c"]);
assert.equal(JSON.stringify(v161Rows),v161Snapshot,"Unicode whitespace deduplication must not mutate source");

/* v162: Unicode-only whitespace IDs are rejected before limiting. */
const v162Rows=[
 {lidlProductId:"\u00a0",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"\u2003\u2002",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"\ufeff",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-162-a",name:"MILBONA Proteiinivanukas"},
 {lidlProductId:"safe-162-b",name:"MILBONA Proteiinivanukas"}
];
const v162Snapshot=JSON.stringify(v162Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v162Rows,2).map(r=>r.lidlProductId),["safe-162-a","safe-162-b"]);
assert.equal(JSON.stringify(v162Rows),v162Snapshot,"Unicode blank IDs must not mutate source");

/* v163: repeated Unicode-normalized ID deduplication leaves source intact. */
const v163Rows=[
 {lidlProductId:"\u00a0safe-163-a\u00a0",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"\u2003safe-163-a\u2003",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:"safe-163-b",name:"MILBONA Proteiinivanukas",variant:"kookos"}
];
const v163Snapshot=JSON.stringify(v163Rows);
for(let v163Attempt=0;v163Attempt<3;v163Attempt++){
 assert.deepEqual(searchResearch("milbona proteiinivanukas",v163Rows,3).map(r=>r.lidlProductId),["safe-163-a","safe-163-b"]);
 assert.equal(JSON.stringify(v163Rows),v163Snapshot,"Unicode deduplication must not mutate source");
}

/* v164: mutating a normalized result ID cannot contaminate future searches. */
const v164Rows=[
 {lidlProductId:"\u00a0safe-164-a\u00a0",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-164-b",name:"MILBONA Proteiinivanukas",variant:"suklaa"}
];
const v164Snapshot=JSON.stringify(v164Rows);
const v164First=searchResearch("milbona proteiinivanukas",v164Rows,2);
assert.deepEqual(v164First.map(r=>r.lidlProductId),["safe-164-a","safe-164-b"]);
v164First[0].lidlProductId="changed-164";
assert.deepEqual(searchResearch("milbona proteiinivanukas",v164Rows,2).map(r=>r.lidlProductId),["safe-164-a","safe-164-b"]);
assert.equal(JSON.stringify(v164Rows),v164Snapshot,"Mutating returned IDs must not mutate source");

/* v165: result mutation cannot disturb normalized duplicate selection on repeat. */
const v165Rows=[
 {lidlProductId:" safe-165-a ",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-165-a",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:"safe-165-b",name:"MILBONA Proteiinivanukas",variant:"kookos"}
];
const v165Snapshot=JSON.stringify(v165Rows);
const v165First=searchResearch("milbona proteiinivanukas",v165Rows,3);
assert.deepEqual(v165First.map(r=>r.lidlProductId),["safe-165-a","safe-165-b"]);
v165First[0].lidlProductId="safe-165-b";
v165First[0].variant="modified";
assert.deepEqual(searchResearch("milbona proteiinivanukas",v165Rows,3).map(r=>r.lidlProductId),["safe-165-a","safe-165-b"]);
assert.equal(JSON.stringify(v165Rows),v165Snapshot,"Result mutation must not alter normalized deduplication");

/* v166: normalized deduplication yields a stable prefix across limits. */
const v166Rows=[
 {lidlProductId:" safe-166-a ",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-166-a",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:"safe-166-b",name:"MILBONA Proteiinivanukas",variant:"kookos"},
 {lidlProductId:" safe-166-b ",name:"MILBONA Proteiinivanukas",variant:"kahvi"},
 {lidlProductId:"safe-166-c",name:"MILBONA Proteiinivanukas",variant:"mansikka"}
];
const v166Snapshot=JSON.stringify(v166Rows);
const v166All=searchResearch("milbona proteiinivanukas",v166Rows,3).map(r=>r.lidlProductId);
assert.deepEqual(v166All,["safe-166-a","safe-166-b","safe-166-c"]);
for(const v166Limit of [0,1,2,3,50]){
 assert.deepEqual(searchResearch("milbona proteiinivanukas",v166Rows,v166Limit).map(r=>r.lidlProductId),v166All.slice(0,v166Limit));
}
assert.equal(JSON.stringify(v166Rows),v166Snapshot,"Cross-limit deduplication must not mutate source");

/* v167: duplicate IDs cannot displace a distinct match at a one-item limit. */
const v167Rows=[
 {lidlProductId:" safe-167-a ",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-167-a",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:"safe-167-b",name:"MILBONA Proteiinivanukas",variant:"kookos"}
];
const v167Snapshot=JSON.stringify(v167Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v167Rows,1).map(r=>r.lidlProductId),["safe-167-a"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v167Rows,2).map(r=>r.lidlProductId),["safe-167-a","safe-167-b"]);
assert.equal(JSON.stringify(v167Rows),v167Snapshot,"Duplicate filtering at small limits must not mutate source");

/* v168: a quarantined first row cannot consume a one-result limit. */
const v168Rows=[
 {lidlProductId:" 10038275 ",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:"safe-168-a",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:"safe-168-b",name:"MILBONA Proteiinivanukas",variant:"kookos"}
];
const v168Snapshot=JSON.stringify(v168Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v168Rows,1).map(r=>r.lidlProductId),["safe-168-a"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v168Rows,2).map(r=>r.lidlProductId),["safe-168-a","safe-168-b"]);
assert.equal(JSON.stringify(v168Rows),v168Snapshot,"Quarantine filtering at small limits must not mutate source");

/* v169: quarantine and duplicate rows cannot consume small result limits together. */
const v169Rows=[
 {lidlProductId:"10038275",name:"MILBONA Proteiinivanukas",variant:"vanilja"},
 {lidlProductId:" safe-169-a ",name:"MILBONA Proteiinivanukas",variant:"suklaa"},
 {lidlProductId:"safe-169-a",name:"MILBONA Proteiinivanukas",variant:"kookos"},
 {lidlProductId:"safe-169-b",name:"MILBONA Proteiinivanukas",variant:"kahvi"},
 {lidlProductId:"safe-169-c",name:"MILBONA Proteiinivanukas",variant:"mansikka"}
];
const v169Snapshot=JSON.stringify(v169Rows);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v169Rows,1).map(r=>r.lidlProductId),["safe-169-a"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v169Rows,2).map(r=>r.lidlProductId),["safe-169-a","safe-169-b"]);
assert.deepEqual(searchResearch("milbona proteiinivanukas",v169Rows,3).map(r=>r.lidlProductId),["safe-169-a","safe-169-b","safe-169-c"]);
assert.equal(JSON.stringify(v169Rows),v169Snapshot,"Combined quarantine and duplicate filtering must not mutate source");

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

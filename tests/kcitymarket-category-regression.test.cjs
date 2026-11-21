const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
// Execute the actual production category() function, not a copy of its rules.
const source = fs.readFileSync("src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts","utf8");
const match = source.match(/export function category\(t:string\)\{[\s\S]*?\n\}\nfunction isNoiseLine/);
assert.ok(match, "Production category function must be found");
const categorySource = match[0].replace("export function category(t:string)", "function category(t)").replace(/\nfunction isNoiseLine$/, "");
const context = {clean: (s) => String(s).trim()};
vm.runInNewContext(categorySource + "\nthis.classify=category;", context);
const cases = [
  ["AIRFRY KANA- ja POSSUTUOTTEET 300–350 g", "Liha & makkarat"],
  ["KANA- tai POSSUTUOTTEET 300 g", "Liha & makkarat"],
  ["Findus CHICKEN SHOP PANEROIDUT KANATUOTTEET 170–250 g", "Pakasteet"],
  ["FILEEKALAPUIKOT 896 g", "Pakasteet"],
  ["Tuore kirjolohifilee", "Kala"],
  ["AIRFRYERIN SUOJAPAPERIT 50 kpl", "Kodinhoito"],
  ["PENTIK LAUTASLIINAT 20 kpl 25 ja 33 cm", "Kodinhoito"],
  ["AIRFRYER 5 l", "Koti & vapaa-aika"],
  ["EYLURE ja ELEGANT TOUCH TUOTTEET", "Hygienia & kosmetiikka"],
  ["MOSSA TUOTTEET", "Hygienia & kosmetiikka"],
  ["SMUUTI SKIN ja COSRX -TUOTTEET", "Hygienia & kosmetiikka"],
  ["TENA PRO SKIN TUOTTEET", "Hygienia & kosmetiikka"],
  ["MUSTA TEE 100 g", "Kahvi & tee"],
  ["TUNTEMATON TUOTTEET", "Muut"],
  ["myhome Lumihiutale LED-lyhty", "Koti & vapaa-aika"],
  ["LUKU- ja KÄSITYÖVALO", "Koti & vapaa-aika"],
  ["MAX FACTOR MEIKIT", "Hygienia & kosmetiikka"],
  ["LUMENE IHONHOITO- ja PUHDISTUSTUOTTEET", "Hygienia & kosmetiikka"],
  ["BONDI SANDS ITSERUSKETTAVAT TUOTTEET", "Hygienia & kosmetiikka"],
  ["DEFINE HIUSTENHOITO- ja MUOTOILUTUOTTEET 100–750 ml", "Hygienia & kosmetiikka"],
  ["HIUSTENMUOTOILUTUOTTEET sekä HIUSVÄRIT", "Hygienia & kosmetiikka"],
  ["LUMENE PUUTERIT", "Hygienia & kosmetiikka"],
  ["LUMENE KULMATUOTTEET", "Hygienia & kosmetiikka"],
  ["RUUKUT ja KULHOT 300 g", "Valmisruoka"],
  ["KULHOT 3 l", "Koti & vapaa-aika"],
  ["PAKASTEATERIAT ja -KEITOT 200–350 g", "Pakasteet"],
  ["Valmisateria 300 g", "Valmisruoka"],
  ["Friggs maissikakut", "Kuivatuotteet"],
  ["Riisikakut 100 g", "Kuivatuotteet"],
  ["Pakastemuusiperuna 500 g", "Pakasteet"],
  ["Oolannin MUUSIPERUNA", "Pakasteet"],
  ["Pakasteperunat 1 kg", "Pakasteet"],
  ["Ingman Creamy jäätelö 850 ml", "Pakasteet"],
  ["Jäätelötuutit 6 kpl", "Pakasteet"],
  ["Tuore peruna 5 kg", "Hevi"],
  ["Kananpojan fileepalat", "Liha & makkarat"],
  ["Pinaattikeitto pakaste", "Pakasteet"],
  ["Kahvi 500 g", "Kahvi & tee"],
];
for(const [name, expected] of cases){
  test("Citymarket category: "+name, () => assert.equal(context.classify(name),expected));
}

test("Soft supplement name does not imply a plush toy",()=>{assert.equal(context.classify("PEHMOVITA MONIVITAMIINIT 75 kpl"),"Vitamiinit & ravinteet");assert.equal(context.classify("PEHMOLELU"),"Koti & vapaa-aika");});


test("Vitamin drinks remain beverages",()=>{assert.equal(context.classify("VITAMIINIJUOMA 0,5 l"),"Juomat");});

// 47AV: keep the source's ambiguous LASTU 220 g unclassified until verified.
for(const [title,wanted] of [
  ["KANAN PIKKUFILEET 340 g","Liha & makkarat"],
  ["KANASUIKALEET 200 g","Liha & makkarat"],
  ["KAURAFRAICHE 150 g","Maitotuotteet"],
  ["KAURANAKSUT 6–12 kk 25–35 g","Lastenruoat"],
  ["NAVELINAS APPELSIINI 1,5 kg","Hevi"],
  ["VITAMIINIVEDET 1,5 l/pl","Juomat"],
  ["LASTU 220 g","Muut"],
  ["Kanan pikkufilee 400 g","Liha & makkarat"],
  ["Appelsiinit 2 kg","Hevi"],
]) test("47AV reusable category: "+title,()=>assert.equal(context.classify(title),wanted));

for(const [title,wanted] of [
 ["MUU Kanaton Lastu 220 g","Valmisruoka"],
 ["MUU Lihaton Lastu 220 g","Valmisruoka"],
 ["MUU Vebablastu 200 g","Valmisruoka"],
 ["PERUNALASTUT 220 g","Makeiset & keksit"],
 ["LASTU 220 g","Muut"],
]) test("Plant protein and ambiguous lastu taxonomy: "+title,()=>assert.equal(context.classify(title),wanted));

// 47AV printed page 17: the publisher's two MUU plant-protein variants share one offer.
test("47AV page 17 full reviewed MUU title has correct category",()=>{
 assert.equal(context.classify("MUU LIHATON- tai KANATON LASTU 220 g"),"Valmisruoka");
});

test("Citymarket supplemental feed retains groceries and excludes durable goods before display", async () => {
  const {filterCitymarketAdditionalGroceryOffers} = await import(
    "../src/app/components/ziiply/offerSearch/providers/kCitymarketDailyGroceryGate.js"
  );
  const accepted = [
    ["L’ORÉAL PARIS MEIKKIVOITEET", "Hygienia & kosmetiikka"],
    ["LUMENE KLASSIKKO KASVOJEN-HOITO- ja PUHDISTUSTUOTTEET", "Hygienia & kosmetiikka"],
    ["SMUUTI SKIN -IHONHOITOTUOTTEET ja COSRX-TUOTTEET", "Hygienia & kosmetiikka"],
    ["SAGA FOLIO 30 cm x 20 m, TUOREKELMU ja EVÄSPUSSI", "Kodinhoito"],
    ["SINI SIIVOUSSOODA ja PUHDISTUSKIVI", "Kodinhoito"],
    ["Kinder MAXI MIX JOULUKALENTERI 351 g", "Makeiset & keksit"],
  ];
  const rejected = [
    "FISKARS AINA KEITTO- ja PAISTOASTIAT", "TEFAL ROBUSTO PAISTOASTIAT",
    "KAIKKI LEGO CITY -PALIKKARASIAT", "KAIKKI LAUTA-, PALA,- ja KORTTIPELIT",
    "PENTIK SATUPORO KODINTEKSTIILIT", "PALJON SPORTTIBRÄNDIEN KENKIÄ",
    "KAIKKI A.ERIKSSON ja ULRIKA LAUKUT ja A.ERIKSSON LOMPAKOT",
    "MYHOME SESONKIVALOT ja LYHDYT", "KAIKKI PYYKINKUIVAUSTELINEET",
    "IITTALA TAIKA ja TEEMA ASTIOITA", "KAMPANJAPOKKAREITA", "TUOTTEET",
  ];
  const rows = [
    ...accepted.map(([title]) => ({title, category:"Koti & vapaa-aika"})),
    ...rejected.map(title => ({title})),
    {title:"FISKARS PAISTINPANNU",category:"Kodinhoito"},
  ];
  const result = filterCitymarketAdditionalGroceryOffers(rows, context.classify);
  assert.deepEqual(result.map(row => [row.title,row.category]), accepted);
});

test("Citymarket grocery gate excludes durable hygiene appliances but keeps consumables", async () => {
 const {filterCitymarketAdditionalGroceryOffers}=await import("../src/app/components/ziiply/offerSearch/providers/kCitymarketDailyGroceryGate.js");
 const durable=[
  "Oral-B iO9S Black Onyx SÄHKÖHAMMASHARJA",
  "PHILIPS 5000 Series PARRANAJOKONE",
  "PHILIPS OneBlade TRIMMERI",
  "REMINGTON PROluxe HIUSTENMUOTOILULAITTEET",
  "LIVIA Aurora LED-VALOMASKI",
  "GESKE Sonic Facial Brush KASVOHARJA"
 ];
 const consumables=[
  "Oral-B VAIHTOHARJAT",
  "PHILIPS OneBlade VAIHTOTERÄ 3 kpl",
  "LUMENE Klassikko VARTALONHOITOTUOTTEET",
  "Libero BIG PACK TEIPPIVAIPAT",
  "OMO Wonder Wash PYYKINPESUNESTEET",
  "Bref WC-RAIKASTIMET"
 ];
 const rows=[...durable,...consumables].map(title=>({title,category:/OMO|Bref/.test(title)?"Kodinhoito":"Hygienia & kosmetiikka"}));
 const result=filterCitymarketAdditionalGroceryOffers(rows,context.classify);
 assert.deepEqual(result.map(x=>x.title),consumables);
});

for (const [title,wanted] of [
 ["Vaasan THE BRGR NAUGHTY BURGER 4 kpl/320 g","Leipomo"],
 ["HAMPURILAISSÄMPYLÄT 4 kpl","Leipomo"],
 ["Burger buns 4 kpl","Leipomo"],
 ["Naughty HOT DOG MAKKARAT","Liha & makkarat"],
 ["Kuusamon Juusto NAUGHTY BURGER JUUSTOVIIPALEET 120–200 g","Maitotuotteet"],
 ["Hampurilaisateria 300 g","Valmisruoka"],
]) test("Burger product-form precedence: "+title,()=>assert.equal(context.classify(title),wanted));

test("Local Tjek rows with stale allowed category use actual product form",async()=>{
 const {filterCitymarketAdditionalGroceryOffers}=await import("../src/app/components/ziiply/offerSearch/providers/kCitymarketDailyGroceryGate.js");
 const rows=[
  {title:"Vaasan THE BRGR NAUGHTY BURGER",category:"Valmisruoka",price:2.39},
  {title:"Kuusamon Juusto NAUGHTY BURGER JUUSTOVIIPALEET",category:"Valmisruoka",price:2.99},
  {title:"Hampurilaisateria 300 g",category:"Valmisruoka",price:3.99},
  {title:"Naughty HOT DOG MAKKARAT",category:"Liha & makkarat",price:2.49}
 ];
 const actual=filterCitymarketAdditionalGroceryOffers(rows,context.classify);
 assert.deepEqual(actual.map(x=>x.category),["Leipomo","Maitotuotteet","Valmisruoka","Liha & makkarat"]);
 assert.deepEqual(actual.map(x=>x.price),rows.map(x=>x.price));
});

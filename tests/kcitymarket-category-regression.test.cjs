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

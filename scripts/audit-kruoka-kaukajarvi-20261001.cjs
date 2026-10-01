// Snapshot: 2026-10-01 K-Supermarket Kaukajärvi, 41 active offers.
// This executes the REAL provider classifier, not a copied approximation.
const fs=require("node:fs"); const vm=require("node:vm"); const ts=require("typescript");
const source=fs.readFileSync("src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts","utf8");
const js=ts.transpileModule(source+"\nexports.__categoryAudit=mapTjekCategoryV54;\n",{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context={exports:{},require,Buffer,console,fetch:()=>{throw Error("Audit must not fetch live data")}};
vm.runInNewContext(js,context,{filename:"kruokaProvider.audit.js"});
const classify=context.exports.__categoryAudit;
const cases=[
  [
    "SADONKORJUU-ÄMPÄRI",
    "Hevi"
  ],
  [
    "Tamminen WANTED NAUDAN PICANHA",
    "Liha & makkarat"
  ],
  [
    "TUORE KOKONAINEN KIRJOLOHI",
    "Kala"
  ],
  [
    "VIRVOITUSJUOMAT",
    "Juomat"
  ],
  [
    "IRTOMAKEISET",
    "Makeiset & keksit"
  ],
  [
    "Tampereen Lihajaloste LENKKIMAKKARA",
    "Liha & makkarat"
  ],
  [
    "HK VILJAPORSAAN FILEEPIHVI",
    "Liha & makkarat"
  ],
  [
    "Naapurin Maalaiskana KANAN OHUET FILEEPIHVIT",
    "Liha & makkarat"
  ],
  [
    "HK NAUDAN TAKUUMUREA ULKOFILEEPALA",
    "Liha & makkarat"
  ],
  [
    "PÍRKKA REILUN KAUPAN ROOSA NAUHA TERTTUNEILIKKA",
    "Koti & vapaa-aika"
  ],
  [
    "PÍRKKA REILUN KAUPAN LUOMUBANAANI",
    "Hevi"
  ],
  [
    "PÍRKKA Parhaat CALLUNA",
    "Koti & vapaa-aika"
  ],
  [
    "MYSKIKURPITSA",
    "Hevi"
  ],
  [
    "PÍRKKA ROOSA NAUHA HERKKUSIENI",
    "Hevi"
  ],
  [
    "Tamminen PERINTEISET KOKOLIHALEIKKELEET",
    "Liha & makkarat"
  ],
  [
    "PÍRKKA LIHAPIIRAKKA",
    "Leipomo"
  ],
  [
    "PÍRKKA MOZZARELLA VEDESSÄ",
    "Maitotuotteet"
  ],
  [
    "PÍRKKA BALKAN-, KINKKUMAKKARA- JA JAHTILEIKE",
    "Liha & makkarat"
  ],
  [
    "PÍRKKA MINILEIPÄJUUSTO",
    "Maitotuotteet"
  ],
  [
    "PÍRKKA L.CASEI JOGURTTIJUOMAT",
    "Maitotuotteet"
  ],
  [
    "HÄRKIS HÄRKÄPAPUMURSKAT",
    "Valmisruoka"
  ],
  [
    "ISOT BURGERIT",
    "Valmisruoka"
  ],
  [
    "KANAN ISOT FILEESUIKALEET",
    "Liha & makkarat"
  ],
  [
    "SUODATIN- tai PAPUKAHVIT",
    "Kahvi & tee"
  ],
  [
    "GIFFLAR KORVAPUUSTIT",
    "Leipomo"
  ],
  [
    "SMOOTHIET",
    "Juomat"
  ],
  [
    "LAKTOOSITTOMAT MAUSTETUT RUOKAKERMAT",
    "Maitotuotteet"
  ],
  [
    "LAKTOOSITTOMAT KREIKKALAISET JOGURTIT",
    "Maitotuotteet"
  ],
  [
    "ORIGINAL HALLOUMI PDO tai HALLOUMI PDO LAKTOOSITON",
    "Maitotuotteet"
  ],
  [
    "ORIGINAL VIRVOITUSJUOMAT",
    "Juomat"
  ],
  [
    "JÄÄTELÖT",
    "Pakasteet"
  ],
  [
    "CRUNCHY SUKLAAPATUKAT",
    "Makeiset & keksit"
  ],
  [
    "Ruokamestarin VILJAPORSAAN ETUSELKÄ",
    "Liha & makkarat"
  ],
  [
    "Ruokamestarin PAREMPI NAUTA-SIKA JAUHELIHA",
    "Liha & makkarat"
  ],
  [
    "Ruokamestarin VILJAPORSAAN LAPA",
    "Liha & makkarat"
  ],
  [
    "Ruokamestarin VILJAPORSAAN LUUTON KYLKI",
    "Liha & makkarat"
  ],
  [
    "Ruokamestarin KUUMA VILJAPORSAAN GRILLISELÄKE",
    "Liha & makkarat"
  ],
  [
    "Kivikylän PORSAAN SISÄFILE",
    "Liha & makkarat"
  ],
  [
    "Salonen OMENAPOSSU MUNKKI",
    "Leipomo"
  ],
  [
    "Leivon KORVAPUUSTI",
    "Leipomo"
  ],
  [
    "Oreo TÄYTEKEKSIT",
    "Makeiset & keksit"
  ],
  // Munckinkatu 1 Oct 2026: source category Muut must not override product identity.
  ["Myhome neulelangat", "Koti & vapaa-aika"],
  ["Pirkka neulelangat", "Koti & vapaa-aika"]
];
let wrong=0;for(const [name,expected] of cases){const originalWrong={"HÄRKIS HÄRKÄPAPUMURSKAT":"Kala","ISOT BURGERIT":"Maitotuotteet","SUODATIN- tai PAPUKAHVIT":"Kuivatuotteet","Oreo TÄYTEKEKSIT":"Leipomo"}; const originalCategory=/neulelangat/i.test(name)?"Muut":(originalWrong[name]??expected); const actual=classify({name,department:originalCategory});if(actual!==expected){wrong++;console.error("CATEGORY_FAIL",JSON.stringify({name,expected,actual}));}}
console.log("KAUKAJARVI_CATEGORY_AUDIT",JSON.stringify({total:cases.length,wrong,passed:cases.length-wrong}));
if(wrong)process.exitCode=1;

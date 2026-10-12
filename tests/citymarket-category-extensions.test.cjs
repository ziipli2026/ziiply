const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
const Module = require('node:module');
const filename = require('node:path').resolve('src/app/components/ziiply/offerSearch/providers/kCitymarketCategoryExtensions.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const loaded = new Module(filename, module);
loaded._compile(compiled, filename);
const {extendedCitymarketCategory: category, categoryFromOwnedContext} = loaded.exports;
const cases = [
  ['KANAN RINTAFILEET 600 g','Liha & makkarat'],
  ['Tamminen MAALAISNAKIT tai SAVUSAUNAPALVIROUHE','Liha & makkarat'],
  ['Kotivara ARKIMEETVURSTI','Liha & makkarat'],
  ['Rönkä PORON PAISTIKÄRISTYS','Liha & makkarat'],
  ['Findus PANEROIDUT KANATUOTTEET 170–250 g','Liha & makkarat'],
  ['Görans KEBAB','Valmisruoka'],
  ['Hetki SUOSIKKISALAATIT','Valmisruoka'],
  ['Valio GOLD & GREEN ROUHE tai PALAT 180 g','Valmisruoka'],
  ['Mammutti KORVAPUUSTI','Leipomo'],
  ['Fazer KUORRUTEMUNKKILAATIKKO','Leipomo'],
  ['Arla PROTEIN PROTEIINIPIRTELÖT','Maitotuotteet'],
  ['PROTEIINIVAAHDOLLA 200 g','Maitotuotteet'],
  ['Leipäjuusto 200 g','Maitotuotteet'],
  ['Magnum BONBONS 168 g','Pakasteet'],
  ['BONBONS 10–12 kpl/pkt 150–168 g (19,84–22,22/kg, 7,58/l)','Pakasteet'],
  ['Malaco AAKKOSET','Makeiset & keksit'],
  ['FASUPALAT 175–199 g','Makeiset & keksit'],
  ['Twinings VIHREÄT TEET 20–25 ps','Kahvi & tee'],
  ['Blue Dragon WOK-KASTIKKEET 120 g','Kuivatuotteet'],
  ['Old El Paso THICK AND CHUNKY SALSAT 340 g','Kuivatuotteet'],
  ['CASHEWPÄHKINÄ 500 g','Kuivatuotteet'],
  ['Pirkka CHILI- ja CHILI-LIMEPÄHKINÄT 150–200 g','Kuivatuotteet'],
  ['Advanced ROLL-ON ja SPRAY','Hygienia & kosmetiikka'],
  ['LUMENE Nordic Berry MASCARAT','Hygienia & kosmetiikka'],
  ['CLASSIC 50 ml PÄIVÄVOITEET','Hygienia & kosmetiikka'],
  ['DUOPACK PUHDISTUSPYYHKEET 128 kpl/pkt','Hygienia & kosmetiikka'],
  ['Moomin Snap TEIPPI- ja HOUSUVAIPAT KOOT 3–7','Hygienia & kosmetiikka'],
  ['Topz VANULAPUT ja VANUPUIKOT','Hygienia & kosmetiikka'],
  ['WC-GEELIT 750 ml','Kodinhoito'],
  ['PYYKKIETIKAT 750 ml','Kodinhoito'],
  ['HUUHTELUAINEET 750–762 ml','Kodinhoito'],
  ['Gold TAHRANPOISTAJAT 940 g','Kodinhoito'],
  ['PENTUALUSTA 15 kpl','Lemmikit'],
  ['myhome ATERINSETTI 24-OSAA','Koti & vapaa-aika'],
  ['SPRAYMOPPI','Koti & vapaa-aika'],
  ['Lego Classic PALIKKARASIA','Koti & vapaa-aika'],
  ['Tom Tailor Miesten T-PAITA','Koti & vapaa-aika'],
  ['PHILIPS OneBlade 360 VAIHTOTERÄ','Koti & vapaa-aika'],
  ['Lasten MERINOVILLASUKAT 2 pr/pkt','Koti & vapaa-aika'],
  ['SÄILYTYSLAATIKKO 31 l 3 kpl/setti','Koti & vapaa-aika'],
];
for (const [title,wanted] of cases) test(title,()=>assert.equal(category(title),wanted));
test('Incomplete names do not receive guessed groups',()=>{
  assert.equal(category('ROUHE tai PALAT 180 g'),undefined);
  assert.equal(category('2 PS ja VEDESSÄ 145/95–102 g'),undefined);
  assert.equal(category('Suklaa Bonbons 150 g'),undefined);
});
test('Only exclusively owned, unambiguous card context supplies a missing category',()=>{
  const classify=t=>category(t)||'Muut';
  const context=['Valio GOLD & GREEN','ROUHE tai PALAT 180 g','2,99'];
  assert.equal(categoryFromOwnedContext('ROUHE tai PALAT 180 g',context,true,classify),'Valmisruoka');
  assert.equal(categoryFromOwnedContext('ROUHE tai PALAT 180 g',context,false,classify),'Muut');
  assert.equal(categoryFromOwnedContext('ROUHE tai PALAT 180 g',[...context,'CLASSIC PÄIVÄVOITEET'],true,classify),'Muut');
  assert.equal(categoryFromOwnedContext('PYYKKIETIKAT 750 ml',['KORVAPUUSTI'],true,classify),'Kodinhoito');
});
test('Page 17 tuna context excludes the adjacent Fasupalat column',()=>{
  const title='2 PS ja VEDESSÄ 145/95–102 g';
  const context=['John West','Fazer','FASUPALAT 175–199 g','TONNIKALAPALOJA','AURINGONKUKKAÖLJYSSÄ',title];
  const classify=text=>/tonnikala/i.test(text)?'Kala':category(text)||'Muut';
  const geometry={anchor:{left:0.685826,top:0.863859,width:0.142183},boxes:[
    {text:'FASUPALAT',left:0.434695,top:0.873524,width:0.08},
    {text:'TONNIKALAPALOJA',left:0.685826,top:0.840662,width:0.110539},
    {text:'AURINGONKUKKAÖLJYSSÄ',left:0.685826,top:0.852261,width:0.151682},
  ]};
  assert.equal(categoryFromOwnedContext(title,context,true,classify),'Muut');
  assert.equal(categoryFromOwnedContext(title,context,true,classify,geometry),'Kala');
  assert.equal(categoryFromOwnedContext(title,context,false,classify,geometry),'Muut');
  assert.equal(categoryFromOwnedContext(title,context,true,classify,{...geometry,anchor:{...geometry.anchor,left:NaN}}),'Muut');
  const conflicting={...geometry,boxes:[...geometry.boxes,{text:'FASUPALAT',left:0.685826,top:0.875,width:0.08}]};
  assert.equal(categoryFromOwnedContext(title,context,true,classify,conflicting),'Muut');
});

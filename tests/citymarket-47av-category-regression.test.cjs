const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const source=fs.readFileSync('src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts','utf8');
const start=source.indexOf('export function category(t:string)');
const end=source.indexOf('\n}\n',start);
assert.ok(start>=0 && end>start,'Citymarket production classifier found');
const js=ts.transpileModule(source.slice(start,end+2).replace(/^export\s+/,'') ,{compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.CommonJS}}).outputText;
const category=new Function('clean',js+'; return category;')((s)=>String(s??'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim());
const cases=[
 ['KANAN PIKKUFILEET 340 g','Liha & makkarat'],
 ['KANASUIKALEET 200 g','Liha & makkarat'],
 ['KAURAFRAICHE 150 g','Maitotuotteet'],
 ['KAURANAKSUT 6–12 kk 25–35 g','Lastenruoat'],
 ['NAVELINAS APPELSIINI 1,5 kg','Hevi'],
 ['VITAMIINIVEDET 1,5 l/pl','Juomat'],
 ['RIISIPUURO 300 g','Valmisruoka'],
 ['UUNIRAPEAT RANSKALAISET 500 g Pakaste','Pakasteet'],
 ['SUIHKUMOUSSET 200 ml','Hygienia & kosmetiikka'],
 ['YLEISJAUHOISET PERUNAT 1 kg','Hevi']
];
for(const [title,expected] of cases)test('Citymarket product form: '+title,()=>assert.equal(category(title),expected));

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts','utf8');
const start=source.indexOf('export function category(t:string){');
const end=source.indexOf('\nfunction isNoiseLine(',start);
assert.ok(start>=0&&end>start,'category function not found');
const fn=source.slice(start,end).replace('export function category(t:string){','function category(t){').replace(/const s=clean\(t\)/,'const s=clean(t)');
const category=new Function('clean',fn+';return category;')(s=>String(s??'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim());
const checks=[
 ['MUSTIKKAGRANOLA 200 g','Kuivatuotteet'],
 ['WC-RAIKASTINTIKUT 5 x 9,5 g','Kodinhoito'],
 ['KAHVINKEITTIMEN PUHDISTUSAINE 250 ml','Kodinhoito'],
 ['WC-PAPERI 24 rl','Kodinhoito'],
 ['JÄÄTELÖT 427–465 ml','Pakasteet'],
 ['RUCOLA 65 g','Hevi'],
 ['KREIKKALAISET JOGURTIT 150 g','Maitotuotteet'],
 ['VIRVOITUSJUOMAT 0,33 l/tlk 6-pack','Juomat']
];
for(const [name,want] of checks)test('category: '+name,()=>assert.equal(category(name),want));

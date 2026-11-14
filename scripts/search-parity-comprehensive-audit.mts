import assert from 'node:assert/strict';
import { desktopSearchDecision } from '../src/app/components/ziiply/search/desktopNormalRelevance';
import { finalizeNormalSearchResults, rankProductResultsByRelevanceAndPrice } from '../src/app/components/ziiply/ziiplyCore';
import { normalizeEan } from '../src/app/components/ziiply/search/searchNormalizer';

type Sample = {id:number; name:string; ean:string; price:number; category?:string; brandName?:string; quantity?:string};
const cases: Array<{q:string; good:string[]; bad:string[]}> = [
{q:'maito',good:['Valio kevytmaito 1 l','Pirkka rasvaton maito 1 l'],bad:['Maitokolmio Ranch-kastike 200 g','Fazer maitosuklaa 200 g']},
{q:'täysmaito',good:['Valio täysmaito 1 l','Pirkka täysmaito 1 l'],bad:['Valio kevytmaito 1 l','Pirkka rasvaton maito 1 l']},
{q:'rasvaton maito',good:['Valio rasvaton maito 1 l'],bad:['Valio täysmaito 1 l','Valio kevytmaito 1 l']},
{q:'kahvi',good:['Juhla Mokka kahvi 500 g','Kulta Katriina kahvi 500 g'],bad:['Kahvila suklaakeksi 150 g','Valio maitokahvijuoma 250 ml']},
{q:'jauheliha',good:['Naudan jauheliha 400 g','Sika-nauta jauheliha 400 g'],bad:['Jauhelihakastike valmisateria 300 g','Jauhelihamauste 50 g']},
{q:'voi',good:['Valio voi 200 g','Kotimaista voi 200 g'],bad:['Estrella voi ja chili sipsit 275 g','Flora & voi levite 500 g']},
{q:'cola',good:['Coca-Cola Zero 0,33 l','Pepsi Cola 1,5 l'],bad:['Cola-karkit 150 g','Cola energiajuoma 330 ml']},
{q:'kirjolohi',good:['Kirjolohifilee 700 g','Kokonainen kirjolohi 1 kg'],bad:['Kirjolohikeitto valmisateria 300 g','Kirjolohen makuinen kastike 200 g']},
{q:'kananmuna',good:['Kotimainen kananmuna 10 kpl'],bad:['Kananmunasalaatti 200 g','Kananmunan korvike 200 g']},
{q:'sitruuna',good:['Tuore sitruuna 1 kpl'],bad:['Sitruunalimonadi 1 l','Sitruunanmakuinen vitamiinitabletti']},
{q:'ketsuppi',good:['Heinz tomaattiketsuppi 500 g'],bad:['Ketsuppisipsit 200 g','Tomaattikastike 500 g']},
{q:'jogurtti',good:['Valio maustamaton jogurtti 1 kg'],bad:['Jogurttikastike 200 g','Jogurttipatukka 40 g']},
{q:'leipä',good:['Fazer ruisleipä 500 g'],bad:['Leipäjuusto 300 g','Leipämauste 100 g']},
{q:'peruna',good:['Kotimainen peruna 1 kg'],bad:['Perunalastut 200 g','Perunamauste 50 g']},
{q:'tomaatti',good:['Kotimainen tomaatti 500 g'],bad:['Tomaattiketsuppi 500 g','Tomaattikeitto 300 g']},
{q:'kurkku',good:['Kotimainen kurkku 1 kpl'],bad:['Kurkkusalaatti 300 g','Kurkkupikkelssi 400 g']},
{q:'juusto',good:['Edam juusto 500 g'],bad:['Juustonaksut 200 g','Juustokakku 400 g']},
{q:'kerma',good:['Valio kuohukerma 2 dl'],bad:['Kermakakku 500 g','Kermatoffee 150 g']},
{q:'piimä',good:['Valio AB-piimä 1 l'],bad:['Piimäkakku 400 g','Piimäjuustoleipä 300 g']},
{q:'limsa',good:['Jaffa appelsiinilimonadi 1,5 l'],bad:['Limsakarkit 150 g','Energiajuoma 330 ml']},
];
let assertions=0, disagreements=0, falsePositives=0, falseNegatives=0, desktopFalsePositives=0, desktopFalseNegatives=0;
const differences:any[]=[];
const decisions:any[]=[];
for(const test of cases){
 const products:Sample[]=[...test.good,...test.bad].map((name,i)=>({id:i+1,name,ean:String(6410000000000+i),price:1+i*.2}));
 const mobile=rankProductResultsByRelevanceAndPrice(test.q,products,p=>p.price);
 const mobileIds=new Set(mobile.map(p=>p.id));
 for(const [i,p] of products.entries()){
   const desktopDecision=desktopSearchDecision(test.q,{...p,__price:p.price});
   const desktop=desktopDecision.accepted;
   const mobileAccepted=mobileIds.has(p.id);
   const expected=i<test.good.length;
   const decision={query:test.q,name:p.name,ean:p.ean,price:p.price,expected,desktop,mobile:mobileAccepted,desktopReason:desktopDecision.reason};
   decisions.push(decision);
   if(desktop!==mobileAccepted){disagreements++;differences.push(decision);}
   if(desktop&&!expected)desktopFalsePositives++;
   if(!desktop&&expected)desktopFalseNegatives++;
   if(mobileAccepted&&!expected)falsePositives++;
   if(!mobileAccepted&&expected)falseNegatives++;
   assertions+=3;
 }
 assert(mobile.every((p,i)=>i===0||mobile[i-1].price<=p.price),'mobile cheapest-first '+test.q);assertions++;
 const zero=rankProductResultsByRelevanceAndPrice(test.q,products.map((p,i)=>({...p,price:i===0?0:p.price})),p=>p.price);
 assert(zero.every(p=>p.price>0),'no unpriced '+test.q);assertions++;
 const reversed=rankProductResultsByRelevanceAndPrice(test.q,[...products].reverse(),p=>p.price);
 assert.deepEqual(mobile.map(p=>p.ean),reversed.map(p=>p.ean),'stable ordering '+test.q);assertions++;
}
// Real product names, EANs and categories read from Ziiply Neon on 2026-11-13.
// Fixture is static: CI never connects to the production database.
const realNeonMilk: Array<Sample & { expected:boolean }> = [
  {id:1001,ean:'6408653125622',name:'Juustoportti vapaan lehmän kevytmaito 1l',category:'maito-juusto-munat-ja-rasvat/maidot-ja-piimat/maidot',price:1.25,expected:true},
  {id:1002,ean:'6408653125660',name:'Juustoportti vapaan lehmän täysmaito 1l',category:'maito-juusto-munat-ja-rasvat/maidot-ja-piimat/maidot',price:1.39,expected:true},
  {id:1003,ean:'6413300100716',name:'Arla 1,5 L Suomesta kevytmaito',category:'maito-juusto-munat-ja-rasvat/maidot-ja-piimat/maidot',price:1.59,expected:true},
  {id:1004,ean:'6413300101010',name:'Arla täysmaito Suomi 1 L',category:'maito-juusto-munat-ja-rasvat/maidot-ja-piimat/maidot',price:1.69,expected:true},
  {id:1005,ean:'6413300101515',name:'Arla rasvaton maito 1l Suomi',category:'maito-juusto-munat-ja-rasvat/maidot-ja-piimat/maidot',price:1.19,expected:true},
  {id:1006,ean:'6413300101713',name:'Arla Rasvaton maito Suomi 1,5 L',category:'maito-juusto-munat-ja-rasvat/maidot-ja-piimat/maidot',price:1.49,expected:true},
  {id:1007,ean:'6414893385221',name:'Kotimaista iskukuumennettu vähälaktoosinen kevytmaito 1L',category:'maito-munat-ja-rasvat/maidot-ja-piimat/laktoosittomat-ja-vahalaktoosiset-maidot',price:1.29,expected:true},
  {id:1008,ean:'6430064400715',name:'Aino Ihana Maitosuklaa 900ml/530g kermajäätelö',category:'pakasteet/jaatelot/jaatelopaketit',price:4.99,expected:false},
  {id:1009,ean:'7340149217086',name:'ASBA Maitosuklaaruusu 18g',category:'karkit-suklaat-ja-keksit/sesonki-ja-lahjamakeiset/sesonkisuklaat',price:2.49,expected:false},
  {id:1010,ean:'8445291505087',name:'After Eight Caramel karamellitäytteinen maitosuklaa 200g',category:'konvehtiboxit;;uutuudet',price:3.99,expected:false}
];
const realNeonMobile = rankProductResultsByRelevanceAndPrice('maito', realNeonMilk, p => p.price);
const realNeonIds = new Set(realNeonMobile.map(p => p.ean));
let realNeonFailures = 0;
for (const p of realNeonMilk) {
  const desktop = desktopSearchDecision('maito', {...p,__price:p.price}).accepted;
  const mobile = realNeonIds.has(p.ean);
  if (desktop !== p.expected || mobile !== p.expected) {
    realNeonFailures++;
    console.error('REAL_NEON_RELEVANCE_MISMATCH', JSON.stringify({ean:p.ean,name:p.name,expected:p.expected,desktop,mobile}));
  }
  assertions += 2;
}
console.log('REAL_NEON_MILK_FIXTURE',JSON.stringify({products:realNeonMilk.length,failures:realNeonFailures}));
if(realNeonFailures) process.exitCode=1;
// Integration contract: a Neon catalog identity has no store price until a
// selected chain returns an EAN-matched price. Simulate that join without DB writes.
const catalogOnly=realNeonMilk.map(({price,...p})=>({...p,price:0}));
const selectedStorePrices=new Map<string,number>([
  ['6413300101010',1.69],['6413300101515',1.19],['6408653125622',1.25]
]);
const joined=rankProductResultsByRelevanceAndPrice('maito',
  catalogOnly.map(p=>({...p,price:selectedStorePrices.get(p.ean)??0})),p=>p.price);
assert.deepEqual(joined.map(p=>p.ean),
  ['6413300101515','6408653125622','6413300101010'],
  'only priced matching EANs from selected store, cheapest first');
assertions++;
assert(joined.every(p=>selectedStorePrices.has(p.ean) && p.price>0),
  'catalog-only and wrong-category rows must never appear as priced results');
assertions++;
const noStorePrices=rankProductResultsByRelevanceAndPrice('maito',catalogOnly,p=>p.price);
assert.equal(noStorePrices.length,0,'Neon catalog alone cannot produce priced results');
assertions++;
console.log('NEON_CHAIN_PRICE_JOIN_FIXTURE',JSON.stringify({catalog:catalogOnly.length,priced:joined.length,unpricedVisible:noStorePrices.length,eanOrder:joined.map(p=>p.ean)}));
const expectedGood=cases.reduce((n,c)=>n+c.good.length,0);
const expectedBad=cases.reduce((n,c)=>n+c.bad.length,0);
// The exact same EAN normalization must be used for formatted and raw codes.
const eanCases:[string,string][]=[
 ['6410401234567','6410401234567'],
 ['641 0401 234567','6410401234567'],
 ['641-0401-234567','6410401234567'],
 [' 6410401234567 ','6410401234567'],
 ['', ''],
];
for(const [input,expected] of eanCases){assert.equal(normalizeEan(input),expected,'EAN '+input);assertions++;}
assert.equal(new Set(['6410401234567','641-0401-234567','641 0401 234567'].map(normalizeEan)).size,1,'same EAN must share one key');assertions++;
console.log(JSON.stringify({queries:cases.length,products:expectedGood+expectedBad,expectedGood,expectedBad,assertions,disagreements,mobileFalsePositives:falsePositives,mobileFalseNegatives:falseNegatives,desktopFalsePositives,desktopFalseNegatives,differences,decisions},null,2));
if(disagreements || falsePositives || falseNegatives || desktopFalsePositives || desktopFalseNegatives) {
 console.error('AUDIT_DIFFERENCES_DETECTED: review before unification');
 process.exitCode=1;
} else console.log('AUDIT_PARITY_OK');

const sameEanQuotes: Sample[] = [
  { id: 1, name: 'Kirjolohiöljy koirille 500 ml', ean: '6410401234567', price: 0.99 },
  { id: 2, name: 'Kirjolohifilee 700 g', ean: '641-0401-234567', price: 12.49 },
  { id: 3, name: 'Kirjolohifilee 700 g', ean: '6410401234567', price: 11.49 },
  { id: 4, name: 'Kokonainen kirjolohi 1 kg', ean: '6410401234568', price: 10.49 },
  { id: 5, name: 'Kokonainen kirjolohi 1 kg', ean: '6410401234569', price: 0 },
];
for (const quotes of [sameEanQuotes, [...sameEanQuotes].reverse()]) {
  assert.deepEqual(
    finalizeNormalSearchResults('kirjolohi', quotes, product => product.price).map(product => product.id),
    [4, 3],
    'reject irrelevant and unpriced quotes before keeping the cheapest eligible quote per EAN',
  );
}

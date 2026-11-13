import assert from 'node:assert/strict';
import { desktopSearchDecision } from '../src/app/components/ziiply/search/desktopNormalRelevance';
import { rankProductResultsByRelevanceAndPrice } from '../src/app/components/ziiply/ziiplyCore';

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
for(const test of cases){
 const products:Sample[]=[...test.good,...test.bad].map((name,i)=>({id:i+1,name,ean:String(6410000000000+i),price:1+i*.2}));
 const mobile=rankProductResultsByRelevanceAndPrice(test.q,products,p=>p.price);
 const mobileIds=new Set(mobile.map(p=>p.id));
 for(const [i,p] of products.entries()){
   const desktop=desktopSearchDecision(test.q,{...p,__price:p.price}).accepted;
   const mobileAccepted=mobileIds.has(p.id);
   const expected=i<test.good.length;
   if(desktop!==mobileAccepted){disagreements++;differences.push({query:test.q,name:p.name,expected,desktop,mobile:mobileAccepted});}
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
const expectedGood=cases.reduce((n,c)=>n+c.good.length,0);
const expectedBad=cases.reduce((n,c)=>n+c.bad.length,0);
console.log(JSON.stringify({queries:cases.length,products:expectedGood+expectedBad,expectedGood,expectedBad,assertions,disagreements,mobileFalsePositives:falsePositives,mobileFalseNegatives:falseNegatives,desktopFalsePositives,desktopFalseNegatives,differences},null,2));
if(disagreements || falsePositives || falseNegatives || desktopFalsePositives || desktopFalseNegatives) console.log('AUDIT_DIFFERENCES_DETECTED: review before unification');
else console.log('AUDIT_PARITY_OK');

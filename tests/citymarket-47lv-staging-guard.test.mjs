import test from 'node:test';
import assert from 'node:assert/strict';
import {validate47LVPublication} from '../src/app/components/ziiply/offerSearch/providers/kCitymarket47LVStagingGuard.js';
const names=[
 'PUNAKAALI Suomi','CELINA PÄÄRYNÄ Suomi','Järvikylä ROSMARIINI Suomi',
 'Oksasen puutarha JUICY SALAATTI 125 g Suomi','Arla PROTEIN RAHKAT 200 g',
 'Danone ACTIMEL JOGURTTIJUOMAT 8 x 100 g','Vaasan THE BRGR NAUGHTY BURGER 4 kpl/320 g'
];
const valid=()=>[...names,...Array.from({length:48},(_,i)=>'Reviewed item '+i)]
 .map((title,i)=>({title,price:2+i/100,category:'Juomat'}));
test('47LV valid PDF-reviewed staged publication is allowed',()=>assert.equal(validate47LVPublication(valid(),'2026-11-19-W47-LV').ok,true));
test('other editions do not inherit 47LV-specific gate',()=>assert.equal(validate47LVPublication([{title:'x'}],'2026-11-23-W48-AV').ok,true));
for(const [name,mutate,reason] of [
 ['glögi 50.31',a=>a[7]={title:'GLÖGI 8 % 0,75 l/pl',price:50.31,category:'Juomat'},'unverified-glogi-price'],
 ['orphan heading',a=>a[7]={title:'NAUDAN LEHTIPIHVI',price:2.39,category:'Liha'},'merged-or-orphan-title'],
 ['merged heading',a=>a[7]={title:'PUNAKAALI KG PÄÄRYNÄ KG KPL 125 g PS',price:0.99,category:'Hedelmät & vihannekset'},'merged-or-orphan-title'],
 ['detached Haribo price digits',a=>a[7].title='Haribo JOULUKALENTERI 300 g (32,63/kg) 79','detached-price-digits-in-title'],
 ['publisher footer in title',a=>a[7].title='L’ORÉAL PARIS MEIKKIVOITEET, PEITEAINEET & TELESCOPIC MASCARAT Voimassa TO–SU 19.–22.11.2026 L’Oréal Paris foundation, Concealers & Telescopic mascaror','publisher-footer-in-title'],
 ['missing category',a=>a[7].category='Muut','missing-category'],
 ['missing price',a=>a[7].price=null,'missing-price-and-discount'],
 ['missing reviewed card',a=>a.splice(0,1),'missing-pdf-reviewed-card'],
 ['duplicate offer',a=>a.push({...a[0]}),'duplicate-offer'],
 ['too few rows',a=>a.splice(12),'47LV-offer-count-below-reviewed-minimum'],
 ])test('47LV rejects '+name,()=>{
 const a=valid();mutate(a);
 const result=validate47LVPublication(a,'2026-11-19-W47-LV');
 assert.equal(result.ok,false);
 assert.ok(result.issues.some(s=>s.startsWith(reason)),JSON.stringify(result));
});

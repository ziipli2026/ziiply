require('./recipe-audit-runtime.cjs');
const assert=require('node:assert/strict');
const {desktopSearchDecision:dec,rankDesktopNormalRows:rank,desktopSearchQueries:queries}=require('../src/app/components/ziiply/search/desktopNormalRelevance.ts');
const yes=[
 ['cola','Coca-Cola Zero 1,5 l'],['cola','Pepsi Max 1.5l'],['COLA','Coca‑Cola 330 ml'],
 ['tee','Lipton jäätee 500ml'],
 ['maitoa','Arla kevytmaito 1 l'],['maidon','Valio rasvaton maito 1l'],
 ['rasvaton maito','Valio maito rasvaton 1l'],['laktoositon maito','Valio laktoositon kevytmaito 1l'],
 ['kahvia','Paulig suodatinkahvi 500g'],['juhla moka','Juhla Mokka 500 g'],
 ['ruisleivät','Vaasan ruisleipä 500g'],['kaurahiutaleet','Kotimaista kaurahiutale 1kg'],
 ['tomaatteja','Tomaatti irto'],['kurkun','Kurkku Suomi'],['perunoita','Peruna 1kg'],
 ['juustoa','Oltermanni kermajuusto 500g'],['broileri','Broilerin filee'],
 ['kahvi','Juhla Mokka 500g'],['kahvi 500g','Kulta Katriina 0,5 kg'],
 ['cola zero','Pirkka Cola sokeriton 1,5 l'],['cola','Coke Diet 330ml'],
 ['ketsuppi','Heinz Ketchup 500g'],
 ['jogurtti','Valio jogurtti 1kg'],['sipsit','Taffel perunalastut 250g'],
 ['maito 1 l','Valio maito 1000ml'],['cola 0,33 l','Coca-Cola 330ml'],
 ['voi 0.5kg','Valio voi 500 g'],['Pirkka maitoa','Pirkka kevytmaito 1 l'],
 ['xyzbrand','XYZBrand erikoistuote'],['piimä','Arla AB-piimä 1l'],
];
const no=[
 ['cola','Chocolate patukka'],['cola','Nicolas suklaa'],['cola','Cola makeinen'],
 ['maito','Maitosuklaa 200g'],['kahvi','Kahvinsuodatin 100kpl'],
 ['juusto','Juustonaksu'],['jauheliha','Jauhelihamauste'],
 ['rasvaton maito','Kevytmaito 1l'],['laktoositon maito','Valio maito 1l'],
 ['pepsi max','Coca-Cola Zero 1l'],['coca cola','Pepsi Max 1l'],
 ['cola 1.5l','Coca-Cola 0.5l'],['maito 1 l','Maito 1kg'],['xyzbrand','Muu tuote'],
 ['kana','Porkkana 1kg'],['kana','Americana pizza'],
 ['voi','Voileipä'],['kana','Kananmuna 10kpl'],
 ['lohi','Carnilove herkku koirille lohi-mustikka'],['suola','Epsom-suola 500g'],
 ['kerma','Pirkka yrttijuoma karpalo & kerma'],['jaatelo','Jäätelö tai virvoitusjuoma'],
 ['kerma','Herkku vihreä tee päärynä-kerma 80g'],['suola','El Valle chips oliiviöljy suola'],
 ['oljy','Garnier öljy 150ml kaikille hiustyypeille'],['jauho','Silverline jauho- ja keittiökoisapyydys'],
 ['lohi','Best-In kssanherkku lohi 80g'],['kana','Atria Grillimakkara Kana'],
 ['juusto','Estrella Juusto Rinkula Lempeä Jalapeno 200g'],
 ['suola','Suola- ja pippurisirotin'],['oljy','Elvital öljy 100ml Extraordinary'],
 ['vesi','Decorata Party vesi-ilmapallo 50 kpl'],
 ['riisi','Atria kanakastike ja riisi 300g'],['kana','Kana-Caesarpatonki'],
 ['kinkku','HK panini kinkku-salami'],['kerma','Elonen kerma-mansikka kranssi'],
 ['kana','Almo Nature Daily kana-nauta'],
 ['cola','Nocco Focus cola energiajuoma 0,33l'],
 ['kahvi','XZ shampoo 250ml kahvi korjaava'],['kahvi','XZ hoitoaine 200ml kahvi'],
 ['kahvi','Mad-Croc energiajuoma kahvi'],['cola','Jaloviina Cola 5% 0,33l'],
 ['kahvi','Arla jogurtti 1kg kahvi'],['kahvi','Jaloviina Kahvi 5% 0,33l'],
 ['Pirkka maito','Pirkka pullotutti (maito) 0-3 kk 2kpl'],
 ['maitoa','Valio maitojuoma 1l'],['olut','Olutlasi 0,5l'],
 ['makkara','Koiranmakkara'],['maito','Kissan maito'],
 ['kahvi','Kahvijäätelö'],['piimä','Piimälimppu'],
 ['cola zero','Cola Original'],['luomu tomaatti','Tomaatti'],
];
for(const [q,name] of yes)assert.equal(dec(q,{name}).accepted,true,`missing ${q}: ${name} ${JSON.stringify(dec(q,{name}))}`);
for(const [q,name] of no)assert.equal(dec(q,{name}).accepted,false,`noise ${q}: ${name}`);
assert.equal(dec('cola',{name:'Vesi',brand:'Cola Company',category:'Cola'}).accepted,false);
const rows=[{name:'Cola',__price:null},{name:'Pepsi Max',__price:2},{name:'Cola',__price:1},{name:'Cola',__price:NaN},{name:'Cola',__price:0}];
assert.deepEqual(rank('cola',rows).slice(0,2).map(x=>x.__price),[1,2]);
assert.deepEqual(queries('juusto'),['juusto']);
assert.ok(queries('cola zero').includes('pepsi max'));
assert.ok(queries('cola zero').includes('cola sokeriton'));
assert.ok(queries('kahvi 500g').includes('juhla mokka 500g'));
assert.ok(!queries('kana').some(q=>q.includes('suikale')));
assert.equal(dec('6410400000001',{name:'Unknown',ean:'6410400000001'}).accepted,true);
assert.equal(dec('6410400000001',{name:'6410400000001',ean:'6410400000002'}).accepted,false);
console.log(`PASS ${yes.length+no.length+7} desktop normal relevance cases`);

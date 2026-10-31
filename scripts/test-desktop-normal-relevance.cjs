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
 ['kerma','Sahlman Kerma pehmeä toffee 50g'],['kerma','Ahvenanmaan kermajuusto 200g'],
 ['kerma','Kermainen Riistakäristys ja perunamuusia'],['kerma','Dr Oetker kerman stabilointiaine'],
 ['suola','HK Viljaporsaan lastut Suola&Pippuri'],
 ['suola','Finca La Rosala Marcona manteli 80g evoo & suola'],
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
assert.equal(dec('juusto',{name:'Jokilaakson Juusto kirkastettu voi 200g',brand:'Jokilaakson Juusto'}).accepted,false);
assert.equal(dec('voi',{name:'Jokilaakson Juusto kirkastettu voi 200g',brand:'Jokilaakson Juusto'}).accepted,true);
assert.equal(dec('cola zero',{name:'Coca-Cola Zero 1l',brand:'Coca-Cola'}).accepted,true);
assert.equal(dec('cola',{name:'Pepsi Max 1l',brand:'Pepsi Max'}).accepted,true);
assert.equal(dec('cola',{name:'Vesi',brand:'Cola Company',category:'Cola'}).accepted,false);
const rows=[{name:'Cola',__price:null},{name:'Pepsi Max',__price:2},{name:'Cola',__price:1},{name:'Cola',__price:NaN},{name:'Cola',__price:0}];
assert.deepEqual(rank('cola',rows).slice(0,2).map(x=>x.__price),[1,2]);
assert.deepEqual(queries('juusto'),['juusto']);
assert.ok(queries('cola zero').includes('pepsi max'));
assert.ok(queries('cola zero 1,5l').includes('pepsi max 1,5l'));
assert.ok(queries('cola zero').includes('cola sokeriton'));
assert.ok(queries('kahvi 500g').includes('juhla mokka 500g'));
assert.ok(!queries('kana').some(q=>q.includes('suikale')));
assert.equal(dec('6410400000001',{name:'Unknown',ean:'6410400000001'}).accepted,true);
assert.equal(dec('6410400000001',{name:'6410400000001',ean:'6410400000002'}).accepted,false);
console.log(`PASS ${yes.length+no.length+7} desktop normal relevance cases`);

assert.deepEqual(rank('cola',rows,{requirePrice:true}).map(x=>x.__price),[1,2]);
assert.equal(rank('maito',[{name:'Valio maito',__price:null}],{requirePrice:true}).length,0);
assert.deepEqual(rank('maito',[{name:'Valio maito 1l',__price:2},{name:'Arla kevytmaito 1l',__price:1}],{requirePrice:true}).map(x=>x.__price),[1,2]);
for(const name of ['Dovgan Kondensoitu maito 397g','Tiivistetty maito 300g'])assert.equal(dec('maito',{name}).accepted,false);

assert.deepEqual(rank('kahvi',[{name:'Kahvi 500g',__price:5},{name:'Suodatinkahvi 500g',__price:3}],{requirePrice:true}).map(x=>x.__price),[3,5]);
assert.deepEqual(rank('cola',[{name:'Cola 1l',__price:2},{name:'Pepsi Max 1l',__price:1}],{requirePrice:true}).map(x=>x.__price),[1,2]);

assert.ok(queries('maito').includes('kevytmaito'));
assert.ok(queries('maito').includes('täysmaito'));
assert.equal(dec('maito',{name:'Xtra pikacappuccino maito-kahvijauhe 250g'}).accepted,false);
assert.equal(dec('maito',{name:'Arla täysmaito 1l'}).accepted,true);

// The display policy is query-independent: qualify first, require an actual
// selected-store quote, then order every accepted result by purchase price.
for(const query of ['maito','kahvi','cola','juusto','suola','sokeri','vesi','xyzbrand']) {
  const sample=[
    {id:'expensive',name:query,__price:4},
    {id:'unpriced',name:query,__price:null},
    {id:'cheap',name:query+' 500g',__price:1},
    {id:'zero',name:query,__price:0},
    {id:'negative',name:query,__price:-1},
    {id:'nan',name:query,__price:NaN},
    {id:'infinity',name:query,__price:Infinity},
    {id:'unrelated',name:'Completely unrelated',__price:0.01},
  ];
  assert.deepEqual(rank(query,sample,{requirePrice:true}).map(p=>p.id),['cheap','expensive'],query+' must apply the same qualified priced ascending policy');
}
console.log('PASS universal Justiina display policy: wrong/unpriced rows excluded; ascending price across all query cases');

for(const product of [
 {name:'Poppamies BBQ Sauce Cherry Cola grillikastike',brand:'Poppamies'},
 {name:'Mun smoothie pina colada',brand:'Mun'},
 {name:'Hartwall Cocktails Pina Colada 5,5%',brand:'Hartwall Cocktails'},
 {name:'Revell 3D Palapeli Coca-Cola Rekka',brand:'Revell'},
 {name:'Green Dates sour cola Candy Dates',brand:'Green Dates'},
 {name:'Sun Lolly mehujää cola',brand:'Sun Lolly'},
 {name:'SodaStream 440ml Pepsi Max',brand:'SodaStream'},
 {name:'Jaloviina Cola 5%',brand:'Jaloviina'},
 {name:'Mad-Croc enegiajuoma Cola',brand:'Mad-Croc'},
 {name:'Kariniemen Kananpojan paistileike Cola BBQ',brand:'Kariniemen'},
 {name:'Pirkka appelsiini-colajuoma 2dl',brand:'Pirkka'},
])assert.equal(dec('cola',product).accepted,false,'wrong product type or embedded colada: '+product.name);

assert.equal(dec('pepsi',{name:'Pepsi Max 0,5l',brand:'Pepsi Max'}).accepted,true);

assert.equal(dec('cola',{name:'Pepsi Zero Sugar Cream Soda virvoitusjuoma',brand:'Pepsi'}).accepted,false);

assert.equal(dec('mehu',{name:'Sun Lolly mehujää cola'}).accepted,false);
assert.equal(dec('olut',{name:'Karhu olut 0,33l',category:'juomat/oluet'}).accepted,true);
assert.equal(dec('olut',{name:'Olutlasi 0,5l'}).accepted,false);

assert.equal(dec('kahvi',{name:'Pirkka Costa Rica kahvi 500g',brandName:'Pirkka',category:'juomat/kahvi-ja-suodatinpussit/jauhettu-kahvi-vaalea'}).accepted,true);
assert.equal(dec('kahvi',{name:'Frezza kahvijuoma 250ml',brandName:'Frezza',category:'juomat/kahvi-ja-suodatinpussit/valmiit-kahvijuomat'}).accepted,false);

assert.equal(dec('cola',{name:'Chupa Chups Fizzy tikkari Cola',category:'makeiset-ja-naposteltavat/muut-makeiset/tikkarit'}).accepted,false);

// Real false positives/negatives from the 100-query protected live audit.
for(const [query,product] of [
 ['pepsi',{name:'SodaStream 440ml Pepsi Max',category:'juomat/virvoitusjuomat/muut-virvoitusjuomat'}],
 ['kananmuna',{name:'Mignon muna 52g',category:'makeiset-ja-naposteltavat/muut-makeiset/kausimakeiset'}],
 ['kananmuna',{name:'HK muna-pekoni kolmioleipä 160g',category:'valmisruoka/valmisruoat/kolmioleivat'}],
 ['kananmuna',{name:'Munakoiso 225g luomu'}],
 ['kananmuna',{name:'Coop Lasagne pasta, sisältää kananmunaa 500g'}],
 ['kananmuna',{name:'Laitilan Kanatarha Muna & Voi-levite 180g'}],
 ['broileri',{name:'Jahti&Vahti Kana ja Riisi 3kg',category:'CAABOAAAAAAAA'}],
 ['lohi',{name:"Mac's lohi ja kana munuais 100g",category:'CAABOAAACACAA'}],
 ['kana',{name:'Mrs Chengs Yakisoba nuudeli kana 93g',category:'kuivat-elintarvikkeet/nuudelit/pikanuudelit'}],
 ['mozzarella',{name:'Coop Pizza tomaatti-mozzarella 120g',category:'CAAAGAAAIAAAA'}],
 ['pasta',{name:'Herkku Pasta Carbonara 350g',category:'CAAAGAAAGACAA'}],
 ['pinaatti',{name:'Xtra tortellini ricotta & pinaatti 500g',category:'CAAAGAAAAAQAA'}],
])assert.equal(dec(query,product).accepted,false,query+' must reject '+product.name);
for(const [query,product] of [
 ['appelsiinimehu',{name:'Innocent appelsiinimehu hedelmälihalla 900ml',category:'juomat/mehut/mehut-viileasta'}],
 ['omenamehu',{name:'Juustoportti Hyvin omenamehu 2dl',category:'juomat/mehut/kerta-annosmehut'}],
 ['omenamehu',{name:'AITO Omenamehu tuorepuristettu 1l',category:'kahvit-teet-ja-mehut/mehut/omenamehut'}],
 ['kahvi',{name:'Pirkka kahvi 500g',category:'kahvit-teet-ja-mehut/kahvit/jauhettu-kahvi'}],
 ['leipä',{name:'Vaasan leipä 500g',category:'leivat-keksit-ja-leivonnaiset/leivat/ruisleivat'}],
 ['kananmuna',{name:'Kieku Vapaan kanan muna M6 348g',category:'maito-juusto-munat-ja-rasvat/munat/kananmunat'}],
 ['kananfilee',{name:'Jyväbroiler broilerin filee maustamaton 320g',category:'liha/broileri/fileet-pihvit-ja-rullat'}],
 ['pasta',{name:'Coop Tortelloni tuorepasta juusto 250g',category:'CAAAGAAAAAQAA'}],
 ['kesäkurpitsa',{name:'Kesäkurpitsa 1kpl'}],
])assert.equal(dec(query,product).accepted,true,query+' must keep '+product.name);
assert.ok(queries('kananfilee').includes('broilerin filee'));
console.log('PASS real 100-query audit regressions');
for(const [query,name] of [
 ['kaakao','Ziaja Kaakao shampoo 400ml'],['kauramaito','Lumene Kauramaito-öljypuhdistus 150ml'],
 ['oliiviöljy','Le Petit Olivier Marseille saippua Oliiviöljy'],['mustikka','Bliw nestesaippua Mustikka'],
 ['paprika','Pirkka paprikajauhe 25g'],['sipuli','Coop sipulijauhe 65g'],
 ['pasta','Santa Maria Pasta Rossa Mausteseos'],['omena','Coop omena-kanelimarmeladi 300g'],
 ['mansikka','Valio Herkku mousse mansikka'],['avokado','Coop avokadoöljy 250ml'],
 ['edam','Dave&Jons edamame papuja'],['kaakao','Coop kaakaokeksi 150g'],
 ['kaakao','Coop kaakao-valkosuklaamurot'],['banaani','Semper puurojauhe banaani 400g'],
 ['maissi','Doritos maissilastu 170g'],
])assert.equal(dec(query,{name}).accepted,false,query+' rejects other product class: '+name);
for(const [query,name] of [
 ['kahvi','Juhla Mokka jauhettu kahvi 500g'],['kaakao','Fazer kaakaojuomajauhe 30g'],
 ['margariini','Keiju Rypsiöljy margariini 60 400g'],['tonnikala','Coop tonnikala oliiviöljyssä'],
 ['omenahillo','Coop omenahillo'],
])assert.equal(dec(query,{name}).accepted,true,query+' keeps requested form: '+name);
console.log('PASS ingredient derivatives and nonfood live regressions');

assert.equal(dec('kauramaito',{name:'Oatly kaurajuoma 1l',category:'juomat/kasvipohjaiset-juomat/kaurajuomat'}).accepted,true);
assert.ok(queries('kauramaito').includes('kaurajuoma'));

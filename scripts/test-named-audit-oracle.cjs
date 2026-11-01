const assert=require('node:assert/strict'),{auditNamedProduct:check}=require('./lib/named-audit-oracle.cjs');
for(const [q,p] of [
 ['Valio Pippuripekka',{name:'Valio Pippuri Pekka'}],
 ['Arla rasvaton AB piimä laktoositon',{name:'Arla Acidofilus-Bifidus piimä 1 L laktoositon rasvaton Suomi'}],
 ['Felix ketsuppi',{name:'Felix Ketchup 1kg'}],
 ['Löfbergs Magnifika kahvi',{name:'Löfbergs Magnifika papukahvi 400g'}],
 ['Coop sitruuna',{name:'Coop sitruuna luomu'}],
 ['Atria kalapihvit smetanakastikkeella',{name:'Atria kalapihvit 350g',aliases:['Atria kalapihvit smetanakastikkeella 350g']}],
 ['Kirjolohifilee D ruodoton',{name:'Kirjolohifilee D-leikkuu kg'}],
])assert.equal(check(q,p),null,q);
for(const [q,p] of [
 ['Coop sitruuna',{name:'Coop lemon hankausaine 500ml',aliases:['Coop sitruuna']}],
 ['Coop sitruuna',{name:'Coop Lemon-Lime hard seltzer 330ml'}],
 ['Heinz Tomaattiketsuppi',{name:"Lay's Heinz Tomato Ketchup perunalastut"}],
 ['maito',{name:'Kissanruoka maito'}],
 ['Hätälä kirjolohifilee 700g',{name:'Hätälä kirjolohifilee 1kg',aliases:['Hätälä kirjolohifilee 700g']}],
])assert.ok(check(q,p)&&check(q,p).kind!=='evidence_review',q);
assert.equal(check('Kurkku Härkälä',{name:'Kurkku Juntti'}).kind,'evidence_review');
assert.equal(check('Omena Jonagold Jonaprince',{name:'Omena Jonagold/Jonagored',aliases:['Omena Jonagold/Jonaprince']}).kind,'evidence_review','a historical slash label cannot change an explicit variety pair');
assert.equal(check('Valio kofeiiniton',{name:'Valio juoma',aliases:['Valio kofeiinillinen juoma']}).kind,'evidence_review');
console.log('PASS independent audit oracle: spelling, brands, complete evidence, types and conflicting packages');

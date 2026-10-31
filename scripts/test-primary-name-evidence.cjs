const assert=require('node:assert/strict');
const {extractPrimaryName,addsOnlyLooseModifier}=require('./lib/primary-name-evidence.cjs');
const ean='2000604100005';
assert.equal(extractPrimaryName('<h1>Kukkakaali <span>irto</span></h1><h3>EAN</h3><p>'+ean+'</p>',ean).name,'Kukkakaali irto');
for(const html of [
 '<h1>Kukkakaali irto</h1><a href="/'+ean+'">Linkki</a>',
 '<h1>Kukkakaali irto</h1><script>EAN '+ean+'</script>',
 '<h1>Kukkakaali irto</h1><h1>Muu tuote</h1><p>EAN '+ean+'</p>',
 '<h1>Kukkakaali irto</h1><p>EAN 2000604100006</p>',
])assert.throws(()=>extractPrimaryName(html,ean));
assert.equal(addsOnlyLooseModifier('Kukkakaali','Kukkakaali irto'),true);
for(const [a,b] of [['Kukkakaali pakattu','Kukkakaali irto'],['Kurkku Härkälä','Kurkku irto'],['Kukkakaali','Kukkakaali irto Suomi'],['Kukkakaali 500g','Kukkakaali irto']])assert.equal(addsOnlyLooseModifier(a,b),false);
console.log('PASS primary product evidence: visible EAN, unique title and exact omitted-attribute boundary');

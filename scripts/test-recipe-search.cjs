require('./recipe-audit-runtime.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../src/app/components/ziiply/justiina/recipeCore.ts');
const {isBadNormalResult,rankProductResultsByRelevanceAndPrice}=require('../src/app/components/ziiply/ziiplyCore.ts');
const cases=require('./fixtures/recipe-audit.json');
const catalog=require('./fixtures/recipe-products.json');
const distractors=['Vartalosokeri karvanpoistoon 300 g','Pyykkietikka 1 l','Lohikeitto 300 g','Savukirjolohifilee 300 g','Jauheliha-spagetti lastenateria 200 g','Makaroni laatikko valmisateria 400 g','Kookosmaito juoma 1 l','Tilli tuorejuusto 200 g','Valkosipuli jauhettu 50 g','Curry kastike 400 g','Broilerin fileesuikale hunajamarinoitu 400 g','Kananmunan muotoinen suklaa 50 g','Sitruuna saippua 100 g'];
// Shared ranking regression: semantic match first, then cheapest within the
// same relevance tier. The explicit price selector represents the normalized
// comparable price supplied by each search provider.
const rankingTieCases=[
 {id:'expensive',name:'Ruokaöljy 1 l',__price:2.99},
 {id:'cheap',name:'Ruokaöljy 1 l',__price:1.79},
 {id:'missing',name:'Ruokaöljy 1 l',__price:null},
];
assert.deepEqual(
 rankProductResultsByRelevanceAndPrice('ruokaöljy',rankingTieCases,p=>p.__price??Number.POSITIVE_INFINITY).map(p=>p.id),
 ['cheap','expensive','missing'],
 'equally relevant products must sort by normalized price, with missing prices last'
);
const relevanceBeforePrice=[
 {id:'exact',name:'Ruokaöljy 1 l',__price:4.99},
 {id:'cheap-weaker',name:'Rypsiöljy 1 l',__price:0.49},
];
const relevanceRanked=rankProductResultsByRelevanceAndPrice('ruokaöljy',relevanceBeforePrice,p=>p.__price);
assert.equal(relevanceRanked[0].id,'exact','a stronger product-name match must remain ahead of a cheaper weaker match');

const report=[];
for(const c of cases){
 const d=core.parseRecipeText(c.text);
 const terms=d.ingredients.map(i=>core.recipeProductSearchTerm(i.name)).filter(Boolean);
 assert.deepEqual(terms,c.expected,c.title+' ingredient extraction');
 const lines=d.ingredients.map(i=>[i.amount,i.unit,i.name].filter(x=>x!==null&&x!=="").join(' '));
 const variants=[lines.join('\n'),c.title+'\nIngredients:\n'+lines.join('\n'),c.title+': '+lines.join('; '),c.title+'\nRaaka-aineet:\n'+lines.map(x=>'• '+x).join('\n')];
 for(const text of variants)assert.deepEqual(core.parseRecipeText(text).ingredients.map(i=>core.recipeProductSearchTerm(i.name)).filter(Boolean),c.expected,c.title+' format variant');
 const search=core.prepareRecipeSearch(d.ingredients,d.instructions);
 const cart=[];
 for(let i=0;i<search.terms.length;i++){
  const term=search.terms[i],item=search.items[i];
  // API simulation intentionally returns every product, cheap distractors first.
  const products=distractors.map((name,j)=>({id:'bad'+j,name,__price:0.01})).concat(Object.entries(catalog).map(([key,name],j)=>({id:key,name,__price:2+j/100})));
  const allowed=products.filter(p=>core.recipeProductCompatible(item.name,p,item));
  assert.ok(allowed.length,c.title+' missing '+term);
  assert.ok(!allowed.some(p=>String(p.id).startsWith('bad')),c.title+' wrong type '+term);
  const ranked=rankProductResultsByRelevanceAndPrice(term,allowed,p=>p.__price);
  const selected=ranked[0];
  const equivalents={inkivääri:["inkivääri jauhettu"],jauheliha:['naudan jauheliha'],pasta:['pennepasta','tumma makaroni','makaroni'],ruokaöljy:['rypsiöljy','oliiviöljy'],tomaatti:['kirsikkatomaatti'],tomaattisose:['tomaattipyree'],tomaattipyree:['tomaattisose']};
  assert.ok(selected&&[term,...(equivalents[term]||[])].some(key=>catalog[key]===selected.name),c.title+' wrong first ranked product for '+term+': '+selected?.name);
  cart.push({ingredient:item.name,term,product:selected.name,quantity:core.recipeRetailPackageCount(item,selected)??1,quantityExact:core.recipeRetailPackageCount(item,selected)!==null});
 }
 report.push({recipe:c.title,source:c.url,ingredients:terms.length,searches:search.terms.length,cart});
}
assert.equal(core.parseRecipeIngredient('2 tl musta- tai valkopippuria').name,'mustapippuria');
assert.equal(core.recipeProductSearchTerm(core.parseRecipeIngredient('2 tl musta- tai valkopippuria').name),'mustapippuri');
assert.equal(core.parseRecipeIngredient('2 tl valko- tai mustapippuria').name,'valkopippuria');
assert.equal(core.recipeProductCompatible('mustapippuria',{name:'Duni musta-valkoinen paperipillilajitelma 20 kpl'}),false);
assert.equal(core.recipeProductCompatible('mustapippuria',{name:'Meira Mustapippuri jauhettu 31g'}),true);
assert.equal(core.parseRecipeIngredient('lohta 600 g').amount,600);
assert.equal(core.packageCount(1,'mystery',2,'mystery'),null);
assert.equal(core.parseRecipeIngredient('5½ dl vehnäjauhoja').amount,5.5);
assert.equal(core.parseRecipeIngredient('½ pkt (à 250 g) sulatejuustoa').amount,125);
assert.equal(core.parseRecipeIngredient('2 tlk (à 400 g/240 g) tomaattia').amount,480);
assert.equal(core.parseRecipeIngredient('1 prk (2,5 dl) ruokakermaa').amount,2.5);
assert.equal(core.parseRecipeIngredient('1–2 tl suolaa').amount,2);
assert.equal(core.recipeProductSearchTerm('oliiviöljyä'),'oliiviöljy');
assert.equal(core.recipeProductSearchTerm('vaniljasokeria'),'vaniljasokeri');
assert.equal(core.recipeRetailPackageCount(core.parseRecipeIngredient('750 g lohta'),{name:'Lohifilee 300 g (2 x 150 g)'}),3);
assert.equal(core.recipeRetailPackageCount(core.parseRecipeIngredient('12 kananmunaa'),{name:'Kananmunia 10 kpl'}),2);
assert.equal(core.recipeRetailPackageCount(core.parseRecipeIngredient('500 g esikeitettyjä punaisia linssejä'),{name:'Punainen linssi esikeitetty 380/230 g'}),3);
assert.equal(core.recipeProductCompatible('oliiviöljyä',{name:'Rypsiöljy 1 l'}),false);
assert.equal(core.recipeProductCompatible('fetajuustoa',{name:'Salaattijuusto 200 g'}),false);
assert.equal(core.recipeProductCompatible('laktoositonta juustokermaa',{name:'Juustokerma 2 dl'}),false);
assert.equal(core.recipeProductCompatible('esikeitettyjä punaisia linssejä',{name:'Punainen linssi kuivattu 400 g'}),false);
assert.equal(core.recipeProductCompatible('tuoretta inkivääriä',{name:'Inkivääri jauhettu 13 g'}),false);
assert.equal(core.recipeProductCompatible('mysteeriraaka-aine',{name:'Maito 1 l'}),false);
assert.equal(core.recipeProductCompatible('tuoreita keittojuureksia',{name:'Pirkka keittojuurekset 200g pakaste'}),false);
assert.equal(core.recipeProductCompatible('tuoreita keittojuureksia',{name:'Pirkka keittojuurekset 300 g'}),true);
assert.equal(core.recipeProductCompatible('persiljaa hienonnettuna',{name:'Meira Persilja 9g pussi mauste'}),false);
assert.equal(core.recipeProductCompatible('persiljaa hienonnettuna',{name:'Persilja ruukku'}),true);
assert.equal(core.recipeRetailPackageCount(core.parseRecipeIngredient('300 g keittojuureksia'),{name:'Keittojuurekset 200 g'}),2);
assert.equal(core.recipeRetailPackageCount(core.parseRecipeIngredient('300 g keittojuureksia'),{name:'Keittojuurekset 500 g'}),1);

// Regression from the 2026-11-06 real desktop recipe-search JSON export.
const cookingOilAccepted=['Kotimaista 450ml rypsiöljy','Pirkka rypsi-rapsiöljy 450ml','Keiju rypsiöljy 0,5l','Xtra 1l rapsiöljy','K-Menu rapsiöljy 1l'];
const cookingOilRejected=['Coop tonnikala paloina oliiviöljyssä MSC 135/104 g','Dave&Jons paahdettuja edamame papuja oliiviöljyllä ja merisuolalla 100 g','Coop oliiviöljyä ja merisuolaa sisältävät krutongit 100 g','Kotimaista rosmariini-oliiviöljy lohkoperuna 450 g, Pakaste','Kotimaista leppäsavukala rypsiöljyssä 150 g/115 g','Coop Juokseva rapsiöljyvalmiste 500 ml'];
for(const name of cookingOilAccepted)assert.equal(core.recipeProductCompatible('öljyä',{name}),true,'valid cooking oil rejected: '+name);
for(const name of cookingOilRejected)assert.equal(core.recipeProductCompatible('öljyä',{name}),false,'non-oil accepted: '+name);
assert.equal(core.recipeProductCompatible('öljyä',{name:'Pirkka rypsiöljy 500ml',category:'oljyt-etikat-ja-salaattikastikkeet/oljyt/rypsi--ja-rapsioljyt'}),true);
assert.equal(core.recipeProductCompatible('öljyä',{name:'Coop tonnikala oliiviöljyssä',category:'sailykkeet/kala'}),false);

if(process.env.RECIPE_AUDIT_OUTPUT)fs.writeFileSync(process.env.RECIPE_AUDIT_OUTPUT,JSON.stringify(report,null,2));
console.log('PASS: 10 recipes, '+report.reduce((n,r)=>n+r.searches,0)+' simulated product selections; adversarial products and quantity regressions');

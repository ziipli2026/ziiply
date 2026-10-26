require('./recipe-audit-runtime.cjs');
const assert=require('node:assert/strict');
const {onlineRecipeIngredients,onlineRecipeDisplayIngredients,onlineRecipeSearchPlan}=require('../src/app/components/ziiply/justiina/onlineRecipe.ts');
const {parseRecipeIngredient,prepareRecipeSearch,recipeProductCompatible,recipeProductSearchTerm}=require('../src/app/components/ziiply/justiina/recipeCore.ts');
const {recipeCoverageQueries}=require('../src/app/components/ziiply/justiina/recipeSearchCoverage.ts');
const {getNormalSearchQueries}=require('../src/app/components/ziiply/ziiplyCore.ts');
const recipes=require('./fixtures/wiki-recipe-flow.json');
const snapshot=require('./fixtures/recipe-diverse-live-products.json');
const expected={
 'Amerikkalainen pannukakku':['vehnäjauho','sokeri','leivinjauhe','suola','kananmuna','maito','ruokaöljy'],
 'Bataatti-porkkanakeitto':['bataatti','porkkana','peruna','kasvisliemikuutio','ruokakerma','mustapippuri','suola','valkopippuri'],
 'Valkosipulipasta':['voi','basilika','sitruunamehu','valkosipulijauhe','suola','spagetti','parsakaali','saksanpähkinä','parmesaani']
};
let steps=0;
for(const [title,terms]of Object.entries(expected)){
 const recipe=recipes.find(r=>r.title===title),plan=onlineRecipeSearchPlan(recipe.content,title);
 assert.deepEqual(plan.terms,terms,title+' canonical requirements');
 for(const item of plan.items){
  const fallback=getNormalSearchQueries(item.searchTerm).slice(0,6);
  const expanded=recipeCoverageQueries(item.searchTerm,item,fallback);
  const candidates=[...new Set((expanded.length?expanded:fallback).flatMap(q=>snapshot.queries[q]||[]))].map(id=>snapshot.products[id]);
  assert.ok(candidates.some(p=>recipeProductCompatible(item.name,p,item)),title+' lost '+item.name);
  steps++;
 }
}
const pancake=recipes.find(r=>r.title==='Amerikkalainen pannukakku');
assert.equal(onlineRecipeIngredients(pancake.content).length,8,'original optional ingredient retained');
const oil=onlineRecipeSearchPlan(pancake.content,pancake.title).items.find(i=>i.searchTerm==='ruokaöljy');
assert.equal(oil.amount,30);assert.equal(oil.unit,'ml');assert.ok(oil.optionalNotes.some(s=>s.includes('ja/tai')));
const alt=parseRecipeIngredient('tarvittaessa öljyä ja/tai voita paistamiseen');
assert.equal(alt.name,'öljyä');
const altItem=prepareRecipeSearch([alt]).items[0];
assert.ok(recipeCoverageQueries(altItem.searchTerm,altItem).includes('rypsiöljy'));
assert.ok(recipeProductCompatible(alt.name,{name:'Valio voi 500g'},altItem));
assert.ok(!recipeProductCompatible(alt.name,{name:'Keiju rypsiöljymargariini 400g',category:'maito-munat-ja-rasvat/rasvat/margariinit'},altItem));
for(const [ingredient,bad]of [
 ['valkosipulijauhetta',{name:'Valkosipuli tuore 100g'}],
 ['sipulijauhetta',{name:'Valkosipulijauhe 100g'}],
 ['spagettia',{name:'Blå Band Italian Pata Spagetti-kasvis-mausteseos',category:'sailykkeet-keitot-ja-ateria-ainekset/pata-ainekset'}],
 ['sitruunamehua',{name:'Pirkka Virkeä rypäle-mustikka-sitruunamehu 1l'}],
 ['parsakaalia',{name:'Parsakaali Silmusalaatti',category:'hedelmat-ja-vihannekset/vihannekset/idut-versot-ja-oraat'}],
 ['bataattia',{name:'Apetit bataatti-kermaperunat 700g pakaste',category:'pakasteet/perunapakasteet/kerma--ja-juustoperunat'}],
 ['bataattia',{name:'Apetit bataatti-juuresgratiini 700g pakaste',category:'pakasteet/perunapakasteet/kerma--ja-juustoperunat'}],
 ['parmesaania',{name:'Parmesaanipastakastike 300g'}]
])assert.equal(recipeProductCompatible(ingredient,bad),false,ingredient+' accepted '+bad.name);
assert.equal(recipeProductSearchTerm('valkosipulijauhetta'),'valkosipulijauhe');
assert.equal(recipeProductSearchTerm('varsiparsakaalia'),'varsiparsakaali');
assert.equal(recipeProductSearchTerm('valkosipulia'),'valkosipuli');
const unknown=prepareRecipeSearch([parseRecipeIngredient('1 rkl suolaa'),parseRecipeIngredient('suolaa')]);
assert.equal(unknown.items.length,2,'unquantified required ingredient must not erase measured amount');
const fish=recipes.find(r=>r.title==='Tomaatti-kalakeitto');
const fishItems=onlineRecipeIngredients(fish.content);
assert.equal(fishItems.length,8,'servings in ingredient heading must not hide first ingredient');
assert.equal(recipeProductSearchTerm(fishItems[0].name),'ruokaöljy');
assert.ok(fishItems.some(i=>/kalaa/.test(i.name)&&i.uncertain),'unspecified fish requirement must remain reviewable');
console.log(`PASS: 3 diverse wiki recipes / ${steps} product-search steps, measured quantities, optional extras, preparation form, pantry categories, and reviewable fish recipe`);

const choiceDisplay=onlineRecipeDisplayIngredients('Ainekset\n2 dl kermaa tai 3 dl maitoa\nValmistus')[0];
assert.equal(choiceDisplay.name,'2 dl kermaa tai 3 dl maitoa');assert.equal(choiceDisplay.amount,'');
assert.ok(onlineRecipeDisplayIngredients(pancake.content).some(i=>i.name.includes('öljyä ja/tai voita')));
console.log('PASS: recipe display retains complete alternatives and their quantities');

for(const [ingredient,product]of [
 ['maitoa',{name:'Pirkka pullotutti (maito) 3+kk 2kpl',category:'lapset/vaipat-ja-lastenhoito/lastenhoitotarvikkeet'}],
 ['maitoa',{name:'MAM Teat 1 2kpl vesi-maitotutti alk 0kk',category:'lapset/vauvanhoitotarvikkeet/tuttipullot-ja-tarvikkeet'}],
 ['spagettia',{name:'Spagetti mitta 1kpl',category:'koti-ja-keittio/keittiotarvikkeet'}]
])assert.equal(recipeProductCompatible(ingredient,product),false,product.name);
console.log('PASS: accessory categories cannot qualify as food ingredients');

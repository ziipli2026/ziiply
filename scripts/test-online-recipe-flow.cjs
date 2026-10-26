require('./recipe-audit-runtime.cjs');
const assert=require('node:assert/strict');
const {onlineRecipeIngredients,onlineRecipeSearchPlan,onlineRecipeDisplayIngredients,onlineRecipeTitleMatches}=require('../src/app/components/ziiply/justiina/onlineRecipe.ts');
const core=require('../src/app/components/ziiply/justiina/recipeCore.ts');
const fixtures=require('./fixtures/recipe-audit-20.json');
let count=0;
for(const recipe of fixtures){
 const items=onlineRecipeIngredients('Ainekset\n'+recipe.ingredients.join('\n')+'\nValmistus\n'+recipe.instructions);
 assert.equal(items.length,recipe.ingredients.length,recipe.title+' lost ingredient');
 assert.deepEqual(core.prepareRecipeSearch(items,recipe.instructions,recipe.title).terms,core.prepareRecipeSearch(core.parseRecipeText(recipe.title+'\nAinekset\n'+recipe.ingredients.join('\n')+'\nValmistus\n'+recipe.instructions).ingredients,recipe.instructions,recipe.title).terms,recipe.title+' online search differs from editor');
 for(const item of items)assert.ok(item.amount===null||item.amount>0,recipe.title+' invalid amount');
 count+=items.length;
}
// Source: https://fi.wikibooks.org/wiki/Keittokirja/Makaronilaatikko
const wiki='Ainekset\n1½ litraa vettä\n200 g makaronia\n400 g ruskistettua jauhelihaa\n1 ja 3/4 tl suolaa\n200 g juustoraastetta\n30 g rasvaa\n2 munaa\n½ litraa maitoa\n½ rkl sokeria\n1/4 tl valkopippuria\nvoita vuoan voiteluun\nValmistus\nKeitä makaronit.';
const items=onlineRecipeIngredients(wiki);
assert.equal(items.length,11);
for(const [i,amount,unit,name] of [[0,1.5,'l','vettä'],[3,1.75,'tl','suolaa'],[7,.5,'l','maitoa'],[9,.25,'tl','valkopippuria']]){
 assert.equal(items[i].amount,amount);assert.equal(items[i].unit,unit);assert.equal(items[i].name,name);
}
assert.ok(!core.prepareRecipeSearch(items,'','Makaronilaatikko').terms.some(term=>/vesi|vettä/.test(term)));
assert.equal(items[10].amount,null);
assert.equal(onlineRecipeDisplayIngredients(wiki)[9].amount,'0,25 tl');
const ranged=onlineRecipeIngredients('Ainekset\n2–3 perunaa\nValmistus')[0];
assert.equal(ranged.amount,3);assert.equal(ranged.unit,'kpl');
for(const [title,query,expected]of [
 ['Lihakeitto','lihakeitto',true],['Naudanlihakeitto','lihakeitto',true],['Lihapullat','lihakeitto',false],
 ['Kanakeitto','liha',false],['Perinteinen lihakeitto','lihakeitto perinteinen',true],
 ['Lohikeitto','lohikeitto',true],['Lohipasta','lohikeitto',false],['Omenapiirakka','omenapiirakka',true],
 ['Omenahillo','omenapiirakka',false],['Valkosipulileipä','sipulikeitto',false],['Kasviskeitto','kasviskeitto',true],
 ['Leivontavinkit','voi',false],['Lihakeitto','   ',false]
])assert.equal(onlineRecipeTitleMatches(title,query),expected,query+' → '+title);
console.log(`PASS: online transfer of ${fixtures.length} recipes / ${count} ingredients; real wiki quantities; water; missing amount; ranges; 13 title relevance cases`);

const wikiRecipes=require('./fixtures/wiki-recipe-flow.json');
const expectedCounts={'Makaronilaatikko':11,'Makkarakeitto':8,'Amerikkalainen pannukakku':8,'Lihapullat':17,'Bataatti-porkkanakeitto':9,'Valkosipulipasta':9,'Munakas':5,'Tomaatti-kalakeitto':8};
for(const recipe of wikiRecipes){
 const ingredients=onlineRecipeIngredients(recipe.content);
 assert.equal(ingredients.length,expectedCounts[recipe.title],recipe.title+' wiki ingredient count');
 assert.ok(!ingredients.some(item=>/^(kuivat|nestemäiset|kastike|perustaikina)$/i.test(item.name)),recipe.title+' section became product');
 const plan=core.prepareRecipeSearch(ingredients,'',recipe.title);
 assert.ok(!plan.terms.some(term=>/^(vesi|vettä|litraa vettä)$/.test(term)),recipe.title+' shopping for tap water');
}
console.log(`PASS: ${wikiRecipes.length} freshly retrieved wiki recipes; section boundaries; ingredients retained; water excluded`);

const directPlan=onlineRecipeSearchPlan(wiki,'Makaronilaatikko');
assert.ok(!directPlan.items.some(i=>i.name==='vettä'));
assert.equal(directPlan.items.find(i=>i.name==='maitoa').amount,500);
assert.equal(directPlan.items.find(i=>i.name==='maitoa').unit,'ml');
assert.equal(directPlan.items.find(i=>/jauhelih/.test(i.name)).proteinRequirement.species,'jauheliha');
assert.equal(onlineRecipeSearchPlan('Ainekset\n1 l vettä\nValmistus','Vesi').items.length,0);
const page=require('fs').readFileSync(require('path').join(__dirname,'../src/app/desktop-preview/page.tsx'),'utf8');
assert.ok(page.includes('const ingredients=onlineRecipeSearchPlan(recipe.content,recipe.title).items;'));
console.log('PASS: actual desktop online entry uses editor plan; quantities and protein requirements preserved; water-only plan empty');

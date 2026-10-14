require('./recipe-audit-runtime.cjs');
const assert=require('node:assert/strict');
const core=require('../src/app/components/ziiply/justiina/recipeCore.ts');
const search=require('../src/app/components/ziiply/justiina/recipeSearch.ts');
const coverage=require('../src/app/components/ziiply/justiina/recipeSearchCoverage.ts');
const normal=require('../src/app/components/ziiply/ziiplyCore.ts');
const recipes=require('./fixtures/recipe-audit-20.json');
const snapshot=require('./fixtures/recipe-audit-20-products.json');
let steps=0,missing=0;
for(const recipe of recipes){
 const draft=core.parseRecipeText(recipe.title+'\nAinekset:\n'+recipe.ingredients.join('\n')+'\nValmistus:\n'+recipe.instructions);
 assert.equal(draft.ingredients.length,recipe.ingredients.length,recipe.title+' lost or invented ingredient');
 const plan=core.prepareRecipeSearch(draft.ingredients,draft.instructions,recipe.title);
 assert.deepEqual(plan.terms,recipe.expectedTerms,recipe.title+' source ingredient interpretation');
 for(const item of plan.items){
  steps++;
  const expanded=coverage.recipeCoverageQueries(item.searchTerm,item);
  const candidates=expanded.length?expanded:normal.getNormalSearchQueries(item.searchTerm).slice(0,6);
  let products=[];
  for(const query of candidates){
   const rows=(snapshot.queries[query]?.ids||[]).map(id=>snapshot.products[id]);
   const accepted=rows.filter(product=>core.recipeProductCompatible(item.name,product,item));
   products.push(...accepted);
   if(!expanded.length&&accepted.some(product=>search.recipeFishFreshnessTier(item.name,product,item)===0))break;
  }
  const unavailable=recipe.unavailableTerms.includes(item.searchTerm);
  if(unavailable){assert.equal(products.length,0,recipe.title+' silently substituted '+item.name);missing++;}
  else assert.ok(products.length,recipe.title+' lost '+item.name);
 }
}
const parsed=core.parseRecipeIngredient('1 ps (400 g) makaroneja');assert.equal(parsed.amount,400);assert.equal(parsed.unit,'g');
assert.equal(core.parseRecipeIngredient('1 iso (125 g) sipuli').amount,125);
assert.equal(core.parseRecipeIngredient('2 (n. 300 g) maustamattomia broilerin rintafileitä').amount,300);
assert.equal(core.parseRecipeIngredient('n. 15 cm pala purjoa').amount,null);
assert.equal(core.recipeRetailPackageCount(core.parseRecipeIngredient('12 kananmunaa'),{name:'Farmimuna 348g M6 Vapaa kananmuna'}),2);
assert.equal(core.recipeRetailPackageCount(core.parseRecipeIngredient('12 kananmunaa'),{name:'Kultamuna vapaa kananmuna XL6 468g'}),2);
const generic=core.parseRecipeIngredient('400 g jauhelihaa');
assert.equal(core.prepareRecipeSearch([generic],'','Kanamakaronilaatikko').items[0].proteinRequirement.species,'kana');
assert.equal(core.prepareRecipeSearch([core.parseRecipeIngredient('400 g naudan jauhelihaa')],'','Kanamakaronilaatikko').items[0].proteinRequirement.species,'nauta');
const titleOnly=core.parseRecipeText('Lohikeitto\nAinekset:\n500 g perunoita\n2 dl kermaa');
assert.equal(titleOnly.ingredients.length,2);
assert.ok(!core.prepareRecipeSearch(titleOnly.ingredients,titleOnly.instructions,titleOnly.title).terms.some(term=>/lohi/.test(term)));
for(const [ingredient,bad] of [
 ['sitruuna','Villi Vichy Sitruuna 0,33l'],['voi','Gårdschips Ruskistettu voi & punasipuli 150g'],
 ['tuoretta inkivääriä','Rainbow tonnikalaa inkiväärillä 185g'],['basilikaa','Semper couscous kana & basilika 120g'],
 ['savulohta','Kala-Kallen Savulohikukko 182g'],['kananjauhelihaa','Atria Nauta-Kana jauheliha 400g'],
 ['Pirkka Italian yrtit tuorejuustoa','Philadelphia Original tuorejuusto 200g']
])assert.equal(core.recipeProductCompatible(ingredient,{name:bad}),false,ingredient+' accepted '+bad);
assert.equal(recipes.length,20);
console.log(`PASS: 20 source recipes; ${steps} ingredient steps; ${steps-missing} have matching real API products; ${missing} unavailable exact ingredients retained as missing; quantities and title-only regressions`);

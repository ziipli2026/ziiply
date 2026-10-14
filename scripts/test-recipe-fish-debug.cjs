require('./recipe-audit-runtime.cjs');
const assert=require('node:assert/strict');
const {parseRecipeIngredient,recipeRetailPackageCount}=require('../src/app/components/ziiply/justiina/recipeCore.ts');
const {recipeProductCompatible,recipeProductRejectionReason,prioritizeRecipeFishProducts}=require('../src/app/components/ziiply/justiina/recipeSearch.ts');
const {rankProductResultsByRelevanceAndPrice}=require('../src/app/components/ziiply/ziiplyCore.ts');
// Actual nine API products supplied in the user's desktop DEBUG on 14 October.
const products=require('./fixtures/recipe-fish-debug-products.json');
for(const input of ['silakoita','silakkafileitä']){
 const allowed=products.filter(p=>recipeProductCompatible(input,p));
 assert.deepEqual(allowed.map(p=>p.id),[48,19449,20655]);
 const base=rankProductResultsByRelevanceAndPrice('silakka',allowed,p=>p.price);
 const ordered=prioritizeRecipeFishProducts(input,base);
 assert.deepEqual(ordered.map(p=>p.id),[19449,48,20655]);
 assert.equal(ordered[0].name,'Kotimaista Silakkafilee MSC 250 g');
 assert.equal(ordered.at(-1).name,'Merihyvä silakkafile 300g irtopakaste');
}
assert.equal(recipeProductRejectionReason('silakoita',products.find(p=>p.id===1859892)),'non_food_product');
assert.equal(recipeProductRejectionReason('silakoita',products.find(p=>p.id===3919)),'ready_meal_is_not_ingredient');
for(const name of ['Lohikeitto 300 g','Savulohifilee 300 g','Graavilohifilee 200 g','Lohifilee teriyakikastikkeessa 300 g'])assert.equal(recipeProductCompatible('lohta',{name}),false,name);
assert.equal(recipeProductCompatible('lohta',{name:'Tuore lohifilee 600 g'}),true);
const fish=parseRecipeIngredient('600 g silakoita tai 300 g silakkafileitä');
assert.equal(fish.name,'silakkafileitä');assert.equal(fish.amount,300);assert.equal(fish.unit,'g');
assert.equal(recipeRetailPackageCount(fish,products.find(p=>p.id===19449)),2);
console.log('PASS: actual DEBUG fish products; fresh first, raw frozen fallback, 6 wrong products rejected; 300 g fillet alternative uses 2 x 250 g');

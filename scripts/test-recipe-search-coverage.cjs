require('./recipe-audit-runtime.cjs');
const assert = require('node:assert/strict');
const {recipeCoverageQueries,mergeRecipeSearchResponses}=require('../src/app/components/ziiply/justiina/recipeSearchCoverage.ts');
const {prepareRecipeSearch}=require('../src/app/components/ziiply/justiina/recipeCore.ts');
const fish=prepareRecipeSearch([{id:'fish',name:'silakkafileitä',amount:300,unit:'g',uncertain:false,atHome:false}]).items[0];
assert.deepEqual(recipeCoverageQueries('silakkafilee',fish),['silakkafilee','silakka']);
const merged=mergeRecipeSearchResponses([
 {source:'s-kaupat-normal-v220',products:[{id:1,name:'Hätälä Silakkafilee MSC n5kg',price:12}]},
 {source:'ruoanhinta-s',items:[{id:1,name:'Hätälä Silakkafilee MSC n5kg',price:1200},{id:2,name:'Kotimaista Silakkafilee MSC 250 g',price:399}]}
]);
assert.equal(merged.products.length,2);
assert.equal(merged.products[0].__recipeResponseSource,'s-kaupat-normal-v220');
assert.equal(merged.products[1].__recipeResponseSource,'ruoanhinta-s');
assert.equal(merged.products[1].price,399);
assert.deepEqual(recipeCoverageQueries('sokeri',{searchTerm:'sokeri'}),['sokeri','taloussokeri','hienosokeri','ruokosokeri','fariinisokeri']);
assert.deepEqual(recipeCoverageQueries('silakka'),[]);
assert.deepEqual(recipeCoverageQueries('tomusokeri',{searchTerm:'tomusokeri'}),[]);
const {recipeProductCompatible}=require('../src/app/components/ziiply/justiina/recipeSearch.ts');
const actual=require('./fixtures/recipe-fish-debug-products.json');
const first=actual.filter(p=>p.name.includes('n5kg'));
const expanded=mergeRecipeSearchResponses([{products:first},{products:actual}]);
assert.equal(first.filter(p=>recipeProductCompatible(fish.name,p,fish)).length,1);
assert.equal(expanded.products.filter(p=>recipeProductCompatible(fish.name,p,fish)).length,3);
console.log('Recipe query coverage, deduplication and per-response price units passed');

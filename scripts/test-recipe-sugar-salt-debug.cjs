require('./recipe-audit-runtime.cjs');
const assert=require('node:assert/strict');
const {recipeProductCompatible}=require('../src/app/components/ziiply/justiina/recipeSearch.ts');
const fixture=require('./fixtures/recipe-sugar-salt-debug-products.json');
const sugar=fixture.sokeri.filter(p=>recipeProductCompatible('sokeria',p));
assert.ok(sugar.length);
assert.ok(sugar.every(p=>p.name.includes('Dansukker Siro erikoishieno sokeri')),JSON.stringify(sugar));
const salt=fixture.merisuola.filter(p=>recipeProductCompatible('karkeaa merisuolaa',p));
assert.ok(salt.length);assert.ok(salt.every(p=>!/chilillä|valkosipulilla/.test(p.name)));
for(const name of ['Dansukker Siro erikoishieno sokeri 1kg','Dansukker suomalainen taloussokeri 1kg','Ruokosokeri 500g','Fariinisokeri 500g'])assert.equal(recipeProductCompatible('sokeria',{name}),true,name);
for(const name of ['Sokeriherne 150g','Coop jäätee sokeriton 1,5l','Sokerimassa 250g','Sokeriruoko lautanen 10kpl','Meira sinappi vähemmän sokeria'])assert.equal(recipeProductCompatible('sokeria',{name}),false,name);
console.log('PASS: actual new DEBUG; sugar '+fixture.sokeri.length+' → '+sugar.length+' actual sugar products; plain salt '+fixture.merisuola.length+' → '+salt.length);
for(const [ingredient,name]of [
 ['suolaa','Krit Finitas Cracker suola 150g'],
 ['mustapippuria','Cracker mustapippuri 150g'],
 ['suolaa','Sea salt crisps 150g'],
 ['paprikajauhetta','Paprika breadsticks 100g']
])assert.equal(recipeProductCompatible(ingredient,{name}),false,name);
assert.equal(recipeProductCompatible('suolaa',{name:'JOZO 1kg Hieno suola jodioitu'}),true);
console.log('PASS: English snack names cannot qualify as seasonings');

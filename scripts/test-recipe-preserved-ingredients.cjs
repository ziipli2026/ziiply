require('./recipe-audit-runtime.cjs');
const assert=require('node:assert/strict');
const core=require('../src/app/components/ziiply/justiina/recipeCore.ts');
const recipe=core.parseRecipeText([
 '1 kpl Omena', '1 kpl suippopaprika', '1 kpl Suolakurkku', '8 kpl Säilöttyä punajuuria',
 '1 kpl Punasipuli', '0,50 dl Majoneesia', '200 g Smetanaa', '1 tl Suolaa',
 '1 tl Mustapippuria', 'Punajuurten etikkalientä',
].join('\n'));
const prepared=core.prepareRecipeSearch(recipe.ingredients);
const {recipeCoverageQueries}=require('../src/app/components/ziiply/justiina/recipeSearchCoverage.ts');
for(const [line,term,query,allowed,rejected] of [
 ['Suolakurkku','suolakurkku','suolakurkku','Suolakurkut 670 g',['Kurkku 1 kpl','Suolakurkku-tillikastike 180 g']],
 ['Säilöttyä punajuuria','punajuuri säilyke','punajuuri','Punajuuriviipaleita 560/370 g',['Punajuuri 500 g','Punajuurisalaatti 300 g']],
 ['Majoneesia','majoneesi','majoneesi','Aito majoneesi 400 g',['Tonnikalasalaatti majoneesissa 200 g']],
 ['Smetanaa','smetana','smetana','Smetana 120 g',['Smetanakastike 200 g','Ranskankerma 200 g']],
]){
 const ingredient=prepared.items.find(item=>item.name===line);
 assert.equal(ingredient?.searchTerm,term,line);
 assert.ok([term,...recipeCoverageQueries(term,ingredient)].includes(query),line);
 assert.ok(core.recipeProductCompatible(line,{name:allowed},ingredient),allowed);
 for(const name of rejected)assert.equal(core.recipeProductCompatible(line,{name},ingredient),false,name);
}
assert.equal(prepared.items.find(item=>item.searchTerm==='majoneesi').amount,50);
assert.equal(prepared.items.find(item=>item.searchTerm==='smetana').amount,200);
console.log('Recipe ingredient matching: 4/4');

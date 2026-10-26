require('./recipe-audit-runtime.cjs');
const assert=require('node:assert/strict');
const {parseRecipeIngredient,prepareRecipeSearch,recipeProductCompatible}=require('../src/app/components/ziiply/justiina/recipeCore.ts');
const {recipeCoverageQueries}=require('../src/app/components/ziiply/justiina/recipeSearchCoverage.ts');
const {getNormalSearchQueries}=require('../src/app/components/ziiply/ziiplyCore.ts');
const live=require('./fixtures/recipe-qualified-products.json');
const cases=[
 ['1 tl ancho chilimaustetta','Santa Maria Ancho-Chili, purkki 35g'],
 ['1 vihreä paprika','Paprika vihreä ulkomainen'],
 ['2 dl Pirkka emmental-mozzarellajuustoraastetta','Pirkka emmental-mozzarella juustoraaste 150g vähälaktoosinen'],
 ['180 g Pirkka Italian yrtit tuorejuustoa','Pirkka tuorejuusto Italian yrtit 180g laktoositon']
];
for(const [line,expected]of cases){
 const item=prepareRecipeSearch([parseRecipeIngredient(line)]).items[0];
 const queries=recipeCoverageQueries(item.searchTerm,item,getNormalSearchQueries(item.searchTerm).slice(0,6));
 const accepted=queries.flatMap(q=>live.queries[q]||[]).filter(p=>recipeProductCompatible(item.name,p,item));
 assert.ok(accepted.some(p=>p.name===expected),line+' did not find '+expected);
 if(item.searchTerm==='juustoraaste')assert.equal(queries[0],'emmental mozzarella juustoraaste');
 if(item.searchTerm==='tuorejuusto')assert.equal(queries[0],'italian yrtit tuorejuusto');
 assert.ok(!accepted.some(p=>/sips|oliivi|keitto/.test(p.name.toLowerCase())),line+' admitted incidental ingredient');
}
for(const name of ['Pirkka emmental-mozzarella juustoraaste','Coop emmental juustoraaste']){
 assert.equal(recipeProductCompatible('emmental-mozzarellajuustoraastetta',{name}),name.includes('mozzarella'));
}
const rice=prepareRecipeSearch([parseRecipeIngredient('1 dl villiriisisekoitusta')]).items[0];
const qs=recipeCoverageQueries(rice.searchTerm,rice);
assert.ok(qs.includes('villi riisi'));assert.ok(qs.includes('wild rice'));
for(const name of ['Riisi ja villiriisi 500 g','Wild rice blend 500g','Villiriisisekoitus 500g'])assert.ok(recipeProductCompatible(rice.name,{name},rice),name);
for(const name of ['Riisi-kaura 800g','Vihannes-riisisekoitus 300g','Villiriisi välipalakakku','Wild rice blend koiran täysravinto'])assert.equal(recipeProductCompatible(rice.name,{name},rice),false,name);
assert.equal((live.queries['villi riisi']||[]).length,0);assert.equal((live.queries['wild rice']||[]).length,0);
console.log('PASS: four exact ingredient identities (five missing recipe rows) found in live K-store responses; qualifier-first queries; wild rice name variants; unrelated products rejected');

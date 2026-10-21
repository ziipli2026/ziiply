require('./recipe-audit-runtime.cjs');
const assert = require('node:assert/strict');
const core = require('../src/app/components/ziiply/justiina/recipeCore.ts');
const {recipeCoverageQueries} = require('../src/app/components/ziiply/justiina/recipeSearchCoverage.ts');
const {recipeCategoryRejection} = require('../src/app/components/ziiply/justiina/recipeCategories.ts');

const sausage = {name:'HK Sininen lenkkimakkara 580 g',category:'liha-ja-kasviproteiinit/makkarat/lenkkimakkarat'};
for (const query of ['hk sininen lenkkimakkaraa', 'lenkkimakkaraa tai', 'lenkkimakkaraa']) {
  assert.equal(core.recipeProductCompatible(query,sausage),true,query);
  const item=core.prepareRecipeSearch([core.parseRecipeIngredient('500 g '+query)]).items[0];
  assert.ok(!item.searchTerm.endsWith(' tai'));
  assert.ok(!item.searchTerm.includes('lenkkimakkaraa'));
  assert.ok(recipeCoverageQueries(item.searchTerm,item).includes('lenkkimakkara'));
}
assert.equal(core.recipeProductCompatible('hk sininen lenkkimakkaraa',{name:'Atria lenkkimakkara 500 g',category:sausage.category}),false);
assert.equal(core.recipeProductCompatible('lenkkimakkaraa',{name:'Grillimakkara 400 g',category:'Makkarat'}),false);
assert.equal(core.recipeProductCompatible('lenkkimakkaraa',{name:'Lenkkimakkara-ateria',category:'valmisruoat/ateriat'}),false);
assert.equal(core.recipeProductCompatible('lenkkimakkaraa',{name:'Lenkkimakkara',category:'CAAAAA'}),true);

// Different species, brands, compound and separate words use the same category path.
for (const [ingredient, title] of [
  ['naudanfondia','Valmistaja A naudanfondi 180 ml'],
  ['naudan fondia','Valmistaja B naudanfondi 200 ml'],
  ['kananfondia','Valmistaja A kanan fondi 180 ml'],
  ['kasvisfondia','Valmistaja B kasvisfondi 200 ml'],
]) {
  const item=core.prepareRecipeSearch([core.parseRecipeIngredient('2 rkl '+ingredient)]).items[0];
  assert.equal(item.proteinRequirement,null,ingredient+' must not become raw meat');
  const queries=recipeCoverageQueries(item.searchTerm,item);
  assert.ok(queries.includes('fondi'));
  assert.ok(!queries.some(query=>/naudanliha|broileri/.test(query)));
  assert.equal(core.recipeProductCompatible(ingredient,{name:title,category:'mausteet-ja-maustaminen/liemet-ja-fondit'},item),true);
  for (const category of ['lapset/lastenruoat','kuivatuotteet/nuudelit','valmisruoat/ateriat']) {
    assert.equal(core.recipeProductCompatible(ingredient,{name:title,category},item),false,category+' overrides matching title');
  }
}
assert.equal(core.recipeProductCompatible('naudanfondia',{name:'Naudanlihasose 6 kk',category:'lapset/lastenruoat'}),false);
assert.equal(core.recipeProductCompatible('naudanfondia',{name:'Naudanlihanmakuiset nuudelit',category:'riisit-ja-pastat/nuudelit'}),false);
assert.equal(core.recipeProductCompatible('naudanfondia',{name:'Kananfondi',category:'Liemet ja fondit'}),false);
assert.equal(recipeCategoryRejection('fondi',{name:'Sose',category:'Liemet ja fondit'}),null,'category may establish type independently of the title');
assert.equal(core.recipeProductCompatible('naudan jauhelihaa',{name:'Naudan jauheliha 400 g',category:'Liha'}),true,'raw meat path still works');
assert.equal(core.recipeProductCompatible('gluteenitonta lenkkimakkaraa',{name:'Lenkkimakkara',category:'Lenkkimakkarat'}),false,'do not silently drop dietary requirements');
console.log('PASS: category-first recipe matching, inflections, brand identity, stock searches and misleading-category regressions');

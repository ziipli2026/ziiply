require('./recipe-audit-runtime.cjs');
const assert=require('node:assert/strict');
const {parseRecipeText,prepareRecipeSearch}=require('../src/app/components/ziiply/justiina/recipeCore.ts');
const {recipeProductCompatible,prioritizeRecipeFishProducts}=require('../src/app/components/ziiply/justiina/recipeSearch.ts');
const {inferRecipeProtein,proteinProductRejection}=require('../src/app/components/ziiply/justiina/recipeProtein.ts');
const rows=require('./fixtures/recipe-seasoning-debug-products.json');
const draft=parseRecipeText('Tillisilakat\nAinekset:\n2 rkl karkeaa merisuolaa\n1/2 dl hienonnettua tilliä\n10 maustepippuria\n5–7 valkopippuria');
const plan=prepareRecipeSearch(draft.ingredients);
for(const item of plan.items){
 const products=rows[item.searchTerm];
 const accepted=products.filter(p=>recipeProductCompatible(item.name,p,item));
 assert.ok(accepted.length,item.name+' all rejected');
 if(item.searchTerm==='merisuola'){
  assert.ok(accepted.some(p=>/karkea/.test(p.name)));
  assert.ok(accepted.every(p=>/suola|^CAABGBAAI/.test(p.category)),JSON.stringify(accepted));
  assert.ok(accepted.some(p=>/hieno/.test(p.name)),'fine salt remains an option');
  assert.ok(accepted.every(p=>/merisuola/.test(p.name.toLowerCase())&&!/keksi|sipsi|suklaa|riisikakku|kanan|broiler|levite|näkkileipä/i.test(p.name)),JSON.stringify(accepted));
  assert.match(prioritizeRecipeFishProducts(item.name,accepted,item)[0].name,/karkea/);
 }
 if(item.searchTerm==='tilli')assert.ok(accepted.every(p=>! /sipsi|oliivi|creme fraiche|peruna|mauste|purkki/i.test(p.name)&&!/^caabgbaak/i.test(p.category)),JSON.stringify(accepted));
 if(item.wholeSpice)assert.ok(accepted.every(p=>! /jauh/i.test(p.name)),JSON.stringify(accepted));
}
for(const name of ['Dansukker Siro erikoishieno sokeri 1 kg','Dansukker taloussokeri 1kg','Ruokosokeri 500 g','Fariinisokeri 500 g'])assert.equal(recipeProductCompatible('sokeria',{name}),true,name);
for(const name of ['Vartalosokeri 300 g','Vaniljasokeri 100g','Hillosokeri 1kg','Sokeri karamellikarkki 100g'])assert.equal(recipeProductCompatible('sokeria',{name}),false,name);
const tests=[
 ['400 g broilerinfileitä','Paista broileri.','Broilerinfilee raaka 400 g',null],
 ['400 g broilerinfileitä','Paista broileri.','Broilerinfilee kypsä 400 g','raw_protein_required'],
 ['400 g broilerinfileitä','','Broilerin pastalaatikko 400 g','ready_meal_is_not_ingredient'],
 ['300 g kypsää kanaa','','Broilerinfilee kypsä 300 g',null],
 ['300 g kypsää kanaa','','Broilerinfilee raaka 300 g','cooked_protein_required'],
 ['300 g pakasteseitifilettä','','Seitifilee tuore 300 g','frozen_protein_required'],
 ['300 g pakasteseitifilettä','','Seitifilee pakaste 300 g',null],
 ['300 g seitifilettä','Sulata kala ennen paistamista.','Seitifilee pakaste 300 g',null],
 ['300 g lohta','Sulata voi. Paista lohi.','Lohifilee tuore 300 g',null],
 ['200 g savulohta','','Savulohifilee 200 g',null],
 ['200 g savulohta','','Lohifilee tuore 200 g','smoked_protein_required'],
 ['1 prk tonnikalaa','','Tonnikala paloina öljyssä 185/140 g',null],
 ['400 g naudan jauhelihaa','','Naudan jauheliha 400 g',null],
 ['400 g naudan jauhelihaa','','Sika-nauta jauheliha 400 g','protein_species_mismatch'],
 ['400 g naudan jauhelihaa','','Naudan jauheliha lasagne 400 g','ready_meal_is_not_ingredient'],
];
for(const [line,instructions,name,reason] of tests){
 const d=parseRecipeText('Ruoka\nAinekset:\n'+line+'\nValmistus:\n'+instructions),item=prepareRecipeSearch(d.ingredients,d.instructions).items[0];
 assert.ok(item.proteinRequirement,line+' missing protein interpretation');
 assert.equal(proteinProductRejection(item.proteinRequirement,{name}),reason,line+' → '+name);
 assert.equal(recipeProductCompatible(item.name,{name},item),reason===null,line+' gate');
}
const req=inferRecipeProtein('kananfilee');assert.equal(req.processing,'raw');assert.equal(req.storage,'prefer_fresh');
const pack=inferRecipeProtein('valmispakattua broilerinfileetä');assert.equal(pack.processing,'raw');
console.log('PASS: actual salt/herb/whole-spice DEBUG rows; broader culinary sugars; 15 protein state and context scenarios');

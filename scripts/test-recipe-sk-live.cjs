require('./recipe-audit-runtime.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const {onlineRecipeSearchPlan}=require('../src/app/components/ziiply/justiina/onlineRecipe.ts');
const {recipeProductCompatible,parseRecipeIngredient,scaleIngredients,prepareRecipeSearch,recipeRetailPackageCount}=require('../src/app/components/ziiply/justiina/recipeCore.ts');
const {recipeProductSearchTerm}=require('../src/app/components/ziiply/justiina/recipeSearch.ts');
const snapshot=require('./fixtures/recipe-sk-live-products.json');
const recipes=require('./fixtures/wiki-recipe-flow.json');
let checks=0;
for(const title of ['Makaronilaatikko','Bataatti-porkkanakeitto']){
 const recipe=recipes.find(r=>r.title===title),plan=onlineRecipeSearchPlan(recipe.content,title);
 for(const item of plan.items){
  if(item.searchTerm==='rasvaa')continue; // The source does not specify the fat type.
  for(const chain of ['s','k']){
   const response=snapshot.responses.find(r=>r.chain===chain&&r.query===item.searchTerm);
   assert.ok(response&&response.status===200,title+' '+item.name+' '+chain);
   assert.ok(response.items.some(p=>recipeProductCompatible(item.name,p,item)),title+' '+item.name+' '+chain);
   checks++;
  }
 }
}
const badNames=/Krit Finitas Cracker|House suola-|Jauhelihamauste|jauhelihamauste|Jauhelihapihv|jauhelihapihv|Jauhelihakiusaus|jauhelihavart|Jauhelihaperunamuusi|jauhelihawrap|kananmunan valkuainen|Kananmunankorvike|Lasagne pasta|Tagliatelle pasta|Pyttipannu|lohkoperunat merisuola|MiniMix|Tonnikalaa lime/;
let rejected=0;
for(const response of snapshot.responses)for(const p of response.items){
 if(badNames.test(p.name)&&['suola','mustapippuri','jauheliha','kananmuna'].includes(response.query)){
  assert.equal(recipeProductCompatible(response.query,p),false,p.name);rejected++;
 }
}
assert.ok(rejected>=30);
assert.equal(recipeProductCompatible('perunaa',{name:'Apetit Kotimainen Peruna & uunijuurekset pakaste 750g'}),false);
assert.ok(snapshot.responses.some(r=>r.source==='s-kaupat-normal-v220'));
assert.ok(snapshot.responses.some(r=>r.source==='ruoanhinta-s'));
console.log(`PASS: ${checks} S/K ingredient checks from 42 deployed API responses; ${rejected} real wrong-type products rejected`);
assert.equal(recipeProductSearchTerm('nokare voita'),'voi');
assert.equal(recipeProductSearchTerm('pussi kuorittuja katkarapuja'),'katkarapu');
assert.equal(recipeProductCompatible('pussi kuorittuja katkarapuja',{name:'Katkarapu kuorimaton 500g'}),false);
for(const title of ['Munakas','Tomaatti-kalakeitto']){
 const recipe=recipes.find(r=>r.title===title),plan=onlineRecipeSearchPlan(recipe.content,title);
 assert.ok(plan.items.some(i=>i.uncertain&&i.amount===null),title+' vague source quantities must remain reviewable');
 assert.equal(plan.items.length,title==='Munakas'?4:8);
}
console.log('PASS: fish/omelette vague source lines retained for review; butter and shrimp forms canonicalized');

const base=['600 g perunaa','300 g porkkanaa','400 g lenkkimakkaraa','1 tl suolaa'].map((line,i)=>parseRecipeIngredient(line,String(i)));
const products=[{name:'Peruna 1 kg'},{name:'Porkkana 500 g'},{name:'HK Uunilenkki 400 g'},{name:'Suola 1kg'}];
const expected={2:[1,1,1,null],6:[1,1,2,null],10:[2,2,3,null]};
for(const servings of [2,6,10,2]){
 const items=prepareRecipeSearch(scaleIngredients(base,4,servings),'Keitä kasvikset. Lisää lenkkimakkara.','Makkarakeitto annostesti').items;
 assert.deepEqual(items.map((i,n)=>recipeRetailPackageCount(i,products[n])),expected[servings]);
 assert.equal(items[0].amount,600*servings/4);
}
console.log('PASS: 2 → 6 → 10 → 2 servings preserve exact amounts and retail package counts');

// Execute the real desktop functions with provider/UI boundaries stubbed.
const page=fs.readFileSync('src/app/desktop-preview/page.tsx','utf8');
const add=page.slice(page.indexOf('  function addRecipeSelectionToCart('),page.indexOf('\n  useEffect(()=>{',page.indexOf('  function addRecipeSelectionToCart(')));
let captured;
const selection={recipeSearchStepRef:{current:0},recipeSearchItemsRef:{current:[]},activeRecipeSelectionIngredient:()=>({id:'celery',name:'pala selleriä',amount:null}),selectedRecipePackageCount:()=>null,desktopPackageSize:()=>null,appendDesktopRecipeDebug(){},sessionStorage:{getItem:()=>'{"title":"Keitto"}'},addDesktopCartItem:p=>{captured=p},justiinaAddedDuringSelectionRef:{current:false},resumeDesktopVoiceList(){}};
vm.createContext(selection);vm.runInContext(ts.transpileModule(add,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,selection);
selection.addRecipeSelectionToCart({name:'Selleri',ean:'2000597800005',__price:2.99});
assert.equal(captured.price,null);assert.equal(captured.__recipeWeightNeedsReview,true);
selection.desktopPackageSize=()=>1000;
selection.addRecipeSelectionToCart({name:'Lanttu 1kg',ean:'6438574525171',__price:1.39});
assert.equal(captured.price,1.39);

async function testMissing(){
 const start=page.indexOf('  async function runDesktopVoiceList('),end=page.indexOf('\n  function requestDesktopListExit(',start);
 const cart=[];let opened=false;
 const env={desktopVoiceRunRef:{current:1},recipeSearchStepRef:{current:0},recipeSearchItemsRef:{current:[]},recipeTermsRef:{current:[]},justiinaUserEditedRef:{current:false},desktopVoiceWaitRef:{current:null},cancelDesktopVoiceList(){},appendDesktopRecipeDebug(){},setDesktopListPending(){},setJustiinaActiveTerm(){},runDesktopJustiinaSearch:async()=>false,setJustiinaResultsOpen(){},setWorkspace(){},setCartOpen:()=>{opened=true},setCartNotice(){},addDesktopCartItem:p=>cart.push(p),recipeProductSearchTerm:()=> 'tuntematon aines'};
 vm.createContext(env);vm.runInContext(ts.transpileModule(page.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,env);
 const run=env.runDesktopVoiceList('tuntematon aines',[{id:'missing',name:'tuntematon aines',amount:25,unit:'g'}]);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(opened,false,'No-match step must wait for explicit skip');assert.equal(typeof env.desktopVoiceWaitRef.current,'function');
 env.desktopVoiceWaitRef.current();await run;
 assert.equal(opened,true);assert.equal(cart.length,1);assert.equal(cart[0].isMemo,true);assert.equal(cart[0].price,null);assert.equal(cart[0].name,'Puuttuva aines: 25 g tuntematon aines');
 console.log('PASS: unknown loose weight is not priced as one kg; missing ingredient waits and persists in cart');
}
async function testNoMatchPanel(){
 const start=page.indexOf('  async function runDesktopJustiinaSearch(');
 const fn=page.slice(start,page.indexOf('\n  }',page.indexOf('}finally{setJustiinaLoading(false)}',start))+5);
 let panelOpen=false;
 const ingredient={id:'wild',name:'villiriisiä',amount:25,unit:'g'};
 const noop=()=>{};
 const env={classifyRecipeIngredient:()=>null,justiinaQuery:'villiriisiä',recipeSearchItemsRef:{current:[ingredient]},recipeSearchStepRef:{current:0},selectedStores:{s:{id:292,name:'Prisma'}},storeKind:()=> 'sHyper',setJustiinaDebug:noop,appendDesktopRecipeDebug:noop,setJustiinaResults:noop,setJustiinaResultsOpen:v=>{panelOpen=v},setJustiinaLoading:noop,setJustiinaMessage:noop,recipeCoverageQueries:()=>[],getNormalSearchQueries:q=>[q],desktopVoiceRunRef:{current:1},fetch:async()=>({ok:true,status:200,json:async()=>({items:[]})}),URLSearchParams,rankNormalSearchResults:()=>[],rankProductResultsByRelevanceAndPrice:()=>[],prioritizeRecipeFishProducts:()=>[],justiinaLastSearchedRef:{current:''},justiinaUserEditedRef:{current:false},justiinaAddedDuringSelectionRef:{current:false},recipeProductCompatible};
 vm.createContext(env);vm.runInContext(ts.transpileModule(fn,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,env);
 assert.equal(await env.runDesktopJustiinaSearch('villiriisiä',1),false);
 assert.equal(panelOpen,true,'No-match recipe step must retain the visible skip panel');
 console.log('PASS: empty provider response retains recipe selection panel and skip control');
}
Promise.all([testMissing(),testNoMatchPanel()]).catch(error=>{console.error(error);process.exitCode=1});

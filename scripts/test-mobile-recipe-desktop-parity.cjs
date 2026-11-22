require('./recipe-audit-runtime.cjs');
const assert=require('node:assert/strict');
const {recipeProductCompatible,parseRecipeIngredient,prepareRecipeSearch}=require('../src/app/components/ziiply/justiina/recipeCore.ts');
const {recipeProductSearchTerm}=require('../src/app/components/ziiply/justiina/recipeSearch.ts');
const {recipeCoverageQueries}=require('../src/app/components/ziiply/justiina/recipeSearchCoverage.ts');
const {fetchOnlineRecipeJson}=require('../src/app/components/ziiply/justiina/onlineRecipe.ts');
const butter={name:'Valio voi 500g normaalisuolainen',category:'maito-juusto-munat-ja-rasvat/rasvat/voit'};
for(const ingredient of ['nokare voita','voita voiteluun','voita paistamiseen','voita vuoan voiteluun','voita tarvittaessa']){
 assert.equal(recipeProductSearchTerm(ingredient),'voi');
 assert.equal(recipeProductCompatible(ingredient,butter),true);
 assert.equal(recipeProductCompatible(ingredient,{name:'Flora & voi 500g',category:'maito-juusto-munat-ja-rasvat/rasvat/rasvalevitteet'}),false);
}
assert.equal(recipeProductSearchTerm('ruokaöljyä'),'ruokaöljy');
assert.equal(recipeProductCompatible('kermaa',{name:'Valio kuohukerma 2 dl'}),true);
for(const name of ['Anton&Anton kana & kerma-tomaattipasta 350g','Elonen kerma-mansikka kranssi 435g','Herkku vihreä tee päärynä-kerma 80 g'])assert.equal(recipeProductCompatible('kermaa',{name}),false);
assert.equal(recipeProductCompatible('parsakaalia',{name:'Apetit Parsakaalia pakaste 200g'}),true);
for(const [ingredient,term] of [['nakkeja','nakki'],['ruisjauhoja','ruisjauho'],['ohrasuurimoita','ohrasuurimo'],['risottoriisiä','risottoriisi'],['puolukoita','puolukka'],['valkokaalia','valkokaali'],['raparperia','raparperi'],['meiramia','meirami']])assert.equal(recipeProductSearchTerm(ingredient),term);
const potato=prepareRecipeSearch([parseRecipeIngredient('500 g perunoita')]).items[0];
assert.ok(recipeCoverageQueries(potato.searchTerm,potato).includes('peruna'));
const optional=prepareRecipeSearch([parseRecipeIngredient('50 g voita'),parseRecipeIngredient('tarvittaessa voita')]);
assert.equal(optional.items.length,1);assert.equal(optional.items[0].amount,50);
const Module=require('node:module'),path=require('node:path'),root=path.resolve('.'),load=Module._load,resolve=Module._resolveFilename;
Module._resolveFilename=function(name,...args){return resolve.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,...args)};
Module._load=function(name,...args){
 if(name==='next/server')return {NextResponse:{json:(body,init)=>Response.json(body,init)},after:()=>{}};
 if(name==='@/lib/eanBank')return {observeEanProductsBestEffort:async()=>{}};
 if(name==='@/app/components/ziiply/offerSearch/providers/skaupatProvider')return {fetchSKaupatNormalProductsV220:async()=>[]};
 return load.call(this,name,...args);
};
(async()=>{
 const realFetch=global.fetch;
 try{
  global.fetch=()=>new Promise(()=>{});
  await assert.rejects(fetchOnlineRecipeJson('https://example.test',new AbortController().signal,10),/aikaraja/);
  for(const [chain,size,store] of [['s',80,292],['k',100,3221]]){
   const {GET}=require('../src/app/api/'+chain+'-products/route.ts');let calls=[];
   global.fetch=async url=>{const p=new URL(url).searchParams;calls.push(Number(p.get('skip')));const page=Number(p.get('skip'))? [{id:9000,...butter,storeItems:[{price:399}]}]:Array.from({length:size},(_,i)=>({id:i+1,name:'Muu tuote '+i,storeItems:[{price:100}]}));return Response.json({items:page});};
   const data=await (await GET(new Request('https://example.test/api/'+chain+'-products?'+new URLSearchParams({store:String(store),search:'voi',recipeIngredient:'voita'})))).json();
   assert.deepEqual(calls,[0,size]);
   const found=data.items.find(p=>p.id==9000);assert.ok(found);assert.equal(found.category,butter.category);assert.equal(recipeProductCompatible('voita',found),true);
   calls=[];await GET(new Request('https://example.test/api/'+chain+'-products?'+new URLSearchParams({store:String(store),search:'voi'})));assert.deepEqual(calls,[0],'ordinary product lookup retains its original fetch path');
  }
 }finally{global.fetch=realFetch;Module._load=load;Module._resolveFilename=resolve;}
 console.log('PASS: butter wording, oil inflection, potato query, optional quantities, stalled recipe timeout, real S/K recipe pagination and K categories');
})().catch(e=>{console.error(e);process.exitCode=1});

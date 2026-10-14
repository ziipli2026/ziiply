require('./recipe-audit-runtime.cjs');
const assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path');
const root=path.resolve('.'),load=Module._load,resolve=Module._resolveFilename;
let own=[],failure=null,calls=[];
Module._resolveFilename=function(name,...args){return resolve.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,...args)};
Module._load=function(name,...args){
 if(name==='@/app/components/ziiply/offerSearch/providers/skaupatProvider')return {fetchSKaupatNormalProductsV220:async(query,storeName)=>{calls.push({query,storeName});if(failure)throw failure;return own}};
 if(name==='@/lib/eanBank')return {observeEanProductsBestEffort:async()=>{}};
 return load.call(this,name,...args);
};
const {GET}=require('../src/app/api/s-products/route.ts');
const {recipeProductCompatible}=require('../src/app/components/ziiply/justiina/recipeSearch.ts');
const meals=[{id:3919,name:'Saarioinen silakkalaatikko 350g',storeItems:[{price:349}]},{id:2374,name:'Hätälä Paistettu silakkapihvi 200g',storeItems:[{price:398}]}];
global.fetch=async url=>{assert.equal(new URL(url).searchParams.get('storeIds'),'721');return Response.json({items:meals})};
async function request(recipe){return (await GET(new Request('https://example.test/api/s-products?search=silakka&store=721&storeName=S-market%20Jokela'+(recipe?'&recipeIngredient=silakkafileit%C3%A4':'')))).json()}
(async()=>{
 own=[{id:'raw',name:'Kotimaista silakkafilee 250 g',price:3.99,ean:'1234567890123'}];
 let data=await request(true);assert.equal(data.source,'s-kaupat-normal-v220');assert.equal(data.items.length,1);assert.equal(data.items[0].price,3.99);assert.equal(calls[0].storeName,'S-market Jokela');
 calls=[];data=await request(false);assert.equal(data.source,'ruoanhinta-s');assert.equal(calls.length,0,'ordinary search unchanged');
 own=[];data=await request(true);assert.equal(data.recipeFallback.matchedCount,0);assert.equal(data.items.filter(p=>recipeProductCompatible('silakkafileitä',p)).length,0);
 failure=new Error('GraphQL storeItems failure');data=await request(true);assert.match(data.recipeFallback.error,/storeItems/);assert.equal(data.items.filter(p=>recipeProductCompatible('silakkafileitä',p)).length,0);
 assert.equal(recipeProductCompatible('sokeria',{name:'Nelson Garden siemen herne, sokeri-, Oregon Sugar Pod',category:'CACBGACAAAAAC'}),false);
 console.log('PASS: actual S route uses selected-store fallback for incompatible recipe results, preserves normal search and price units, reports upstream failure, rejects garden seeds');
})().catch(error=>{console.error(error);process.exitCode=1});

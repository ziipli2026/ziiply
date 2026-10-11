import { chromium } from 'playwright';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out = 'browser-test-results';
await fs.mkdir(out,{recursive:true});
const base = 'http://127.0.0.1:3000';
const browser = await chromium.launch();
const context = await browser.newContext({viewport:{width:390,height:844}});
await context.tracing.start({screenshots:true,snapshots:true});
const page = await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const stores=[
 {id:292,externalId:'fixture-s',name:'Prisma Hyvinkää',type:'S',chain:'S',city:'Hyvinkää',latitude:60.63,longitude:24.86},
 {id:99902,name:'K-Citymarket Hyvinkää',type:'K',chain:'K',city:'Hyvinkää',latitude:60.63,longitude:24.87}
];
const product={id:90001,name:'Valio kevytmaito 1 l',ean:'6408430000128',price:1.25,storeItems:[{price:1.25}]};
const requests=[];
await page.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.origin!==base){
  if(url.hostname.includes('nominatim'))await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({address:{city:'Hyvinkää',postcode:'05800'}})});
  else await route.abort();
  return;
 }
 if(!url.pathname.startsWith('/api/')){await route.continue();return;}
 requests.push({path:url.pathname,method:route.request().method()});
 // No application API request reaches a backend or production database.
 let body={items:[]};
 if(url.pathname.includes('store-search')) body={items:stores,stores};
 if(url.pathname==='/api/s-products'||url.pathname==='/api/s-ean-product')body={items:[product]};
 if(url.pathname==='/api/k-products')body={items:[{...product,id:90002,price:1.45}]};
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});
await page.addInitScript(({stores})=>{
 navigator.geolocation.getCurrentPosition=success=>success({coords:{latitude:60.63,longitude:24.86,accuracy:5},timestamp:Date.now()});
 navigator.geolocation.watchPosition=()=>0;
 localStorage.setItem('ziiply-store-selection-v536',JSON.stringify({version:1,savedAt:Date.now(),activeArea:{label:'Hyvinkää',aliases:['hyvinkää'],sStoreId:292,sStoreName:'Prisma Hyvinkää',kStoreId:99902,kStoreName:'K-Citymarket Hyvinkää'},storeMode:'hyper',storeModeChosenV299:true,selectedChains:{s:true,k:true,lidl:false,tokmanni:false},betweenChainSelectionModeV749:'many',storeCompareScope:'between_chains',usingOwnLocation:false}));
 localStorage.setItem('ziiply-manual-store-overrides-v786',JSON.stringify({sHyper:{id:292,name:'Prisma Hyvinkää'},kHyper:{id:99902,name:'K-Citymarket Hyvinkää'}}));
}, {stores});
let failure;
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});
 await page.getByRole('button',{name:'Kaupat',exact:true}).click({timeout:30000});
 await page.getByPlaceholder('05510 tai Hyvinkää').filter({visible:true}).fill('Hyvinkää');
 await page.waitForResponse(r=>new URL(r.url()).pathname==='/api/store-search',{timeout:30000});
 await page.getByRole('button',{name:/Tavaratalot/}).filter({visible:true}).click();
 const many=page.getByRole('switch',{name:'Valitse yksi tai monta kauppaa'});
 if(await many.getAttribute('aria-checked')!=='true')await many.click();
 for(const chain of ['S-RYHMÄ','K-RYHMÄ']){
   const card=page.locator('[role="button"][aria-pressed]:visible').filter({has:page.locator('img[alt="'+chain+'"]')}).first();
   await card.waitFor({state:'visible',timeout:30000});
   if(await card.getAttribute('aria-pressed')!=='true')await card.click();
 }
 await page.getByText('Prisma Hyvinkää',{exact:false}).filter({visible:true}).first().waitFor({state:'visible',timeout:30000});
 await page.getByText('K-Citymarket Hyvinkää',{exact:false}).filter({visible:true}).first().waitFor({state:'visible',timeout:30000});
 await page.screenshot({path:out+'/00-stores.png',fullPage:true});
 await page.getByRole('button',{name:'Hae',exact:true}).click({timeout:30000});
 const search=page.locator('textarea:visible').first();
 await search.waitFor({state:'visible',timeout:30000});
 await page.screenshot({path:out+'/01-home.png',fullPage:true});
 // Run the real learning module with real browser localStorage.
 const bundle=await build({stdin:{contents:'import * as memory from "./src/app/components/ziiply/search/searchIntentMemory.ts"; window.__searchMemory = memory;',resolveDir:process.cwd()},bundle:true,write:false,platform:'browser',format:'iife'});
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 const learning=await page.evaluate(()=>{
  const m=window.__searchMemory;
  const cases=[['mehu','Valio appelsiinimehu 1 l','Appelsiini 1 kg'],['tee','Lipton musta tee','Pirkka jäätee'],['voi','Valio voi','Voitaikina'],['kerma','Kuohukerma','Kermajuusto'],['rahka','Maitorahka','Rahkapiirakka'],['raejuusto','Raejuusto','Raejuustosalaatti'],['tuorejuusto','Tuorejuusto','Tuorejuustokakku'],['margariini','Flora margariini','Margariini keksi'],['makkara','Grillimakkara','Makkarakeitto'],['leikkele','Kinkkuleikkele','Kinkkuleikkele salaatti'],['hammastahna','Hammastahna','Hammasharja'],['deodorantti','Deodorantti','Suihkugeeli']];
  return cases.map(([query,good,bad])=>{
   m.clearSearchIntentMemory();
   for(let i=0;i<8;i++){m.rememberSearchChoice(query,{name:good});m.rememberSearchChoice(query,{name:bad});}
   return {query,good:m.getLearnedSearchBoost(query,{name:good}),bad:m.getLearnedSearchBoost(query,{name:bad})};
  });
 });
 for(const r of learning){assert.ok(r.good.boost>0,r.query);assert.equal(r.bad.reason,'blocked_by_intent_guardrail',r.query);}
 await fs.writeFile(out+'/learning.json',JSON.stringify(learning,null,2));
 await search.fill('maito');
 await page.getByRole('button',{name:'Justiina',exact:true}).click();
 const add=page.getByRole('button',{name:/Lisää koriin: Valio kevytmaito/}).first();
 await add.waitFor({state:'visible',timeout:60000});
 await page.screenshot({path:out+'/02-search.png',fullPage:true});
 await add.click();
 await page.waitForFunction(()=>{
  const saved=JSON.parse(localStorage.getItem('ziiply-cart-v1')||'null');
  const items=Array.isArray(saved)?saved:saved?.items;
  return Array.isArray(items)&&items.some(x=>String(x.name||x.product?.name).includes('Valio kevytmaito'));
 },{},{timeout:30000});
 await page.screenshot({path:out+'/03-cart.png',fullPage:true});
 await page.getByRole('button',{name:'Vertailu',exact:true}).click();
 await page.getByRole('button',{name:'Halpuusvertailu',exact:true}).filter({visible:true}).click();
 await page.getByText('Prisma',{exact:true}).filter({visible:true}).first().waitFor({state:'visible',timeout:60000});
 await page.getByText('K-Citymarket',{exact:true}).filter({visible:true}).first().waitFor({state:'visible',timeout:60000});
 await page.getByText('1,45',{exact:false}).filter({visible:true}).first().waitFor({state:'visible',timeout:60000});
 await page.getByText('1,25',{exact:false}).filter({visible:true}).first().waitFor({state:'visible',timeout:60000});
 await page.screenshot({path:out+'/04-comparison.png',fullPage:true});
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('BROWSER SEARCH / CART / COMPARISON AND 12 LEARNING CASES PASS');
}catch(e){failure=e;await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});console.error(e); console.error('VISIBLE_UI',await page.locator('body').innerText().catch(()=>''));}
finally{
 await fs.writeFile(out+'/diagnostics.json',JSON.stringify({errors,requests,failure:failure?.stack},null,2));
 await fs.writeFile(out+'/page.txt',await page.locator('body').innerText().catch(()=>'Unavailable'));
 await context.tracing.stop({path:out+'/trace.zip'});
 await browser.close();
}
if(failure)process.exitCode=1;

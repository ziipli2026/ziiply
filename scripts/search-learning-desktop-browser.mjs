import { chromium } from 'playwright';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out='browser-test-results/desktop';
await fs.mkdir(out,{recursive:true});
const base='http://127.0.0.1:3000';
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1600,height:1000}});
await context.tracing.start({screenshots:true,snapshots:true});
const page=await context.newPage();
const errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));
const stores=[{id:292,externalId:'fixture-s',name:'Prisma Hyvinkää',chain:'S',city:'Hyvinkää',latitude:60.63,longitude:24.86},{id:99902,name:'K-Citymarket Hyvinkää',chain:'K',city:'Hyvinkää',latitude:60.63,longitude:24.87}];
const cases=[
 ['mehu','Mehu appelsiini 1 l','Mehujää appelsiini'],
 ['tee','Tee musta 20 kpl','Tee jäätee juoma'],
 ['voi','Voi suolaton 200 g','Voitaikina'],
 ['kerma','Kerma kuohukerma 2 dl','Kermajuusto'],
 ['rahka','Rahka maustamaton 250 g','Rahkapiirakka'],
 ['raejuusto','Raejuusto 200 g','Raejuustosalaatti'],
 ['tuorejuusto','Tuorejuusto 200 g','Tuorejuustokakku'],
 ['margariini','Margariini 400 g','Margariini keksi'],
 ['makkara','Makkara grillimakkara 400 g','Makkarakeitto'],
 ['leikkele','Leikkele kinkku 200 g','Leikkele salaatti'],
 ['hammastahna','Hammastahna 75 ml','Hammastahna hammasharja'],
 ['deodorantti','Deodorantti 50 ml','Deodorantti suihkugeeli']
];
const milk={id:90001,name:'Valio kevytmaito 1 l',ean:'6408430000128',price:125,storeItems:[{price:125}]};
await page.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.origin!==base){await route.abort();return;}
 if(!url.pathname.startsWith('/api/')){await route.continue();return;}
 requests.push({path:url.pathname,search:url.search,method:route.request().method()});
 let body={items:[]};
 if(url.pathname==='/api/store-search')body={items:stores};
 if(['/api/s-products','/api/k-products'].includes(url.pathname)){
   const test=cases.find(c=>c[0]===url.searchParams.get('search'));
   const isK=url.pathname==='/api/k-products';
   const price=isK?145:125;
   const items=test?[{id:isK?92001:91001,name:test[2],price,storeItems:[{price}]},{id:isK?92002:91002,name:test[1],price,storeItems:[{price}]}]:[{...milk,id:isK?90002:90001,price,storeItems:[{price}]}];
   body={items,source:'fixture-cents'};
 }
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
});
await page.addInitScript(({stores})=>{
 navigator.geolocation.getCurrentPosition=success=>success({coords:{latitude:60.63,longitude:24.86,accuracy:5},timestamp:Date.now()});
 navigator.geolocation.watchPosition=()=>0;
 localStorage.setItem('ziiply-desktop-store-choices-v1',JSON.stringify({storeMode:'hyper',selectedChain:null,betweenMode:'many',allStoreSelections:{hyper:Object.fromEntries(stores.map(s=>[String(s.id),s])),local:{}},storeCompareScope:'between_chains',withinChain:null,withinStoreSlots:{S:[null,null],K:[null,null]},storeModeChosen:true}));
},{stores});
let failure;
try{
 await page.goto(base+'/desktop-preview',{waitUntil:'domcontentloaded',timeout:120000});
 await page.getByRole('textbox',{name:'Paikkakunta tai postinumero'}).fill('Hyvinkää');
 await page.getByRole('textbox',{name:'Paikkakunta tai postinumero'}).press('Enter');
 await page.getByRole('button',{name:'Avaa Justiina',exact:true}).click();
 const bundle=await build({stdin:{contents:'import * as memory from "./src/app/components/ziiply/search/searchIntentMemory.ts"; window.__searchMemory=memory;',resolveDir:process.cwd()},bundle:true,write:false,platform:'browser',format:'iife'});
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.evaluate(cases=>{
   window.__searchMemory.clearSearchIntentMemory();
   for(const [query,,bad] of cases)for(let i=0;i<8;i++)window.__searchMemory.rememberSearchChoice(query,{name:bad});
 },cases);
 const results=[];
 for(const [query,good,bad] of cases){
   await page.getByRole('textbox',{name:'Hae tuotteita',exact:true}).fill(query);
   await page.getByRole('button',{name:'Takaisin hakuun',exact:true}).waitFor({state:'visible',timeout:30000});
   assert.equal(await page.getByText(good,{exact:true}).filter({visible:true}).count(),2,query+' valid result in both stores');
   assert.equal(await page.getByText(bad,{exact:true}).filter({visible:true}).count(),0,query+' forbidden result');
   results.push({query,good,bad,passed:true});
   await page.getByRole('button',{name:'Takaisin hakuun',exact:true}).click();
 }
 await fs.writeFile(out+'/categories.json',JSON.stringify(results,null,2));
 await page.getByRole('textbox',{name:'Hae tuotteita',exact:true}).fill('kevytmaito');
 await page.getByRole('button',{name:'Takaisin hakuun',exact:true}).waitFor({state:'visible',timeout:30000});
 await page.screenshot({path:out+'/01-search.png',fullPage:true});
 await page.getByRole('button',{name:/1,25 €.*Lisää koriin/}).click();
 await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('ziiply-desktop-current-cart-v1')||'[]').some(x=>x.ean==='6408430000128'));
 const memory=await page.evaluate(()=>window.__searchMemory.getSearchMemoryDebug('kevytmaito'));
 assert.ok(memory.entries.some(x=>x.productName==='Valio kevytmaito 1 l'&&x.lastEventType==='added_to_cart'),'real cart selection recorded');
 await fs.writeFile(out+'/selection-memory.json',JSON.stringify(memory,null,2));
 await page.getByRole('button',{name:'Sulje tuotevalinta',exact:true}).first().click();
 await page.getByRole('button',{name:/^Kori/}).click();
 await page.screenshot({path:out+'/02-cart.png',fullPage:true});
 await page.getByRole('button',{name:'Sulje ostoskori',exact:true}).click();
 await page.getByRole('button',{name:'Vertailu',exact:true}).click();
 const compare=page.getByRole('dialog',{name:'Hintavertailu',exact:true});
 await compare.waitFor({state:'visible',timeout:60000});
 await compare.getByText('1,25 €',{exact:true}).first().waitFor({state:'visible',timeout:60000});
 await compare.getByText('1,45 €',{exact:true}).first().waitFor({state:'visible',timeout:60000});
 await page.screenshot({path:out+'/03-comparison.png',fullPage:true});
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('DESKTOP 1600PX: 12 GUARDED UI SEARCHES, REAL SELECTION MEMORY, CART AND BOTH COMPARISON PRICES PASS');
}catch(e){failure=e;console.error(e);console.error('DESKTOP_VISIBLE_UI',await page.locator('body').innerText().catch(()=>''));await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});}
finally{
 await fs.writeFile(out+'/diagnostics.json',JSON.stringify({errors,requests,failure:failure?.stack},null,2));
 await fs.writeFile(out+'/page.txt',await page.locator('body').innerText().catch(()=>'Unavailable'));
 await context.tracing.stop({path:out+'/trace.zip'});
 await browser.close();
}
if(failure)process.exitCode=1;

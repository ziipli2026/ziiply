// Development-only real-browser roundtrip. Synthetic account; no production credentials.
// ZIIPLY_PLAYWRIGHT_MODULE may point to an installed Playwright package.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import {isolatedAccountDatabase} from '../../src/lib/account/database.ts';
if(process.env.ZIIPLY_ACCOUNT_LAB!=='true'||process.env.VERCEL_ENV!=='preview')throw Error('Explicit preview configuration required');
isolatedAccountDatabase(process.env);
const dbHost=new URL(process.env.ZIIPLY_ACCOUNT_DATABASE_URL).hostname.replace('-pooler.','.');
assert.ok(new URL(process.env.NEON_AUTH_BASE_URL).hostname.startsWith(dbHost.split('.')[0]+'.'));
const {chromium}=createRequire(import.meta.url)(process.env.ZIIPLY_PLAYWRIGHT_MODULE||'playwright');
const base='http://127.0.0.1:3222';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3222'],{env:process.env,stdio:'ignore'});
let browser;let checks=0;const ok=name=>{checks++;console.log('PASS '+name)};
const email='browser-'+randomUUID()+'@example.invalid';const password='Ziiply-'+randomUUID()+'aA1!';
async function account(page,signup=false){
 await page.goto(base+'/account-lab');
 await page.getByLabel('Sähköposti',{exact:true}).fill(email);
 await page.getByLabel('Salasana',{exact:true}).fill(password);
 await page.getByRole('button',{name:signup?'Luo tili':'Kirjaudu sähköpostilla',exact:true}).click();
 await page.getByRole('button',{name:'Tallenna uusi pilvikori',exact:true}).waitFor({timeout:45000});
}
async function latest(page){
 await page.getByRole('button',{name:'Hae viimeisin pilvikori',exact:true}).click();
 await page.getByRole('heading',{name:'Palauta aktiivinen kori',exact:true}).waitFor();
}
async function waitSaved(page){
 for(let attempt=0;attempt<4;attempt++){
  await page.waitForFunction(()=>document.body.innerText.includes('Pilvikori tallennettu. Paikallinen kori säilyi.')||[...document.querySelectorAll('button')].some(button=>button.textContent==='Yritä samaa tallennusta uudelleen'&&!button.disabled),{},{timeout:45000});
  if(await page.getByText('Pilvikori tallennettu. Paikallinen kori säilyi.',{exact:true}).isVisible())return;
  if(attempt===3)throw Error('Cloud save could not be confirmed after bounded retries');
  await page.getByRole('button',{name:'Yritä samaa tallennusta uudelleen',exact:true}).click();
 }
}
async function restore(page,source,target){
 await page.getByLabel('Pilvikorin lähde').selectOption(source);
 await page.getByLabel('Paikallinen kohde').selectOption(target);
 await page.getByRole('button',{name:'Esikatsele palautusta',exact:true}).click();
 await page.getByRole('button',{name:'Hyväksy paikallisen korin korvaaminen',exact:true}).click();
 await page.getByText(/^Kori palautettu\./).waitFor();
}
try{
 let ready=false;for(let i=0;i<80;i++){if(server.exitCode!==null)throw Error('Server stopped');try{await fetch(base+'/api/auth/get-session');ready=true;break}catch{await pause(250)}}assert.ok(ready);
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const mobile=await browser.newContext({viewport:{width:390,height:844}});
 const desktop=await browser.newContext({viewport:{width:1440,height:1000}});
 // Price/store/fuel integrations are outside this isolated account test.
 for(const context of [mobile,desktop])await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin!==base)return route.abort();
  if(url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/api/auth/')&&!url.pathname.startsWith('/api/account/'))return route.fulfill({status:200,contentType:'application/json',body:'{"stores":[],"items":[],"offers":[],"results":[]}'});
  return route.continue();
 });
 const m=await mobile.newPage();const d=await desktop.newPage();
 await account(m,true);ok('real browser email signup and session');
 await m.evaluate(()=>localStorage.setItem('ziiply-cart-v1',JSON.stringify({version:2,savedAt:Date.now(),items:[{id:'roundtrip-1',name:'Testimaito',quantity:2,price:3.99,source:'search',chain:'S',storeName:'Testikauppa',product:{id:'roundtrip-1',name:'Testimaito',price:3.99}}]})));
 await m.getByRole('button',{name:'Tallenna uusi pilvikori',exact:true}).click();
 await waitSaved(m);ok('guest mobile cart stored after signup');
 await account(d);await latest(d);ok('independent desktop browser session reads same cloud cart');
 await restore(d,'mobile','desktop');
 let cart=await d.evaluate(()=>JSON.parse(sessionStorage.getItem('ziiply-desktop-current-cart-v1')));
 assert.equal(cart[0].quantity,2);assert.equal(cart[0].price,null);ok('mobile cart restored into desktop storage with fresh price requirement');
 await d.getByRole('button',{name:'Avaa valittu sovellusnäkymä',exact:true}).click();
 await d.waitForURL('**/desktop-preview');
 await d.getByRole('button',{name:'Avaa ostoskori',exact:true}).last().click();
 await d.getByText('Testimaito',{exact:true}).waitFor();ok('desktop native cart visibly hydrates cloud product');
 await d.getByRole('button',{name:'Lisää määrää',exact:true}).first().click();
 await d.waitForFunction(()=>JSON.parse(sessionStorage.getItem('ziiply-desktop-current-cart-v1'))[0].quantity===3);ok('desktop native quantity edit persists');
 await d.goto(base+'/account-lab');await latest(d);
 await d.getByRole('button',{name:'Päivitä valittu pilvikori',exact:true}).click();
 await waitSaved(d);ok('desktop edited cart saved to same cloud document');
 await m.reload();await latest(m);await restore(m,'desktop','mobile');
 cart=await m.evaluate(()=>JSON.parse(localStorage.getItem('ziiply-cart-v1')));
 assert.equal(cart.items[0].quantity,3);assert.equal(cart.items[0].price,0);ok('desktop changes return to mobile without stale price');
 // Native cart navigation requires an explicit chain choice, independent of account restore.
 await m.evaluate(async()=>{const cache=await caches.open('ziiply-boot-marker-v778');await cache.put('/__ziiply_boot_marker_v778__',new Response('1'));localStorage.setItem('ziiply-store-selection-v536',JSON.stringify({selectedChains:{s:true,k:false,lidl:false,tokmanni:false},betweenChainSelectionModeV749:'one',storeCompareScope:'between_chains',storeMode:'hyper',storeModeChosenV299:true}));});
 await m.getByRole('button',{name:'Avaa valittu sovellusnäkymä',exact:true}).click();
 await m.waitForURL(base+'/');
 await m.getByRole('button',{name:/^Kori/}).click({timeout:20000});
 await m.getByText('Testimaito',{exact:true}).filter({visible:true}).first().waitFor();ok('mobile native cart visibly hydrates returned product');
 await d.goto(base+'/account-lab');await d.getByRole('button',{name:'Kirjaudu ulos',exact:true}).click();
 await d.getByRole('button',{name:'Kirjaudu sähköpostilla',exact:true}).waitFor();
 assert.equal((await d.request.get(base+'/api/account/documents')).status(),401);ok('browser signout revokes cloud access');
 console.log(`${checks} browser roundtrip checks passed; production unchanged`);
}finally{await browser?.close();server.kill();if(server.exitCode===null)await new Promise(resolve=>server.once('exit',resolve))}

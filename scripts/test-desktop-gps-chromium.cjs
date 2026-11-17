const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const HY = {latitude:60.63,longitude:24.86}, LA = {latitude:60.98,longitude:25.66};
const store=(id,name,chain,coords,origin)=>({id,name,chain,latitude:coords.latitude,longitude:coords.longitude,...(origin?{desktopSelectionOrigin:origin}:{})});
const fixtures=[
  store('s-h','Prisma Hyvinkää','S',HY),store('s-l','Prisma Lahti','S',LA),
  store('k-h','K-Citymarket Hyvinkää','K',HY),store('k-l','K-Citymarket Lahti','K',LA),
  store('l-h','Lidl Hyvinkää','LIDL',HY),store('l-l','Lidl Lahti','LIDL',LA),
  store('t-h','Tokmanni Hyvinkää','TOKMANNI',HY),store('t-l','Tokmanni Lahti','TOKMANNI',LA)
];
const selected=()=>({hyper:Object.fromEntries(fixtures.filter(x=>x.id.endsWith('-h')).map(x=>[x.id,{...x,desktopSelectionOrigin:'suggested'}])),local:{}});
(async()=>{
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},geolocation:HY,permissions:['geolocation'],extraHTTPHeaders:{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET}});
 await context.addInitScript((initial)=>localStorage.setItem('ziiply-desktop-store-choices-v1',JSON.stringify({storeMode:'hyper',storeModeChosen:true,selectedChain:'S',betweenMode:'many',storeCompareScope:'between_chains',allStoreSelections:initial})),selected());
 const page=await context.newPage();
 await page.route('**/api/store-search?*',r=>r.fulfill({json:{items:fixtures.filter(x=>x.chain==='S'||x.chain==='K')}}));
 await page.route('**/api/lidl/store-search?*',r=>r.fulfill({json:{items:fixtures.filter(x=>x.chain==='LIDL')}}));
 await page.route('**/api/eurospar-stores?*',r=>r.fulfill({json:{items:fixtures.filter(x=>x.chain==='TOKMANNI')}}));
 const response=await page.goto(process.env.PREVIEW_URL,{waitUntil:'domcontentloaded',timeout:60000});
 assert.equal(response.status(),200);
 const gps=page.getByRole('button',{name:'GPS',exact:true});
 const grid=page.locator('[data-desktop-store-grid]');
 await grid.waitFor();
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ziiply-desktop-store-choices-v1')).allStoreSelections.hyper);
 const assertNames=async(suffix)=>{
   await page.waitForFunction(suffix=>{const v=JSON.parse(localStorage.getItem('ziiply-desktop-store-choices-v1')||'{}').allStoreSelections?.hyper||{};return ['s','k','l','t'].every(k=>v[k+'-'+suffix])},suffix,{timeout:20000});
   const v=await read();assert.deepEqual(Object.keys(v).sort(),['k','l','s','t'].map(x=>x+'-'+suffix).sort());
 };
 await assertNames('h');
 console.log('PASS Hyvinkää all four chain groups');
 const input=page.getByRole('textbox',{name:'Paikkakunta tai postinumero'});
 assert.equal(await input.getAttribute('placeholder'),'05510 tai Hyvinkää');
 assert.equal(await input.inputValue(),'');
 console.log('PASS placeholder is only example, input empty');
 await page.waitForFunction(()=>document.querySelector('button[aria-label="GPS"]')?.getAttribute('aria-pressed')==='true');
 const gridText=()=>grid.innerText();
 assert.match(await gridText(),/0\.0 km/);
 await gps.click();
 await page.waitForFunction(()=>document.querySelector('button[aria-label="GPS"]')?.getAttribute('aria-pressed')==='false');
 assert.doesNotMatch(await gridText(),/\d+[.,]\d+ km/);
 await assertNames('h');
 console.log('PASS GPS OFF hides distances and retains stores');
 await context.setGeolocation(LA);
 console.log('DEBUG browser geolocation before click',JSON.stringify(await page.evaluate(()=>new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude}),reject,{maximumAge:0})))));
 await gps.click();
 await page.waitForFunction(()=>document.querySelector('button[aria-label="GPS"]')?.getAttribute('aria-pressed')==='true');
 await page.waitForTimeout(1500);
 console.log('DEBUG after switch',JSON.stringify(await read()));
 console.log('DEBUG GPS state',await gps.getAttribute('aria-pressed'),'grid',JSON.stringify((await gridText()).slice(0,600)));
 console.log('DEBUG API calls',JSON.stringify(await page.evaluate(()=>performance.getEntriesByType('resource').filter(x=>x.name.includes('store-search')||x.name.includes('eurospar-stores')).map(x=>x.name).slice(-12))));
 await assertNames('l');
 console.log('PASS location change Hyvinkää to Lahti updates all four chain groups');
 await gps.click();
 await page.waitForFunction(()=>document.querySelector('button[aria-label="GPS"]')?.getAttribute('aria-pressed')==='false');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('button[aria-label="GPS"]')?.getAttribute('aria-pressed')==='true');
 await assertNames('l');
 // Seed a manual selection before a fresh page opens; do not race React's persistence effect.
 const savedStoreState = await page.evaluate(()=>JSON.parse(localStorage.getItem('ziiply-desktop-store-choices-v1')));
 savedStoreState.allStoreSelections.hyper['s-l'].desktopSelectionOrigin='manual';
 await page.close();
 const manualPage=await context.newPage();
 await manualPage.route('**/api/store-search?*',r=>r.fulfill({json:{items:fixtures.filter(x=>x.chain==='S'||x.chain==='K')}}));
 await manualPage.route('**/api/lidl/store-search?*',r=>r.fulfill({json:{items:fixtures.filter(x=>x.chain==='LIDL')}}));
 await manualPage.route('**/api/eurospar-stores?*',r=>r.fulfill({json:{items:fixtures.filter(x=>x.chain==='TOKMANNI')}}));
 await manualPage.addInitScript(state=>localStorage.setItem('ziiply-desktop-store-choices-v1',JSON.stringify(state)), savedStoreState);
 await manualPage.goto(process.env.PREVIEW_URL,{waitUntil:'domcontentloaded'});
 const gpsManual=manualPage.getByRole('button',{name:'GPS',exact:true});
 const manualRead=()=>manualPage.evaluate(()=>JSON.parse(localStorage.getItem('ziiply-desktop-store-choices-v1')).allStoreSelections.hyper);
 await manualPage.waitForFunction(()=>document.querySelector('button[aria-label="GPS"]')?.getAttribute('aria-pressed')==='true');
 // A manual selection must survive a location change; set manual selection in saved state before the next navigation.
 const saved=await manualRead();assert.equal(saved['s-l']?.desktopSelectionOrigin,'manual');
 await context.setGeolocation(HY);
 await gpsManual.click();await manualPage.waitForFunction(()=>document.querySelector('button[aria-label="GPS"]')?.getAttribute('aria-pressed')==='false');
 await gpsManual.click();await manualPage.waitForFunction(()=>document.querySelector('button[aria-label="GPS"]')?.getAttribute('aria-pressed')==='true');
 await manualPage.waitForFunction(()=>{const v=JSON.parse(localStorage.getItem('ziiply-desktop-store-choices-v1')||'{}').allStoreSelections?.hyper||{};return !!v['k-h']&&!!v['l-h']&&!!v['t-h']});
 const after=await manualRead();assert.equal(after['s-l']?.desktopSelectionOrigin,'manual');
 console.log('PASS manually selected store remains unchanged when GPS location changes');
 console.log('PASS extended GPS Chromium regression');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

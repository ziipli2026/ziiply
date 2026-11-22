const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict');
const offerSnapshots = new Map();
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});try{
await Promise.all([false,true].flatMap(desktop=>['one','many','control','offers'].map(async mode=>{
let ctx=await b.newContext(desktop?{viewport:{width:1440,height:1000}}:devices['iPhone 13']);
const tag=(desktop?'desktop':'mobiili')+' '+mode;
let p=await ctx.newPage(); const req=[];p.on('request',r=>req.push(r.url()));p.on('pageerror',e=>console.log(tag,'pageerror',e.message));
await p.addInitScript(({mode})=>{
 const s={id:'634976534',name:'Prisma Hyvinkää',chain:'S'},k={id:'C130',name:'K-Citymarket Hyvinkää',chain:'K'},l={id:'FI0218',name:'Lidl Hyvinkää',chain:'LIDL'};
 const many=mode!=='one',lidl=mode!=='control',betweenMode=many?'many':'one';
 const item={id:'milk',name:'Valio kevytmaito 1 l',ean:'6408430106443',quantity:1,price:1.79,chain:'S',source:'search',product:{id:'milk',name:'Valio kevytmaito 1 l',ean:'6408430106443',price:179}};
 if (mode !== 'offers') {
 localStorage.setItem('ziiply-cart-v1',JSON.stringify({items:[item],savedAt:Date.now()}));
 sessionStorage.setItem('ziiply-active-panel-v812','cart');
 sessionStorage.setItem('ziiply-desktop-current-cart-v1',JSON.stringify([item]));
 }
 localStorage.setItem('ziiply-desktop-store-choices-v1',JSON.stringify({storeMode:'hyper',storeModeChosen:true,selectedChain:many?'S':'LIDL',betweenMode,storeCompareScope:'between_chains',allStoreSelections:{hyper:{...(many?{[s.id]:s,[k.id]:k}:{}),...(lidl?{[l.id]:l}:{})},local:{}}}));
 localStorage.setItem('ziiply-store-selection-v536',JSON.stringify({version:1,savedAt:Date.now(),activeArea:{label:'Hyvinkää',sStoreId:s.id,sStoreName:s.name,kStoreId:k.id,kStoreName:k.name},storeMode:'hyper',storeModeChosenV299:true,storeCompareScope:'between_chains',betweenChainSelectionModeV749:betweenMode,selectedChains:{s:many,k:many,lidl,tokmanni:false},selectedLidlStoreV750:lidl?l:null,usingOwnLocation:false}));
}, {mode});
const lidlResponses = [];
await p.route('**/api/**', async route => {
  const url = new URL(route.request().url());
  if (mode === 'offers' && url.pathname === '/api/offers/search' && url.searchParams.get('provider') === 'lidl') {
    try {
      const response = await fetch(new URL(url.pathname + url.search, 'https://ziiply.vercel.app'), {signal:AbortSignal.timeout(35000)});
      const data = await response.json();
      lidlResponses.push({status:response.status, key:url.searchParams.get('lidlStoreKey'), data});
      await route.fulfill({status:response.status,json:data});
    } catch (error) {
      console.error(tag, 'live Lidl provider', error.message);
      await route.fulfill({status:502,json:{ok:false,results:[]}});
    }
    return;
  }
  await route.fulfill({json:{ok:true,products:[],results:[],items:[]}});
});
try{
if (!desktop) {
  await p.route('**/__browser_fixture__', route => route.fulfill({contentType:'text/html',body:'<!doctype html><title>Browser test setup</title>'}));
  await p.goto('http://127.0.0.1:3179/__browser_fixture__');
  await p.evaluate(async () => {
    const cache = await caches.open('ziiply-boot-marker-v778');
    await cache.put('/__ziiply_boot_marker_v778__', new Response('1'));
  });
}
await p.goto('http://127.0.0.1:3179/',{timeout:90000,waitUntil:'domcontentloaded'});
if (desktop) await p.locator('[data-desktop-layout]').waitFor({timeout:35000});
if (mode === 'offers') {
  await p.getByRole('button',{name:desktop?'Avaa Gösta':/Gösta: Tarjoushaku/}).filter({visible:true}).first().click({timeout:25000});
  await p.getByRole('button',{name:desktop?'Lidl':'Hae Lidlin tarjoukset',exact:true}).filter({visible:true}).first().click({timeout:25000});
  await p.getByRole('button',{name:/liha.*makkara/i}).filter({visible:true}).first().click({timeout:60000});
  const response = lidlResponses.find(row => row.status === 200 && row.key === 'FI0218' && row.data.ok);
  assert.ok(response, 'Gösta requested the live Lidl provider for FI0218');
  const today = new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Helsinki'}).format(new Date());
  const offers = response.data.results.filter(row => row.hasConcretePrice && Number(row.offerPrice) > 0 &&
    row.validFrom?.slice(0,10) <= today && row.validUntil?.slice(0,10) >= today &&
    /liha.*makkara/i.test(row.category || '') && row.campaignType !== 'campaign');
  // PRODUCTION API baseline only (the route above proxies to ziiply.vercel.app).\n  // Do not claim this validates test-branch category enrichment.\n  // Report the full live provider category distribution, not just the selected
  // meat tab. This exposes uncategorized and inconsistent source records.
  const categoryCounts = {};
  const uncategorized = [];
  for (const row of response.data.results) {
    const category = String(row.category || '').trim();
    categoryCounts[category || '(missing)'] = (categoryCounts[category || '(missing)'] || 0) + 1;
    if (!category || category === 'Muut') uncategorized.push(String(row.productName || row.title || row.name));
  }
  console.log('AUDIT_PRODUCTION_BASELINE',tag,JSON.stringify({api:'https://ziiply.vercel.app',total:response.data.results.length,categoryCounts,uncategorized:uncategorized.slice(0,40)}));
  // The original browser check only required one visible meat offer. Fail if
  // the live category feed silently loses classifications in any section.
  const allowedCategories = new Set(['Kahvi & tee','Maitotuotteet','Liha & makkarat','Kala','Leipomo','Hevi','Juomat','Pakasteet','Valmisruoka','Kuivatuotteet','Makeiset & keksit','Lastenruoat','Lastenhoito','Vitamiinit & ravinteet','Lemmikit','Hygienia & kosmetiikka','Kodinhoito','Koti & vapaa-aika']);
  const unexpectedCategories = Object.keys(categoryCounts).filter(category => !allowedCategories.has(category));
  assert.deepEqual(unexpectedCategories,[],'Lidl offers contain unknown or unclassified category labels');
  assert.equal(uncategorized.length,0,'Lidl offers must not have missing/Muut categories');
  offerSnapshots.set(desktop?'desktop':'mobiili', response.data.results.map(row=>({id:String(row.id||''),title:String(row.productName||row.title||row.name||''),category:String(row.category||''),price:Number(row.offerPrice)})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
  const shown = [];
  for (const row of offers) {
    const title = String(row.productName || row.title || row.name);
    if (await p.getByText(title,{exact:false}).filter({visible:true}).count()) shown.push(title);
  }
  assert.ok(shown.length > 0, 'At least one live, valid, priced Lidl product offer appears in Gösta');
  console.log('PASS',tag,JSON.stringify({store:response.data.storeKey,total:response.data.results.length,validMeatOffers:offers.length,shown:shown.slice(0,6)}));
  await ctx.close();
  return;
}
if (!desktop) await p.getByRole('button',{name:'Jatka',exact:true}).filter({visible:true}).first().click({timeout:20000});
let cmp=p.getByRole('button',{name:/^Halpuusvertailu$/}).filter({visible:true});
if(!await cmp.count()){let cart=p.getByRole('button',{name:/^Kori\s*\d*$/}).filter({visible:true});await cart.last().click({timeout:10000});}
cmp=p.getByRole('button',{name:/^Halpuusvertailu$/}).filter({visible:true});
await cmp.first().waitFor({timeout:15000});
const firstComparisonRequest = req.length;
await cmp.first().click({timeout:15000});
const note=p.getByText('Lidl ei ole mukana ostoskorin hintavertailussa, koska ajantasaisia normaalihintoja ei ole saatavilla julkisista lähteistä.',{exact:true});
if(lidlMode()) {await note.waitFor({timeout:20000});assert.equal(await note.count(),1);} else {await (desktop?p.getByText('Prisma Hyvinkää',{exact:true}):p.getByRole('button',{name:'Avaa Prisma Hyvinkää',exact:true})).filter({visible:true}).first().waitFor({timeout:20000});assert.equal(await note.count(),0);}
assert.equal(await p.getByRole('button',{name:/Avaa Lidl/}).count(),0);
if(mode==='one')assert.equal(req.slice(firstComparisonRequest).filter(x=>new URL(x).pathname==='/api/lidl/products').length,0,'Halpuusvertailu did not request Lidl product prices');
console.log('PASS',tag);
}catch(e){console.log('FAIL',tag,e.message.slice(0,850),(await p.locator('body').innerText().catch(()=>'' )).slice(0,750));process.exitCode=1;}
function lidlMode(){return mode!=='control'}
await ctx.close();
})));
assert.deepEqual(offerSnapshots.get('desktop'),offerSnapshots.get('mobiili'),'Desktop and mobile must receive identical Lidl product categories and prices');
console.log('PASS Lidl mobile-desktop full category and price parity');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});

const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict');
// The live category audit names products from the 18–22 November leaflet.
const todayFi = new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Helsinki'}).format(new Date());
const liveCategoryModes = todayFi >= '2026-11-18' && todayFi <= '2026-11-22' ? ['categories'] : [];
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});try{
await Promise.all([false,true].flatMap(desktop=>['one','many','control','offers',...liveCategoryModes,'normal',...(desktop?[]:['offers-stale'])].map(async mode=>{
let ctx=await b.newContext(desktop?{viewport:{width:1440,height:1000}}:devices['iPhone 13']);
const tag=(desktop?'desktop':'mobiili')+' '+mode;
let p=await ctx.newPage(); const req=[];p.on('request',r=>req.push(r.url()));p.on('pageerror',e=>console.log(tag,'pageerror',e.message));
await p.addInitScript(({mode})=>{
 const s={id:'634976534',name:'Prisma Hyvinkää',chain:'S'},k={id:'C130',name:'K-Citymarket Hyvinkää',chain:'K'},l={id:'FI0218',name:'Lidl Hyvinkää',chain:'LIDL'};
 const many=mode!=='one' && mode!=='normal',lidl=mode!=='control',betweenMode=many?'many':'one';
 const item={id:'milk',name:'Valio kevytmaito 1 l',ean:'6408430106443',quantity:1,price:1.79,chain:'S',source:'search',product:{id:'milk',name:'Valio kevytmaito 1 l',ean:'6408430106443',price:179}};
 if (mode !== 'offers' && mode !== 'categories' && mode !== 'offers-stale' && mode !== 'normal') {
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
  if (mode === 'categories' && url.pathname === '/api/offers/search' && url.searchParams.get('provider') === 'lidl') {
    const response = await route.fetch({timeout:110000});
    const data = await response.json();
    // Audit only actual API results. Never inject category-correct rows into a live test.
    assert.ok(Array.isArray(data.results), 'Lidl API results must be an array');
    console.log('LIVE CATEGORY SOURCE',tag,JSON.stringify({count:data.results.length,audit:data.lidlSourceAudit}));
    await route.fulfill({response,json:data});
    return;
  }
  if ((mode === 'offers' || mode === 'offers-stale') && url.pathname === '/api/offers/search' && url.searchParams.get('provider') === 'lidl') {
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
if (mode === 'normal') {
  const searches=['maito','kahvi','jauheliha'];
  if(desktop) await p.getByRole('button',{name:'Avaa Justiina'}).filter({visible:true}).first().click({timeout:20000});
  else { await p.getByRole('button',{name:'Hae',exact:true}).filter({visible:true}).last().click({timeout:20000}); await p.locator('textarea').filter({visible:true}).first().waitFor({timeout:20000}); }
  for(const word of searches){
    const field=desktop?p.getByRole('textbox',{name:'Hae tuotteita'}).filter({visible:true}).first():p.locator('textarea').filter({visible:true}).first();
    await field.fill(word);
    const before=req.length;
    await p.getByRole('button',{name:desktop?'Hae kirjoitetut tuotteet':'Justiina',exact:true}).filter({visible:true}).first().click({timeout:15000});
    await p.getByText(/Lidl ei ole mukana normaalihintojen tuotehaussa/).filter({visible:true}).first().waitFor({timeout:15000});
    const noticeCard=p.getByRole('alertdialog',{name:'Lidlin normaalihinnat eivät ole saatavilla'}).filter({visible:true}).first();
    await noticeCard.waitFor({timeout:15000});
    await p.waitForTimeout(4000);
    assert.equal(await noticeCard.isVisible(),true,'Lidl notice must remain visible until dismissed');
    await noticeCard.getByRole('button',{name:'Selvä, sulje ilmoitus'}).click();
    await noticeCard.waitFor({state:'hidden',timeout:10000});
    const calls=req.slice(before).filter(u=>new URL(u).pathname.startsWith("/api/") && /products|search|ean-bank/i.test(new URL(u).pathname) && !new URL(u).pathname.includes("/offers/"));
    assert.equal(calls.length,0,'Normal search must not request product APIs: '+calls.join(','));
    assert.equal(await p.locator('[data-testid="normal-search-result"]:visible').count(),0,'No product cards');
    console.log('PASS',tag,word,'no product requests, no cards, notice shown');
  }
  await ctx.close();return;
}
if (mode === 'categories') {
  await p.getByRole('button',{name:desktop?'Avaa Gösta':/Gösta: Tarjoushaku/}).filter({visible:true}).first().click({timeout:25000});
  const responsePromise = p.waitForResponse(response => {
    const url = new URL(response.url());
    return url.origin === 'http://127.0.0.1:3179' &&
      url.pathname === '/api/offers/search' && url.searchParams.get('provider') === 'lidl' &&
      url.searchParams.get('lidlStoreKey') === 'FI0218';
  }, {timeout:120000});
  await p.getByRole('button',{name:desktop?'Lidl':'Hae Lidlin tarjoukset',exact:true}).filter({visible:true}).first().click({timeout:25000});
  const response = await responsePromise;
  assert.equal(response.status(), 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  const today = new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Helsinki'}).format(new Date());
  const titleOf = row => String(row.productName || row.title || row.name);
  const cases = [
    {product:/lihap(?:yö|yo)ryk/i, brand:/kivikyl/i, category:'Liha & makkarat'},
    {product:/pistaasi.*juustokakku/i, category:'Leipomo'},
  ];
  for (const {product,brand,category} of cases) {
    const rows = data.results.filter(row => product.test(titleOf(row)) &&
      (!brand || brand.test([row.brandName,row.brand,row.name,row.title,row.productName].join(' '))));
    assert.ok(rows.length, `Missing live offer ${product} (source counts ${JSON.stringify(data.lidlSourceAudit)})`);
    for (const row of rows) {
      assert.ok(row.validFrom?.slice(0,10) <= today && row.validUntil?.slice(0,10) >= today, titleOf(row));
      for (const fields of [row, row.__sourceOfferSearchResult].filter(Boolean)) {
        for (const key of ['category','categoryPath','mainCategory','neonDisplayCategory']) {
          assert.equal(fields[key], category, `${titleOf(row)} ${key}`);
        }
      }
      console.log('PASS category payload',tag,JSON.stringify({title:titleOf(row),category,source:row.sourceUrl,tab:row.campaignType}));
    }
    for (const tab of new Set(rows.map(row => row.campaignType === 'campaign' ? 'Kampanjat' : 'Tarjoukset'))) {
      const tabButton = p.getByRole('button',{name:tab,exact:true}).filter({visible:true});
      if (await tabButton.count()) await tabButton.first().click();
      const categoryButton = p.getByRole('button',{name:category === 'Leipomo' ? /leiv[aä]t.*leivonnaiset|leipomo/i : /liha.*makkara/i}).filter({visible:true}).first();
      assert.ok(await categoryButton.count(), `Category UI button missing: ${category} (${tag})`);
      await categoryButton.click({timeout:30000});
      await p.getByText(product).filter({visible:true}).first().waitFor({timeout:20000});
      console.log('PASS UI',tag,product.toString(),category,tab);
    }
  }
  await ctx.close();
  return;
}
if (mode === 'offers' || mode === 'offers-stale') {
  if (mode === 'offers-stale') {
    await p.getByRole('button',{name:'Hae',exact:true}).filter({visible:true}).last().click({timeout:20000});
    await p.locator('textarea').filter({visible:true}).first().fill('erikoishakusana987');
    // Keep a previous normal-search term in the input, then switch to Gösta.
    // The test does not require triggering the normal search itself.
    // The product search panel must not leak its query to Gösta.
    await p.getByRole('button',{name:'Justiina',exact:true}).filter({visible:true}).first().click({timeout:15000});
    // Dismiss the normal-search results overlay before opening Gösta from home.
    await p.getByRole('button',{name:'Hae',exact:true}).filter({visible:true}).last().click({timeout:20000});
  }
  await p.getByRole('button',{name:desktop?'Avaa Gösta':/Gösta: Tarjoushaku/}).filter({visible:true}).first().click({timeout:25000});
  await p.getByRole('button',{name:desktop?'Lidl':'Hae Lidlin tarjoukset',exact:true}).filter({visible:true}).first().click({timeout:25000});
  await p.getByRole('button',{name:/liha.*makkara/i}).filter({visible:true}).first().click({timeout:60000});
  if(mode === 'offers-stale') {
    const offerCalls=req.filter(u=>new URL(u).pathname==='/api/offers/search');
    assert.ok(offerCalls.length>0,'Gösta must call offer search');
    assert.ok(offerCalls.every(u=>!decodeURIComponent(u).includes('erikoishakusana987')),'Gösta must not inherit normal search query: '+offerCalls.join(','));
  }
  const response = lidlResponses.find(row => row.status === 200 && row.key === 'FI0218' && row.data.ok);
  assert.ok(response, 'Gösta requested the live Lidl provider for FI0218');
  const today = new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Helsinki'}).format(new Date());
  const offers = response.data.results.filter(row => row.hasConcretePrice && Number(row.offerPrice) > 0 &&
    row.validFrom?.slice(0,10) <= today && row.validUntil?.slice(0,10) >= today &&
    /liha.*makkara/i.test(row.category || '') && row.campaignType !== 'campaign');
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
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});

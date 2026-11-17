const {test,expect,devices}=require('@playwright/test');
const fs=require('node:fs');
const base=process.env.ZIIPLY_LIVE_URL||'https://ziiply.fi';
const queries=['maito','cola','kahvi','kananmunat','juusto','banaani','pasta','riisi','jauheliha','jogurtti','kurkku'];
for(const device of ['mobile','desktop']){
test('Monta live all chains: '+device,async({browser})=>{
  test.setTimeout(480000);
  const authHeaders=process.env.VERCEL_AUTOMATION_BYPASS_SECRET?{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET}:process.env.VERCEL_OIDC_TOKEN?{'x-vercel-trusted-oidc-idp-token':process.env.VERCEL_OIDC_TOKEN}:{};
  const context=await browser.newContext(device==='mobile'?{...devices['iPhone 13'],serviceWorkers:'block',extraHTTPHeaders:authHeaders}:{viewport:{width:1440,height:900},serviceWorkers:'block',extraHTTPHeaders:authHeaders});
  const page=await context.newPage();
  const calls=[],errors=[];
  const providerEvidence=[];
  const selectedStoreIds={lidl:null,tokmanni:null};
  const chains={s:0,k:0,lidl:0,tokmanni:0};
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('response',r=>{if(r.url().includes('/api/')){const url=r.url().split('?')[0];calls.push({url,status:r.status()});for(const [chain,pattern] of Object.entries({s:/\/api\/s-products$/,k:/\/api\/k-products$/,lidl:/\/api\/lidl\/products$/,tokmanni:/\/api\/tokmanni\/products$/}))if(pattern.test(url)&&r.status()===200)chains[chain]++;if(/\/api\/(?:lidl|tokmanni)\/products$/.test(url)){const requestUrl=new URL(r.url());r.json().then(data=>{const items=Array.isArray(data?.items)?data.items:Array.isArray(data?.products)?data.products:[];providerEvidence.push({chain:url.includes('/lidl/')?'lidl':'tokmanni',query:requestUrl.searchParams.get('search'),intent:requestUrl.searchParams.get('intent'),mode:requestUrl.searchParams.get('mode'),source:data?.source,priceVerified:data?.priceVerified,returned:items.length,priced:items.filter(p=>Number(p.price??p.storeItems?.[0]?.price)>0).length,localPriced:items.filter(p=>Number(p.price??p.storeItems?.[0]?.price)>0&&p.priceVerified===true&&p.priceScope==='local_store'&&String(p.priceStoreId??'').trim().length>0&&String(p.priceStoreId)===String(selectedStoreIds[url.includes('/lidl/')?'lidl':'tokmanni']??'__not_selected__')).length,priceScope:url.includes('/tokmanni/')?'online-catalog-not-local-store':'research-unverified'});}).catch(()=>{});}}});
  const result={device,base,queries,results:[],calls,errors,chains,providerEvidence};
  try{
    const first=await page.goto(device==='desktop'?base.replace(/\/$/,'')+'/desktop-preview':base,{waitUntil:'domcontentloaded',timeout:60000});
    expect(first.status()).toBeLessThan(400);
    await page.waitForTimeout(1800);
    const lidlResponse=await context.request.get(base+'/api/lidl/store-search?search=Hyvinkää');
    const sparResponse=await context.request.get(base+'/api/eurospar-stores?search=Hyvinkää');
    expect(lidlResponse.ok(),'Live Lidl store discovery failed').toBe(true);
    expect(sparResponse.ok(),'Live SPAR/Tokmanni store discovery failed').toBe(true);
    async function readDiscoveryJson(response, provider) {
      const body = await response.text();
      const contentType = response.headers()['content-type'] || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`${provider} discovery returned non-JSON: status=${response.status()}, url=${response.url()}, content-type=${contentType}, body=${body.slice(0,350)}`);
      }
      try { return JSON.parse(body); }
      catch (error) { throw new Error(`${provider} discovery invalid JSON: status=${response.status()}, url=${response.url()}, body=${body.slice(0,350)}, error=${error}`); }
    }
    const lidlStores=(await readDiscoveryJson(lidlResponse,'Lidl')).items||[];
    const sparStores=(await readDiscoveryJson(sparResponse,'SPAR/Tokmanni')).items||[];
    const selectedLidl=lidlStores.find(x=>x.id&&/hyvinkää/i.test(x.city||x.name));
    const selectedSpar=sparStores.find(x=>x.id&&/^(EUROSPAR|TOKMANNI)$/i.test(x.chain||''));
    expect(selectedLidl,'No real Lidl Hyvinkää store returned').toBeTruthy();
    expect(selectedSpar,'No real Tokmanni/SPAR store returned').toBeTruthy();
    result.discoveredStores={lidl:selectedLidl,spar:selectedSpar};
    selectedStoreIds.lidl=String(selectedLidl.id);
    selectedStoreIds.tokmanni=String(selectedSpar.id);
    await page.evaluate(({selectedLidl,selectedSpar})=>{
      const s={id:'634976534',name:'Prisma Hyvinkää',chain:'S',latitude:60.63,longitude:24.86};
      const k={id:'C130',name:'K-Citymarket Hyvinkää',chain:'K'};
      const lidl=selectedLidl;
      const spar=selectedSpar;
      localStorage.setItem('ziiply-desktop-store-choices-v1',JSON.stringify({storeMode:'hyper',storeModeChosen:true,selectedChain:'S',betweenMode:'many',storeCompareScope:'between_chains',allStoreSelections:{hyper:{[s.id]:s,[k.id]:k,[lidl.id]:lidl,[spar.id]:spar},local:{}}}));
      localStorage.setItem('ziiply-store-selection-v536',JSON.stringify({
        version:1,savedAt:Date.now(),activeArea:{label:'Hyvinkää',sStoreId:s.id,sStoreName:s.name,kStoreId:k.id,kStoreName:k.name},storeMode:'hyper',storeModeChosenV299:true,
        storeCompareScope:'between_chains',betweenChainSelectionModeV749:'many',
        selectedChains:{s:true,k:true,lidl:true,tokmanni:true},selectedLidlStoreV750:lidl,selectedEurosparStoreV751:spar.chain==='EUROSPAR'?spar:null,selectedTokmanniStoreV756:spar.chain==='TOKMANNI'?spar:null,usingOwnLocation:false
      }));
    },{selectedLidl,selectedSpar});
    await page.reload({waitUntil:'domcontentloaded'});
    result.selectedStores=await page.evaluate(()=>localStorage.getItem('ziiply-store-selection-v536'));
    expect(JSON.parse(result.selectedStores||'{}').selectedChains).toEqual({s:true,k:true,lidl:true,tokmanni:true});
    // Never mock network: all product searches use the real deployed backend.
    const justiina=page.getByRole('button',{name:device==='mobile'?'Justiina: Tuotehaku':'Avaa Justiina',exact:true});
    await expect(justiina).toBeVisible({timeout:30000});
    await justiina.click();
    const input=device==='mobile'
      ?page.getByPlaceholder(/Kirjoita yksi tuote|maito, kahvi/).filter({visible:true})
      :page.getByRole('textbox',{name:'Hae tuotteita'});
    await expect(input).toBeVisible({timeout:15000});
    fs.mkdirSync('test-results',{recursive:true});
    const added=[];
    for(const query of queries){
      if(device==='desktop' && !(await input.isVisible().catch(()=>false))) {
        const reopen=page.getByRole('button',{name:'Avaa Justiina',exact:true}).filter({visible:true});
        if(await reopen.count())await reopen.first().click();
      }
      await expect(input,'Search textbox must reopen between desktop queries').toBeVisible({timeout:12000});
      await input.fill(query);
      if(device==='desktop')await input.press('Enter');
      else await page.getByRole('button',{name:'Justiina',exact:true}).filter({visible:true}).click();
      await page.waitForTimeout(3000);
      const visible=await page.locator('body').innerText();
      // Capture identified result EANs independently of shopping-list text.
      // Both UIs must expose the same EAN-backed product set for the same query.
      // Result sheets may hide the literal EAN label. Capture both rendered
      // product cards and the actual response payload, not only EAN text nodes.
      const eans=await page.getByText(/EAN \d{13}/).filter({visible:true}).allTextContents();
      const resultEans=[...new Set(eans.flatMap(v=>[...v.matchAll(/EAN\s*(\d{13})/g)].map(m=>m[1])))].sort();
      const visibleProductButtons=await page.getByRole('button',{name:/Lisää (?:ostoskoriin|koriin)/i}).filter({visible:true}).count();
      result.results.push({query,visibleExcerpt:visible.slice(-1800),apiCalls:calls.length,resultEans,visibleProductButtons});
      // The mobile search opens a full-screen result sheet; only target controls
      // within that sheet, not similarly named buttons behind its backdrop.
      const candidate=page.locator('div.pointer-events-none.fixed.inset-0').getByRole('button',{name:/Lisää (?:ostoskoriin|koriin)/i}).filter({visible:true});
      const addCandidate=device==='mobile'&&await candidate.count()?candidate:page.getByRole('button',{name:/Lisää (?:ostoskoriin|koriin)/i}).filter({visible:true});
      if(await addCandidate.count()){
        try{
          await addCandidate.first().click({timeout:5000});
          added.push(query);
          const close=page.getByRole('button',{name:'Sulje tuotevalinta',exact:true}).filter({visible:true});
          if(await close.count())await close.first().click();
        }catch(e){result.results[result.results.length-1].addError=String(e)}
      }
      await page.screenshot({path:'test-results/monta-'+device+'-'+query+'.png',fullPage:true});
    }
    // Keep the rest of the audit running even if one provider is absent.
    // Missing chain calls are acceptance failures, not a reason to discard
    // screenshots and the basket-comparison diagnostics.
    result.chainApiAcceptance=Object.fromEntries(Object.entries(chains).map(([chain,count])=>[chain,count>0]));
    const apiCalls=calls.filter(x=>/search|products|lidl|spar|tokmanni|neon/i.test(x.url));
    expect(apiCalls.length,'Real product search APIs must be called').toBeGreaterThan(0);
    expect(apiCalls.some(x=>x.status>=500),'Product API must not return server errors').toBe(false);
    expect(errors.filter(x=>/Hydration failed|Cannot read properties of undefined|Minified React error/.test(x))).toEqual([]);
    // Do not claim all four chains passed from a mere HTTP 200: record actual
    // chain evidence for review; absence of Lidl/SPAR is explicitly a failure.
    // A chain name somewhere in page text is NOT proof of a real product search.
    // Assertions for provider coverage run after comparison evidence is saved.
    await page.waitForTimeout(500);
    // Record chain acceptance evidence, but do not abort before collecting cart
    // and comparison screenshots. A missing price remains a failing assertion
    // after the complete diagnostic pass.
    result.chainAcceptance={};
    for(const chain of ['lidl','tokmanni']){
      const evidence=providerEvidence.filter(x=>x.chain===chain&&['maito','cola'].includes(x.intent||x.query));
      result.chainAcceptance[chain]={
        hasQueryEvidence:evidence.length>0,
        hasComparablePrice:evidence.some(x=>x.localPriced>0),
        evidence
      };
    }
    // Products are added as each search completes, before the next query replaces results.
    result.addedQueries=added;
    expect(added.length,'At least four distinct searches must add products').toBeGreaterThanOrEqual(4);
    const cartState=await page.evaluate(()=>({mobile:JSON.parse(localStorage.getItem('ziiply-cart-v1')||'{}').items||[],desktop:JSON.parse(sessionStorage.getItem('ziiply-desktop-current-cart-v1')||'[]')}));
    result.cartBeforeCompare=cartState;
    const cartRows=device==='mobile'?cartState.mobile:cartState.desktop;
    expect(cartRows.length,'Shopping cart must have at least four products').toBeGreaterThanOrEqual(4);
    result.cartProductNames=cartRows.map(row=>row.name||row.title||row.product?.name||row.product?.title);
    result.cartProductIdentity=cartRows.map(row=>({name:row.name||row.title||row.product?.name||row.product?.title||'',ean:String(row.ean||row.product?.ean||row.barcode||''),price:row.price??row.product?.price??null}));
    // On mobile Enter can intentionally add the typed search term to the basket.
    // Keep those rows as valid shopping-list entries, but do not count them as
    // evidence of an identified, EAN-backed product or a comparable store price.
    result.searchTermRows=result.cartProductIdentity.filter(row=>queries.includes(row.name.trim().toLowerCase()));
    result.identifiedProductRows=result.cartProductIdentity.filter(row=>!queries.includes(row.name.trim().toLowerCase()));
    expect(new Set(result.cartProductNames.filter(Boolean)).size,'Cart must contain four different product names').toBeGreaterThanOrEqual(4);
    const comparisonNav=page.getByRole('button',{name:'Vertailu',exact:true}).filter({visible:true}).last();
    await expect(comparisonNav).toBeVisible({timeout:15000});
    await comparisonNav.click();
    const compareButton=page.getByRole('button',{name:/Halpuusvertailu/i}).filter({visible:true}).first();
    if(device==='mobile'){
      await expect(compareButton,'Basket must expose Halpuusvertailu').toBeVisible({timeout:15000});
      await compareButton.click();
    }
    await expect(page.getByText(device==='mobile'?/^Vertailu$/:/Halpuusvertailu|Hintavertailu/).filter({visible:true}).first()).toBeVisible({timeout:30000});
    // Do not treat the desktop loading placeholder as completed comparison evidence.
    if(device==='desktop')await expect(page.getByText('Vertailutuloksia haetaan…').filter({visible:true})).toHaveCount(0,{timeout:45000});
    result.compareText=(await page.locator('body').innerText()).slice(-6500);
    expect(result.compareText).not.toMatch(/Vertailutuloksia ei ole saatavilla|Ei vertailua/);
    result.compareChainEvidence=Object.fromEntries(['Prisma','K-Citymarket','Lidl','Tokmanni','EUROSPAR'].map(name=>[name,result.compareText.toLowerCase().includes(name.toLowerCase())]));
    // Always persist the actual comparison screenshot before any missing-chain assertion.
    result.cart=await page.evaluate(()=>({mobile:localStorage.getItem('ziiply-cart-v1'),desktop:sessionStorage.getItem('ziiply-desktop-current-cart-v1')}));
    await page.screenshot({path:'test-results/monta-'+device+'-comparison.png',fullPage:true});
    expect(result.compareChainEvidence.Prisma,'S store absent from comparison').toBe(true);
    expect(result.compareChainEvidence['K-Citymarket'],'K store absent from comparison').toBe(true);
    expect(result.compareChainEvidence.Lidl,'Lidl absent from comparison').toBe(true);
    expect(result.compareChainEvidence.Tokmanni||result.compareChainEvidence.EUROSPAR,'Tokmanni/SPAR absent from comparison').toBe(true);
    for(const [chain,count] of Object.entries(chains))expect(count,'No successful real '+chain+' product API response').toBeGreaterThan(0);
    for(const chain of ['lidl','tokmanni']){
      const audit=result.chainAcceptance[chain];
      expect(audit.hasQueryEvidence,`No ${chain} provider evidence for maito or cola`).toBe(true);
      expect(audit.hasComparablePrice,`${chain} returned no comparable priced products for maito/cola`).toBe(true);
    }
  }finally{
    // Even when the app fails before the comparison page, preserve the
    // actual browser state and provider evidence for diagnosis.
    fs.mkdirSync('test-results',{recursive:true});
    result.finalUrl=page.url();
    result.finalTitle=await page.title().catch(()=>null);
    result.finalBodyExcerpt=await page.locator('body').innerText({timeout:5000}).then(s=>s.slice(-4000)).catch(()=>null);
    await page.screenshot({path:'test-results/monta-'+device+'-final-state.png',fullPage:true,timeout:10000}).catch(e=>{result.finalScreenshotError=String(e)});
    fs.writeFileSync('test-results/monta-'+device+'-evidence.json',JSON.stringify(result,null,2));
    await context.close().catch(()=>{});
  }
});
}

// Run parity even when a preceding four-chain price assertion fails: the
// evidence JSON is written in finally for each device.
test('Monta: mobile and desktop visible EAN sets match per query',async()=>{
  const load=device=>{
    const file='test-results/monta-'+device+'-evidence.json';
    expect(fs.existsSync(file),device+' evidence must exist').toBe(true);
    return JSON.parse(fs.readFileSync(file,'utf8'));
  };
  const mobile=load('mobile'),desktop=load('desktop');
  const byQuery=result=>Object.fromEntries(result.results.map(x=>[x.query,x.resultEans||[]]));
  const a=byQuery(mobile),b=byQuery(desktop);
  const differences=queries.filter(q=>JSON.stringify(a[q])!==JSON.stringify(b[q])).map(q=>({query:q,mobile:a[q]||[],desktop:b[q]||[]}));
  const missingEvidence=queries.filter(q=>!(a[q]?.length>0&&b[q]?.length>0)).map(q=>({query:q,mobile:a[q]?.length||0,desktop:b[q]?.length||0}));
  fs.writeFileSync('test-results/monta-mobile-desktop-parity.json',JSON.stringify({queries,matched:queries.length-differences.length,differences,missingEvidence},null,2));
  expect(missingEvidence,'Every query must contain real visible EAN-backed products on BOTH layouts; empty sets cannot pass parity').toEqual([]);
  expect(differences,'EAN product sets must match for every query').toEqual([]);
});

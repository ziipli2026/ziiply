const {test,expect,devices}=require('@playwright/test');
const fs=require('node:fs');
const base=process.env.ZIIPLY_LIVE_URL||'https://ziiply.fi';
const queries=['maito','kahvi','kananmunat','juusto','banaani','pasta','riisi','jauheliha','jogurtti','kurkku'];
for(const device of ['mobile','desktop']){
test('Monta live all chains: '+device,async({browser})=>{
  test.setTimeout(240000);
  const context=await browser.newContext(device==='mobile'?{...devices['iPhone 13'],serviceWorkers:'block'}:{viewport:{width:1440,height:900},serviceWorkers:'block'});
  const page=await context.newPage();
  const calls=[],errors=[];
  const chains={s:0,k:0,lidl:0,tokmanni:0};
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('response',r=>{if(r.url().includes('/api/')){const url=r.url().split('?')[0];calls.push({url,status:r.status()});for(const [chain,pattern] of Object.entries({s:/\/api\/s-products$/,k:/\/api\/k-products$/,lidl:/\/api\/lidl\/products$/,tokmanni:/\/api\/tokmanni\/products$/}))if(pattern.test(url)&&r.status()===200)chains[chain]++;}});
  const result={device,base,queries,results:[],calls,errors,chains};
  try{
    const first=await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
    expect(first.status()).toBeLessThan(400);
    await page.waitForTimeout(1800);
    await page.evaluate(()=>{
      localStorage.setItem('ziiply-store-selection-v536',JSON.stringify({
        version:1,savedAt:Date.now(),storeMode:'hyper',storeModeChosenV299:true,
        storeCompareScope:'between_chains',betweenChainSelectionModeV749:'many',
        selectedChains:{s:true,k:true,lidl:true,tokmanni:true},usingOwnLocation:false
      }));
    });
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
      await input.fill(query);
      if(device==='desktop')await input.press('Enter');
      else await page.getByRole('button',{name:'Justiina',exact:true}).filter({visible:true}).click();
      await page.waitForTimeout(3000);
      const visible=await page.locator('body').innerText();
      result.results.push({query,visibleExcerpt:visible.slice(-1800),apiCalls:calls.length});
      const candidate=page.getByRole('button',{name:/Lisää (?:ostoskoriin|koriin)/i}).filter({visible:true});
      if(await candidate.count()){
        try{
          await candidate.first().click({timeout:5000});
          added.push(query);
          const close=page.getByRole('button',{name:'Sulje tuotevalinta',exact:true}).filter({visible:true});
          if(await close.count())await close.first().click();
        }catch(e){result.results[result.results.length-1].addError=String(e)}
      }
      await page.screenshot({path:'test-results/monta-'+device+'-'+query+'.png',fullPage:true});
    }
    const apiCalls=calls.filter(x=>/search|products|lidl|spar|tokmanni|neon/i.test(x.url));
    expect(apiCalls.length,'Real product search APIs must be called').toBeGreaterThan(0);
    expect(apiCalls.some(x=>x.status>=500),'Product API must not return server errors').toBe(false);
    expect(errors.filter(x=>/Hydration failed|Cannot read properties of undefined|Minified React error/.test(x))).toEqual([]);
    // Do not claim all four chains passed from a mere HTTP 200: record actual
    // chain evidence for review; absence of Lidl/SPAR is explicitly a failure.
    // A chain name somewhere in page text is NOT proof of a real product search.
    for(const [chain,count] of Object.entries(chains))expect(count,'No successful real '+chain+' product API response').toBeGreaterThan(0);
    // Products are added as each search completes, before the next query replaces results.
    result.addedQueries=added;
    expect(added.length,'At least four distinct searches must add products').toBeGreaterThanOrEqual(4);
    const cartState=await page.evaluate(()=>({mobile:JSON.parse(localStorage.getItem('ziiply-cart-v1')||'{}').items||[],desktop:JSON.parse(sessionStorage.getItem('ziiply-desktop-current-cart-v1')||'[]')}));
    result.cartBeforeCompare=cartState;
    const cartRows=device==='mobile'?cartState.mobile:cartState.desktop;
    expect(cartRows.length,'Shopping cart must have at least four products').toBeGreaterThanOrEqual(4);
    result.cartProductNames=cartRows.map(row=>row.name||row.title||row.product?.name||row.product?.title);
    expect(new Set(result.cartProductNames.filter(Boolean)).size,'Cart must contain four different product names').toBeGreaterThanOrEqual(4);
    const comparisonNav=page.getByRole('button',{name:'Vertailu',exact:true}).filter({visible:true}).last();
    await expect(comparisonNav).toBeVisible({timeout:15000});
    await comparisonNav.click();
    const compareButton=page.getByRole('button',{name:/Halpuusvertailu/i}).filter({visible:true}).first();
    if(device==='mobile'){
      await expect(compareButton,'Basket must expose Halpuusvertailu').toBeVisible({timeout:15000});
      await compareButton.click();
    }
    await expect(page.getByText(/Halpuusvertailu|Hintavertailu/).first()).toBeVisible({timeout:30000});
    result.compareText=(await page.locator('body').innerText()).slice(-6500);
    expect(result.compareText).not.toMatch(/Vertailutuloksia ei ole saatavilla|Ei vertailua/);
    result.compareChainEvidence=Object.fromEntries(['Prisma','K-Citymarket','Lidl','Tokmanni','EUROSPAR'].map(name=>[name,result.compareText.toLowerCase().includes(name.toLowerCase())]));
    expect(result.compareChainEvidence.Prisma,'S store absent from comparison').toBe(true);
    expect(result.compareChainEvidence['K-Citymarket'],'K store absent from comparison').toBe(true);
    expect(result.compareChainEvidence.Lidl,'Lidl absent from comparison').toBe(true);
    expect(result.compareChainEvidence.Tokmanni||result.compareChainEvidence.EUROSPAR,'Tokmanni/SPAR absent from comparison').toBe(true);
    result.cart=await page.evaluate(()=>({mobile:localStorage.getItem('ziiply-cart-v1'),desktop:sessionStorage.getItem('ziiply-desktop-current-cart-v1')}));
    await page.screenshot({path:'test-results/monta-'+device+'-comparison.png',fullPage:true});
  }finally{
    fs.mkdirSync('test-results',{recursive:true});
    fs.writeFileSync('test-results/monta-'+device+'-evidence.json',JSON.stringify(result,null,2));
    await context.close();
  }
});
}

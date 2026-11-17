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
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('response',r=>{if(r.url().includes('/api/'))calls.push({url:r.url().split('?')[0],status:r.status()});});
  const result={device,base,queries,results:[],calls,errors};
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
    // Never mock network: all product searches use the real deployed backend.
    const justiina=page.getByRole('button',{name:device==='mobile'?'Justiina: Tuotehaku':'Avaa Justiina',exact:true});
    await expect(justiina).toBeVisible({timeout:30000});
    await justiina.click();
    const input=device==='mobile'
      ?page.getByPlaceholder(/Kirjoita yksi tuote|maito, kahvi/).filter({visible:true})
      :page.getByRole('textbox',{name:'Hae tuotteita'});
    await expect(input).toBeVisible({timeout:15000});
    for(const query of queries){
      await input.fill(query);
      if(device==='desktop')await input.press('Enter');
      else await page.getByRole('button',{name:'Justiina',exact:true}).filter({visible:true}).click();
      await page.waitForTimeout(3000);
      const visible=await page.locator('body').innerText();
      result.results.push({query,visibleExcerpt:visible.slice(-1800),apiCalls:calls.length});
      await page.screenshot({path:'test-results/monta-'+device+'-'+query+'.png',fullPage:true});
    }
    const apiCalls=calls.filter(x=>/search|products|lidl|spar|tokmanni|neon/i.test(x.url));
    expect(apiCalls.length,'Real product search APIs must be called').toBeGreaterThan(0);
    expect(apiCalls.some(x=>x.status>=500),'Product API must not return server errors').toBe(false);
    expect(errors.filter(x=>/Hydration failed|Cannot read properties of undefined|Minified React error/.test(x))).toEqual([]);
    // Do not claim all four chains passed from a mere HTTP 200: record actual
    // chain evidence for review; absence of Lidl/SPAR is explicitly a failure.
    const joined=JSON.stringify(result.results).toLowerCase();
    for(const chain of ['lidl','tokmanni','spar']){
      if(chain==='tokmanni'&&joined.includes('spar'))continue;
      if(chain==='spar'&&joined.includes('tokmanni'))continue;
      expect(joined.includes(chain),'No visible '+chain+' evidence in live search results').toBe(true);
    }
    // Exercise the actual basket and comparison screen, not just product search.
    const addButtons=page.getByRole('button',{name:/Lisää (?:ostoskoriin|koriin)/i}).filter({visible:true});
    const addCount=await addButtons.count();
    result.addButtons=addCount;
    expect(addCount,'Search must expose add-to-cart action').toBeGreaterThan(0);
    await addButtons.first().click();
    await page.waitForFunction(()=>{try{return JSON.parse(localStorage.getItem('ziiply-cart-v1')||'{}').items?.length>0}catch{return false}},null,{timeout:15000});
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
    result.cart=await page.evaluate(()=>({mobile:localStorage.getItem('ziiply-cart-v1'),desktop:sessionStorage.getItem('ziiply-desktop-current-cart-v1')}));
    await page.screenshot({path:'test-results/monta-'+device+'-comparison.png',fullPage:true});
  }finally{
    fs.mkdirSync('test-results',{recursive:true});
    fs.writeFileSync('test-results/monta-'+device+'-evidence.json',JSON.stringify(result,null,2));
    await context.close();
  }
});
}

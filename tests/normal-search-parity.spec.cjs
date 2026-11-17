const {test,expect,devices}=require('@playwright/test');
const fs=require('node:fs');
const base=process.env.ZIIPLY_LIVE_URL;
const queries=['maito','cola','kahvi','kananmunat','juusto','banaani','pasta','riisi','jauheliha','jogurtti','kurkku'];
const auth=process.env.VERCEL_AUTOMATION_BYPASS_SECRET?{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET}:{};
test('Normal product search: scoped EAN parity, no cart or Monta assertions',async({browser})=>{
  test.setTimeout(480000);
  if(!base)throw Error('ZIIPLY_LIVE_URL missing');
  const evidence={base,queries,layouts:{},differences:[],orderDifferences:[]};
  for(const device of ['mobile','desktop']){
    const context=await browser.newContext(device==='mobile'?{...devices['iPhone 13'],serviceWorkers:'block',extraHTTPHeaders:auth}:{viewport:{width:1440,height:900},serviceWorkers:'block',extraHTTPHeaders:auth});
    const page=await context.newPage();
    const errors=[],apiResponses=[];
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('response',r=>{try{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))apiResponses.push({path:u.pathname,status:r.status()});}catch{}});
    try{
      const response=await page.goto(device==='mobile'?base:base.replace(/\/$/,'')+'/desktop-preview',{waitUntil:'domcontentloaded',timeout:60000});
      expect(response.status()).toBeLessThan(400);
      await page.evaluate(()=>{
        const s={id:'634976534',name:'Prisma Hyvinkää',chain:'S',latitude:60.63,longitude:24.86};
        const k={id:'C130',name:'K-Citymarket Hyvinkää',chain:'K'};
        localStorage.setItem('ziiply-desktop-store-choices-v1',JSON.stringify({storeMode:'hyper',storeModeChosen:true,selectedChain:'S',betweenMode:'many',storeCompareScope:'between_chains',allStoreSelections:{hyper:{[s.id]:s,[k.id]:k},local:{}}}));
        localStorage.setItem('ziiply-store-selection-v536',JSON.stringify({version:1,savedAt:Date.now(),activeArea:{label:'Hyvinkää',sStoreId:s.id,sStoreName:s.name,kStoreId:k.id,kStoreName:k.name},storeMode:'hyper',storeModeChosenV299:true,storeCompareScope:'between_chains',betweenChainSelectionModeV749:'many',selectedChains:{s:true,k:true,lidl:false,tokmanni:false},usingOwnLocation:false}));
      });
      await page.reload({waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:device==='mobile'?'Justiina: Tuotehaku':'Avaa Justiina',exact:true}).click({timeout:30000});
      const input=device==='mobile'?page.getByPlaceholder(/Kirjoita yksi tuote|maito, kahvi/).filter({visible:true}):page.getByRole('textbox',{name:'Hae tuotteita'});
      const results=[];
      for(const query of queries){
        if(device==='desktop'&&!await input.isVisible().catch(()=>false)){
          const reopen=page.getByRole('button',{name:'Avaa Justiina',exact:true}).filter({visible:true});
          if(await reopen.count())await reopen.first().click();
        }
        await expect(input).toBeVisible({timeout:15000});
        await input.fill(query);
        if(device==='desktop')await input.press('Enter');
        else await page.getByRole('button',{name:'Justiina',exact:true}).filter({visible:true}).click();
        const cards=page.locator('[data-testid="normal-search-result"][data-ean]');
        // Mobile may keep the findings sheet closed after a previous selection.
        // Reopen the existing results instead of treating a hidden sheet as an empty search.
        if(device==='mobile'){
          await page.waitForTimeout(1000);
          if(await cards.count()===0){
            const ledger=page.getByRole('button',{name:/Avaa löytöluettelo/i}).filter({visible:true});
            if(await ledger.count())await ledger.first().click();
          }
        }
        try{
          await expect.poll(async()=>cards.count(),{timeout:30000}).toBeGreaterThan(0);
        }catch(error){
          fs.mkdirSync('normal-search-evidence',{recursive:true});
          const diagnostic={
            device,query,reason:String(error),pageUrl:page.url(),
            resultCardCount:await cards.count(),
            oldVisibleEans:await page.getByText(/EAN \\d{13}/).filter({visible:true}).count(),
            findingsButtonCount:await page.getByRole('button',{name:/Avaa löytöluettelo/i}).count(),
            visibleText:(await page.locator('body').innerText()).slice(-5000),
            apiResponses:apiResponses.slice(-50),errors,
          };
          fs.writeFileSync('normal-search-evidence/failure-diagnostic.json',JSON.stringify(diagnostic,null,2));
          await page.screenshot({path:'normal-search-evidence/failure.png',fullPage:true}).catch(()=>{});
          throw error;
        }
        if(device==='mobile')await page.getByText(/Haetaan lisää tuotteita|Haetaan tuotteita/).filter({visible:true}).first().waitFor({state:'hidden',timeout:45000}).catch(()=>{});
        else await page.getByText('Haetaan tuotteita…').filter({visible:true}).first().waitFor({state:'hidden',timeout:45000}).catch(()=>{});
        await page.waitForTimeout(500);
        const eans=await cards.evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>n.getAttribute('data-ean')).filter(e=>/^\d{13}$/.test(e||'')));
        results.push({query,eans:[...new Set(eans)],count:eans.length});
      }
      evidence.layouts[device]={results,errors};
      expect(errors,'Browser page errors').toEqual([]);
    }finally{await context.close();}
  }
  for(const query of queries){
    const mobile=evidence.layouts.mobile.results.find(x=>x.query===query).eans;
    const desktop=evidence.layouts.desktop.results.find(x=>x.query===query).eans;
    if([...mobile].sort().join(',')!==[...desktop].sort().join(','))evidence.differences.push({query,mobileOnly:mobile.filter(x=>!desktop.includes(x)),desktopOnly:desktop.filter(x=>!mobile.includes(x)),mobileCount:mobile.length,desktopCount:desktop.length});
    if(mobile.join(',')!==desktop.join(','))evidence.orderDifferences.push(query);
  }
  fs.mkdirSync('normal-search-evidence',{recursive:true});
  fs.writeFileSync('normal-search-evidence/parity.json',JSON.stringify(evidence,null,2));
  expect(evidence.differences,'Scoped normal search EAN parity').toEqual([]);
  expect(evidence.orderDifferences,'Scoped normal search order parity').toEqual([]);
});

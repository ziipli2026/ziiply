const {test,expect,devices}=require('@playwright/test');
const fs=require('node:fs');
const base=process.env.ZIIPLY_LIVE_URL;
const queries=['maito','cola','kahvi','kananmunat','juusto','banaani','pasta','riisi','jauheliha','jogurtti','kurkku'];
const auth=process.env.VERCEL_AUTOMATION_BYPASS_SECRET?{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET}:{};
test('Normal product search: scoped EAN parity, no cart or Monta assertions',async({browser})=>{
  // This test runs 22 live searches plus real store discovery. Preserve evidence even
  // when a single provider stalls; cap each operation independently.
  test.setTimeout(1200000);
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
      // Use the same verified store selection as the existing working live comparison.
      // Do not infer independent-chain store IDs or silently proceed with an empty selection.
      const lidlResponse=await context.request.get(base+'/api/lidl/store-search?search=Hyvinkää');
      const sparResponse=await context.request.get(base+'/api/eurospar-stores?search=Hyvinkää');
      expect(lidlResponse.ok(),'Lidl discovery failed').toBe(true);
      expect(sparResponse.ok(),'SPAR discovery failed').toBe(true);
      const lidlStores=(await lidlResponse.json()).items||[];
      const sparStores=(await sparResponse.json()).items||[];
      const selectedLidl=lidlStores.find(x=>x.id&&/hyvinkää/i.test(x.city||x.name));
      const selectedSpar=sparStores.find(x=>x.id&&/^(EUROSPAR|TOKMANNI)$/i.test(x.chain||''));
      expect(selectedLidl,'No real Lidl Hyvinkää store').toBeTruthy();
      expect(selectedSpar,'No real SPAR/Tokmanni store').toBeTruthy();
      await page.evaluate(({selectedLidl,selectedSpar})=>{
        const s={id:'634976534',name:'Prisma Hyvinkää',chain:'S',latitude:60.63,longitude:24.86};
        const k={id:'C130',name:'K-Citymarket Hyvinkää',chain:'K'};
        const lidl=selectedLidl,spar=selectedSpar;
        localStorage.setItem('ziiply-desktop-store-choices-v1',JSON.stringify({storeMode:'hyper',storeModeChosen:true,selectedChain:'S',betweenMode:'many',storeCompareScope:'between_chains',allStoreSelections:{hyper:{[s.id]:s,[k.id]:k,[lidl.id]:lidl,[spar.id]:spar},local:{}}}));
        localStorage.setItem('ziiply-store-selection-v536',JSON.stringify({
          version:1,savedAt:Date.now(),activeArea:{label:'Hyvinkää',sStoreId:s.id,sStoreName:s.name,kStoreId:k.id,kStoreName:k.name},storeMode:'hyper',storeModeChosenV299:true,
          storeCompareScope:'between_chains',betweenChainSelectionModeV749:'many',
          selectedChains:{s:true,k:true,lidl:true,tokmanni:true},
          selectedLidlStoreV750:lidl,selectedEurosparStoreV751:spar.chain==='EUROSPAR'?spar:null,
          selectedTokmanniStoreV756:spar.chain==='TOKMANNI'?spar:null,usingOwnLocation:false
        }));
      },{selectedLidl,selectedSpar});
      await page.reload({waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:device==='mobile'?'Justiina: Tuotehaku':'Avaa Justiina',exact:true}).click({timeout:30000});
      const input=device==='mobile'?page.getByPlaceholder(/Kirjoita yksi tuote|maito, kahvi/).filter({visible:true}):page.getByRole('textbox',{name:'Hae tuotteita'});
      const results=[];
      fs.mkdirSync('normal-search-evidence',{recursive:true});
      const checkpoint=()=>fs.writeFileSync('normal-search-evidence/progress-'+device+'.json',JSON.stringify({base,device,results,apiResponses:apiResponses.slice(-100),errors},null,2));
      checkpoint();
      for(const query of queries){
        const startedAt=Date.now();
        console.log('[normal-parity] start',device,query);
        checkpoint();
        // The mobile findings dialog covers the search controls after a completed
        // search. Close it before submitting a new query, otherwise Playwright's
        // actionability auto-wait can hang behind its backdrop until the global timeout.
        if(device==='mobile'){
          const closeFindings=page.getByRole('button',{name:'Sulje löydökset',exact:true}).filter({visible:true});
          if(await closeFindings.count()){
            await closeFindings.first().click({timeout:8000});
            console.log('[normal-parity] closed findings before',device,query);
          }
        } else {
          // Desktop displays normal results in a modal covering the search input.
          // Close it before the next query; otherwise Playwright waits forever
          // for a hidden text box to become actionable.
          const closeResults=page.getByRole('button',{name:'Sulje tuotevalinta',exact:true}).filter({visible:true});
          if(await closeResults.count()){
            await closeResults.first().click({timeout:8000});
            console.log('[normal-parity] closed desktop results before',query);
          }
        }
        if(device==='desktop'&&!await input.isVisible().catch(()=>false)){
          const reopen=page.getByRole('button',{name:'Avaa Justiina',exact:true}).filter({visible:true});
          if(await reopen.count())await reopen.first().click();
        }
        await expect(input).toBeVisible({timeout:15000});
        await input.fill(query,{timeout:12000});
        if(device==='desktop')await input.press('Enter',{timeout:12000});
        else await page.getByRole('button',{name:'Justiina',exact:true}).filter({visible:true}).click({timeout:12000});
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
            oldVisibleEans:await page.getByText(/EAN \d{13}/).filter({visible:true}).count(),
            findingsButtonCount:await page.getByRole('button',{name:/Avaa löytöluettelo/i}).count(),
            visibleText:(await page.locator('body').innerText()).slice(-5000),
            apiResponses:apiResponses.slice(-50),errors,
          };
          fs.writeFileSync('normal-search-evidence/failure-diagnostic.json',JSON.stringify(diagnostic,null,2));
          await page.screenshot({path:'normal-search-evidence/failure.png',fullPage:true}).catch(()=>{});
          throw error;
        }
        if(device==='mobile')await page.getByText(/Haetaan lisää tuotteita|Haetaan tuotteita/).filter({visible:true}).first().waitFor({state:'hidden',timeout:45000}).catch(()=>{});
        else {
          // The app may autocorrect or normalize the displayed active query.
          // Match completion, not the raw typed term. Keep the exact rendered
          // status for diagnosis if completion does not arrive.
          try {
            await expect(page.getByRole('status').filter({hasText:/löydetty ·/}).first()).toBeVisible({timeout:25000});
          } catch(error) {
            const diagnostic={
              device,query,reason:String(error),
              renderedStatuses:await page.getByRole('status').allTextContents().catch(()=>[]),
              renderedHeadings:await page.getByRole('heading').allTextContents().catch(()=>[]),
              cards:await cards.count(),visibleCards:await cards.filter({visible:true}).count(),
              inputValue:await input.inputValue().catch(()=>null),
              visibleText:(await page.locator('body').innerText().catch(()=>'')).slice(-5500),
              apiResponses:apiResponses.slice(-80),errors,
            };
            fs.writeFileSync('normal-search-evidence/desktop-'+query+'-failure.json',JSON.stringify(diagnostic,null,2));
            await page.screenshot({path:'normal-search-evidence/desktop-'+query+'-failure.png',fullPage:true}).catch(()=>{});
            throw error;
          }
        }
        await page.waitForTimeout(500);
        const snapshots=await cards.evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>({ean:n.getAttribute('data-ean'),label:(n.textContent||'').replace(/\\s+/g,' ').slice(0,240)})).filter(x=>/^\d{13}$/.test(x.ean||'')));
        const eans=[...new Set(snapshots.map(x=>x.ean))];
        results.push({query,eans,uniqueEans:eans.length,renderedCards:snapshots.length,duplicates:snapshots.length-eans.length,samples:snapshots.slice(0,25),durationMs:Date.now()-startedAt});
        console.log('[normal-parity] complete',device,query,'unique='+eans.length,'rendered='+snapshots.length,'ms='+String(Date.now()-startedAt));
        checkpoint();
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

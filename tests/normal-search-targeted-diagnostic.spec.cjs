const {test,expect,devices}=require('@playwright/test');
const fs=require('node:fs');
const crypto=require('node:crypto');
const base=process.env.ZIIPLY_LIVE_URL;
const fullCorpus=require('./normal-search-100-queries.cjs');
const legacyQueries=['maito','cola','kahvi','kananmunat','juusto','banaani','pasta','riisi','jauheliha','jogurtti','kurkku'];
const auditBatch=process.env.NORMAL_SEARCH_AUDIT_BATCH;
const smokeQueries=['tomaatti','paprika','salaatti','appelsiini','maito','kahvi','kananmunat','jauheliha','kurkku','banaani','riisi','jogurtti'];
if(auditBatch!==undefined && !/^[0-9]$/.test(auditBatch))throw Error('Invalid NORMAL_SEARCH_AUDIT_BATCH: expected 0-9');
if(new Set(fullCorpus).size!==100)throw Error('100-query corpus must contain exactly 100 distinct queries');
const singleQuery=process.env.NORMAL_SEARCH_SINGLE_QUERY?.trim();
const selectedQueries=process.env.NORMAL_SEARCH_SELECTED_QUERIES?.split(',').map(query=>query.trim()).filter(Boolean);
const queries=selectedQueries?.length?selectedQueries:(singleQuery?[singleQuery]:(auditBatch===undefined?smokeQueries:fullCorpus.slice(Number(auditBatch)*10,(Number(auditBatch)+1)*10)));
const auth=process.env.VERCEL_AUTOMATION_BYPASS_SECRET?{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET}:{};
test('Normal product search: scoped EAN parity, no cart or Monta assertions',async({browser})=>{
  // This test runs 22 live searches plus real store discovery. Preserve evidence even
  // when a single provider stalls; cap each operation independently.
  // A 10-query batch searches mobile and desktop sequentially; the previous
  // 20-minute cap closed the browser before parity could be evaluated.
  test.setTimeout(auditBatch!==undefined ? 1800000 : 1200000);
  if(!base)throw Error('ZIIPLY_LIVE_URL missing');
  const evidence={base,queries,auditBatch:auditBatch??null,expectedCommit:process.env.GITHUB_SHA||null,deployments:{},layouts:{},differences:[],orderDifferences:[],duplicates:[],noResults:[]};
  // Record the actual Vercel deployment identifiers used by each layout.
  // The workflow currently targets a fixed preview alias: a passing audit
  // must not be mistaken for proof that it exercised the current Git SHA.
  console.log('[normal-parity] deployment target',JSON.stringify({base,expectedCommit:evidence.expectedCommit}));

  // Optional deterministic provider replay: capture mobile API responses and
  // serve identical bytes to desktop for the same search query and URL.
  const replayEnabled=process.env.NORMAL_SEARCH_REPLAY==='1';
  const replayResponses=new Map();
  const replayCaptures=[];
  const replayPaths=/^\/api\/(?:k-products|s-products|neon-first-search|lidl\/products|tokmanni\/products|ean-bank)(?:\/|$)/;
  for(const device of ['mobile','desktop']){
    const mobileWidth=Number(process.env.NORMAL_SEARCH_MOBILE_WIDTH||390);
    const context=await browser.newContext(device==='mobile'?{...devices['iPhone 13'],viewport:{width:mobileWidth,height:mobileWidth>=700?1024:844},serviceWorkers:'block',extraHTTPHeaders:auth}:{viewport:{width:1440,height:900},serviceWorkers:'block',extraHTTPHeaders:auth});
    const page=await context.newPage();
    const errors=[],apiResponses=[],providerEanPresence=[],providerChecks=[],responseBodyChecks=[],providerBodyShapes=[],decisionSummaries=[],providerFingerprints=[];
    const anomalyQueries=new Set(['mansikka','suklaa','makkara','vadelma','mustikka','muro','pakastevihannes']);
    const anomalyEans=['6417801801004','6407800000980','6410405181091','6411020008015','8445292269520'];
    page.on('console',msg=>{if(msg.text().startsWith('[normal-search-decision-summary]')){try{const item=JSON.parse(msg.text().slice('[normal-search-decision-summary]'.length).trim());decisionSummaries.push({device,...item});console.log('[normal-parity] DECISION SUMMARY',JSON.stringify({device,...item}));}catch{}}});
    page.on('console',msg=>{if(msg.text().startsWith('[normal-search-finalization-summary]')){try{const item=JSON.parse(msg.text().slice('[normal-search-finalization-summary]'.length).trim());decisionSummaries.push({device,stage:'finalization',...item});console.log('[normal-parity] FINALIZATION SUMMARY',JSON.stringify({device,...item}));}catch{}}});
    let currentSearchQuery='';
    const queryAtRequest=new WeakMap();
    if(replayEnabled && device==='desktop'){
      await page.route('**/api/**',async route=>{
        const url=new URL(route.request().url());
        if(!replayPaths.test(url.pathname))return route.continue();
        const key=currentSearchQuery+'|'+url.pathname+url.search;
        const saved=replayResponses.get(key);
        if(!saved){
          console.log('[normal-parity] REPLAY MISS',key);
          // A missing EAN enrichment is not a missing product-search response.
          // Preserve the live enrichment path, but fail closed for search providers.
          if(url.pathname==='/api/ean-bank')return route.continue();
          return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Missing recorded provider response',key})});
        }
        return route.fulfill({status:saved.status,headers:saved.headers,body:saved.body});
      });
    }
    page.on('request',request=>{ queryAtRequest.set(request,currentSearchQuery); });
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('response',r=>{
      try {
        const u=new URL(r.url());
        const requestQuery=queryAtRequest.get(r.request())||currentSearchQuery;
        if(replayEnabled && device==='mobile' && replayPaths.test(u.pathname) && requestQuery){
          const key=requestQuery+'|'+u.pathname+u.search;
          const capture=r.body().then(body=>{
            const headers={...r.headers()};
            delete headers['content-encoding'];delete headers['content-length'];delete headers['transfer-encoding'];
            replayResponses.set(key,{status:r.status(),headers,body});
          });
          replayCaptures.push(capture);
        }
        if(u.pathname.startsWith('/api/'))apiResponses.push({
          path:u.pathname,status:r.status(),method:r.request().method(),
          search:u.searchParams.get('search'),requestUrl:u.pathname+u.search,
          searchAtResponse:requestQuery
        });
        if(requestQuery==='suklaa' && ['/api/neon-first-search','/api/k-products','/api/s-products'].includes(u.pathname)){
          const queryAtResponse=requestQuery;
          const fingerprint=r.body().then(body=>{
            const record={device,query:queryAtResponse,path:u.pathname,search:u.searchParams.get('search')||u.searchParams.get('q'),status:r.status(),bytes:body.length,sha256:crypto.createHash('sha256').update(body).digest('hex')};
            providerFingerprints.push(record);
            console.log('[normal-parity] PROVIDER BODY SHA256',JSON.stringify(record));
          }).catch(error=>console.log('[normal-parity] PROVIDER BODY SHA256 ERROR',String(error)));
          providerChecks.push(fingerprint);
        }
        // Compare the actual provider EAN sets and pagination completeness, not
        // just raw response hashes (which can change with metadata/order).
        if(['mustikka','vadelma','suklaa','mansikka','makkara','kala'].includes(requestQuery)
          && ['/api/k-products','/api/s-products','/api/neon-first-search'].includes(u.pathname)){
          const queryAtResponse=requestQuery;
          const check=r.json().then(data=>{
            const rows=Array.isArray(data)?data:(Array.isArray(data?.items)?data.items:(Array.isArray(data?.products)?data.products:(Array.isArray(data?.results)?data.results:[])));
            const eans=[...new Set(rows.map(p=>String(p?.ean||p?.barcode||p?.gtin||p?.product?.ean||'').replace(/\D/g,'')).filter(x=>/^(?:\d{8}|\d{12,14})$/.test(x)))].sort();
            const item={device,query:queryAtResponse,path:u.pathname,requestSearch:u.searchParams.get('search')||u.searchParams.get('q'),status:r.status(),rowCount:rows.length,eanCount:eans.length,eans,pagination:data?.pagination||null};
            providerFingerprints.push(item);
            console.log('[normal-parity] PROVIDER EAN SET',JSON.stringify(item));
          }).catch(error=>console.log('[normal-parity] PROVIDER EAN SET ERROR',String(error)));
          providerChecks.push(check);
        }
        // Capture the response structure for queries that currently produce no
        // rendered cards. HTTP 200 alone does not prove the API returned products.
        if(['paprika','salaatti','appelsiini'].includes(requestQuery)
          && /\/api\/(?:neon-first-search|k-products|s-products|lidl\/products|tokmanni\/products)/.test(u.pathname)){
          const queryAtRequest=requestQuery;
          const check=r.text().then(body=>{
            let shape;
            try {
              const parsed=JSON.parse(body);
              shape={type:Array.isArray(parsed)?'array':typeof parsed,
                keys:parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?Object.keys(parsed).slice(0,25):[],
                arrayLengths:Object.fromEntries(Object.entries(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{}).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length])),
                topLevelLength:Array.isArray(parsed)?parsed.length:null};
            }catch{shape={type:'non-json',bodyLength:body.length};}
            const item={device,query:queryAtRequest,path:u.pathname,requestSearch:u.searchParams.get('search')||u.searchParams.get('q'),status:r.status(),shape};
            providerBodyShapes.push(item);
            console.log('[normal-parity] PROVIDER BODY SHAPE',JSON.stringify(item));
          }).catch(error=>console.log('[normal-parity] PROVIDER BODY ERROR',JSON.stringify({device,query:queryAtRequest,path:u.pathname,error:String(error)})));
          responseBodyChecks.push(check);
        }
        if(anomalyQueries.has(requestQuery) && /\/api\/(?:neon-first-search|k-products|s-products|lidl\/products|tokmanni\/products)/.test(u.pathname)){
          const queryAtResponse=requestQuery;
          const check=r.text().then(body=>{
            const matches=anomalyEans.filter(ean=>body.includes(ean));
            const item={device,query:queryAtResponse,path:u.pathname,requestSearch:u.searchParams.get('search')||u.searchParams.get('q'),status:r.status(),bodyLength:body.length,matchingEans:matches};
            providerEanPresence.push(item);
            console.log('[normal-parity] ANOMALY PROVIDER EANS',JSON.stringify(item));
          }).catch(error=>console.log('[normal-parity] ANOMALY PROVIDER ERROR',String(error)));
          providerChecks.push(check);
        }
        if(requestQuery==='juusto' && /\/api\/(?:neon-first-search|k-products|s-products|lidl\/products|tokmanni\/products)/.test(u.pathname)){
          const requestSearch=u.searchParams.get('search');
          const check=r.text().then(body=>{
            const targets=['3073780902441','6407204002559'];
            const matches=targets.map(ean=>{const index=body.indexOf(ean);return {ean,present:index>=0,excerpt:index<0?null:body.slice(Math.max(0,index-350),index+450)};});
            providerEanPresence.push({device,query:'juusto',path:u.pathname,requestSearch,status:r.status(),matches,bodyLength:body.length});
          }).catch(error=>providerEanPresence.push({device,query:'juusto',path:u.pathname,requestSearch,status:r.status(),error:String(error)}));
          providerChecks.push(check);
        }
      }catch{}
    });
    try{
      // Discover real stores BEFORE mounting the app; the previous test loaded
      // an empty profile, then wrote localStorage after React hydrated.
      // On reload app effects sometimes replaced it with empty choices.
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
      await context.addInitScript(({selectedLidl,selectedSpar})=>{
        const s={id:'634976534',name:'Prisma Hyvinkää',chain:'S',latitude:60.63,longitude:24.86};
        const k={id:'C130',name:'K-Citymarket Hyvinkää',chain:'K'};
        const lidl=selectedLidl,spar=selectedSpar;
        sessionStorage.setItem('ziiply-normal-search-diagnostic','1');
        localStorage.setItem('ziiply-desktop-store-choices-v1',JSON.stringify({
          storeMode:'hyper',storeModeChosen:true,selectedChain:'S',betweenMode:'many',
          storeCompareScope:'between_chains',
          allStoreSelections:{hyper:{[s.id]:s,[k.id]:k,[lidl.id]:lidl,[spar.id]:spar},local:{}}
        }));
        localStorage.setItem('ziiply-store-selection-v536',JSON.stringify({
          version:1,savedAt:Date.now(),
          activeArea:{label:'Hyvinkää',sStoreId:s.id,sStoreName:s.name,kStoreId:k.id,kStoreName:k.name},
          storeMode:'hyper',storeModeChosenV299:true,storeCompareScope:'between_chains',
          betweenChainSelectionModeV749:'many',withinChain:null,
          selectedChains:{s:true,k:true,lidl:true,tokmanni:true},
          selectedLidlStoreV750:lidl,
          selectedEurosparStoreV751:spar.chain==='EUROSPAR'?spar:null,
          selectedTokmanniStoreV756:spar.chain==='TOKMANNI'?spar:null,
          usingOwnLocation:false
        }));
      },{selectedLidl,selectedSpar});
      // The real mobile app treats a missing CacheStorage V778 marker as a
      // deliberate browser-cache clear: it removes ALL saved store selections.
      // An isolated Playwright context always has an empty CacheStorage, so
      // seed this marker in a synthetic same-origin document before app mount.
      // This tests a RETURNING user's explicitly selected stores instead of
      // accidentally exercising the first-install reset path.
      await page.route('**/ziiply-audit-bootstrap',route=>route.fulfill({
        status:200,contentType:'text/html',
        body:'<!doctype html><html lang="fi"><title>Audit bootstrap</title></html>'
      }));
      await page.goto(base.replace(/\/$/,'')+'/ziiply-audit-bootstrap',{waitUntil:'domcontentloaded'});
      const cacheMarkerReady=await page.evaluate(async()=>{
        const cache=await window.caches.open('ziiply-boot-marker-v778');
        const req=new Request('/__ziiply_boot_marker_v778__');
        await cache.put(req,new Response('1',{headers:{'content-type':'text/plain'}}));
        return Boolean(await cache.match(req));
      });
      expect(cacheMarkerReady,'CacheStorage V778 returning-user marker must exist before hydration').toBe(true);
      const response=await page.goto(device==='mobile'?base:base.replace(/\/$/,'')+'/desktop-preview',{waitUntil:'domcontentloaded',timeout:60000});
      evidence.deployments[device]={
        url:response.url(),status:response.status(),
        vercelId:response.headers()['x-vercel-id']||null,
        deploymentUrl:response.headers()['x-vercel-deployment-url']||null,
        gitCommit:response.headers()['x-vercel-git-commit-sha']||null
      };
      console.log('[normal-parity] deployment response',device,JSON.stringify(evidence.deployments[device]));
      expect(response.status()).toBeLessThan(400);
      // The page may be hydrating store selection after DOMContentLoaded. Wait for
      // the active Justiina control rather than clicking an unhydrated button.
      const openSearch=page.getByRole('button',{name:device==='mobile'?'Justiina: Tuotehaku':'Avaa Justiina',exact:true}).filter({visible:true});
      await expect(openSearch).toBeVisible({timeout:30000});
      await openSearch.click({timeout:30000});
      if(device==='desktop'){
        const desktopInput=page.getByRole('textbox',{name:'Hae tuotteita'});
        if(!await desktopInput.isVisible().catch(()=>false)){
          // Desktop Justiina sometimes opens an intermediate workspace. Record
          // actual controls and try the explicit search entry once.
          const possible=page.getByRole('button',{name:/Justiina|Tuotehaku|Hae tuotteita/i}).filter({visible:true});
          const labels=await possible.allTextContents();
          console.log('[normal-parity] desktop search entry not yet visible',JSON.stringify(labels.slice(0,20)));
          const reopen=page.getByRole('button',{name:'Avaa Justiina',exact:true}).filter({visible:true});
          if(await reopen.count())await reopen.first().click({timeout:8000});
        }
      }
      const input=device==='mobile'?page.getByPlaceholder(/Kirjoita yksi tuote|maito, kahvi/).filter({visible:true}):page.getByRole('textbox',{name:'Hae tuotteita'});
      if(device==='desktop'&&!await input.isVisible().catch(()=>false)){
        // A click can land during hydration and leave the desktop workspace
        // without the search dialog. Retry the entry once, not the search.
        await page.waitForTimeout(750);
        const entry=page.getByRole('button',{name:'Avaa Justiina',exact:true}).filter({visible:true});
        if(await entry.count())await entry.first().click({timeout:10000});
        if(!await input.isVisible().catch(()=>false)){
          console.log('[normal-parity] desktop entry hydration retry',page.url());
          await page.reload({waitUntil:'domcontentloaded',timeout:45000});
          const afterReload=page.getByRole('button',{name:'Avaa Justiina',exact:true}).filter({visible:true});
          await expect(afterReload).toBeVisible({timeout:30000});
          await afterReload.first().click({timeout:10000});
        }
      }
      const results=[];
      const noResultDiagnostics=[];
      fs.mkdirSync('normal-search-evidence',{recursive:true});
      const checkpoint=()=>fs.writeFileSync('normal-search-evidence/progress-'+device+'.json',JSON.stringify({base,device,results,noResultDiagnostics,apiResponses:apiResponses.slice(-100),providerEanPresence,decisionSummaries,errors},null,2));
      checkpoint();
      for(const query of queries){
        // Per-query watchdog: a stuck browser RPC must not consume the entire 25-minute batch.
        await test.step(`${device}: ${query}`,async()=>{
        const startedAt=Date.now();
        currentSearchQuery=query;
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
        try{await expect(input).toBeVisible({timeout:15000});}
        catch(error){
          const diagnostic={device,query,reason:String(error),url:page.url(),buttons:await page.getByRole('button').allTextContents().catch(()=>[]),
            body:(await page.locator('body').innerText().catch(()=>'')).slice(-6500),
            selectedDesktop:await page.evaluate(()=>localStorage.getItem('ziiply-desktop-store-choices-v1')).catch(()=>null),
            selectedMobile:await page.evaluate(()=>localStorage.getItem('ziiply-store-selection-v536')).catch(()=>null),
            apiResponses:apiResponses.slice(-80),errors};
          fs.writeFileSync('normal-search-evidence/input-'+device+'-'+query+'.json',JSON.stringify(diagnostic,null,2));
          await page.screenshot({path:'normal-search-evidence/input-'+device+'-'+query+'.png',fullPage:true}).catch(()=>{});
          throw error;
        }
        const apiResponseStart=apiResponses.length;
        const browserErrorStart=errors.length;
        console.log('[normal-parity] stage input-fill',device,query);
        await input.fill(query,{timeout:12000});
        console.log('[normal-parity] stage input-filled',device,query);
        if(device==='desktop')await input.press('Enter',{timeout:12000});
        else await page.getByRole('button',{name:'Justiina',exact:true}).filter({visible:true}).click({timeout:12000});
        console.log('[normal-parity] stage submitted',device,query);
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
        let noVisibleCards=false;
        try{
          console.log('[normal-parity] stage waiting-cards',device,query);
          await expect.poll(async()=>cards.count(),{timeout:30000}).toBeGreaterThan(0);
          console.log('[normal-parity] stage cards-found',device,query);
        }catch(error){
          noVisibleCards=true;
          fs.mkdirSync('normal-search-evidence',{recursive:true});
          // Preserve network and console evidence without further potentially
          // blocked browser RPCs after a results wait has already failed.
          const diagnostic={
            device,query,reason:String(error),elapsedMs:Date.now()-startedAt,
            apiResponses:apiResponses.slice(apiResponseStart),
            errors:errors.slice(browserErrorStart),
            providerBodyShapes:providerBodyShapes.filter(x=>x.query===query),
          };
          await Promise.allSettled(responseBodyChecks.splice(0));
          try {
            diagnostic.ui=await Promise.race([page.evaluate(()=>({
              resultCards:document.querySelectorAll('[data-testid="normal-search-result"]').length,
              resultCardsWithEan:document.querySelectorAll('[data-testid="normal-search-result"][data-ean]').length,
              mobileResultSections:[...document.querySelectorAll('[data-testid="mobile-normal-search-results"]')].map(e=>({loading:e.getAttribute('data-search-loading'),visible:!!e.getClientRects().length,text:e.textContent?.slice(0,500)})),
              loadingStatuses:[...document.querySelectorAll('[role="status"]')].map(e=>e.textContent?.trim().slice(0,150)).filter(Boolean).slice(0,15),
              visibleDialogs:[...document.querySelectorAll('[role="dialog"]')].filter(e=>e.getClientRects().length).map(e=>e.textContent?.slice(0,160)),
            })),new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),4000))]);
          } catch(e){diagnostic.uiError=String(e)}
          noResultDiagnostics.push(diagnostic);
          fs.writeFileSync('normal-search-evidence/no-results-'+device+'-'+query.replace(/[^a-z0-9-]/gi,'_')+'.json',JSON.stringify(diagnostic,null,2));
          console.log('[normal-parity] NO RESULTS',device,query,JSON.stringify(diagnostic));
        }
        if(noVisibleCards){
          results.push({query,eans:[],uniqueEans:0,renderedCards:0,duplicates:0,samples:[],durationMs:Date.now()-startedAt,noResults:true});
          checkpoint();
          return;
        }
        if(device==='mobile'){
          // Wait for the actual component's loading+completion flags.
          // A transient initial result may contain duplicate EAN cards and a
          // different order while the S/K provider batches are still merging.
          await expect(page.getByTestId('mobile-normal-search-results')).toHaveAttribute('data-search-loading','false',{timeout:60000});
        }
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
        await Promise.allSettled(providerChecks.splice(0));
        // React can render the last initial S/K rows immediately before the
        // final ranked list. Do not compare a transitional DOM snapshot.
        // Require the rendered EAN sequence to remain unchanged across
        // three 1000ms samples after the loading indicator is cleared.
        const readSnapshots=()=>cards.evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>({ean:n.getAttribute('data-ean'),label:(n.textContent||'').replace(/\s+/g,' ').slice(0,240)})).filter(x=>/^\d{13}$/.test(x.ean||'')));
        let snapshots=await readSnapshots();
        let stable=0;
        for(let attempt=0;attempt<18 && stable<3;attempt++){
          await page.waitForTimeout(1000);
          const next=await readSnapshots();
          const same=JSON.stringify(next.map(x=>x.ean))===JSON.stringify(snapshots.map(x=>x.ean));
          stable=same?stable+1:0;
          snapshots=next;
        }
        if(stable<3)console.log('[normal-parity] DOM UNSTABLE',device,query,'cards='+snapshots.length);
        if(query==='mansikka') {
          const targetEan='6417801801004';
          const targetCards=snapshots.filter(x=>x.ean===targetEan);
          const suspicious=snapshots.filter(x=>/mansikka/i.test(x.label)&&/641780/i.test(x.label));
          console.log('[normal-parity] MANSIKKA TARGET EAN DIAGNOSTIC',JSON.stringify({device,query,targetEan,present:targetCards.length>0,targetCards,suspicious,stableSamples:stable,renderedCount:snapshots.length,providerResponses:apiResponses.slice(apiResponseStart).filter(x=>/\/api\/(s-products|k-products|neon-first-search)/.test(x.path)).map(x=>({path:x.path,search:x.search,status:x.status,method:x.method}))}));
        }
        const eans=[...new Set(snapshots.map(x=>x.ean))];
        const duplicateDetails=[...new Set(snapshots.map(x=>x.ean))]
          .map(ean=>({ean,cards:snapshots.filter(x=>x.ean===ean)}))
          .filter(x=>x.cards.length>1);
        if(duplicateDetails.length)console.log('[normal-parity] DUPLICATE CARD DETAIL',JSON.stringify({
          resultSections:await page.locator('[data-testid="mobile-normal-search-results"]').count(),
          duplicateSectionCounts:await cards.evaluateAll((nodes,duplicateEans)=>{
            const sections=[...new Set(nodes.map(n=>n.closest('[data-testid="mobile-normal-search-results"]')).filter(Boolean))];
            return sections.map((section,index)=>({index,visible:!!section.getClientRects().length,total:section.querySelectorAll('[data-testid="normal-search-result"][data-ean]').length,duplicates:duplicateEans.map(ean=>({ean,count:[...section.querySelectorAll('[data-testid="normal-search-result"][data-ean]')].filter(n=>n.getAttribute('data-ean')===ean).length})).filter(x=>x.count>1)}));
          },duplicateDetails.map(d=>d.ean)),
          domSource:await cards.evaluateAll((nodes,duplicateEans)=>nodes.filter(n=>n.getClientRects().length).map(n=>({ean:n.getAttribute('data-ean'),container:n.closest('[data-testid="mobile-normal-search-results"]')?.getAttribute('data-testid')||null,ancestors:(()=>{const list=[];for(let el=n,i=0;el&&i<5;el=el.parentElement,i++)list.push({tag:el.tagName,testId:el.getAttribute("data-testid"),className:String(el.className||"").slice(0,100)});return list;})()})).filter(row=>duplicateEans.includes(row.ean)).slice(0,45),duplicateDetails.map(d=>d.ean)),
          device,query,duplicateDetails:duplicateDetails.slice(0,25),
          loading:await page.getByTestId('mobile-normal-search-results').getAttribute('data-search-loading').catch(()=>null)
        }));
        results.push({query,eans,uniqueEans:eans.length,renderedCards:snapshots.length,duplicates:snapshots.length-eans.length,
          providerResponses:apiResponses.slice(apiResponseStart).map(x=>({
            path:x.path,search:x.search,status:x.status,method:x.method,searchAtResponse:x.searchAtResponse
          })),
          samples:snapshots.slice(0,25),allCards:anomalyQueries.has(query)?snapshots:undefined,targetProduct:snapshots.find(x=>x.ean==='3073780902441')||null,durationMs:Date.now()-startedAt});
        console.log('[normal-parity] CONTENT SAMPLES',JSON.stringify({device,query,total:snapshots.length,first:snapshots.slice(0,12)}));
        console.log('[normal-parity] complete',device,query,'unique='+eans.length,'rendered='+snapshots.length,'ms='+String(Date.now()-startedAt));
        checkpoint();
        },{timeout:120000});
      }
      console.log('[normal-parity] BABYBEL PROVIDER TRACE',JSON.stringify({device,requests:providerEanPresence}));
      evidence.layouts[device]={results,errors,noResultDiagnostics,providerEanPresence,apiResponses,providerFingerprints};
      expect(errors,'Browser page errors').toEqual([]);
    }finally{
      if(replayEnabled && device==='mobile')await Promise.allSettled(replayCaptures);
      await context.close();
    }
  }
  for(const query of queries){
    const mobile=evidence.layouts.mobile.results.find(x=>x.query===query).eans;
    const desktop=evidence.layouts.desktop.results.find(x=>x.query===query).eans;
    if([...mobile].sort().join(',')!==[...desktop].sort().join(','))evidence.differences.push({query,mobileOnly:mobile.filter(x=>!desktop.includes(x)),desktopOnly:desktop.filter(x=>!mobile.includes(x)),mobileCount:mobile.length,desktopCount:desktop.length,atResultCap:mobile.length===100||desktop.length===100,mobileTail:mobile.slice(-5),desktopTail:desktop.slice(-5),mobileOnlyCards:evidence.layouts.mobile.results.find(x=>x.query===query).samples.filter(x=>!desktop.includes(x.ean)),desktopOnlyCards:evidence.layouts.desktop.results.find(x=>x.query===query).samples.filter(x=>!mobile.includes(x.ean))});
    if(mobile.join(',')!==desktop.join(','))evidence.orderDifferences.push(query);
    for(const device of ['mobile','desktop']){
      const result=evidence.layouts[device].results.find(x=>x.query===query);
      if(result.noResults)evidence.noResults.push({device,query});
      if(result.duplicates)evidence.duplicates.push({device,query,count:result.duplicates});
    }
  }
  // Preserve the provider request/HTTP evidence alongside every EAN mismatch.
  // This distinguishes incomplete upstream requests from relevance/dedup losses.
  evidence.mismatchProviderRequests=evidence.differences.map(diff=>({
    query:diff.query,
    mobile:evidence.layouts.mobile.apiResponses.filter(x=>x.searchAtResponse===diff.query),
    desktop:evidence.layouts.desktop.apiResponses.filter(x=>x.searchAtResponse===diff.query)
  }));
  console.log('[normal-parity] MISMATCH PROVIDER REQUESTS',JSON.stringify(evidence.mismatchProviderRequests));
  // Show exactly where identical search terms return different provider EANs.
  // Keep complete normalized sets in the uploaded parity.json evidence file.
  evidence.providerEanDifferences=[];
  for(const query of queries){
    const find=(device)=>evidence.layouts[device].providerFingerprints.filter(x=>x.query===query && Array.isArray(x.eans));
    const mobile=find('mobile'),desktop=find('desktop');
    const keys=new Set([...mobile,...desktop].map(x=>[x.path,x.requestSearch].join('|')));
    for(const key of keys){
      const m=mobile.find(x=>[x.path,x.requestSearch].join('|')===key);
      const d=desktop.find(x=>[x.path,x.requestSearch].join('|')===key);
      if(!m||!d||m.eans.join(',')!==d.eans.join(',')||JSON.stringify(m.pagination)!==JSON.stringify(d.pagination)){
        evidence.providerEanDifferences.push({query,key,
          mobile:m?{rowCount:m.rowCount,eanCount:m.eanCount,pagination:m.pagination}:null,
          desktop:d?{rowCount:d.rowCount,eanCount:d.eanCount,pagination:d.pagination}:null,
          mobileOnly:m?m.eans.filter(x=>!d?.eans.includes(x)):[],
          desktopOnly:d?d.eans.filter(x=>!m?.eans.includes(x)):[]});
      }
    }
  }
  console.log('[normal-parity] PROVIDER EAN DIFFERENCES',JSON.stringify(evidence.providerEanDifferences));

  // Regression against concrete wrong-type EANs observed in live results.
  // Keep positive controls so the filter cannot pass by removing all produce.
  const produceChecks={
    tomaatti:{reject:['6413300026849'],keep:['2003304300003']},
    appelsiini:{reject:['6419800082682','4009300528395'],keep:['2000041000005']},
    banaani:{reject:['4002971329001'],keep:['2005603200008']},
    kurkku:{reject:['4823006806522'],keep:['2000604700007']}
  };
  for(const device of ['mobile','desktop']){
    for(const [query,check] of Object.entries(produceChecks)){
      if(!queries.includes(query))continue;
      const actual=evidence.layouts[device].results.find(x=>x.query===query)?.eans||[];
      for(const ean of check.reject)expect(actual,device+' '+query+' must reject unrelated EAN '+ean).not.toContain(ean);
      for(const ean of check.keep)expect(actual,device+' '+query+' must keep produce EAN '+ean).toContain(ean);
    }
  }
  fs.mkdirSync('normal-search-evidence',{recursive:true});
  fs.writeFileSync('normal-search-evidence/parity.json',JSON.stringify(evidence,null,2));
  const auditSummary={
    batch:auditBatch??'smoke',queries:queries.length,
    noResults:evidence.noResults,
    eanDifferences:evidence.differences,
    orderDifferences:evidence.orderDifferences,
    duplicates:evidence.duplicates
  };
  console.log('[normal-parity] REPLAY MODE',JSON.stringify({enabled:replayEnabled,capturedResponses:replayResponses.size}));
  console.log('[normal-parity] AUDIT SUMMARY',JSON.stringify(auditSummary));
  const failures=[];
  if(evidence.noResults.length)failures.push('No-result searches: '+evidence.noResults.map(x=>x.device+':'+x.query).join(', '));
  if(evidence.differences.length)failures.push('EAN set differences: '+JSON.stringify(evidence.differences));
  if(evidence.orderDifferences.length)failures.push('EAN order differences: '+evidence.orderDifferences.join(', '));
  if(evidence.duplicates.length)failures.push('Duplicate EAN cards: '+JSON.stringify(evidence.duplicates));
  expect(failures,'All normal-search parity failures (full evidence in parity.json)').toEqual([]);
});

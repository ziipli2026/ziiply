#!/usr/bin/env node
// Browser smoke against deployed Ziiply; never writes to production data.
// Mark events as internal tests and do not print payloads or user data.
const { chromium } = require('playwright');
const target = process.env.ZIIPLY_SMOKE_URL || 'https://ziiply.vercel.app/';
const searchMode = process.env.ZIIPLY_SMOKE_SEARCH === '1';
const comparisonMode = process.env.ZIIPLY_SMOKE_COMPARE === '1';
// A hung browser must fail quickly rather than consuming the full CI timeout.
let activeBrowser;
const watchdog = setTimeout(() => {
  console.error('FAIL: browser smoke exceeded 100 seconds');
  process.exit(1);
}, 100000);
(async () => {
  const browser = await chromium.launch({ headless: true });
  activeBrowser = browser;
  const previewHeaders = process.env.VERCEL_OIDC_TOKEN
    ? { 'x-vercel-trusted-oidc-idp-token': process.env.VERCEL_OIDC_TOKEN }
    : process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
      : {};
  const page = await browser.newPage({ locale: 'fi-FI', viewport: { width: 390, height: 844 }, extraHTTPHeaders: previewHeaders, ...(searchMode ? { permissions: ['geolocation'], geolocation: { latitude: 60.631, longitude: 24.859 }, timezoneId: 'Europe/Helsinki' } : {}) });
  const sdkDiagnostics = [];
  page.on('console', message => {
    const text = message.text();
    if (text.startsWith('[ziiply-ph-probe]')) {
      try { sdkDiagnostics.push(JSON.parse(text.slice('[ziiply-ph-probe]'.length).trim())); }
      catch { sdkDiagnostics.push({parse:'failed'}); }
    }
  });
  const captures = [];
  const failures = [];
  const responses = [];
  const eventNames = [];
  const eventResponses = [];
  const internalFlags = [];
  const searchTypes = [];
  const payloadShapes = [];
  const searchNetwork = [];
  const pendingSearchRequests = new Map();
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/') && path !== '/api/analytics/search') pendingSearchRequests.set(request, {path, startedAt:Date.now()});
  });
  page.on('requestfinished', request => pendingSearchRequests.delete(request));
  page.on('requestfailed', request => pendingSearchRequests.delete(request));
  const serverAnalytics = [];
  const serverAnalyticsResponses = [];
  const pageErrors = [];
  const navigations = [];
  const documentRequests = [];
  page.on('request', request => { if (request.isNavigationRequest() && documentRequests.length < 12) documentRequests.push({method:request.method(),path:new URL(request.url()).pathname,resourceType:request.resourceType()}); });
  page.on('response', response => { if (response.request().isNavigationRequest() && documentRequests.length < 12) documentRequests.push({status:response.status(),path:new URL(response.url()).pathname,location:response.headers()['location'] ? 'redirect' : undefined}); });
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations.push({urlPath:new URL(frame.url()).pathname,host:new URL(frame.url()).hostname}); });
  page.on('request', request => {
    if (new URL(request.url()).pathname !== '/api/analytics/search' || request.method() !== 'POST') return;
    try {
      const body = JSON.parse(request.postData() || '{}');
      serverAnalytics.push({event:body.event,kind:body.search_kind,outcome:body.outcome,hasAnonymousId:typeof body.anonymous_user_id==='string',hasSdkDistinctId:typeof body.posthog_distinct_id==='string' && /^[a-f0-9]{8}-[a-f0-9-]{27,40}$/i.test(body.posthog_distinct_id),internalTest:body.ziiply_internal_test===true});
    } catch { serverAnalytics.push({parse:'failed'}); }
  });
  page.on('response', response => {
    if (new URL(response.url()).pathname !== '/api/analytics/search') return;
    void response.json().then(body => serverAnalyticsResponses.push({status:response.status(),accepted:body?.accepted===true})).catch(() => serverAnalyticsResponses.push({status:response.status(),accepted:false}));
  });
  page.on('pageerror', err => pageErrors.push(String(err.message).slice(0,160)));
  page.on('request', request => { const u = new URL(request.url()); if (u.pathname.startsWith('/api/') && searchNetwork.length < 25) searchNetwork.push({method:request.method(),path:u.pathname}); });
  page.on('response', response => {
    if (response.url().includes('/ph-ingest/') && response.request().method() === 'POST')
    {
      const endpoint = new URL(response.url()).pathname;
      responses.push({ status: response.status(), endpoint });
      if (!/\/flags\/?$/.test(endpoint)) eventResponses.push(response.status());
    }
  });
  page.on('request', request => {
    if (request.url().includes('/ph-ingest/') && request.method() === 'POST')
    {
      captures.push({ method: request.method(), endpoint: new URL(request.url()).pathname });
      try {
        const raw = request.postData() || '';
        const contentType = request.headers()['content-type'] || '';
        payloadShapes.push({ contentType: contentType.split(';')[0], bytes: Buffer.byteLength(raw), endpoint: new URL(request.url()).pathname, prefix: raw.slice(0, 1) === '{' ? 'json-object' : raw.slice(0, 1) === '[' ? 'json-array' : 'other' });
        const parsed = contentType.includes('application/x-www-form-urlencoded')
          ? JSON.parse(new URLSearchParams(raw).get('data') || '{}')
          : JSON.parse(raw);
        const events = Array.isArray(parsed.batch) ? parsed.batch : (parsed.event ? [parsed] : []);
        for (const event of events) {
          if (typeof event.event === 'string') eventNames.push(event.event);
          if (typeof event.properties?.ziiply_internal_test === 'boolean') internalFlags.push(event.properties.ziiply_internal_test);
          if (event.event === 'search_started' && typeof event.properties?.search_type === 'string') searchTypes.push(event.properties.search_type);
        }
      } catch { payloadShapes.push({ parse: 'unavailable' }); }
    }
  });
  page.on('requestfailed', request => {
    if (request.url().includes('/ph-ingest/')) failures.push(request.failure()?.errorText || 'request failed');
  });
  const url = new URL(target);
  url.searchParams.set('ziiply_test', '1');
  const response = await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(5000);
  const title = await page.title();
  const loginGate = /login\s*[–-]\s*vercel/i.test(title) ||
    await page.getByRole('heading', { name: /log in to vercel/i }).count() > 0;
  if (loginGate) {
    console.error('FAIL: Vercel authentication page, not Ziiply application');
    throw new Error('Preview is protected by Vercel Authentication; configure a short-lived trusted OIDC token for CI browser access');
  }
  console.log(JSON.stringify({ check: 'browser-page-load', status: response?.status(), title, urlHost: url.host }));
  // PostHog is module-scoped, not exposed on window. Do not mistake a missing
  // window.posthog global for failed initialization.
  const posthogScript = await page.evaluate(() => [...document.scripts].some(s =>
    (s.src || '').includes('posthog') || (s.textContent || '').includes('ph-ingest')));
  console.log(JSON.stringify({ check: 'posthog-script-hint', found: posthogScript }));
  const buttons = await page.getByRole('button').allTextContents();
  console.log(JSON.stringify({ check: 'visible-button-count', count: buttons.length }));
  console.log(JSON.stringify({ check: 'button-labels', labels: buttons.map(s => s.trim().slice(0, 80)).slice(0, 20) }));
  console.log(JSON.stringify({ check: 'page-headings', headings: (await page.locator('h1, h2').allTextContents()).map(s => s.trim().slice(0, 80)).slice(0, 12) }));
  // Do not create a cart or submit a search in production. Observe only
  // automatic activity and provider initialization.
  // Switch a read-only app tab to exercise explicit navigation analytics.
  console.log(JSON.stringify({ check: 'gosta-click', stage: 'starting' }));
  if (!searchMode) {
    await page.getByRole('button', { name: 'Gösta: Tarjoushaku', exact: true }).click({ timeout: 10000, noWaitAfter: true });
    console.log(JSON.stringify({ check: 'gosta-click', stage: 'completed' }));
    await page.waitForTimeout(3000);
  }
  if (searchMode) {
    // Preview-only, read-only synthetic search. Never execute against the public main alias.
    if (url.hostname === 'ziiply.vercel.app' || url.hostname === 'ziiply.fi' || url.hostname === 'www.ziiply.fi') {
      throw new Error('Search smoke must target an isolated preview deployment, not production');
    }
    // Reuse the proven store-selection fixture from search-result-comparison-prices.yml.
    // Only on the protected preview; never modify a production user's selection.
    const fixtureStore = {id:'292',name:'Prisma Hyvinkää',chain:'S',latitude:60.63,longitude:24.86};
    await page.evaluate(({store,comparisonMode}) => {
      localStorage.setItem('ziiply-desktop-store-choices-v1',JSON.stringify({
        storeMode:'hyper',storeModeChosen:true,selectedChain:'S',betweenMode:comparisonMode?'many':'one',
        storeCompareScope:'between_chains',allStoreSelections:{hyper:{[store.id]:store},local:{}}
      }));
      localStorage.setItem('ziiply-store-selection-v536',JSON.stringify({
        version:1,savedAt:Date.now(),activeArea:{label:'Hyvinkää',sStoreId:store.id,sStoreName:store.name},
        storeMode:'hyper',storeModeChosenV299:true,storeCompareScope:'between_chains',
        betweenChainSelectionModeV749:comparisonMode?'many':'one',withinChain:null,
        selectedChains:{s:true,k:false,lidl:comparisonMode,tokmanni:false},
        ...(comparisonMode?{selectedLidlStoreV750:{id:'hyvinkaa-keskusta',name:'Lidl Hyvinkää Keskusta',city:'Hyvinkää'}}:{}),usingOwnLocation:false
      }));
    },{store:fixtureStore,comparisonMode});
    await page.reload({waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForTimeout(2200);
    console.log(JSON.stringify({check:'store-fixture',selected:await page.evaluate(()=>({
      storeSelection:!!localStorage.getItem('ziiply-store-selection-v536'),
      desktopChoices:!!localStorage.getItem('ziiply-desktop-store-choices-v1')
    }))}));
    // The initial comparison dashboard hides its search textarea. The visible
    // Justiina: Tuotehaku navigation button opens the normal product search,
    // unlike Justiina: Reseptit which opens the separate recipe search.
    await page.getByRole('button', { name: 'Justiina: Tuotehaku', exact: true }).click({ timeout: 10000 });
    await page.waitForTimeout(900);
    // Default landing view already exposes normal product search. Avoid switching to
    // Gösta and back: that navigation can hide the Justiina control in mobile UI.
    // Normal product search is accessed through the comparison dashboard's Hae
    // control, not Justiina's recipe search (which has a different input).
    const searchButtons = await page.locator('button').evaluateAll(els => els.filter(el => (el.textContent || '').trim() === 'Hae').map(el => ({ disabled: el.disabled, ariaDisabled: el.getAttribute('aria-disabled'), visible: !!el.getClientRects().length, title: el.getAttribute('title'), outerTag: el.tagName.toLowerCase() })));
    console.log(JSON.stringify({ check: 'search-button-state', buttons: searchButtons }));
    // 'Hae' submits an existing query and can be disabled while empty; inspect
    // the search UI before attempting submission rather than clicking blindly.
    await page.waitForTimeout(1200);
    // Mobile and desktop use different search controls. Inspect visible input metadata,
    // never log field values or user-entered content.
    const inputs = await page.locator('input, textarea, [role="searchbox"]').evaluateAll(els => els.map(el => ({ tag: el.tagName.toLowerCase(), type: el.getAttribute('type'), placeholder: el.getAttribute('placeholder'), ariaLabel: el.getAttribute('aria-label'), visible: !!(el.getClientRects().length) })).filter(x => x.visible));
    console.log(JSON.stringify({ check: 'visible-search-inputs', inputs }));
    const searchDom = await page.evaluate(() => ({
      inputs: [...document.querySelectorAll('input,textarea,[contenteditable],[role="textbox"],[role="searchbox"]')].map(el => ({tag:el.tagName.toLowerCase(),type:el.getAttribute('type'),placeholder:el.getAttribute('placeholder'),role:el.getAttribute('role'),visible:!!el.getClientRects().length})).slice(0,30),
      candidates: [...document.querySelectorAll('button,[role="button"]')].filter(el => /Hae|Tuotteet|Vertailu/i.test((el.textContent||'').trim())).slice(0,12).map(el=>({text:(el.textContent||'').trim().slice(0,65),disabled:!!el.disabled,visible:!!el.getClientRects().length,ariaLabel:el.getAttribute('aria-label')})),
      headings:[...document.querySelectorAll('h1,h2,h3')].map(el=>(el.textContent||'').trim().slice(0,65)).slice(0,15)
    }));
    console.log(JSON.stringify({check:'search-dom-diagnostic',...searchDom}));
    const uiPath = await page.evaluate(() => {
      const el = document.querySelector('textarea[placeholder*="maito"]');
      const chain = []; let node = el;
      for (let i=0; node && i<7; i++,node=node.parentElement) chain.push({tag:node.tagName.toLowerCase(),className:String(node.className||'').slice(0,130),hidden:node.hidden,ariaHidden:node.getAttribute('aria-hidden'),style:node.getAttribute('style')?.slice(0,120),text:(node.textContent||'').trim().slice(0,90)});
      return {textareaAncestors:chain,visibleButtons:[...document.querySelectorAll('button')].filter(b=>!!b.getClientRects().length).map(b=>({text:(b.textContent||'').trim().slice(0,75),aria:b.getAttribute('aria-label'),disabled:b.disabled})).slice(0,35)};
    });
    console.log(JSON.stringify({check:'search-ui-path',...uiPath}));
    const searchInput = page.locator('textarea:visible, input[type="search"]:visible, input[placeholder*="tuote" i]:visible, input[placeholder*="hae" i]:visible').first();
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await searchInput.fill('maito');
    const preflight = await page.evaluate(() => ({
      inputLength: [...document.querySelectorAll('textarea')].find(e => !!e.getClientRects().length)?.value.length ?? null,
      selectedStoreLabels: [...document.querySelectorAll('button,[role="checkbox"],input[type="checkbox"]')]
        .filter(e => !!e.getClientRects().length && /Prisma|S-market|K-Citymarket|K-Supermarket|Lidl|Tokmanni|Valitse|Kaupat/i.test((e.textContent||'')+' '+(e.getAttribute('aria-label')||'')))
        .map(e => ({label:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,65),checked:e.getAttribute('aria-checked')||e.getAttribute('aria-pressed')||('checked' in e ? String(e.checked) : null)})).slice(0,15),
      localStorageKeys: Object.keys(localStorage).filter(k=>/store|kaup|area|location|zip/i.test(k)).slice(0,15)
    }));
    console.log(JSON.stringify({check:'search-preflight',preflight}));
    // The normal Tuotehaku card requires explicit Hae submission after filling.
    const beforeSubmit = await page.evaluate(() => ({path:location.pathname,searchModeText:document.body.innerText.slice(-220),buttonDisabled:[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Hae')?.disabled}));
    const submitMechanics = await page.evaluate(() => {const b=[...document.querySelectorAll('button')].find(e=>e.getAttribute('aria-label')==='Hae');return {type:b?.getAttribute('type'),formTag:b?.closest('form')?.tagName||null,formMethod:b?.closest('form')?.getAttribute('method')||null,formAction:b?.closest('form')?.getAttribute('action')||null,outerHTML:b?.outerHTML.slice(0,420)}});
    console.log(JSON.stringify({check:'search-submit-mechanics',submitMechanics}));
    await page.evaluate(() => { window.__ziiplySmokeHistory = []; for (const name of ['pushState','replaceState']) {const original=history[name].bind(history);history[name]=function(...args){window.__ziiplySmokeHistory.push({name,path:location.pathname,nextPath:String(args[2]||'').split('?')[0].slice(0,90)});return original(...args)}};window.addEventListener('popstate',()=>window.__ziiplySmokeHistory.push({name:'popstate',path:location.pathname}));window.addEventListener('beforeunload', () => console.log('ziiply-smoke-beforeunload')); window.addEventListener('pagehide', () => console.log('ziiply-smoke-pagehide')); });
    page.on('console', message => { if (/ziiply-smoke-(beforeunload|pagehide)/.test(message.text())) console.log(JSON.stringify({check:'browser-lifecycle',message:message.text()})); });
    // The bottom navigation's "Hae" button closes the search overlay.
    // The real product search is dispatched by the Justiina assistant button.
    // Selecting Hae here previously created a false negative without a search request.
    await page.getByRole('button', { name: 'Justiina', exact: true }).click({ timeout: 10000 });
    await page.waitForTimeout(2500);
    const afterSubmit = await page.evaluate(() => ({path:location.pathname,searchModeText:document.body.innerText.slice(-220),visibleTextareas:[...document.querySelectorAll('textarea')].filter(e=>!!e.getClientRects().length).length,historyActions:window.__ziiplySmokeHistory||[],navigationType:performance.getEntriesByType('navigation').map(e=>e.type)}));
    console.log(JSON.stringify({check:'search-submit-transition',beforeSubmit,afterSubmit,navigations,documentRequests,searchNetwork,pageErrors}));
    // Product cards can render before every source and the completion telemetry settle.
    // Wait for the actual completion event, including sequential provider/catalog recovery requests.
    const telemetryWaitStarted = Date.now();
    const searchTelemetryDeadline = telemetryWaitStarted + 60000;
    while (!serverAnalytics.some(e=>e.event==='search_completed'&&e.kind==='normal') && Date.now()<searchTelemetryDeadline) {
      await page.waitForTimeout(500);
    }
    console.log(JSON.stringify({check:'search-telemetry-wait',elapsedMs:Date.now()-telemetryWaitStarted,completed:serverAnalytics.some(e=>e.event==='search_completed'&&e.kind==='normal'),eventTypes:serverAnalytics.map(e=>e.event),apiRequestCount:searchNetwork.length,pageErrorCount:pageErrors.length,pendingRequests:[...pendingSearchRequests.values()].map(x=>({path:x.path,ageMs:Date.now()-x.startedAt})).slice(0,25)}));
    const searchStatus = await page.evaluate(() => ({ visibleText:document.body.innerText.slice(-650), visibleInputs:[...document.querySelectorAll('textarea,input')].filter(e=>!!e.getClientRects().length).map(e=>({tag:e.tagName,placeholder:e.getAttribute('placeholder')})), visibleButtons:[...document.querySelectorAll('button')].filter(e=>!!e.getClientRects().length).map(e=>({text:(e.textContent||'').trim().slice(0,45),disabled:e.disabled})).slice(-12) }));
    console.log(JSON.stringify({check:'search-after-submit',searchStatus,searchNetwork,pageErrors}));
    // Search telemetry uses the server-side /api/analytics/search proxy,
    // not the browser SDK /ph-ingest endpoint.
    const started = serverAnalytics.some(e=>e.event==='search_started'&&e.kind==='normal');
    const completed = serverAnalytics.some(e=>e.event==='search_completed'&&e.kind==='normal'&&['priced_results','no_priced_results','partial_source_failure','error'].includes(e.outcome));
    const accepted = serverAnalyticsResponses.some(e=>e.status===200&&e.accepted);
    const joinedIdentity = serverAnalytics.filter(e=>e.event==='search_started'||e.event==='search_completed')
      .every(e=>e.hasSdkDistinctId===true);
    console.log(JSON.stringify({check:'server-search-shared-sdk-identity',joinedIdentity}));
    if (!joinedIdentity) {
      console.error('FAIL: search events are not linked to the browser SDK anonymous identity');
      process.exitCode = 1;
    }
    const testMarked = serverAnalytics.filter(e=>e.event==='search_started'||e.event==='search_completed')
      .every(e=>e.internalTest===true);
    console.log(JSON.stringify({check:'server-search-internal-test-marker',testMarked,events:serverAnalytics.map(e=>({event:e.event,internalTest:e.internalTest}))}));
    if (!testMarked) {
      console.error('FAIL: server-proxied search events lack the internal-test marker');
      process.exitCode = 1;
    }
    console.log(JSON.stringify({check:'preview-search',started,completed,accepted,events:serverAnalytics.map(e=>({event:e.event,kind:e.kind,outcome:e.outcome})),responses:serverAnalyticsResponses}));
    if (process.env.ZIIPLY_SMOKE_CART === '1') {
      // Preview only: synthetic test cart, never an actual checkout.
      // The result overlay intercepts clicks on the background card's icon.
      // Target the overlay's own visible textual add-to-cart action.
      const overlay = page.locator('div.fixed.z-\\[95\\]').first();
      const candidates = await overlay.locator('button').evaluateAll(nodes =>
        nodes.filter(el => /Lisää koriin/i.test((el.textContent||'')+' '+(el.getAttribute('aria-label')||'')))
          .map(el=>({text:(el.textContent||'').trim().slice(0,55),aria:el.getAttribute('aria-label'),visible:!!el.getClientRects().length})).slice(0,8));
      console.log(JSON.stringify({check:'cart-overlay-candidates',candidates}));
      const addButton = overlay.getByRole('button',{name:/Lisää koriin/i}).first();
      const available = await addButton.isVisible().catch(()=>false);
      if (!available) {
        console.error('FAIL: priced search returned no visible add-to-cart action');
        process.exitCode = 1;
      } else {
        const before = serverAnalytics.filter(e=>e.event==='product_added_to_cart').length;
        await addButton.click({timeout:10000});
        const cartTelemetryDeadline = Date.now() + 6000;
        while (!serverAnalytics.some(e=>e.event==='product_added_to_cart') && Date.now()<cartTelemetryDeadline) {
          await page.waitForTimeout(250);
        }
        // The cart badge adds a quantity to the accessible name (e.g. 'Kori 1').
        // Exact accessible-name matching would falsely report a disabled cart.
        const cart = page.locator('nav button').filter({hasText:/Kori/}).last();
        const comparison = page.getByRole('button',{name:'Vertailu',exact:true});
        const cartEnabled = await cart.isEnabled().catch(()=>false);
        const comparisonEnabled = await comparison.isEnabled().catch(()=>false);
        const cartEvents = serverAnalytics.filter(e=>e.event==='product_added_to_cart').length-before;
        const cartUi = await page.evaluate(() => ({
          buttons: [...document.querySelectorAll('button')].filter(b=>/^(Kori|Vertailu)$/.test((b.textContent||'').trim())).map(b=>({text:(b.textContent||'').trim(),disabled:b.disabled,ariaDisabled:b.getAttribute('aria-disabled'),visible:!!b.getClientRects().length})),
          cartStorageKeys: Object.keys(localStorage).filter(k=>/cart|basket|ostos|vihko/i.test(k)),
          cartStorageSummary: Object.keys(localStorage).filter(k=>/cart|basket|ostos|vihko/i.test(k)).map(key=>{
            try { const value=JSON.parse(localStorage.getItem(key)||'null'); return {key,type:Array.isArray(value)?'array':typeof value,count:Array.isArray(value)?value.length:typeof value==='object'&&value?Object.keys(value).length:0}; }
            catch {return {key,type:'unparseable'};}
          }),
          visibleNotices: [...document.querySelectorAll('[role="alert"],[role="status"]')].filter(e=>!!e.getClientRects().length).map(e=>(e.textContent||'').trim().slice(0,130)).slice(0,8),
          cartLabels: [...document.querySelectorAll('body *')].filter(e=>e.children.length===0&&/\bKori\b/.test(e.textContent||'')&&!!e.getClientRects().length).slice(0,8).map(e=>({tag:e.tagName,text:(e.textContent||'').slice(0,70)})),

          cart: [...document.querySelectorAll('button')].filter(b=>(b.textContent||'').trim()==='Kori').map(b=>({disabled:b.disabled,ariaDisabled:b.getAttribute('aria-disabled'),title:b.title})),
          compare: [...document.querySelectorAll('button')].filter(b=>(b.textContent||'').trim()==='Vertailu').map(b=>({disabled:b.disabled,ariaDisabled:b.getAttribute('aria-disabled'),title:b.title})),
          selectedStore: localStorage.getItem('ziiply-store-selection-v536')?.slice(0,500) || null,
          overlayCartText: [...document.querySelectorAll('div.fixed')].filter(e=>e.className.includes('z-[95]')).map(e=>(e.textContent||'').slice(-400)).slice(0,1)
        }));
        console.log(JSON.stringify({check:'beta-cart-after-search',cartEnabled,comparisonEnabled,cartEvents,serverAnalyticsResponses,cartUi}));
        if (comparisonMode) {
          if (!comparisonEnabled) {
            console.error('FAIL: Monta-mode comparison did not enable after adding a priced product');
            process.exitCode = 1;
          } else {
            const compareNav = page.locator('nav button').filter({hasText:/Vertailu/}).last();
            await compareNav.click({timeout:10000});
            await page.waitForTimeout(900);
            const compareOpen = await page.locator('.ziiply-mobile-compare-pop').evaluateAll(nodes =>
              nodes.some(el=>!!el.getClientRects().length));
            const comparisonDiagnostic = await page.evaluate(() => ({
              compareCards: [...document.querySelectorAll('.ziiply-mobile-compare-pop')].map(el=>({visible:!!el.getClientRects().length,parentVisible:!!el.closest('div.fixed')?.getClientRects().length})),
              fixedPanels: [...document.querySelectorAll('div.fixed')].filter(el=>!!el.getClientRects().length).map(el=>({className:String(el.className).slice(0,100),compare:!!el.querySelector('.ziiply-mobile-compare-pop'),cart:!!el.querySelector('.ziiply-cart-paper-pop')})).slice(-8),
              visibleCompareButtons: [...document.querySelectorAll('button')].filter(el=>!!el.getClientRects().length&&/vertailu/i.test(el.textContent||'')).map(el=>({disabled:el.disabled,ariaDisabled:el.getAttribute('aria-disabled')})).slice(-5)
            }));
            console.log(JSON.stringify({check:'beta-monta-comparison-open',comparisonEnabled,compareOpen,cartEvents,comparisonDiagnostic}));
            // Vertailu is a snapshot viewer, not the action that computes prices.
            // With no saved comparison, the expected fallback is the cart with
            // instructions to run Halpuuta. Do not assert a new comparison here.
            const cartFallback = await page.locator('.ziiply-cart-paper-pop').evaluateAll(nodes =>
              nodes.some(el=>!!el.getClientRects().length));
            console.log(JSON.stringify({check:'beta-monta-comparison-snapshot-fallback',compareOpen,cartFallback}));
            if (!compareOpen && !cartFallback) {
              console.error('FAIL: Monta comparison tab opened neither saved comparison nor cart fallback');
              process.exitCode = 1;
            }
          }
        }
        if (cartEnabled && process.env.ZIIPLY_SMOKE_CART === '1' && !comparisonMode) {
          // Verify the cart can actually be opened, not merely that its nav is enabled.
          // Do not log product names or other user data.
          await cart.click({timeout:10000});
          await page.waitForTimeout(900);
          const cartOpen = await page.evaluate(() => ({
            visibleCartOverlays:[...document.querySelectorAll('.ziiply-cart-paper-pop')].filter(e=>!!e.getClientRects().length&&!!e.closest('div.fixed')).length,
            visibleFixedPanels:[...document.querySelectorAll('div.fixed')].filter(e=>!!e.getClientRects().length).map(e=>({className:String(e.className||'').slice(0,130),hasCart:/kori|ostoslista/i.test((e.textContent||'').slice(0,350)),buttons:e.querySelectorAll('button').length})).slice(-8),
            visibleCartText:[...document.querySelectorAll('button')].filter(e=>!!e.getClientRects().length&&/kori|ostoslista|sulje/i.test((e.textContent||'').trim())).map(e=>({text:(e.textContent||'').trim().slice(0,55),aria:e.getAttribute('aria-label')})).slice(-10),
            visibleCartItemRows:[...document.querySelectorAll('.ziiply-cart-paper-pop')].filter(e=>!!e.getClientRects().length).map(e=>e.querySelectorAll('button').length).slice(0,2),
            visibleCloseButtons:[...document.querySelectorAll('button')].filter(e=>!!e.getClientRects().length&&/sulje/i.test((e.getAttribute('aria-label')||'')+' '+(e.textContent||''))).length
          }));
          console.log(JSON.stringify({check:'beta-cart-open',...cartOpen}));
          if (!cartOpen.visibleCartOverlays) {
            console.error('FAIL: cart nav enabled but cart view did not open');
            process.exitCode = 1;
          }
        }
        if (!cartEnabled || cartEvents!==1) {
          console.error('FAIL: adding a priced search result did not enable cart or emit exactly one cart telemetry event');
          process.exitCode = 1;
        }
      }
    }

    if (!started || !completed || !accepted) {
      console.error('FAIL: normal search missing server telemetry start/completion or accepted PostHog delivery');
      process.exitCode = 1;
    }
  }
  if (eventNames.length && (!internalFlags.length || internalFlags.some(value => value !== true))) {
    console.error('FAIL: PostHog events missing internal-test marker');
    process.exitCode = 1;
  }
  console.log(JSON.stringify({check:'posthog-sdk-readiness',diagnostics:sdkDiagnostics}));
  console.log(JSON.stringify({ check: 'posthog-network', requests: captures.length, responses: responses.map(r => r.status), failures: failures.length, eventNames, internalFlags, payloadShapes, eventResponses }));
  // A preview-only SDK canary must traverse the browser PostHog capture path.
  // A 200 from /flags is not proof of event ingestion.
  const isProductionHost = ['ziiply.fi', 'www.ziiply.fi', 'ziiply.vercel.app'].includes(url.hostname);
  if (!isProductionHost && !eventNames.includes('ziiply_posthog_transport_probe')) {
    console.error('FAIL: preview SDK transport canary missing; feature-flag requests do not count as events');
    process.exitCode = 1;
  }
  // Autocapture and pageviews are intentionally disabled; navigation alone
  // does not need to generate a client capture.
  if (failures.length || eventResponses.some(status => status >= 400)) {
    console.error('FAIL: browser PostHog ingestion request failed');
    process.exitCode = 1;
  }
  await browser.close();
  activeBrowser = undefined;
  clearTimeout(watchdog);
  if (!response || response.status() >= 400) process.exitCode = 1;
  // No events are expected until a user interaction because autocapture and
  // automatic pageview tracking are intentionally disabled.
})().catch(async err => {
  clearTimeout(watchdog);
  console.error('Browser smoke failed:', err.message);
  process.exitCode = 1;
  if (activeBrowser) await activeBrowser.close().catch(() => {});
});

#!/usr/bin/env node
// Browser smoke against deployed Ziiply; never writes to production data.
// Mark events as internal tests and do not print payloads or user data.
const { chromium } = require('playwright');
const target = process.env.ZIIPLY_SMOKE_URL || 'https://ziiply.vercel.app/';
const searchMode = process.env.ZIIPLY_SMOKE_SEARCH === '1';
// A hung browser must fail quickly rather than consuming the full CI timeout.
let activeBrowser;
const watchdog = setTimeout(() => {
  console.error('FAIL: browser smoke exceeded 60 seconds');
  process.exit(1);
}, 60000);
(async () => {
  const browser = await chromium.launch({ headless: true });
  activeBrowser = browser;
  const previewHeaders = process.env.VERCEL_OIDC_TOKEN
    ? { 'x-vercel-trusted-oidc-idp-token': process.env.VERCEL_OIDC_TOKEN }
    : process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
      : {};
  const page = await browser.newPage({ locale: 'fi-FI', viewport: { width: 390, height: 844 }, extraHTTPHeaders: previewHeaders });
  const captures = [];
  const failures = [];
  const responses = [];
  const eventNames = [];
  const eventResponses = [];
  const internalFlags = [];
  const searchTypes = [];
  const payloadShapes = [];
  const searchNetwork = [];
  const pageErrors = [];
  const navigations = [];
  const documentRequests = [];
  page.on('request', request => { if (request.isNavigationRequest() && documentRequests.length < 12) documentRequests.push({method:request.method(),path:new URL(request.url()).pathname,resourceType:request.resourceType()}); });
  page.on('response', response => { if (response.request().isNavigationRequest() && documentRequests.length < 12) documentRequests.push({status:response.status(),path:new URL(response.url()).pathname,location:response.headers()['location'] ? 'redirect' : undefined}); });
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations.push({urlPath:new URL(frame.url()).pathname,host:new URL(frame.url()).hostname}); });
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
    // Establish a real store before searching: fresh CI browsers have no GPS
    // permission and can otherwise take the no-store early return.
    await page.getByRole('button', { name: 'Kaupat', exact: true }).click({ timeout: 10000 });
    await page.waitForTimeout(800);
    const storePicker = await page.evaluate(() => ({
      visibleText: document.body.innerText.slice(-1100),
      choices: [...document.querySelectorAll('button,[role="button"]')]
        .filter(e=>!!e.getClientRects().length)
        .map(e=>({text:(e.textContent||'').trim().slice(0,90),aria:e.getAttribute('aria-label')}))
        .filter(e=>/Prisma|Citymarket|S-market|Kaupat|Valitse|Hyvinkää/i.test(e.text+' '+e.aria)).slice(0,20)
    }));
    console.log(JSON.stringify({check:'store-picker-before-search',storePicker}));
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
    await page.waitForTimeout(12000);
    const searchStatus = await page.evaluate(() => ({ visibleText:document.body.innerText.slice(-650), visibleInputs:[...document.querySelectorAll('textarea,input')].filter(e=>!!e.getClientRects().length).map(e=>({tag:e.tagName,placeholder:e.getAttribute('placeholder')})), visibleButtons:[...document.querySelectorAll('button')].filter(e=>!!e.getClientRects().length).map(e=>({text:(e.textContent||'').trim().slice(0,45),disabled:e.disabled})).slice(-12) }));
    console.log(JSON.stringify({check:'search-after-submit',searchStatus,searchNetwork,pageErrors}));
    console.log(JSON.stringify({ check: 'preview-search', started: eventNames.includes('search_started'), outcome: eventNames.some(name => ['search_priced_results_shown', 'search_no_priced_results', 'search_failed'].includes(name)) }));
    if (!eventNames.includes('search_started') || !eventNames.some(name => ['search_priced_results_shown', 'search_no_priced_results', 'search_failed'].includes(name)) || !searchTypes.length) {
      console.error('FAIL: preview search did not emit start and terminal events');
      process.exitCode = 1;
    }
  }
  if (eventNames.length && (!internalFlags.length || internalFlags.some(value => value !== true))) {
    console.error('FAIL: PostHog events missing internal-test marker');
    process.exitCode = 1;
  }
  console.log(JSON.stringify({ check: 'posthog-network', requests: captures.length, responses: responses.map(r => r.status), failures: failures.length, eventNames, internalFlags, payloadShapes, eventResponses }));
  if (!eventResponses.some(status => status >= 200 && status < 300) || failures.length || eventResponses.some(status => status >= 400)) {
    console.error('FAIL: no successful PostHog event-ingest response (feature-flag requests do not count)');
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

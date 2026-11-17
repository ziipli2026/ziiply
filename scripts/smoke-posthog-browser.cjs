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
    // Default landing view already exposes normal product search. Avoid switching to
    // Gösta and back: that navigation can hide the Justiina control in mobile UI.
    const searchInput = page.locator('textarea[placeholder="maito, kahvi"], textarea[placeholder="Kirjoita yksi tuote"]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await searchInput.fill('maito');
    // The mobile card auto-searches after input changes; do not submit twice.
    await page.waitForTimeout(2500);
    await page.waitForTimeout(12000);
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

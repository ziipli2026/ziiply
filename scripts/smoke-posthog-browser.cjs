#!/usr/bin/env node
// Browser smoke against deployed Ziiply; never writes to production data.
// Mark events as internal tests and do not print payloads or user data.
const { chromium } = require('playwright');
const target = process.env.ZIIPLY_SMOKE_URL || 'https://ziiply.vercel.app/';
// A hung browser must fail quickly rather than consuming the full CI timeout.
const watchdog = setTimeout(() => {
  console.error('FAIL: browser smoke exceeded 60 seconds');
  process.exit(1);
}, 60000);
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: 'fi-FI', viewport: { width: 390, height: 844 } });
  const captures = [];
  const failures = [];
  const responses = [];
  const eventNames = [];
  const internalFlags = [];
  page.on('response', response => {
    if (response.url().includes('/ph-ingest/') && response.request().method() === 'POST')
      responses.push({ status: response.status(), endpoint: new URL(response.url()).pathname });
  });
  page.on('request', request => {
    if (request.url().includes('/ph-ingest/') && request.method() === 'POST')
    {
      captures.push({ method: request.method(), endpoint: new URL(request.url()).pathname });
      try {
        const raw = request.postData() || '';
        const contentType = request.headers()['content-type'] || '';
        const parsed = contentType.includes('application/x-www-form-urlencoded')
          ? JSON.parse(new URLSearchParams(raw).get('data') || '{}')
          : JSON.parse(raw);
        const events = Array.isArray(parsed.batch) ? parsed.batch : (parsed.event ? [parsed] : []);
        for (const event of events) {
          if (typeof event.event === 'string') eventNames.push(event.event);
          if (typeof event.properties?.ziiply_internal_test === 'boolean') internalFlags.push(event.properties.ziiply_internal_test);
        }
      } catch { /* Some PostHog requests are encoded or compressed. */ }
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
  const loginGate = /login\\s*[–-]\\s*vercel/i.test(title) ||
    await page.getByRole('heading', { name: /log in to vercel/i }).count() > 0;
  if (loginGate) {
    console.error('FAIL: Vercel authentication page, not Ziiply application');
    process.exitCode = 1;
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
  await page.getByRole('button', { name: /^Gösta/ }).click({ timeout: 10000, noWaitAfter: true });
  console.log(JSON.stringify({ check: 'gosta-click', stage: 'completed' }));
  await page.waitForTimeout(3000);
  console.log(JSON.stringify({ check: 'posthog-network', requests: captures.length, responses: responses.map(r => r.status), failures: failures.length, eventNames, internalFlags }));
  if (captures.length === 0 || !responses.some(r => r.status === 200) || failures.length || responses.some(r => r.status >= 400)) {
    console.error('FAIL: PostHog ingest did not return successful HTTP responses');
    process.exitCode = 1;
  }
  await browser.close();
  clearTimeout(watchdog);
  if (!response || response.status() >= 400) process.exitCode = 1;
  // No events are expected until a user interaction because autocapture and
  // automatic pageview tracking are intentionally disabled.
})().catch(err => { console.error('Browser smoke failed:', err.message); process.exitCode = 1; });

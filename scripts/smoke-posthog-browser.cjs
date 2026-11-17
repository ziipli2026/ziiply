#!/usr/bin/env node
// Browser smoke against deployed Ziiply; never writes to production data.
// Mark events as internal tests and do not print payloads or user data.
const { chromium } = require('playwright');
const target = process.env.ZIIPLY_SMOKE_URL || 'https://ziiply.fi/';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: 'fi-FI', viewport: { width: 390, height: 844 } });
  const captures = [];
  const failures = [];
  page.on('request', request => {
    if (request.url().includes('/ph-ingest/') && request.method() === 'POST')
      captures.push({ method: request.method(), endpoint: new URL(request.url()).pathname });
  });
  page.on('requestfailed', request => {
    if (request.url().includes('/ph-ingest/')) failures.push(request.failure()?.errorText || 'request failed');
  });
  const url = new URL(target);
  url.searchParams.set('ziiply_test', '1');
  const response = await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(5000);
  const title = await page.title();
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
  console.log(JSON.stringify({ check: 'posthog-network', requests: captures.length, failures: failures.length }));
  await browser.close();
  if (!response || response.status() >= 400) process.exitCode = 1;
  // No events are expected until a user interaction because autocapture and
  // automatic pageview tracking are intentionally disabled.
})().catch(err => { console.error('Browser smoke failed:', err.message); process.exitCode = 1; });

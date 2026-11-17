#!/usr/bin/env node
// Static regression guard for beta analytics; never sends events or accesses credentials.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const provider = fs.readFileSync(path.join(root, 'src/app/components/PostHogProvider.tsx'), 'utf8');
const core = fs.readFileSync(path.join(root, 'src/app/components/ziiply/ziiplyCore.ts'), 'utf8');
const page = fs.readFileSync(path.join(root, 'src/app/page.tsx'), 'utf8');
const requirements = [
  ['autocapture disabled', /autocapture:\s*false\b/.test(provider)],
  ['automatic pageviews disabled', /capture_pageview:\s*false\b/.test(provider)],
  ['session replay disabled pending privacy review', /disable_session_recording:\s*true\b/.test(provider)],
  ['PostHog URL and sensitive-key scrubber present', /before_send\s*:/.test(provider) && /bannedKey/.test(provider)],
  ['internal test marker present', /ziiply_internal_test/.test(provider)],
  ['environment marker present', /ziiply_environment/.test(provider)],
  ['shared tracking wrapper present', /function\s+trackZiiplyEvent\s*\(/.test(core)],
  ['search event present', /trackZiiplyEvent\s*\(\s*["']search_used["']/.test(page)],
  ['cart event present', /trackZiiplyEvent\s*\(\s*["']product_added_to_cart["']/.test(page)],
  ['offer search event present', /trackZiiplyEvent\s*\(\s*["']gosta_offer_search_clicked["']/.test(page)],
];
let failed = 0;
for (const [name, passed] of requirements) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) failed++;
}
if (failed) {
  console.error(`${failed} analytics regression checks failed`);
  process.exitCode = 1;
}

/*
 * Exercise the real before_send callback with synthetic data. This is a source
 * extraction test: it does not initialize PostHog or make network requests.
 */
const callbackStart = provider.indexOf('before_send: (event) => {');
if (callbackStart < 0) {
  console.error('FAIL before_send callback not found');
  process.exitCode = 1;
} else {
  const braceStart = provider.indexOf('{', callbackStart);
  let depth = 0;
  let end = -1;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  for (let i = braceStart; i < provider.length; i++) {
    const ch = provider[i];
    const next = provider[i + 1];
    if (lineComment) {
      if (ch === '\\n') lineComment = false;
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\\\') { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    if (ch === '}' && --depth === 0) { end = i; break; }
  }
  if (end < 0) {
    console.error('FAIL before_send callback cannot be extracted');
    process.exitCode = 1;
  } else {
    const callback = new Function('environment', 'isInternalTest',
      'return (' + provider.slice(callbackStart + 'before_send: '.length, end + 1) + ')'
    )('preview', true);
    const event = callback({ event: 'search_used', properties: {
      email: 'secret@example.test', access_token: 'private',
      latitude: 60.1, longitude: 24.9, search: 'sensitive query',
      ean: '1234567890123', product_name: 'sensitive',
      $current_url: 'https://example.test/?token=private',
      $referrer: 'https://example.test/?secret=private',
      search_kind: 'normal', search_id: 'synthetic-id',
      result_count: 3,
      metadata: { email: 'nested@example.test', token: 'nested-secret' },
      items: [{ ean: '1234567890123' }],
    }});
    const props = event.properties;
    const sensitive = ['email', 'access_token', 'latitude', 'longitude',
      'search', 'ean', 'product_name', '$current_url', '$referrer'];
    const passed = sensitive.every(key => !(key in props)) &&
      !('metadata' in props) && !('items' in props) &&
      props.search_kind === 'normal' && props.result_count === 3 &&
      props.ziiply_environment === 'preview' &&
      props.ziiply_internal_test === true &&
      props.ziiply_analytics_schema === 1;
    console.log(`${passed ? 'PASS' : 'FAIL'} before_send strips sensitive and nested synthetic properties`);
    if (!passed) process.exitCode = 1;
  }
}

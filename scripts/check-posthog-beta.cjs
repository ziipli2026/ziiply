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

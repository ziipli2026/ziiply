#!/usr/bin/env node
// Read-only PostHog instrumentation inventory. No network requests or credentials.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ignored = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage']);
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const matches = [];
const eventNames = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      const relative = path.relative(root, full).replaceAll(path.sep, '/');
      if (relative === 'scripts/audit-posthog-beta.cjs') continue;
      const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        const types = [
          ['capture', /\b(?:posthog|analytics)\.capture\s*\(/],
          ['identify', /\bposthog\.identify\s*\(/],
          ['pageview', /\bcapture_pageview\b/],
          ['session-replay', /\b(?:disable_session_recording|session_recording|startSessionRecording|stopSessionRecording)\b/],
          ['autocapture', /\bautocapture\b/],
          ['exception', /\b(?:captureException|capture_exception)\b/],
          ['posthog-import', /(?:from\s*['"]posthog-js|require\(['"]posthog-js)/],
        ];
        for (const [type, pattern] of types) {
          if (pattern.test(line)) {
            matches.push({ file: relative, line: i + 1, type });
            if (type === 'capture') {
              const match = line.match(/\\b(?:posthog|analytics)\\.capture\\s*\\(\\s*['\"]([^'\"]+)['\"]/);
              if (match) eventNames.push({ event: match[1], file: relative, line: i + 1 });
            }
          }
        }
      });
    }
  }
}
walk(path.join(root, 'src'));
const counts = Object.fromEntries([...new Set(matches.map(m => m.type))].sort().map(t => [t, matches.filter(m => m.type === t).length]));
console.log(JSON.stringify({ audit: 'posthog-beta', scanned: 'src', counts, eventNames, locations: matches }, null, 2));

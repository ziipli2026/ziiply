#!/usr/bin/env node
// Verify the audit fails closed when its input is corrupted.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const source = fs.readFileSync('scripts/fixtures/category-findings-test-20261011.csv', 'utf8');
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ziiply-category-negative-'));
try {
  const cases = [
    ['missing-row', source.trimEnd().split('\n').slice(0, -1).join('\n') + '\n'],
    ['invalid-ean', source.replace(/^6408653129323,/m, 'INVALID,')],
    ['wrong-category', source.replace(',more_specific_subcategory,cola,candidate', ',more_specific_subcategory,frozen,candidate')],
    ['duplicate-row', source + source.trimEnd().split('\n')[1] + '\n'],
    ['invalid-review-status', source.replace(',ambiguous_search_term,,candidate', ',ambiguous_search_term,,approved')],
    ['extra-column', source.replace('6408653129323,Juustoportti', '6408653129323,EXTRA,Juustoportti')],
  ];
  for (const [name, csv] of cases) {
    assert.notEqual(csv, source, 'Mutation not applied: ' + name);
    const file = path.join(folder, name + '.csv');
    fs.writeFileSync(file, csv);
    const result = cp.spawnSync(process.execPath, ['scripts/audit-category-findings.cjs', file], {encoding:'utf8'});
    assert.equal(result.status, 1, name + ' must fail');
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, 'FAIL', name + ' must report FAIL');
    assert.ok(report.failures.length, name + ' must explain failure');
    process.stdout.write(name + ': rejected\n');
  }
} finally {
  fs.rmSync(folder, {recursive:true, force:true});
}

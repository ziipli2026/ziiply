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
  const baseline = cp.spawnSync(process.execPath, ['scripts/audit-category-findings.cjs', 'scripts/fixtures/category-findings-test-20261011.csv'], {encoding:'utf8'});
  assert.equal(baseline.status, 0, 'Original category snapshot must pass before mutation tests');
  const baselineReport = JSON.parse(baseline.stdout);
  assert.equal(baselineReport.status, 'PASS');
  assert.equal(baselineReport.rows, 65);
  assert.deepEqual(baselineReport.counts, {source_misclassification:17, more_specific_subcategory:37, ambiguous_search_term:11});
  assert.deepEqual(baselineReport.failures, []);
  const cases = [
    ['missing-row', source.trimEnd().split('\n').slice(0, -1).join('\n') + '\n'],
    ['invalid-ean', source.replace(/^6408653129323,/m, 'INVALID,')],
    ['wrong-category', source.replace(',more_specific_subcategory,cola,candidate', ',more_specific_subcategory,frozen,candidate')],
    ['duplicate-row', source + source.trimEnd().split('\n')[1] + '\n'],
    ['invalid-review-status', source.replace(',ambiguous_search_term,,candidate', ',ambiguous_search_term,,approved')],
    ['extra-column', source.replace('6408653129323,Juustoportti', '6408653129323,EXTRA,Juustoportti')],
    ['unclosed-quote', source.replace('6408653129323,Juustoportti', '6408653129323,"Juustoportti')],
  ];
  const results = [];
  for (const [name, csv] of cases) {
    assert.notEqual(csv, source, 'Mutation not applied: ' + name);
    const file = path.join(folder, name + '.csv');
    fs.writeFileSync(file, csv);
    const result = cp.spawnSync(process.execPath, ['scripts/audit-category-findings.cjs', file], {encoding:'utf8'});
    assert.equal(result.status, 1, name + ' must fail');
    if (name === 'unclosed-quote') {
      assert.match(result.stderr, /Unterminated quoted CSV field/, name + ' must explain parse failure');
    } else {
      const report = JSON.parse(result.stdout);
      assert.equal(report.status, 'FAIL', name + ' must report FAIL');
      assert.ok(report.failures.length, name + ' must explain failure');
    }
    results.push({name, pass:true});
    process.stdout.write(name + ': rejected\n');
  }
  fs.mkdirSync('search-audit-results', {recursive:true});
  fs.writeFileSync('search-audit-results/category-negative.json', JSON.stringify({total:cases.length, passed:results.length, results, status:'PASS'}, null, 2) + '\n');
} finally {
  fs.rmSync(folder, {recursive:true, force:true});
}

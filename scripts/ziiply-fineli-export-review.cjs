const fs = require('node:fs');
const path = require('node:path');
const dir = process.argv[2] || 'fineli-audit';
const input = path.join(dir, 'pending-review.jsonl');
const lines = fs.readFileSync(input, 'utf8').split(/\r?\n/).filter(Boolean);
const records = lines.map((line, index) => {
  try { return JSON.parse(line); }
  catch (error) { throw new Error('Invalid audit JSON on line ' + (index + 1) + ': ' + error.message); }
});
const summary = records.find(row => row.mode === 'read_only_pending_audit');
if (!summary) throw new Error('Missing audit summary');
const rows = records.filter(row => row.decision);
if (rows.length !== summary.total) throw new Error('Audit count mismatch: expected ' + summary.total + ', got ' + rows.length);
const categories = ['CONFLICT_REVIEW', 'VERIFY_NUTRITION', 'MANUAL_REVIEW'];
const csv = value => '"' + String(value ?? '').replace(/"/g, '""') + '"';
const columns = ['ean','fineli_id','product','fineli','issues','decision'];
const serialize = values => values.map(csv).join(',');
for (const category of categories) {
  const subset = rows.filter(row => row.decision === category);
  const output = [serialize(columns), ...subset.map(row => serialize(columns.map(column => column === 'issues' ? (row.issues || []).join('; ') : row[column])))].join('\n') + '\n';
  fs.writeFileSync(path.join(dir, category.toLowerCase() + '.csv'), '\uFEFF' + output);
}
const counts = Object.fromEntries(categories.map(category => [category, rows.filter(row => row.decision === category).length]));
if (counts.CONFLICT_REVIEW !== summary.conflicts || counts.VERIFY_NUTRITION !== summary.verify_nutrition || counts.MANUAL_REVIEW !== summary.manual_review) throw new Error('Category counts differ from audit summary');
fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify({ ...summary, categories: counts }, null, 2) + '\n');
console.log('Fineli review files generated:', JSON.stringify(counts));

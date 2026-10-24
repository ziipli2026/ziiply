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
const columns = ['ean','fineli_id','product','fineli','issues','decision','priority'];
const serialize = values => values.map(csv).join(',');
for (const category of categories) {
  const subset = rows.filter(row => row.decision === category);
  const output = [serialize(columns), ...subset.map(row => serialize(columns.map(column => column === 'issues' ? (row.issues || []).join('; ') : row[column])))].join('\n') + '\n';
  fs.writeFileSync(path.join(dir, category.toLowerCase() + '.csv'), '\uFEFF' + output);
}
const priorityCounts = {};
for (const row of rows) priorityCounts[row.priority || 'UNCLASSIFIED'] = (priorityCounts[row.priority || 'UNCLASSIFIED'] || 0) + 1;
const priorityCsv = [serialize(columns), ...rows.filter(row => row.decision === 'MANUAL_REVIEW').sort((a,b) => String(a.priority).localeCompare(String(b.priority))).map(row => serialize(columns.map(column => column === 'issues' ? (row.issues || []).join('; ') : row[column])))].join('\n') + '\n';
fs.writeFileSync(path.join(dir, 'manual-review-by-category.csv'), '\uFEFF' + priorityCsv);
const counts = Object.fromEntries(categories.map(category => [category, rows.filter(row => row.decision === category).length]));
if (counts.CONFLICT_REVIEW !== summary.conflicts || counts.VERIFY_NUTRITION !== summary.verify_nutrition || counts.MANUAL_REVIEW !== summary.manual_review) throw new Error('Category counts differ from audit summary');
fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify({ ...summary, categories: counts, priorities: priorityCounts }, null, 2) + '\n');
console.log('Fineli review files generated:', JSON.stringify(counts));

const queueColumns = ['ean','fineli_id','product','fineli','issues','decision','priority','review_queue','diet_evidence','dairy_fat_coverage'];
const csvCell = (row, column) => column === 'issues' ? (row.issues || []).join('; ') : column === 'diet_evidence' ? (row.diet_evidence || []).join('; ') : row[column];
const reviewQueues = {};
for (const row of rows) {
  const queue = String(row.review_queue || row.decision || 'UNCLASSIFIED');
  (reviewQueues[queue] ||= []).push(row);
}
const queueCounts = {};
for (const [queue, subset] of Object.entries(reviewQueues).sort(([a],[b]) => a.localeCompare(b))) {
  queueCounts[queue] = subset.length;
  const filename = 'queue-' + queue.toLowerCase().replace(/[^a-z0-9_-]+/g, '-') + '.csv';
  const output = [serialize(queueColumns), ...subset.map(row => serialize(queueColumns.map(column => csvCell(row, column))))].join('\n') + '\n';
  fs.writeFileSync(path.join(dir, filename), '\uFEFF' + output);
}
const sorted = rows.slice().sort((a,b) =>
  String(a.review_queue || a.decision).localeCompare(String(b.review_queue || b.decision)) ||
  String(a.priority).localeCompare(String(b.priority)) ||
  String(a.ean).localeCompare(String(b.ean)) ||
  String(a.fineli_id).localeCompare(String(b.fineli_id))
);
const batchSize = 100;
const batches = [];
for (let i=0;i<sorted.length;i+=batchSize) {
  const subset = sorted.slice(i,i+batchSize);
  const filename = 'review-batch-' + String(batches.length+1).padStart(3,'0') + '.csv';
  fs.writeFileSync(path.join(dir,filename), '\uFEFF' + [serialize(queueColumns),...subset.map(row=>serialize(queueColumns.map(column=>csvCell(row,column))))].join('\n') + '\n');
  batches.push({file:filename,count:subset.length});
}
if (batches.reduce((sum,b)=>sum+b.count,0)!==rows.length) throw new Error('Batch partition count mismatch');
const key = row => String(row.ean)+'|'+String(row.fineli_id);
if (new Set(rows.map(key)).size!==rows.length) throw new Error('Duplicate EAN-Fineli candidates in audit');
fs.writeFileSync(path.join(dir,'review-batches-summary.json'),JSON.stringify({total:rows.length,modified:0,queue_counts:queueCounts,batches},null,2)+'\n');
console.log('Fineli review batches:',JSON.stringify({total:rows.length,modified:0,queue_counts:queueCounts,batches}));

const conflictGroups = {};
for (const row of rows.filter(row => row.decision === 'CONFLICT_REVIEW')) {
  const reason = (row.issues || []).slice().sort().join('+') || 'unknown';
  (conflictGroups[reason] ||= []).push(row);
}
const conflictSummary = Object.fromEntries(Object.entries(conflictGroups).map(([reason,items])=>[reason,items.length]));
fs.writeFileSync(path.join(dir,'conflict-reasons.json'),JSON.stringify({total:rows.filter(r=>r.decision==='CONFLICT_REVIEW').length,modified:0,reasons:conflictSummary},null,2)+'\n');
for (const [reason,subset] of Object.entries(conflictGroups)) {
  const filename='conflict-' + reason.toLowerCase().replace(/[^a-z0-9_-]+/g,'-')+'.csv';
  fs.writeFileSync(path.join(dir,filename),'\uFEFF'+[serialize(queueColumns),...subset.map(row=>serialize(queueColumns.map(column=>csvCell(row,column))))].join('\n')+'\n');
}
console.log('Fineli conflict groups:',JSON.stringify(conflictSummary));

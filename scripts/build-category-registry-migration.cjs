#!/usr/bin/env node
// Generate a reproducible test-only migration from the registry used by search.
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/app/components/ziiply/search/searchCategoryRegistry.ts', 'utf8');
const section = source.split('export const SEARCH_INTENTS: SearchIntent[] = ')[1];
const rules = vm.runInNewContext(section.replace(/;\s*$/, ''));
const mappings = JSON.parse(fs.readFileSync('data/search/category-mappings-reviewed.json', 'utf8'));
const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const quote = value => "'" + String(value).replace(/'/g, "''") + "'";
const statements = [
  'ALTER TABLE ziiply_product_categories ADD COLUMN IF NOT EXISTS search_rules jsonb',
  'ALTER TABLE ziiply_product_categories ADD COLUMN IF NOT EXISTS registry_version text',
];
for (const rule of rules) {
  statements.push(`INSERT INTO ziiply_product_categories(id,label_fi,status,search_rules,registry_version) VALUES (${quote(rule.category)},${quote(rule.label)},'active',${quote(JSON.stringify(rule))}::jsonb,${quote(mappings.version)}) ON CONFLICT(id) DO UPDATE SET label_fi=EXCLUDED.label_fi,status=EXCLUDED.status,search_rules=EXCLUDED.search_rules,registry_version=EXCLUDED.registry_version`);
  const seen = new Set();
  for (const term of rule.variants) {
    const normalized = normalize(term);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    statements.push(`INSERT INTO ziiply_search_synonyms(category_id,term,term_normalized,status) VALUES (${quote(rule.category)},${quote(term)},${quote(normalized)},'active') ON CONFLICT(category_id,term_normalized) DO UPDATE SET term=EXCLUDED.term,status=EXCLUDED.status`);
  }
}
for (const row of mappings.mappings) statements.push(`UPDATE ziiply_source_category_mappings SET ziiply_category_id=${quote(row.category_id)},review_status='reviewed',updated_at=now() WHERE source=${quote(row.source)} AND source_category=${quote(row.source_category)}`);
const snapshot = JSON.stringify({version:mappings.version,projectId:mappings.projectId,branchId:mappings.branchId,rules},null,2)+'\n';
const sql = '-- Apply only to Neon branch '+mappings.branchId+'. Search consumes the same versioned rules.\nBEGIN;\n'+statements.join(';\n')+';\nCOMMIT;\n';
if (process.argv.includes('--check')) {
  if (fs.readFileSync('data/search/category-registry-reviewed.json','utf8') !== snapshot || fs.readFileSync('scripts/sql/ziiply-category-registry-reviewed.sql','utf8') !== sql) throw Error('Registry snapshot or migration is stale');
} else {
  fs.writeFileSync('data/search/category-registry-reviewed.json', snapshot);
  fs.writeFileSync('scripts/sql/ziiply-category-registry-reviewed.sql',sql);
}
console.log(JSON.stringify({groups:rules.length,reviewedMappings:mappings.mappings.length,version:mappings.version}));

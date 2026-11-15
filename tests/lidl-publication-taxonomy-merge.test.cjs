const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync('src/app/api/cron/lidl-publications/route.ts','utf8');
const normalize = (value) => String(value ?? '').toLocaleLowerCase('fi')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\b\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l)\b/g, ' ')
  .replace(/[^a-z0-9åäö]+/gi, ' ').replace(/\s+/g, ' ').trim();
const start = source.indexOf('function mergePeriodRows(');
const end = source.indexOf('/** Stage Lidl Plus', start);
assert.ok(start >= 0 && end > start, 'Find production duplicate merger');
const compiled = ts.transpileModule(source.slice(start,end), {compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.CommonJS}}).outputText;
const mergePeriodRows = new Function('normalize', compiled + '; return mergePeriodRows;')(normalize);
const shared = {name:'Kotimainen rypsiöljy 500 ml',brandName:'Merkki',validFrom:'2026-11-15',validUntil:'2026-11-20'};
test('Lidl Plus wins price while retaining public source taxonomy', () => {
 const rows=mergePeriodRows([
  {...shared,source:'lidl-plus',price:2.5,imageUrl:'https://example.test/plus.jpg'},
  {...shared,source:'lidl-fi-public',price:3.5,sourceCategoryPath:'Ruokaöljyt',imageUrl:'https://example.test/public.jpg'}
 ]);
 assert.equal(rows.length,1);
 assert.equal(rows[0].source,'lidl-plus');
 assert.equal(rows[0].price,2.5);
 assert.equal(rows[0].sourceCategoryPath,'Ruokaöljyt');
 assert.equal(rows[0].imageUrl,'https://example.test/plus.jpg');
});
test('Public source first still preserves taxonomy when Lidl Plus wins', () => {
 const rows=mergePeriodRows([
  {...shared,source:'lidl-fi-public',price:3.5,sourceCategoryPath:'Ruokaöljyt',imageUrl:'https://example.test/public.jpg'},
  {...shared,source:'lidl-plus',price:2.5,imageUrl:''}
 ]);
 assert.equal(rows.length,1);
 assert.equal(rows[0].price,2.5);
 assert.equal(rows[0].sourceCategoryPath,'Ruokaöljyt');
 assert.equal(rows[0].imageUrl,'https://example.test/public.jpg');
});

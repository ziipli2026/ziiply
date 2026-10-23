const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('scripts/ziiply-fineli-discover-candidates.mts','utf8');
for (const term of ['const unsafeProduct =','const containsDifferentPreparation =','const fatMismatch =','const productIsGlutenFree =','const productIsLactoseFree =','autoApproved:0']) assert.ok(source.includes(term),term);
assert.ok(source.includes('const productFat = unbranded.match('));
assert.ok(source.includes('if (unsafeProduct) return []'));
console.log('Fineli static guard preflight OK');

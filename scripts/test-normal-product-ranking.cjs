require('./recipe-audit-runtime.cjs');
const assert = require('node:assert/strict');
const { rankProductResultsByRelevanceAndPrice } = require('../src/app/components/ziiply/ziiplyCore.ts');

const cases = [
  { query: 'ruokaöljy', relevant: 'Rypsiöljy 1 l', distractor: 'Hiusöljy 100 ml' },
  { query: 'maito', relevant: 'Kevytmaito 1 l', distractor: 'Maitokahvijuoma 250 ml' },
  { query: 'kahvi', relevant: 'Juhla Mokka kahvi 500 g', distractor: 'Kahvimuki 300 ml' },
  { query: 'jauheliha', relevant: 'Naudan jauheliha 400 g', distractor: 'Jauhelihapizza 400 g' },
  { query: 'jauheliha', relevant: 'Naudan jauheliha 400 g', distractor: 'Jauhelihakastike valmisateria 300 g' },
];

for (const test of cases) {
  const rows = [
    { id: 'relevant-expensive', name: test.relevant, price: 4.99, category: 'Elintarvikkeet' },
    { id: 'relevant-cheap', name: test.relevant, price: 1.79, category: 'Elintarvikkeet' },
    { id: 'wrong-very-cheap', name: test.distractor, price: 0.19, category: 'Muut' },
  ];
  const ranked = rankProductResultsByRelevanceAndPrice(test.query, rows, p => p.price);
  assert.equal(ranked[0].id, 'relevant-cheap',
    test.query + ': same relevant product must be ordered by lowest price');
  assert.ok(ranked.findIndex(p => p.id === 'relevant-expensive') < ranked.findIndex(p => p.id === 'wrong-very-cheap'),
    test.query + ': cheap unrelated product must not outrank the relevant product');
}

const missingPrice = [
  { id: 'missing', name: 'Rypsiöljy 1 l', price: Number.POSITIVE_INFINITY },
  { id: 'priced', name: 'Rypsiöljy 1 l', price: 2.49 },
];
const missingRanked = rankProductResultsByRelevanceAndPrice('ruokaöljy', missingPrice, p => p.price);
assert.deepEqual(missingRanked.map(p => p.id), ['priced', 'missing'],
  'missing/unusable prices must follow priced products');

console.log('PASS: shared normal-product ranking — ruokaöljy, maito, kahvi, jauheliha; relevance before price; cheapest first; missing prices last');

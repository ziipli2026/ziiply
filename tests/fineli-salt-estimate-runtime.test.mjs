import test from 'node:test';
import assert from 'node:assert/strict';
import { attachFineliSaltEstimate } from '../src/app/api/ean-bank/fineli-salt-estimate.mjs';

const row = { saltG100g: '0.1147', fineliId: 123, foodName: 'SEESAMINSIEMEN', confidence: 'verified' };
const off = { salt_100g: null, proteins_100g: 18 };
test('adds separately labeled Fineli salt when enabled and OFF salt missing', () => {
  const result = attachFineliSaltEstimate(off, 'open-food-facts', true, [row]);
  assert.equal(result.estimatedSalt.value, 0.1147);
  assert.equal(result.estimatedSalt.source, 'fineli-generic');
  assert.equal(result.estimatedSalt.estimated, true);
  assert.equal(result.salt_100g, null);
  assert.equal(result.proteins_100g, 18);
  assert.equal(off.estimatedSalt, undefined);
});
test('does not replace an existing OFF salt', () => {
  assert.deepEqual(attachFineliSaltEstimate({salt_100g: 1.2}, 'open-food-facts', true, [row]), {salt_100g: 1.2});
});
test('feature disabled returns OFF record unchanged', () => {
  assert.deepEqual(attachFineliSaltEstimate(off, 'open-food-facts', false, [row]), off);
});
test('ambiguous or invalid estimates are rejected', () => {
  for (const rows of [[], [row,row], [{...row,saltG100g: -1}], [{...row,saltG100g: 101}], [{...row,saltG100g: 'oops'}]]) {
    assert.deepEqual(attachFineliSaltEstimate(off, 'open-food-facts', true, rows), off);
  }
});
test('does not add Fineli salt to other sources', () => {
  assert.deepEqual(attachFineliSaltEstimate(off, 'fineli-generic', true, [row]), off);
});

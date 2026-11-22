import test from 'node:test';
import assert from 'node:assert/strict';
import { hasConflictingOffProductName, shouldSuppressLocalOffNutrition, attachFineliSaltEstimate } from '../src/app/api/ean-bank/fineli-salt-estimate.mjs';

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
  for (const rows of [[], [row,row], [{...row,saltG100g: -1}], [{...row,saltG100g: 101}], [{...row,saltG100g: 'oops'}], [{...row,saltG100g: null}], [{...row,saltG100g: ''}]]) {
    assert.deepEqual(attachFineliSaltEstimate(off, 'open-food-facts', true, rows), off);
  }
});
test('does not add Fineli salt to other sources', () => {
  assert.deepEqual(attachFineliSaltEstimate(off, 'fineli-generic', true, [row]), off);
});

test('obvious mismatched OFF product name blocks Fineli estimate', () => {
  assert.equal(hasConflictingOffProductName('Omena gala', 'Chili Carolina Reaper 50g'), true);
  assert.equal(hasConflictingOffProductName('Omena gala', 'Omena Gala 1kg'), false);
  assert.equal(hasConflictingOffProductName('Omena gala', ''), false);
});

test('rejects estimates without verified confidence and complete Fineli identity', () => {
  for (const invalid of [
    {...row, confidence: 'low'},
    {...row, confidence: 'medium'},
    {...row, confidence: null},
    {...row, fineliId: null},
    {...row, fineliId: -1},
    {...row, foodName: ''},
    {...row, foodName: null}
  ]) {
    assert.deepEqual(attachFineliSaltEstimate(off, 'open-food-facts', true, [invalid]), off);
  }
  assert.equal(attachFineliSaltEstimate(off, 'open-food-facts', true, [{...row,confidence:'high'}]).estimatedSalt.confidence, 'high');
});

test('local EAN conflicting OFF products are suppressed, regular EANs unaffected', () => {
  assert.equal(shouldSuppressLocalOffNutrition('2000607000005', 'Palsternakka Suomi', 'Nocetta'), true);
  assert.equal(shouldSuppressLocalOffNutrition('2000610800005', 'Punajuuri Luomu Suomi', 'Änglamark Sitron 400g'), true);
  assert.equal(shouldSuppressLocalOffNutrition('2000607000005', 'Palsternakka Suomi', 'Palsternakka Suomi'), false);
  assert.equal(shouldSuppressLocalOffNutrition('6410405078872', 'Palsternakka Suomi', 'Nocetta'), false);
  assert.equal(shouldSuppressLocalOffNutrition('2000607000005', 'Palsternakka Suomi', ''), true);
  assert.equal(shouldSuppressLocalOffNutrition('2000607000005', 'Palsternakka Suomi', null), true);
});

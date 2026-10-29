import assert from 'node:assert/strict';
import test from 'node:test';

const base = process.env.FINELI_PREVIEW_URL;
const ean = process.env.FINELI_TEST_EAN;
const ready = Boolean(base && /^\d{8,14}$/.test(ean || ''));

test('Fineli preview returns a separately labeled estimate without replacing OFF salt', {}, async () => {
  const url = new URL('/api/ean-bank', base);
  url.searchParams.set('ean', ean);
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, 'Preview API must return 200');
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.product?.ean, ean);
  const nutrition = data.product?.nutrition;
  assert.equal(nutrition?.source, 'open-food-facts');
  assert.equal(nutrition?.salt_100g, null);
  assert.equal(nutrition?.estimatedSalt?.estimated, true);
  assert.equal(nutrition?.estimatedSalt?.source, 'fineli-generic');
  assert.equal(nutrition?.estimatedSalt?.label, 'Fineli – arvio');
  assert.ok(Number.isFinite(nutrition?.estimatedSalt?.value));
  assert.ok(nutrition.estimatedSalt.value >= 0 && nutrition.estimatedSalt.value <= 100);
});

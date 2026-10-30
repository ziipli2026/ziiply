import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Contract tests for the feature-flagged, read-only EAN nutrition extension.
// These tests do not connect to Neon or alter production records.
const route = readFileSync(new URL('../src/app/api/ean-bank/route.ts', import.meta.url), 'utf8');
const block = route.split('// Optional, explicitly labeled Fineli salt estimate.')[1]?.split('nutrition = safeNutrition;')[0];
const helper = readFileSync(new URL('../src/app/api/ean-bank/fineli-salt-estimate.mjs', import.meta.url), 'utf8');

test('Fineli salt estimate is opt-in and requires an OFF record with missing salt', () => {
  assert.ok(block);
  assert.match(block, /ZIIPLY_FINELI_SALT_ESTIMATE_PREVIEW\s*===\s*"1"/);
  assert.match(block, /selected\.source\s*===\s*"open-food-facts"/);
  assert.match(block, /safeNutrition\.salt_100g\s*===\s*null/);
  assert.match(block, /safeNutrition\.salt_100g\s*===\s*undefined/);
});

test('only approved, manually checked, numeric Fineli NACL values qualify', () => {
  assert.match(block, /m\.approved IS TRUE/);
  assert.match(block, /m\.match_method = 'manual_verified'/);
  assert.match(block, /m\.confidence IN \('verified', 'high'\)/);
  assert.match(block, /jsonb_typeof\(f\.nutrients->'NACL'->'value'\) = 'number'/);
  assert.match(block, /BETWEEN 0 AND 100000/);
  assert.match(block, /LIMIT 2/);
  assert.match(helper, /estimates\.length !== 1/);
});

test('Fineli is a separately labeled estimate, not a replacement for OFF salt', () => {
  assert.match(helper, /output\.estimatedSalt\s*=/);
  assert.match(helper, /source:\s*"fineli-generic"/);
  assert.match(helper, /estimated:\s*true/);
  assert.match(helper, /label:\s*"Fineli – arvio"/);
  assert.doesNotMatch(block, /safeNutrition\.salt_100g\s*(?:=(?!=)|\+=(?!=)|-=(?!=)|\*=(?!=)|\/=(?!=)|\?\?=)/);
  assert.doesNotMatch(block, /\b(?:INSERT|UPDATE|DELETE)\b/i);
});

test('local EAN name conflicts suppress OFF nutrition without hiding catalog product', () => {
  assert.match(route, /const unsafeLocalOff = \/\^2\[0-9\]\//);
  assert.match(route, /hasConflictingOffProductName\(rows\[0\]\.name, selected\.data\?\.product_name\)/);
  assert.match(route, /if \(selected && !unsafeLocalOff\)/);
  assert.match(route, /return NextResponse\.json\(\{ ok: true, product: \{ \.\.\.rows\[0\], nutrition \} \}\)/);
});

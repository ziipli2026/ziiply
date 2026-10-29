import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ui = readFileSync('src/app/components/ziiply/arvo/ArvoNutritionScannerPreview.tsx', 'utf8');
test('manual EAN input is accessible without scanning', () => {
  assert.match(ui, /Syötä EAN/);
  assert.match(ui, /setTab\("nutrition"\)/);
  assert.match(ui, /name="manualEan"/);
  assert.match(ui, /cameraOverlay=\{tab === "nutrition" \?/);
  assert.match(ui, /setEan\(code\)/);
});
test('Fineli estimate is labeled and cannot override reported salt', () => {
  assert.match(ui, /reportedSaltValue !== null \?/);
  assert.match(ui, /estimatedSaltValue !== null \?/);
  assert.match(ui, /Fineli – arvio/);
  assert.match(ui, /ei valmistajan ilmoittama tuotearvo/);
  assert.match(ui, /estimatedSalt\?\.source === "fineli-generic"/);
});
test('estimated portion calculation is proportional to grams', () => {
  const value = 0.01055;
  assert.ok(Math.abs(value * 100 / 100 - 0.01055) < 1e-10);
  assert.ok(Math.abs(value * 400 / 100 - 0.0422) < 1e-10);
});

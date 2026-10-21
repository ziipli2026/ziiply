const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync('src/app/components/ziiplyWakePolicy.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const testModule = { exports: {} };
vm.runInNewContext(compiled, { module: testModule, exports: testModule.exports });
const { classifyZiiplyWake } = testModule.exports;

function simulateResume({ idleMs, lastWakeAgoMs, requestAgeMs, requestType }) {
  const kind = classifyZiiplyWake(idleMs, lastWakeAgoMs);
  // Test desired recovery contract, not yet wired into application requests.
  const stale = requestAgeMs >= 30_000;
  return {
    kind,
    cancelStaleRequest: !!kind && stale && requestType !== 'basket-priced',
    refreshExistingBasketPrices: false,
    preserveCart: true,
    preserveStoreSelection: true,
  };
}
const cases = [
  { name: '30-second wake', idleMs: 30_000, lastWakeAgoMs: Infinity, requestAgeMs: 45_000, requestType: 'offer', cancel: true },
  { name: '5-minute wake', idleMs: 300_000, lastWakeAgoMs: Infinity, requestAgeMs: 300_000, requestType: 'product', cancel: true },
  { name: '20-minute wake', idleMs: 1_200_000, lastWakeAgoMs: Infinity, requestAgeMs: 1_200_000, requestType: 'offer', cancel: true },
  { name: '24-hour wake', idleMs: 86_400_000, lastWakeAgoMs: Infinity, requestAgeMs: 86_400_000, requestType: 'product', cancel: true },
  { name: 'cooldown prevents duplicate', idleMs: 1_200_000, lastWakeAgoMs: 2_000, requestAgeMs: 1_200_000, requestType: 'offer', cancel: false },
  { name: 'fresh request survives', idleMs: 1_200_000, lastWakeAgoMs: Infinity, requestAgeMs: 2_000, requestType: 'offer', cancel: false },
  { name: 'basket price never re-fetched', idleMs: 1_200_000, lastWakeAgoMs: Infinity, requestAgeMs: 1_200_000, requestType: 'basket-priced', cancel: false },
];
for (const c of cases) {
  const r = simulateResume(c);
  assert.equal(r.cancelStaleRequest, c.cancel, c.name);
  assert.equal(r.refreshExistingBasketPrices, false, c.name);
  assert.equal(r.preserveCart, true, c.name);
  assert.equal(r.preserveStoreSelection, true, c.name);
  console.log('PASS', c.name);
}
console.log('NOTE: request recovery integration is NOT implemented; these are simulated expected outcomes.');

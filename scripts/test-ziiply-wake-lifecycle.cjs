const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
let now = 1_000_000;
class Clock extends Date { static now() { return now; } }
class DetailEvent extends Event {
  constructor(type, options) { super(type); this.detail = options.detail; }
}
const win = new EventTarget();
const doc = new EventTarget();
doc.hidden = false;
const cache = new Map();
let cleanup;
let probes = 0;
const wakes = [];
win.addEventListener('ziiply:wake', event => wakes.push(event.detail));
function load(file) {
  file = require('node:path').resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require(name) {
      if (name === 'react') return { useEffect: effect => { cleanup = effect(); } };
      return load(require('node:path').resolve(require('node:path').dirname(file), name) + '.ts');
    },
    window: win, document: doc, navigator: {}, Date: Clock, CustomEvent: DetailEvent,
    AbortController, fetch: async () => { probes++; return { ok: true }; },
  });
  return module.exports;
}
const { registerZiiplyRecoverableRequest: register, recoverZiiplyStalledRequests: recover } = load('src/app/components/ziiplyRequestRecovery.ts');
load('src/app/components/ZiiplyWakeUp.tsx').default();
(async () => {
  for (const idleMs of [30_000, 300_000, 1_200_000, 86_400_000]) {
    let cancelled = 0;
    register('visible-search', { kind: 'product-search', startedAt: now, abort: () => cancelled++ });
    doc.hidden = true;
    doc.dispatchEvent(new Event('visibilitychange'));
    now += idleMs;
    let freshCancelled = false;
    const clearFresh = register('fresh', { kind: 'offer-search', startedAt: now, abort: () => { freshCancelled = true; } });
    doc.hidden = false;
    doc.dispatchEvent(new Event('visibilitychange'));
    win.dispatchEvent(new Event('focus'));
    win.dispatchEvent(new Event('pageshow'));
    await Promise.resolve();
    assert.equal(cancelled, 1, `stale search recovered after ${idleMs}ms`);
    assert.equal(freshCancelled, false, 'new search survives wake');
    clearFresh();
    const initialWakes = wakes.filter(w => w.reason !== 'network-resumed').length;
    now += 16_000;
    win.dispatchEvent(new Event('focus'));
    assert.equal(wakes.filter(w => w.reason !== 'network-resumed').length, initialWakes,
      'focus 16s after resume is not another idle period');
    assert.equal(recover(now), 0, 'completed recovery is not repeated');
    console.log(`PASS: actual visibility/focus/pageshow recovery after ${idleMs}ms`);
  }
  const count = wakes.length;
  const previousProbes = probes;
  cleanup();
  now += 300_000;
  win.dispatchEvent(new Event('focus'));
  assert.equal(wakes.length, count, 'unmount removes listeners');
  assert.equal(probes, previousProbes, 'unmount prevents network probes');
})().catch(error => { console.error(error); process.exitCode = 1; });

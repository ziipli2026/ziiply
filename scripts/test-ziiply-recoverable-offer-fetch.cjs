const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const cache = {};
function load(path) {
  path = require('node:path').resolve(path);
  if (cache[path]) return cache[path].exports;
  const source = fs.readFileSync(path, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const moduleObj = { exports: {} };
  cache[path] = moduleObj;
  vm.runInNewContext(code, {
    module: moduleObj, exports: moduleObj.exports,
    require: (name) => load(require('node:path').resolve(require('node:path').dirname(path), name) + '.ts'),
    window: {}, Date, AbortController, AbortSignal,
    setTimeout, clearTimeout, Response, ReadableStream, TextEncoder, fetch: (...args) => fakeFetch(...args),
  });
  return moduleObj.exports;
}
let fakeFetch;
const registry = load('src/app/components/ziiplyRequestRecovery.ts');
const { fetchZiiplyRecoverableOfferSearch } = load('src/app/components/ziiply/ziiplyRecoverableOfferFetch.ts');
(async () => {
  let signal;
  fakeFetch = (_, options) => {
    signal = options.signal;
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  };
  const pending = fetchZiiplyRecoverableOfferSearch('/api/offers/search?q=test');
  assert.equal(registry.recoverZiiplyStalledRequests(Date.now() + 31_000), 1);
  await assert.rejects(pending, /aborted/);
  assert.equal(signal.aborted, true);
  assert.equal(registry.recoverZiiplyStalledRequests(Date.now() + 60_000), 0);
  // Headers arrive, but the body stalls: recovery must still abort the stream.
  fakeFetch = (_, options) => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"items":'));
        options.signal.addEventListener('abort', () => controller.error(new Error('body-aborted')), { once: true });
      },
    });
    return Promise.resolve(new Response(stream, { status: 200 }));
  };
  const stalledBody = fetchZiiplyRecoverableOfferSearch('/api/offers/search?q=stalled-body');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(registry.recoverZiiplyStalledRequests(Date.now() + 31_000), 1);
  await assert.rejects(stalledBody, /body-aborted|abort/i);
  assert.equal(registry.recoverZiiplyStalledRequests(Date.now() + 60_000), 0);

  fakeFetch = async () => new Response(JSON.stringify({ items: [1] }), { status: 200, headers: { 'content-type': 'application/json' } });
  const response = await fetchZiiplyRecoverableOfferSearch('/api/offers/search?q=test2');
  assert.equal(response.ok, true);
  assert.equal((await response.json()).items[0], 1);
  assert.equal(registry.recoverZiiplyStalledRequests(Date.now() + 60_000), 0);
  fakeFetch = async () => new Response(null, { status: 204 });
  const emptyResponse = await fetchZiiplyRecoverableOfferSearch('/api/offers/search?q=empty');
  assert.equal(emptyResponse.status, 204);
  assert.equal(await emptyResponse.text(), '');
  console.log('PASS: actual offer fetch is cancelled on stale wake and successful fetch is deregistered');
})().catch(error => { console.error(error); process.exitCode = 1; });

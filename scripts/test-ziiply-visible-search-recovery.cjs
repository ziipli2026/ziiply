const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const source = fs.readFileSync('src/app/components/ziiplyRequestRecovery.ts', 'utf8');
const registryCode = stripTypeScriptTypes(source).replace(/^export /gm, '');
const page = fs.readFileSync('src/app/page.tsx', 'utf8');
const wake = fs.readFileSync('src/app/components/ZiiplyWakeUp.tsx', 'utf8');
assert.match(wake, /lastWake = now;\s+recoverZiiplyStalledRequests\(now\);/,
  'both light and full wakes must recover stale searches');
for (const [name, registration, sequence, setter] of [
  ['Gösta', 'unregisterOfferRecovery', 'gostaOfferSearchRequestSeqRefV551', 'setLoadingOffers'],
  ['Justiina', 'unregisterProductRecovery', 'activeNormalSearchRequestRefV441', 'setLoadingNormal'],
]) {
  const start = page.indexOf(`    const ${registration} = registerZiiplyRecoverableRequest(`);
  assert.ok(start >= 0, `${name} must register the visible operation`);
  const end = page.indexOf('\n    });', start) + '\n    });'.length;
  const operationCode = page.slice(start, end);
  assert.match(page, new RegExp(`finally \\{\\s+${registration}\\(\\);`));
  const state = { loading: true };
  const context = vm.createContext({ Date, state });
  vm.runInContext(`${registryCode}
    const ${sequence} = { current: 1 };
    const requestSeqV551 = 1, normalSearchRequestIdV441 = 1;
    const ${setter} = value => { state.loading = value; };
    ${operationCode}
    if (recoverZiiplyStalledRequests(Date.now() + 29_000) !== 0) throw Error('fresh cancelled');
    if (!state.loading) throw Error('fresh spinner cleared');
    if (recoverZiiplyStalledRequests(Date.now() + 31_000) !== 1) throw Error('stale not recovered');
    if (state.loading || ${sequence}.current !== 2) throw Error('UI/sequence not recovered');
    ${registration}();
    if (recoverZiiplyStalledRequests(Date.now() + 60_000) !== 0) throw Error('duplicate recovery');
  `, context);
  // A superseded operation's completion must not unregister the replacement.
  vm.runInContext(`
    let replacements = 0;
    const oldCleanup = registerZiiplyRecoverableRequest('replacement', {
      kind: 'product-search', startedAt: 0, abort() { throw Error('old request'); }
    });
    registerZiiplyRecoverableRequest('replacement', {
      kind: 'product-search', startedAt: 0, abort() { replacements++; }
    });
    oldCleanup();
    recoverZiiplyStalledRequests(31_000);
    if (replacements !== 1) throw Error('replacement lost');
  `, context);
  console.log(`PASS: ${name} actual page recovery releases loading and invalidates old results`);
}

// Focused source contract audit; no changes to application or Monta tests.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const shared=read('src/app/components/ziiply/search/normalStoreSearch.ts');
const desktop=read('src/app/desktop-preview/DesktopPreviewClient.tsx');
const mobileCard=read('src/app/components/ziiply/cards/ZiiplyMobileSearchResultsCard.tsx');
test('both UI routes use the shared normal-search engine and same final EAN gate',()=>{
  assert.match(desktop,/searchNormalStores\(/);
  assert.match(shared,/finalizeNormalSearchResults\(/);
  assert.match(shared,/rankStoreRows\(query, rows\)/);
  assert.match(shared,/rankedRows\.slice\(0, 100\)/);
  assert.match(mobileCard,/data-testid="normal-search-result"/);
  assert.match(desktop,/data-testid="normal-search-result"/);
});
test('cache uses selected stores and 20-minute TTL and always revalidates',()=>{
  assert.match(shared,/20 \* 60 \* 1000/);
  assert.match(shared,/searchCacheIdentity\(query, stores\)/);
  assert.match(shared,/onCachedRows\(cached\)/);
  assert.match(shared,/cache: "no-store", signal/);
  assert.match(shared,/failures\.length === 0\) rememberCachedSearch/);
});
test('desktop cancels old requests and prevents stale preview overwrite',()=>{
  assert.match(desktop,/activeDesktopNormalSearchAbortRef\.current\?\.abort\(\)/);
  assert.match(desktop,/signal: diagnostic\?\.signal \?\? searchController\?\.signal/);
  assert.match(desktop,/generation !== desktopVoiceRunRef\.current/);
});
test('unverified local prices are excluded and priced results deduplicated',()=>{
  assert.match(shared,/priceVerified === true/);
  assert.match(shared,/priceScope === "local_store"/);
  assert.match(shared,/if \(!verifiedLocalPrice\)/);
  assert.match(shared,/const included=!normalRejected && euro!==null/);
  assert.match(shared,/finalizeNormalSearchResults/);
});
test('grocery corpus has exactly 100 distinct search terms',()=>{
  const terms=require('./normal-search-100-queries.cjs');
  assert.equal(terms.length,100);
  assert.equal(new Set(terms).size,100);
});

test('mobile result sheet renders only one card per normalized EAN without modifying source rows',()=>{
  assert.match(mobileCard,/const visibleProducts =/);
  assert.match(mobileCard,/products\.filter\(product =>/);
  assert.match(mobileCard,/seen\.has\(raw\)/);
  assert.match(mobileCard,/visibleProducts\.map\(\(product, index\)/);
  assert.doesNotMatch(mobileCard,/products\.map\(\(product, index\)/);
});

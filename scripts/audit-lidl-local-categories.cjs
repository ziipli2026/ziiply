// Read-only test-branch API audit. The CI server is started with OFFER_CATEGORY_READ_ONLY=1.
const assert = require('node:assert/strict');
(async () => {
  const url = 'http://127.0.0.1:3179/api/offers/search?provider=lidl&lidlStoreKey=FI0218&lidlStoreName=Lidl%20Hyvink%C3%A4%C3%A4';
  const response = await fetch(url, {signal:AbortSignal.timeout(90000)});
  assert.equal(response.status,200,'Local test-branch Lidl API must return HTTP 200');
  const data = await response.json();
  assert.equal(data.ok,true,'Local Lidl API must succeed');
  assert.ok(Array.isArray(data.results),'Local Lidl API must return product rows');
  const categoryCounts = {};
  const missing = [];
  for(const row of data.results) {
    const category = String(row.category || '').trim();
    categoryCounts[category || '(missing)'] = (categoryCounts[category || '(missing)'] || 0) + 1;
    if(!category || category === 'Muut') missing.push({name:row.title || row.name,ean:row.ean || ''});
  }
  console.log('AUDIT_TEST_BRANCH',JSON.stringify({
    source:'local test-branch API, read-only catalog',total:data.results.length,
    categoryCounts,missingCount:missing.length,missing:missing.slice(0,80),
    sourceAudit:data.lidlSourceAudit || null
  }));
  assert.ok(data.results.length > 0,'Test branch must return real Lidl offers');
  console.log('PASS read-only test-branch Lidl offer audit');
})().catch(error => {console.error('FAIL test-branch Lidl audit',error);process.exitCode=1;});

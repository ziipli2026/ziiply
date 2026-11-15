const test = require('node:test');
const assert = require('node:assert/strict');
const feed = require('../src/app/components/ziiply/offerSearch/providers/eurospar-feed.json');

const expected = {
  '1:6':'Maitotuotteet','1:3':'Liha & makkarat','1:5':'Pakasteet','1:4':'Hevi',
  '2:11':'Leipomo','2:8':'Leipomo','2:10':'Valmisruoka','2:2':'Liha & makkarat',
  '3:6':'Makeiset & keksit','3:13':'Valmisruoka','3:16':'Leipomo','3:15':'Juomat',
  '3:17':'Leipomo','3:9':'Kuivatuotteet','3:1':'Hevi','3:4':'Hevi',
  '3:2':'Hevi','3:8':'Hevi','3:3':'Kuivatuotteet',
};

test('EUROSPAR 45/26 complete offer taxonomy regression', () => {
  assert.equal(feed.issue,'45/26');
  assert.equal(feed.offers.length,34);
  const seen = new Set();
  for (const offer of feed.offers) {
    assert.ok(!seen.has(offer.id), 'duplicate '+offer.id);
    seen.add(offer.id);
    assert.ok(offer.category && offer.category !== 'Muut', 'unclassified '+offer.id);
    assert.ok(offer.sourceEvidence?.pdfSha256, 'missing publisher provenance '+offer.id);
  }
  for (const [suffix,category] of Object.entries(expected)) {
    const match = feed.offers.find(row => row.id.endsWith(':'+suffix));
    assert.ok(match,'missing '+suffix);
    assert.equal(match.category,category,match.name);
  }
});

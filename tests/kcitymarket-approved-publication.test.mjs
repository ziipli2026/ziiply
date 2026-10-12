import test from 'node:test';
import assert from 'node:assert/strict';
import {parseKCitymarketSpatialLeaflet} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParser.js';
test('Published 42AV selects the same approved archive without preview-only environment',async()=>{
  const entry='https://kcm-tarjouslehdet.k-ruoka.fi/83z6h5o_tarjouslehti_42AV_KCM/index.html';
  const parsed=await parseKCitymarketSpatialLeaflet(entry);
  assert.equal(parsed.leaflet,entry);
  assert.equal(parsed.sourceMode,'immutable-publisher-archive');
  assert.equal(parsed.approvalStatus,'APPROVED-20261012');
  assert.match(parsed.revision,/V158/);
  assert.equal(parsed.rows.length,99);
  const bun=parsed.rows.find(row=>row.title==='KORVAPUUSTI 6/360 g');
  assert.equal(bun.spatialResolved.value,2.99);
  assert.equal(bun.unitPrice.min,8.31);
});

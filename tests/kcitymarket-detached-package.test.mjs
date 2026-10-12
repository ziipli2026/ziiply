import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reattachDetachedPackage, resolveRecoveredPrintedPrice} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketDetachedPackage.js';
const {boxes} = JSON.parse(fs.readFileSync(new URL('./fixtures/citymarket/detached-package.json', import.meta.url)));
test('Detached package requires unique same-column geometry and its own unit rate', () => {
  const lines = [{text:'-30 % WOK-KASTIKKEET'}];
  assert.equal(reattachDetachedPackage(lines, boxes)[0].text, 'WOK-KASTIKKEET 120 g');
  for (const mode of ['column','missing','ambiguous','rate']) {
    const altered = structuredClone(boxes);
    if (mode === 'column') altered.find(b=>b.text==='120').left+=.3;
    if (mode === 'missing') altered.splice(altered.findIndex(b=>b.text==='120'),1);
    if (mode === 'ambiguous') altered.push({...altered.find(b=>b.text==='120'),text:'130'});
    if (mode === 'rate') altered.splice(altered.findIndex(b=>b.text==='33/kg)'),1);
    assert.deepEqual(reattachDetachedPackage(lines,altered),lines,mode);
  }
});
test('Recovered purchase price cannot come from another column or a normal-price label', () => {
  const row={debugCardAnchor:{left:.050172,top:.828644},spatialResolved:null};
  const before=JSON.stringify(boxes);
  assert.deepEqual(resolveRecoveredPrintedPrice(row,boxes).spatialResolved,{value:1,quantity:null,unit:'PS',source:'recovered-headline-owned-printed-price',sanity:'pass',confidence:'high'});
  assert.equal(resolveRecoveredPrintedPrice({...row,debugCardAnchor:{left:.4,top:.828644}},boxes).spatialResolved,null);
  const missing=boxes.filter(b=>!(b.text==='PS'&&b.left===.22443));
  assert.equal(resolveRecoveredPrintedPrice(row,missing),row);
  assert.equal(JSON.stringify(boxes),before);
});

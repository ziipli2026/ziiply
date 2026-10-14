import assert from 'node:assert/strict';
import {repairPublisherTransaction as repair} from '../../src/app/components/ziiply/offerSearch/providers/kCitymarketPublisherTransactionRepair.js';
const row=(title,price,nearby,source='spatial-price')=>({title,nearby,spatialResolved:{value:price,quantity:1,source}});
assert.equal(repair(row('VICHY 0,33 l/pl 24-pack',.36,['24-PACK 1099'])).spatialResolved.value,10.99);
assert.equal(repair(row('ALKOHOLITON OLUT 0,33 l/tlk 8-pack',.85,['8-PACK 799'])).spatialResolved.value,7.99);
assert.equal(repair(row('KASSLER n. 2,3 kg',53,['-53 % 6 ERÄ'])).spatialResolved,null);
assert.equal(repair(row('KASSLER n. 2,3 kg',5.99,['-53 % 6 ERÄ'])).spatialResolved.value,5.99);
assert.equal(repair(row('VICHY 24-pack',.36,['24-PACK 1099','24-PACK 1299'])).spatialResolved.value,.36);
assert.equal(repair(row('VICHY 24-pack',10.99,['24-PACK 1099'])).spatialResolved.value,10.99);

// Regression: a percentage printed next to an unrelated valid price must not erase it.
assert.equal(repair(row('KASSLER',6.99,['-53 %','6 99'])).spatialResolved.value,6.99);
// A single discount percentage cannot be promoted to a euro amount.
assert.equal(repair(row('KASSLER',53,['-53 %','6 99'])).spatialResolved,null);
// Pack totals must not leak to products with a different pack count.
assert.equal(repair(row('VICHY 8-pack',.85,['24-PACK 1099'])).spatialResolved.value,.85);
// Multiple conflicting pack prices must remain unresolved rather than arbitrarily chosen.
assert.equal(repair(row('VICHY 24-pack',.36,['24-PACK 1099','24-PACK 1299'])).spatialResolved.value,.36);
console.log('KCM publisher transaction repair tests passed');

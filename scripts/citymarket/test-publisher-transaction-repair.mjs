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
// Never override a previously verified printed transaction price.
assert.equal(repair(row('VICHY 24-pack',12.99,['24-PACK 1099'],'printed-transaction')).spatialResolved.value,12.99);
assert.equal(repair(row('VICHY 24-pack',12.99,['24-PACK 1099'],'publisher-owned-pack-total')).spatialResolved.value,12.99);
// Repeated identical nearby pack-size evidence is ambiguous ownership, not confirmation.
assert.equal(repair(row('VICHY 24-pack',.36,['24-PACK 1099','24-PACK 1099'])).spatialResolved.value,.36);
// Unique pack evidence can still repair an unverified spatial price.
assert.equal(repair(row('VICHY 24-pack',.36,['24-PACK 1099'])).spatialResolved.value,10.99);
// A combined card naming two different pack sizes does not own either nearby price unambiguously.
assert.equal(repair(row('JUOMAT 8-pack tai 24-pack',.85,['8-PACK 799'])).spatialResolved.value,.85);
assert.equal(repair(row('JUOMAT 8-pack ja 24-pack',.85,['24-PACK 1099'])).spatialResolved.value,.85);
// Coincidental numerical equality of a percentage and a verified euro amount is not proof of a bad price.
assert.equal(repair(row('TUOTE',20,['-20 %'],'printed-transaction')).spatialResolved.value,20);
assert.equal(repair(row('TUOTE',20,['-20 %'],'verified-transaction')).spatialResolved.value,20);
assert.equal(repair(row('TUOTE',20,['-20 %'],'spatial-price')).spatialResolved,null);
// Publisher PDFs may use Unicode minus or en dash rather than ASCII hyphen.
assert.equal(repair(row('TUOTE',53,['−53 %'])).spatialResolved,null);
assert.equal(repair(row('TUOTE',53,['–53 %'])).spatialResolved,null);
assert.equal(repair(row('TUOTE',5.99,['−53 %'])).spatialResolved.value,5.99);
console.log('KCM publisher transaction repair tests passed');

import assert from 'node:assert/strict';
import {isUnverified45LVPrice as blocked, verified45LVTransaction as verified} from '../../src/app/components/ziiply/offerSearch/providers/kCitymarket45LVPriceGuard.js';
const lv='https://kcm-tarjouslehdet.k-ruoka.fi/90e9db1_tarjouslehti_45LV_KCM/index.html';
const av='https://kcm-tarjouslehdet.k-ruoka.fi/example_tarjouslehti_45AV_KCM/index.html';
for(const [page,title,price,quantity,unit] of [
 [3,'KOLMIOJUUSTOPALAT 45–300 g',5.99,1,'KPL'],
 [3,'CREAM CRACKER 200 g',3,2,'PKT'],
 [8,'KÄÄREELLISET KONVEHDIT 250–320 g (15,63–20,00/kg)',10,2,'RS'],
 [8,'KÄÄREELLISET KONVEHDIT 209 g (21,48/kg)',4.49,1,'RS'],
]){
 const result=verified(lv,page,title);
 assert.deepEqual([result.price,result.quantity,result.unit],[price,quantity,unit]);
 assert.equal(blocked(lv,page,title),false);
 assert.equal(verified(av,page,title),null);
 assert.equal(verified(lv,page+1,title),null);
}
assert.match(verified(lv,3,'KOLMIOJUUSTOPALAT 45–300 g').title,/245–300 g/);
assert.match(verified(lv,3,'CREAM CRACKER 200 g').title,/RUIS CRACKER 225 g/);
assert.equal(blocked(lv,3,'ja RUIS CRACKER 225 g'),true);
assert.equal(blocked(lv,8,'KÄÄREELLISET KONVEHDIT 500 g'),true);
assert.equal(blocked('https://example.com/another_tarjouslehti_45LV_KCM/index.html',3,'KOLMIOJUUSTOPALAT'),false);
assert.deepEqual(verified(lv,4,'M4EETVURSTIT 150 g 2 (15,00/kg)'),{price:4.5,quantity:2,unit:'KPL'});
assert.deepEqual(verified(lv,9,'VIRVOITUSJUOMAT 0,33 l/pl 24-pack'),{price:12.99,quantity:1,unit:'PKT',depositAmount:2.4});
assert.equal(verified(av,9,'VIRVOITUSJUOMAT 0,33 l/pl 24-pack'),null);
assert.equal(blocked(lv,4,'PIRKKA MEETVURSTIT 150 g'),false);
assert.equal(blocked(lv,9,'VIRVOITUSJUOMAT 0,33 l/pl 24-pack'),false);
console.log('Citymarket 45LV price guard and verified totals passed');

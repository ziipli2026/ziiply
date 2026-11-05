import assert from 'node:assert/strict';
import {isUnverified45LVPrice as blocked} from '../../src/app/components/ziiply/offerSearch/providers/kCitymarket45LVPriceGuard.js';
const lv='https://kcm-tarjouslehdet.k-ruoka.fi/90e9db1_tarjouslehti_45LV_KCM/index.html';
const av='https://kcm-tarjouslehdet.k-ruoka.fi/example_tarjouslehti_45AV_KCM/index.html';
for(const [page,title] of [[3,'KOLMIOJUUSTOPALAT 45–300 g'],[3,'ja RUIS CRACKER 225 g'],[4,'M4EETVURSTIT 150 g 2 (15,00/kg)'],[9,'VIRVOITUSJUOMAT 0,33 l/pl 24-pack']]){
 assert.equal(blocked(lv,page,title),true,'45LV unsafe row must be suppressed: '+title);
 assert.equal(blocked(av,page,title),false,'Do not suppress historical AV: '+title);
 assert.equal(blocked(lv,page+1,title),false,'Do not suppress same title on a different page: '+title);
}
assert.equal(blocked(lv,3,'KOLMIOJUUSTO 100 g'),false);
assert.equal(blocked('https://example.com/another_tarjouslehti_45LV_KCM/index.html',3,'KOLMIOJUUSTOPALAT'),false,'Future week 45 issues must not inherit this quarantine');
assert.equal(blocked(lv,9,'KIVENNÄISVEDET'),false);
console.log('Citymarket 45LV unsafe price guard: 15 checks passed');

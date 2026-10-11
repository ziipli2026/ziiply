import test from 'node:test';import assert from 'node:assert/strict';
import {productish} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParserCurrent.js';
test('Prepared meal bowls with food weight are eligible',()=>{for(const title of ['RUUKUT ja KULHOT 300 g','RUOKAKULHOT 250–350 g','ATERIAKULHO 0,3 kg'])assert.equal(productish(title),true,title);});
test('Household bowls remain excluded even with dimensions',()=>{for(const title of ['KULHOT 3 l','KULHO 300 g','RUUKUT ja KULHOT 3 l','RUUKUT ja KULHOT 300 g PAISTOASTIAT'])assert.equal(productish(title),false,title);});

import assert from 'node:assert/strict';
import {repairCitymarketOCRTitle as fix} from '../../src/app/components/ziiply/offerSearch/providers/kCitymarketOCRRepair.js';
assert.equal(fix('CREAM CRACKER CRACKER 200 g g ja RUIS CRACKER 225 g'),'CREAM CRACKER 200 g ja RUIS CRACKER 225 g');
assert.equal(fix('NIVEA VARTALOVOITEET 100–400 ml'),'NIVEA VARTALOVOITEET 100–400 ml');
assert.equal(fix('KÄÄREELLISET KONVEHDIT 209 g'),'KÄÄREELLISET KONVEHDIT 209 g');
assert.equal(fix('PIRKKA 24-pack 0,33 l'),'PIRKKA 24-pack 0,33 l');
assert.equal(fix('  MEHU   900 ml  '),'MEHU 900 ml');
console.log('Citymarket reusable OCR title repair: 5 checks passed');

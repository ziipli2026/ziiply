import assert from 'node:assert/strict';
import {repairCitymarketOCRTitle as fix} from '../../src/app/components/ziiply/offerSearch/providers/kCitymarketOCRRepair.js';
assert.equal(fix('CREAM CRACKER CRACKER 200 g g ja RUIS CRACKER 225 g'),'CREAM CRACKER 200 g ja RUIS CRACKER 225 g');
assert.equal(fix('NIVEA VARTALOVOITEET 100–400 ml'),'NIVEA VARTALOVOITEET 100–400 ml');
assert.equal(fix('KÄÄREELLISET KONVEHDIT 209 g'),'KÄÄREELLISET KONVEHDIT 209 g');
assert.equal(fix('PIRKKA 24-pack 0,33 l'),'PIRKKA 24-pack 0,33 l');
assert.equal(fix('  MEHU   900 ml  '),'MEHU 900 ml');
// Image extraction must use normalized titles while retaining the original ID.
const raw='CREAM CRACKER CRACKER 200 g g ja RUIS CRACKER 225 g';
const row={id:'kcm:spatial:3:original:1.46',title:raw,normalizedTitle:fix(raw)};
assert.equal(row.id,'kcm:spatial:3:original:1.46');
assert.equal(row.normalizedTitle,'CREAM CRACKER 200 g ja RUIS CRACKER 225 g');
console.log('Citymarket reusable OCR title repair: 6 checks passed');

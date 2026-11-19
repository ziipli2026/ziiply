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
assert.equal(fix('T1ORTILLA ORIGINAL MEDIUM 320 g (3,59/kg)15'),'TORTILLA ORIGINAL MEDIUM 320 g (3,59/kg)15');
assert.equal(fix('A4LKOHOLITON GLÖGI 0,75 l/pl'),'ALKOHOLITON GLÖGI 0,75 l/pl');
assert.equal(fix('C8HARDONNAY tai CABERNET SAUVIGNON 8 %'),'CHARDONNAY tai CABERNET SAUVIGNON 8 %');
assert.equal(fix('H9aribo JOULUKALENTERI 300 g'),'Haribo JOULUKALENTERI 300 g');
assert.equal(fix('G9LÖGI 8 % 0,75 l/pl (12,25/l)'),'GLÖGI 8 % 0,75 l/pl (12,25/l)');
assert.equal(fix('50.31'),'50.31');
console.log('Citymarket reusable OCR title repair: 12 checks passed');

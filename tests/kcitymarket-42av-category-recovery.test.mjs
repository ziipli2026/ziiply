import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// Read the provider's exported category function through TypeScript in the CI tsx runner.
import {category} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts';
test('42AV recovered product titles retain specific product-form categories',()=>{
 const cases=[
  ['KANAN RINTAFILEET 600 g','Liha & makkarat'],
  ['CLASSIC 50 ml PÄIVÄVOITEET','Hygienia & kosmetiikka'],
  ['MICELLAR 400 ml ja SORBET PÄIVÄVOITEET','Hygienia & kosmetiikka'],
  ['ROLL-ON ja SPRAY 50–150 ml','Hygienia & kosmetiikka'],
  ['INKOSUOJAT ja PIKKUHOUSUNSUOJAT 6–34 kpl','Hygienia & kosmetiikka'],
  ['SUUVESI 500 ml','Hygienia & kosmetiikka'],
  ['SAPPISAIPPUA 500 ml','Kodinhoito'],
  ['PUSSILAKANASETTI','Koti & vapaa-aika'],
  ['KIRJOLOHI','Kala'],
  ['KORVAPUUSTI 6/360 g','Leipomo']
 ];
 for(const [title,expected] of cases)assert.equal(category(title),expected,title);
});

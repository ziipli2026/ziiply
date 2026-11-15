const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync('src/app/components/ziiply/offerSearch/lidlPublicationCategoryRepair.ts', 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021}}).outputText;
const moduleObject = {exports:{}};
new Function('module','exports',compiled)(moduleObject,moduleObject.exports);
const repair = moduleObject.exports.repairLidlPublicationCategory;
const cases = [
  ['Crelando Sukkalanka 2 kerää','Kala','Koti & vapaa-aika'],
  ['Ultimate Speed Pullotunkki','Leipomo','Koti & vapaa-aika'],
  ['Crivit Juomapullo','Leipomo','Koti & vapaa-aika'],
  ['Joulukaktus','Juomat','Koti & vapaa-aika'],
  ['Kotimainen tulilatva','Juomat','Koti & vapaa-aika'],
  ['JOULUAITTA Perunalaatikko','Hevi','Valmisruoka'],
  ['JOULUAITTA Porkkanalaatikko','Hevi','Valmisruoka'],
  ['ATRIA Rosolli','Hevi','Valmisruoka'],
  ['FAZER AITO Kauraruoka, tomaatti-basilika','Hevi','Valmisruoka'],
  ['Klementiini 1 kg','Muut','Hevi'],
  ['Bluetooth-vastamelukuulokkeet','Muut','Koti & vapaa-aika'],
  ['Auton akkulaturi','Muut','Koti & vapaa-aika'],
  ['Autotarvike','Muut','Koti & vapaa-aika'],
  ['Työhousut','Muut','Koti & vapaa-aika'],
  ['Varavirtalähde','Muut','Koti & vapaa-aika'],
  ['Auton lumisukat','Muut','Koti & vapaa-aika'],
  ['WC-raikastin','Muut','Koti & vapaa-aika'],
  ['Viemärinavaaja','Muut','Koti & vapaa-aika']
];
for (const [title,oldCategory,expected] of cases) {
  test('Lidl stored/read category: '+title, () => {
    const old = {title,category:oldCategory,categoryPath:oldCategory,mainCategory:oldCategory,
      sourceCategoryPath:'Original upstream /h/path',sourceDepartmentPath:'/h/official-page',
      price:2.49,ean:'1234567890123',validFrom:'2026-11-15',validUntil:'2026-11-18'};
    const corrected=repair('LIDL:FI0218',old);
    assert.equal(corrected.category,expected);
    assert.equal(corrected.categoryPath,expected);
    assert.equal(corrected.mainCategory,expected);
    for (const key of ['sourceCategoryPath','sourceDepartmentPath','price','ean','validFrom','validUntil']) {
      assert.equal(corrected[key],old[key],key+' must not change');
    }
    assert.deepEqual(old.category,oldCategory,'input snapshot must not be mutated');
    assert.deepEqual(repair('LIDL:FI0218',corrected),corrected,'idempotent');
    assert.strictEqual(repair('K-Citymarket',old),old,'other chains unchanged');
  });
}
test('Lidl unaffected groceries retain exact original row',()=>{
  const original={title:'Granaattiomena, irto',category:'Hevi',sourceCategoryPath:'fruit'};
  assert.strictEqual(repair('LIDL:FI0218',original),original);
});
test('Publication storage uses repair before INSERT and reader repairs old rows',()=>{
  const storage=fs.readFileSync('src/app/components/ziiply/offerSearch/publicationStore.ts','utf8');
  assert.match(storage,/const storedOffers = candidate\.offers\.map\(\(offer\) => repairLidlPublicationCategory\(candidate\.chain, offer\)\)/);
  assert.match(storage,/JSON\.stringify\(storedOffers\)/);
  assert.match(storage,/row\.offers as T\[\]\)\.map\(\(offer\) => repairLidlPublicationCategory\(chain, offer\)\)/);
});

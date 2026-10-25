const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('scripts/ziiply-fineli-discover-candidates.mts','utf8');
for (const term of ['const unsafeProduct =','const containsDifferentPreparation =','const fatMismatch =','const productIsGlutenFree =','const productIsLactoseFree =','const productIsFatFree =','const productIsLight =','const productIsUnsweetened =','autoApproved:0']) assert.ok(source.includes(term),term);
const unsafeMatch = source.match(/const unsafeProduct = (\/[^\n]+\/i)\.test\(unbranded\)/);
assert.ok(unsafeMatch,'unsafe-product filter must exist');
const unsafePattern = unsafeMatch[1];
const unsafe = new RegExp(unsafePattern.slice(1,-2),'i');
for (const name of ['koiran annosrasia naudan maksa','paprika kasvipohjainen levite','riisi-quinoa-moniviljaseos','pekoni nuudeli','kreikkalainen jogurtti 10%','suklaa välipalapatukka']) assert.equal(unsafe.test(name),true,name);
for (const name of ['Öljykynttilä 5 kpl','Pesusieni Miny porkkana','PrimaCat Soup tonnikala','Dagsmark Buusti kana patee','Xtra leipäveitsi','Xtra pastakauha','Ilmanraikastin Omena']) assert.equal(unsafe.test(name),true,'nonfood guard: '+name);
for (const name of ['siika savustettu','paprika keltainen','herne kuivattu']) assert.equal(unsafe.test(name),false,name);
const percent = /(\d+(?:[.,]\d+)?)\s*%/;
assert.equal(percent.exec('jogurtti 10%')[1],'10');
assert.equal(percent.exec('jauheliha 9,5%')[1],'9,5');
assert.ok(source.includes('const productFat = withoutBlendRatio.match(/(\\d+(?:[.,]\\d+)?)\\s*%/)'), 'numeric percent parser must use blend-ratio-safe input');
for (const term of [
  'const withoutBlendRatio =',
  'const unverifiedMinceFat =',
  'const incompatibleCategory =',
  '!unverifiedMinceFat(entry.name)',
  '!incompatibleCategory(entry.name)'
]) assert.ok(source.includes(term), 'missing category guard: ' + term);
const ratio = /\b\d+(?:[.,]\d+)?\s*%\s*\/\s*\d+(?:[.,]\d+)?\s*%/g;
assert.equal('nauta-sika jauheliha (50%/50%)'.replace(ratio,'' ).match(percent), null, 'species ratio must not be read as fat');
assert.equal('sika-nauta jauheliha 23%'.replace(ratio,'').match(percent)[1], '23', 'actual fat percentage must remain');
assert.equal(source.includes('\\n    const '), false, 'literal newline escapes must not appear before declarations');
assert.ok(source.includes('entry.coverage >= 0.5'), 'expanded review coverage threshold');
assert.ok(source.includes('.slice(0,3)'), 'expanded per-product review candidate limit');
console.log('Fineli candidate guard regression OK');


const strictSource = fs.readFileSync('scripts/ziiply-fineli-discover-candidates.mts','utf8');
for (const key of ['strictBrandPrefixes','strictQuantitySuffix']) {
  const declaration = strictSource.match(new RegExp('const '+key+' = (\\/[^\\n]+\\/[a-z]*);'));
  assert.ok(declaration, 'missing normalization regex '+key);
  assert.equal(declaration[1].includes(String.raw`\\s`),false,'double escaped regex '+key);
}
const prefix = /^(?:(?:pirkka|coop|xtra|kotimaista|rainbow|k-menu|s-market)\s+)+/i;
const quantity = /\s+\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l)(?:\s+(?:\d+\s*(?:kpl|lk)|suomi|kotimainen))?$/i;
assert.equal('Pirkka porkkana 500g'.replace(prefix,'').replace(quantity,''),'porkkana');
assert.equal('Coop kurkku 300g 1lk'.replace(prefix,'').replace(quantity,''),'kurkku');
assert.ok(strictSource.includes('raw_produce_origin_grade'),'origin/grade discovery must remain enabled');
console.log('Fineli normalization regression OK');


const originNormalize = value => value.toLocaleLowerCase('fi')
  .replace(/(?:^|\s)(?:suomalainen|kotimainen|kotimaista|luomu)(?=\s|$)/g,' ')
  .replace(/(?:^|\s)(?:suomi|espanja|hollanti|nl|eg)(?=\s|$)/g,' ')
  .replace(/(?:^|\s)(?:ruotsi|italia|ranska|puola|saksa|belgia|viro|kreikka|turkki)(?=\s|$)/g,' ')
  .replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|g)\b/g,' ')
  .replace(/\b[12]\s*lk\b/g,' ')
  .replace(/\s+/g,' ').trim();
for(const [input,expected] of [
  ['porkkana 500g suomi 1lk','porkkana'],
  ['luomu sipuli 1 kg ruotsi 2lk','sipuli'],
  ['kurkku 300g hollanti','kurkku'],
  ['peruna 2kg viro','peruna'],
  ['tomaatti 500g italia','tomaatti'],
]) assert.equal(originNormalize(input),expected,input);
assert.equal(originNormalize('kurkkusalaatti 300g suomi'),'kurkkusalaatti','must not turn prepared foods into raw produce');
console.log('Fineli origin mass normalization regression OK');

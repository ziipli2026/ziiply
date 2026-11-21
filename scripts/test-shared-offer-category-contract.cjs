const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

// Test the actual shared category mapper, without any database connection,
// production endpoint, or Lidl-only classification.
const source = fs.readFileSync('src/app/components/ziiply/offerSearch/neonOfferCategory.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022}
}).outputText;
const exports = {};
const sandbox = {
  exports,
  require(name) {
    if (name === '@neondatabase/serverless') return {neon: () => {throw Error('Unexpected database access')}};
    if (name === './catalogIdentityResolver') return {};
    throw Error('Unexpected import '+name);
  },
};
vm.runInNewContext(compiled, sandbox, {filename:'neonOfferCategory.js'});
const classify = exports.neonOfferDisplayCategory;
assert.equal(typeof classify, 'function');
const examples = [
  ['Juomat/Kahvi', 'Kahvi & tee'],
  ['Juomat/Mehut', 'Juomat'],
  ['Liha ja lihavalmisteet/Makkarat', 'Liha & makkarat'],
  ['Hedelmät ja vihannekset/Salaatit', 'Hevi'],
  ['Pakasteet/Pakastevihannekset', 'Pakasteet'],
  ['Leivät ja leivonnaiset/Leivät', 'Leipomo'],
  ['Maitotuotteet/Juustot', 'Maitotuotteet'],
  ['Muut', null],
  ['CAUNKNOWNCATEGORY', null],
  ['Tuntematon/Alaryhmä', null],
];
for (const [path, expected] of examples) {
  assert.equal(classify(path), expected, 'Shared category mapping for '+path);
}
console.log('PASS shared Neon category mapper: '+examples.length+' source-independent taxonomy cases');

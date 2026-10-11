const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const source=fs.readFileSync('src/app/components/ziiply/offerSearch/kOfferTabPolicy.ts','utf8');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function('exports','module',code)(mod.exports,mod);
const {removeCampaignCopiesOfLeaflet}=mod.exports;
test('Same product and total with different offer counts survives',()=>{const row={title:'Tuorejuusto 200 g',price:4,ean:'1234567890123'};assert.equal(removeCampaignCopiesOfLeaflet([{...row,offerQuantity:2}],[{...row,offerQuantity:3}]).length,1);});
test('Matching product price and count is suppressed',()=>{const row={title:'Tuorejuusto 200 g',price:4,offerQuantity:2};assert.equal(removeCampaignCopiesOfLeaflet([row],[row]).length,0);});

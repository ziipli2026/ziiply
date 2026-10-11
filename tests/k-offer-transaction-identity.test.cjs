const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const source=fs.readFileSync('src/app/components/ziiply/offerSearch/kOfferTabPolicy.ts','utf8');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function('exports','module',code)(mod.exports,mod);
const {removeCampaignCopiesOfLeaflet}=mod.exports;
test('Same product and total with different offer counts survives',()=>{const row={title:'Tuorejuusto 200 g',price:4,ean:'1234567890123'};assert.equal(removeCampaignCopiesOfLeaflet([{...row,offerQuantity:2}],[{...row,offerQuantity:3}]).length,1);});
test('Matching product price and count is suppressed',()=>{const row={title:'Tuorejuusto 200 g',price:4,offerQuantity:2};assert.equal(removeCampaignCopiesOfLeaflet([row],[row]).length,0);});
const {removeProvenPercentageCopies}=mod.exports;
const crop='https://image-transformer-api.tjek.com/?u=s3%3A%2F%2Fassets%2Fp-7.webp&x1r=0.1&x2r=0.4&y1r=0.2&y2r=0.5';
const national={title:'MEHUT 2 dl 24-pack',price:null,discountPercent:21,source:'K-Citymarket tarjouslehti',imageUrl:crop,validFrom:'8.10.',validTo:'18.10.'};
const local={title:'Valmistaja MEHUT 2 dl 24-pack',price:10,provider:'kcitymarket-local',imageUrl:crop,validFrom:'2026-10-07T21:00:00+0000',validUntil:'2026-10-18T20:59:59+0000',additionalInfo:'Plussa-etu -21%',packageCount:24};
test('Unique same-card same-period percentage copy yields to complete price without mutation',()=>{const rows=[national,local],before=JSON.stringify(rows);assert.deepEqual(removeProvenPercentageCopies(rows),[local]);assert.equal(JSON.stringify(rows),before);});
for(const [reason,change] of Object.entries({period:{validUntil:'2026-10-11T20:59:59+0000'},crop:{imageUrl:crop.replace('x1r=0.1','x1r=0.2')},percentage:{additionalInfo:'Plussa-etu -20%'},package:{title:'Valmistaja MEHUT 2 dl 12-pack'},quantity:{offerQuantity:2},source:{provider:'other'},missingProof:{additionalInfo:''}})) {
 test('Percentage copy survives different '+reason,()=>assert.equal(removeProvenPercentageCopies([national,{...local,...change}]).length,2));
}
test('Ambiguous priced counterparts preserve percentage for review',()=>assert.equal(removeProvenPercentageCopies([national,local,{...local,price:11}]).length,3));
test('Standalone percentage remains',()=>assert.deepEqual(removeProvenPercentageCopies([national]),[national]));

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync('src/app/components/ziiply/offerSearch/providers/kCitymarket45AVCorrections.js','utf8')
  .replace(/export function /g, 'function ');
const ctx = {};
vm.runInNewContext(src + '\nthis.api={repairCitymarketPrintedTitle,removeDuplicateContinuationRows};',ctx);
const {repairCitymarketPrintedTitle,removeDuplicateContinuationRows}=ctx.api;
test('45AV: merge only same-page matching LV 15% discount; keep source immutable',()=>{
  const rows=[
    {title:'LV PYYKINPESUNESTEET 750–1500 ml',page:18,percentageOffer:{percent:15}},
    {title:'tai TAHRANPOISTOSUIHKE 150 ml',page:18,percentageOffer:{percent:15}},
    {title:'Another product',page:18,percentageOffer:{percent:15}},
  ];
  const out=removeDuplicateContinuationRows(rows);
  assert.equal(out.length,2);
  assert.match(out[0].title,/LV PYYKINPESUNESTEET.*tai TAHRANPOISTOSUIHKE 150 ml/);
  assert.equal(rows[0].title,'LV PYYKINPESUNESTEET 750–1500 ml');
});
test('45AV: different discount or page must not merge',()=>{
  for(const row of [{page:17,percentageOffer:{percent:15}},{page:18,percentageOffer:{percent:20}}]){
    const rows=[{title:'LV PYYKINPESUNESTEET 750 ml',page:18,percentageOffer:{percent:15}},
      {title:'tai TAHRANPOISTOSUIHKE 150 ml',...row}];
    assert.equal(removeDuplicateContinuationRows(rows).length,2);
  }
});
test('45AV: printed title repairs',()=>{
  assert.equal(repairCitymarketPrintedTitle({},'TÄYSMEHUT 900 ml/pl tai'),'Innocent TÄYSMEHUT 900 ml/pl');
  assert.equal(repairCitymarketPrintedTitle({},'SMOOTHIET 750 ml/pl'),'Innocent SMOOTHIET 750 ml/pl');
  assert.equal(repairCitymarketPrintedTitle({},'tai TAHRANPOISTOSUIHKE 150 ml'),'LV TAHRANPOISTOSUIHKE 150 ml');
});

test('45AV: printed Innocent price includes deposit and has product-specific unit prices',()=>{
  const provider=fs.readFileSync('src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts','utf8');
  const quality=fs.readFileSync('src/app/components/ziiply/offerSearch/citymarketQuality.ts','utf8');
  assert.match(provider,/if\(innocent45AV\) price=3\.49/);
  assert.match(provider,/depositAmount:0\.20/);
  assert.match(provider,/TÄYSMEHUT\/i\.test\(title\)\?3\.66:4\.39/);
  assert.match(quality,/deposit > 0 \? deposit : expectedDeposit/);
  assert.match(quality,/\(price - depositToCheck\) \/ \(amount \* quantity \* packCount\)/);
  assert.equal(Math.round((3.49-.20)/.9*100)/100,3.66);
  assert.equal(Math.round((3.49-.20)/.75*100)/100,4.39);
});

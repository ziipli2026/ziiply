#!/usr/bin/env node
// K-Citymarket offer-price audit. Read-only: never changes parser data.
// Usage: node scripts/audit-citymarket-prices.cjs exported-debug.json
const fs=require('node:fs');
const file=process.argv[2];
if(!file){console.error('Usage: node scripts/audit-citymarket-prices.cjs debug.json');process.exit(2);}
const input=JSON.parse(fs.readFileSync(file,'utf8'));
const items=Array.isArray(input)?input:(input.rawItems||[]);
const issues=[];
for(const [index,item] of items.entries()){
 const src=item.__sourceOfferSearchResult||item;
 const title=String(item.title||item.name||src.title||'');
 const price=Number(src.price??item.price);
 const qty=Number(src.offerQuantity);
 const size=String(src.packageSize||title);
 const unitPrice=Number(src.unitPrice);
 if(!Number.isFinite(price)||price<=0){issues.push({index,title,reason:'missing-or-invalid-price',price:src.price});continue;}
 if(Number.isFinite(qty)&&qty>1){
   issues.push({index,title,reason:'multibuy-requires-total-and-quantity-display',price,quantity:qty,unit:src.offerUnit||null,perItem:Number((price/qty).toFixed(4))});
 }
 // Only single fixed-size packages are mathematically comparable to €/kg or €/l.
 const matches=[...size.matchAll(/(\d+(?:[,.]\d+)?)\s*(kg|g|ml|cl|dl|l)\b/gi)];
 if(matches.length!==1||!Number.isFinite(unitPrice)||unitPrice<=0)continue;
 const [,raw,unit]=matches[0];const n=Number(raw.replace(',','.'));
 const amount=({kg:n,g:n/1000,l:n,dl:n/10,cl:n/100,ml:n/1000})[unit.toLowerCase()];
 const expected=unitPrice*amount*(Number.isFinite(qty)&&qty>1?qty:1);
 if(expected>0&&Math.abs(expected-price)>Math.max(.15,expected*.08))
   issues.push({index,title,reason:'unit-price-inconsistency',price,quantity:Number.isFinite(qty)?qty:null,unitPrice,packageSize:size,expected:Number(expected.toFixed(2))});
}
const counts={};for(const i of issues)counts[i.reason]=(counts[i.reason]||0)+1;
console.log(JSON.stringify({rows:items.length,issueCounts:counts,issues},null,2));
if(issues.some(x=>x.reason==='unit-price-inconsistency'||x.reason==='missing-or-invalid-price'))process.exitCode=1;

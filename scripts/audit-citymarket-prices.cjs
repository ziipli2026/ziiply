#!/usr/bin/env node
// K-Citymarket offer-price audit. Read-only: never changes parser data.
// Usage: node scripts/audit-citymarket-prices.cjs exported-debug.json
const fs=require('node:fs');
const file=process.argv[2];
if(!file){console.error('Usage: node scripts/audit-citymarket-prices.cjs debug.json');process.exit(2);}
// Debug exports may contain several adjacent JSON objects (offers + campaigns).
const raw=fs.readFileSync(file,'utf8');
function parseExports(text){
 const objects=[];let depth=0,start=-1,inString=false,escaped=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(inString){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')inString=false;continue;}
  if(c==='"'){inString=true;continue;}
  if(c==='{'||c==='['){if(depth++===0)start=i;}
  else if(c==='}'||c===']'){if(--depth===0&&start>=0){objects.push(JSON.parse(text.slice(start,i+1)));start=-1;}}
 }
 if(depth!==0||!objects.length)throw new Error('Invalid or incomplete JSON export');
 return objects;
}
const exports=parseExports(raw);
const items=exports.flatMap((input,exportIndex)=>
 (Array.isArray(input)?input:(input.rawItems||[])).map(item=>({...item,__auditExportIndex:exportIndex}))
);
const issues=[];
for(const [index,item] of items.entries()){
 const src=item.__sourceOfferSearchResult||item;
 const title=String(item.title||item.name||src.title||'');
 const price=src.price==null&&item.price==null?null:Number(src.price??item.price);
 const qty=src.offerQuantity==null?null:Number(src.offerQuantity);
 const size=String(src.packageSize||title);
 const unitPrice=src.unitPrice==null?null:Number(src.unitPrice);
 // An explicit printed total/quantity is authoritative evidence within this
 // debug record; a mismatch means downstream handling must be investigated.
 const explicit=[...title.matchAll(/(\d{1,3}[,.]\d{2})\s*€?\s*\/\s*(\d{1,2})\s*(kpl|pkt|ps|prk|plo)\b/gi)];
 if(explicit.length===1){
  const printedTotal=Number(explicit[0][1].replace(',','.'));
  const printedQuantity=Number(explicit[0][2]);
  if(printedQuantity>=2&&printedQuantity<=24&&printedTotal>0&&
     (price==null||Math.abs(price-printedTotal)>.011||qty!==printedQuantity)){
   issues.push({index,title,reason:'printed-multibuy-conflict',price,quantity:qty,printedTotal,printedQuantity});
  }
 }

 // Percentage-only campaigns intentionally have no absolute price.
 if(price==null&&Number.isFinite(Number(src.discountPercent))&&Number(src.discountPercent)>0)continue;
 if(price==null||!Number.isFinite(price)||price<=0){issues.push({index,title,reason:'missing-or-invalid-price',price:src.price});continue;}
 if(Number.isFinite(qty)&&qty>1){
   issues.push({index,title,reason:'multibuy-requires-total-and-quantity-display',price,quantity:qty,unit:src.offerUnit||null,perItem:Number((price/qty).toFixed(4))});
 }
 // Only single fixed-size packages are mathematically comparable to €/kg or €/l.
 // Ranges and composite product titles are not comparable to one fixed pack size.
 if(/[0-9][,.]?[0-9]*\s*[–-]\s*[0-9]/.test(size)||/\b(?:tai|sekä)\b/i.test(size))continue;
 const matches=[...size.matchAll(/(\d+(?:[,.]\d+)?)\s*(kg|g|ml|cl|dl|l)\b/gi)];
 if(matches.length!==1||!Number.isFinite(unitPrice)||unitPrice<=0)continue;
 const [,raw,unit]=matches[0];const n=Number(raw.replace(',','.'));
 const amount=({kg:n,g:n/1000,l:n,dl:n/10,cl:n/100,ml:n/1000})[unit.toLowerCase()];
 const expected=unitPrice*amount*(qty!=null&&Number.isFinite(qty)&&qty>1?qty:1);
 if(expected>0&&Math.abs(expected-price)>Math.max(.15,expected*.08))
   issues.push({index,title,reason:'unit-price-inconsistency',price,quantity:Number.isFinite(qty)?qty:null,unitPrice,packageSize:size,expected:Number(expected.toFixed(2))});
}
const counts={};for(const i of issues)counts[i.reason]=(counts[i.reason]||0)+1;
console.log(JSON.stringify({exports:exports.length,rows:items.length,issueCounts:counts,issues},null,2));
if(issues.some(x=>x.reason==='unit-price-inconsistency'||x.reason==='missing-or-invalid-price'||x.reason==='printed-multibuy-conflict'))process.exitCode=1;

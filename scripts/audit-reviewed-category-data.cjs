const assert=require('node:assert/strict');
const rules=require('./lib/read-search-registry.cjs')();
const exceptions=require('../data/search/product-category-exceptions-reviewed.json').exceptions;
const ids=new Set(rules.map(rule=>rule.category));
const keys=new Set(),eanCategories=new Map();
for(const row of exceptions){
  assert.match(row.ean,/^(\d{8}|\d{13})$/);
  assert.equal([...row.ean].reduce((sum,digit,i)=>sum+Number(digit)*(i===row.ean.length-1?1:(row.ean.length-1-i)%2?3:1),0)%10,0,`Invalid checksum ${row.ean}`);
  assert(ids.has(row.category_id),`Unknown category ${row.category_id}`);
  const key=[row.ean,row.source,row.source_category].join('|');
  assert(!keys.has(key),`Duplicate identity ${key}`);keys.add(key);
  const previous=eanCategories.get(row.ean);assert(!previous||previous===row.category_id,`Conflicting EAN ${row.ean}`);eanCategories.set(row.ean,row.category_id);
}
for(const rule of rules){
  const visit=(id,path)=>{assert(ids.has(id),`Missing parent ${id}`);assert(!path.includes(id),`Parent cycle ${[...path,id].join(' > ')}`);const current=rules.find(r=>r.category===id);for(const p of current.parentCategories||(current.parentCategory?[current.parentCategory]:[]))visit(p,[...path,id]);};visit(rule.category,[]);
}
console.log(JSON.stringify({groups:rules.length,reviewedExceptions:exceptions.length,uniqueEans:eanCategories.size,status:'PASS'}));
